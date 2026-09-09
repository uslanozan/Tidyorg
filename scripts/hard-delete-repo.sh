#!/usr/bin/env bash
# =============================================================================
# hard-delete-repo.sh — BREAK-GLASS: permanently delete a managed repository.
# =============================================================================
# The dashboard deliberately cannot hard-delete a repo (it only archives, and
# the Terraform module carries prevent_destroy). Real deletion is a rare, manual,
# irreversible operation. This script automates the whole ritual behind two
# guardrails so it cannot be done by accident:
#
#   1. Only an ORG OWNER may run it (checked against the GitHub API).
#   2. Only an ALREADY-ARCHIVED repo may be deleted (archive first, via config).
#
# What it does, in this exact order (order matters — see below):
#   1. Remove terraform/config/repositories/<repo>.yml and push it (so the repo
#      leaves config BEFORE it leaves state — otherwise the next `apply` would
#      recreate it).
#   2. terraform state rm 'module.repositories["<repo>"]'  (bypass prevent_destroy)
#   3. DELETE the repository via the GitHub API.
#   4. DELETE the leftover <repo>-mentors / <repo>-devs teams.
#
# Auth: uses YOUR OWN token via $GH_TOKEN (an org-owner PAT). This is on purpose:
#   - deleting a repo needs `delete_repo`, which the engine's GitHub App lacks;
#   - it ties the destructive act to a human identity, not the automation;
#   - a non-owner token simply cannot pass the guardrails or the API calls.
# The PAT needs scopes: repo, delete_repo, admin:org.
#
# Usage:
#   GH_TOKEN=ghp_xxx GITHUB_ORG=your-org ./scripts/hard-delete-repo.sh --dry-run my-repo
#   GH_TOKEN=ghp_xxx GITHUB_ORG=your-org ./scripts/hard-delete-repo.sh my-repo
#
# Flags:
#   --dry-run   Run every read-only check and print the plan; change NOTHING.
#   --yes       Skip the interactive "type the repo name" confirmation.
#
# Requires: bash, curl, jq, git, terraform (initialised in ./terraform).
# =============================================================================
set -euo pipefail

API="https://api.github.com"
DRY_RUN=false
ASSUME_YES=false
REPO=""

die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
info() { printf '  %s\n' "$*"; }
step() { printf '\033[36m▸ %s\033[0m\n' "$*"; }

# ---- args -------------------------------------------------------------------
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --yes|-y)  ASSUME_YES=true ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "unknown flag: $1" ;;
    *)  [ -z "$REPO" ] || die "only one repo name allowed"; REPO="$1" ;;
  esac
  shift
done
[ -n "$REPO" ] || die "usage: $0 [--dry-run] [--yes] <repo-name>"

# ---- deps + env -------------------------------------------------------------
for c in curl jq git terraform; do
  command -v "$c" >/dev/null 2>&1 || die "missing dependency: $c"
done
[ -n "${GH_TOKEN:-}" ] || die "GH_TOKEN is not set (org-owner PAT with repo, delete_repo, admin:org)"

ROOT="$(git rev-parse --show-toplevel)"
CONFIG_FILE="$ROOT/terraform/config/repositories/$REPO.yml"

# Resolve org: explicit env wins, else read organization.yml.
ORG="${GITHUB_ORG:-}"
if [ -z "$ORG" ]; then
  ORG="$(grep -E '^organization:' "$ROOT/terraform/config/organization.yml" 2>/dev/null \
         | head -n1 | sed -E 's/^organization:[[:space:]]*//; s/[[:space:]]*(#.*)?$//')"
fi
[ -n "$ORG" ] || die "cannot determine org — set GITHUB_ORG"

# Authenticated GitHub API call; -f makes non-2xx a failure.
gh() { curl -fsSL -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$@"; }

# Preflight: state must be readable now, so we never mutate then discover we
# cannot run `state rm` (which would leave a dangling, prevent_destroy'd entry).
if ! STATE_LIST="$(terraform -chdir="$ROOT/terraform" state list 2>/dev/null)"; then
  die "cannot read terraform state — run 'terraform init' in ./terraform (and set backend creds for remote state)"
fi

# ---- guardrail 1: caller must be an org owner -------------------------------
step "Checking caller identity…"
LOGIN="$(gh "$API/user" | jq -r '.login')"
[ -n "$LOGIN" ] && [ "$LOGIN" != null ] || die "could not resolve token owner (bad GH_TOKEN?)"

ROLE="$(gh "$API/orgs/$ORG/memberships/$LOGIN" 2>/dev/null | jq -r '.role // empty')" || true
[ "$ROLE" = "admin" ] || die "$LOGIN is not an owner of '$ORG' (role: ${ROLE:-none}). Only org owners may hard-delete."
info "$LOGIN is an owner of $ORG ✓"

# ---- guardrail 2: repo must exist and be archived ---------------------------
step "Checking repository state…"
REPO_JSON="$(gh "$API/repos/$ORG/$REPO" 2>/dev/null)" || die "repo '$ORG/$REPO' not found (or no access)"
ARCHIVED="$(echo "$REPO_JSON" | jq -r '.archived')"
[ "$ARCHIVED" = "true" ] || die "'$REPO' is NOT archived. Archive it first (dashboard → Arşivle, or archived: true in config), then re-run."
info "$ORG/$REPO exists and is archived ✓"

# Team slugs GitHub derives from the module's team names (<repo>-mentors/-devs).
BASE="$(echo "$REPO" | tr '[:upper:]' '[:lower:]')"
MENTORS_SLUG="$BASE-mentors"
DEVS_SLUG="$BASE-devs"
STATE_ADDR="module.repositories[\"$REPO\"]"

# ---- plan -------------------------------------------------------------------
echo
step "Planned actions for $ORG/$REPO:"
[ -f "$CONFIG_FILE" ] && info "1. git rm  terraform/config/repositories/$REPO.yml  (commit + push)" \
                       || info "1. (config file already absent — skipped)"
info "2. terraform state rm  $STATE_ADDR"
info "3. DELETE repo         $ORG/$REPO   (irreversible)"
info "4. DELETE teams        $MENTORS_SLUG, $DEVS_SLUG (if present)"
echo

if $DRY_RUN; then
  step "--dry-run: no changes made."
  exit 0
fi

# ---- confirmation -----------------------------------------------------------
if ! $ASSUME_YES; then
  printf '\033[33mThis is IRREVERSIBLE. Type the repo name to confirm: \033[0m'
  read -r REPLY </dev/tty
  [ "$REPLY" = "$REPO" ] || die "confirmation did not match — aborted."
fi

# ---- 1. remove from config FIRST (so a stray apply cannot recreate it) ------
if [ -f "$CONFIG_FILE" ]; then
  step "Removing config and pushing…"
  git -C "$ROOT" rm -q "$CONFIG_FILE"
  git -C "$ROOT" commit -q -m "chore: hard-delete $REPO — remove from config"
  if ! git -C "$ROOT" push; then
    die "config commit made locally but push failed — push it before continuing, or the repo may reappear on the next apply."
  fi
fi

# ---- 2. drop from terraform state (bypasses prevent_destroy) ----------------
# `state list` prints leaf resources (module.repositories["x"].github_repository…),
# not the bare module address, so match it as a substring. The trailing "] in
# STATE_ADDR keeps "x" from matching "x-2".
if echo "$STATE_LIST" | grep -qF "$STATE_ADDR"; then
  step "Removing $STATE_ADDR from terraform state…"
  terraform -chdir="$ROOT/terraform" state rm "$STATE_ADDR"
else
  info "state: $STATE_ADDR not tracked — skipped"
fi

# ---- 3. delete the repository ------------------------------------------------
step "Deleting repository $ORG/$REPO…"
gh -X DELETE "$API/repos/$ORG/$REPO" >/dev/null
info "repository deleted ✓"

# ---- 4. delete leftover teams ------------------------------------------------
for slug in "$MENTORS_SLUG" "$DEVS_SLUG"; do
  if gh -o /dev/null "$API/orgs/$ORG/teams/$slug" 2>/dev/null; then
    step "Deleting team $slug…"
    gh -X DELETE "$API/orgs/$ORG/teams/$slug" >/dev/null
    info "team $slug deleted ✓"
  else
    info "team $slug not found — skipped"
  fi
done

echo
step "Done. $ORG/$REPO and its teams are gone; config and state no longer reference it."
