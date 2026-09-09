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
# Auth — no manual PAT needed if you use the GitHub CLI:
#   * Preferred: `gh` CLI. Run `gh auth login` once; the script acts as YOU, so
#     your org-owner status is the gate. (First time also run
#     `gh auth refresh -s delete_repo,admin:org` to grant the delete scopes.)
#   * Fallback: a PAT in $GH_TOKEN (scopes: repo, delete_repo, admin:org).
#   The engine's GitHub App is intentionally NOT used: it cannot delete repos,
#   and granting it that power would let the dashboard delete too — breaking the
#   "the dashboard can never do destructive things" boundary.
#
# Usage:
#   gh auth login                               # once (or: export GH_TOKEN=…)
#   gh auth refresh -s delete_repo,admin:org    # once, add delete scopes
#   GITHUB_ORG=your-org ./scripts/hard-delete-repo.sh --dry-run my-repo
#   GITHUB_ORG=your-org ./scripts/hard-delete-repo.sh my-repo
#
# Flags:
#   --dry-run   Run every read-only check and print the plan; change NOTHING.
#   --yes       Skip the interactive "type the repo name" confirmation.
#
# Requires: bash, git, terraform, jq, and either `gh` (preferred) or curl+$GH_TOKEN.
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

# ---- deps -------------------------------------------------------------------
for c in git terraform jq; do
  command -v "$c" >/dev/null 2>&1 || die "missing dependency: $c"
done

# ---- auth mode: prefer gh CLI, else a PAT in $GH_TOKEN ----------------------
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  AUTH="gh"
elif [ -n "${GH_TOKEN:-}" ]; then
  command -v curl >/dev/null 2>&1 || die "curl is required for GH_TOKEN mode"
  AUTH="token"
else
  die "no GitHub auth — run 'gh auth login' (recommended) or set GH_TOKEN"
fi

# API helpers take a path (e.g. /repos/o/r) and use whichever auth mode is active.
api_get() {     # -> JSON on stdout, non-zero on HTTP failure
  if [ "$AUTH" = gh ]; then gh api "$1"
  else curl -fsSL -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$API$1"; fi
}
api_delete() {  # DELETE, discards body
  if [ "$AUTH" = gh ]; then gh api -X DELETE "$1" >/dev/null
  else curl -fsSL -X DELETE -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$API$1" >/dev/null; fi
}
api_exists() {  # -> 0 if the resource returns 200
  if [ "$AUTH" = gh ]; then gh api "$1" >/dev/null 2>&1
  else curl -fsSL -o /dev/null -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$API$1" 2>/dev/null; fi
}

ROOT="$(git rev-parse --show-toplevel)"
CONFIG_FILE="$ROOT/terraform/config/repositories/$REPO.yml"

# Resolve org: explicit env wins, else read organization.yml.
ORG="${GITHUB_ORG:-}"
if [ -z "$ORG" ]; then
  ORG="$(grep -E '^organization:' "$ROOT/terraform/config/organization.yml" 2>/dev/null \
         | head -n1 | sed -E 's/^organization:[[:space:]]*//; s/[[:space:]]*(#.*)?$//')"
fi
[ -n "$ORG" ] || die "cannot determine org — set GITHUB_ORG"

# Preflight: state must be readable now, so we never mutate then discover we
# cannot run `state rm` (which would leave a dangling, prevent_destroy'd entry).
if ! STATE_LIST="$(terraform -chdir="$ROOT/terraform" state list 2>/dev/null)"; then
  die "cannot read terraform state — run 'terraform init' in ./terraform (and set backend creds for remote state)"
fi

# Preflight: if we will push the config removal, local must not be behind origin,
# or the push is rejected mid-operation, leaving a half-done local commit.
if [ -f "$CONFIG_FILE" ]; then
  CUR_BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
  git -C "$ROOT" fetch -q origin 2>/dev/null || true
  BEHIND="$(git -C "$ROOT" rev-list --count "HEAD..origin/$CUR_BRANCH" 2>/dev/null || echo 0)"
  [ "$BEHIND" -eq 0 ] || die "local '$CUR_BRANCH' is $BEHIND commit(s) behind origin — run 'git pull' first, then re-run."
fi

# ---- guardrail 1: caller must be an org owner -------------------------------
step "Checking caller identity…"
LOGIN="$(api_get /user | jq -r '.login')"
[ -n "$LOGIN" ] && [ "$LOGIN" != null ] || die "could not resolve your GitHub identity (is gh logged in / GH_TOKEN valid?)"
ROLE="$(api_get "/orgs/$ORG/memberships/$LOGIN" 2>/dev/null | jq -r '.role // empty')" || true
[ "$ROLE" = "admin" ] || die "$LOGIN is not an owner of '$ORG' (role: ${ROLE:-none}). Only org owners may hard-delete."
info "$LOGIN is an owner of $ORG ✓"

# ---- guardrail 2: repo must exist and be archived ---------------------------
step "Checking repository state…"
REPO_JSON="$(api_get "/repos/$ORG/$REPO" 2>/dev/null)" || die "repo '$ORG/$REPO' not found (or no access)"
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
step "Planned actions for $ORG/$REPO  (auth: $AUTH):"
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
api_delete "/repos/$ORG/$REPO"
info "repository deleted ✓"

# ---- 4. delete leftover teams ------------------------------------------------
for slug in "$MENTORS_SLUG" "$DEVS_SLUG"; do
  if api_exists "/orgs/$ORG/teams/$slug"; then
    step "Deleting team $slug…"
    api_delete "/orgs/$ORG/teams/$slug"
    info "team $slug deleted ✓"
  else
    info "team $slug not found — skipped"
  fi
done

echo
step "Done. $ORG/$REPO and its teams are gone; config and state no longer reference it."
