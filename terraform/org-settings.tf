# =============================================================================
# Organization Settings
# =============================================================================
# ⚠️ CAUTION — `github_organization_settings` does not manage A SINGLE FIELD, but
# the organization's ENTIRE SETTINGS OBJECT (~25 fields: billing email, member
# permissions, project settings, security defaults...).
#
# For this reason it cannot be added just to "manage only default_repository_permission".
# The sequence followed:
#   1. Existing settings are pulled into state with an `import` block
#   2. `plan` is run — EVERY difference between the provider default and reality is shown
#   3. Config is filled in to match reality; only the field we intentionally change stays different
#   4. Only then is it applied
#
# Steps 1–2 were done on 2026-08-18. The results are below. Step 3 is blocked
# because of A SINGLE FIELD; that is why the block is commented out for now (see "Why blocked").
#
# -----------------------------------------------------------------------------
# The real state that plan revealed (import id = 313128349)
# -----------------------------------------------------------------------------
# Only two fields showed up as changes; the remaining ~23 fields were read from
# GitHub by the provider and, because they are not written in the config, stay AS THEY ARE
# (this is the behavior of optional+computed fields in Terraform). So the feared
# "everything reverts to defaults" scenario does not happen — the only exception is below.
#
# Side effect: the import revealed the org security posture we had never seen before.
#
#   advanced_security_enabled_for_new_repositories               = false
#   dependabot_alerts_enabled_for_new_repositories               = false
#   dependabot_security_updates_enabled_for_new_repositories     = false
#   dependency_graph_enabled_for_new_repositories                = false
#   secret_scanning_enabled_for_new_repositories                 = false
#   secret_scanning_push_protection_enabled_for_new_repositories = false
#
#   → NO security default is enabled at the org level. Every newly created repo is
#     born with zero security features. Phase 6's "repo security settings" item
#     will enable these on a per-repo basis; enabling them as the org default has
#     now become possible from here with a single line.
#
#   members_can_create_public_repositories = true
#   members_can_create_repositories        = true
#
#   → Any org member can create a PUBLIC repo. This is the shortest path to a code
#     leak; `default_repository_permission = none` does NOT close this (a different axis).
#     A separate decision is needed — added as an item to ROADMAP Phase 6.
#
#   members_can_fork_private_repositories  = false   ✅ (desired state)
#   web_commit_signoff_required            = false
#
# -----------------------------------------------------------------------------
# `billing_email` — why it was written by hand
# -----------------------------------------------------------------------------
# It is REQUIRED in the provider schema, cannot be omitted (tried: "The argument billing_email
# is required, but no definition was found").
#
# But after the import, plan showed it as `+` (being newly added) — meaning Terraform
# read the existing value as EMPTY; the GitHub App token cannot read this field. It
# does have write permission, however. Had it been applied with a wrong value, the
# org's billing email would have silently changed. That is why the value was NOT GUESSED,
# but read from the UI and written here.
#
# ⚠️ Because the provider cannot read this field, Terraform CANNOT SEE ITS DRIFT either.
# If it is changed via the UI, plan stays silent and the next apply writes back the value
# here. So this line is not a "record" but the single source of truth — if it is going to
# be changed via the UI, here must be updated first.
#
# -----------------------------------------------------------------------------
# Required App permission — `Organization → Administration: Read and write`
# -----------------------------------------------------------------------------
# The first apply attempt (2026-08-18) blew up with:
#
#   Error: PATCH https://api.github.com/orgs/your-org:
#          403 Resource not accessible by integration
#
# Reason: the App HAD `Repository → Administration: write` but that is NOT the permission
# needed for org settings. GitHub keeps these separate:
#
#   administration               → repo settings, branch protection    (had it)
#   organization_administration  → org settings, base permission       (did not)
#
# This is the THIRD of the `Issues` and `Workflows` 403s — the cause is the same in all
# three: a permission assumed to be broad is defined more narrowly on GitHub's side. Expect
# this 403 when touching a new resource type for the first time.
#
# Permission was granted, the second apply passed. Status: `plan` is clean.
# =============================================================================

data "github_organization" "this" {
  name = var.github_org_name
}

import {
  to = github_organization_settings.this
  id = data.github_organization.this.id
}

resource "github_organization_settings" "this" {
  # The billing email now comes not from the code but from the outside (HCP variable
  # TF_VAR_billing_email) — a personal address is not written into the repo.
  # ⚠️ This field is REQUIRED in the provider (cannot be null). If the value is not set
  # in HCP, an empty string is applied; TF_VAR_billing_email must be set in HCP before apply.
  # Historical note: until 2026-08-18 this address belonged to a departed team member; during
  # offboarding it was overlooked for three days. That is why it was brought under management —
  # but its value now lives in HCP.
  billing_email = var.billing_email

  # If billing_email is empty (TF_VAR_billing_email not set), do NOT OVERWRITE the org's REAL
  # email. The field is required in the provider (cannot be omitted), but with ignore_changes
  # Terraform disregards the diff on this field → the value in the GitHub UI is preserved.
  # The "empty = leave unmanaged" intent is only TRULY achieved this way.
  # Note: if you want to manage the value, fill in the var + remove this block. If it was
  # previously deleted by an empty apply, first enter the correct value once in the UI; after
  # that it is preserved.
  lifecycle {
    ignore_changes = [billing_email]
  }

  # --- Org profile (visible in the GitHub UI) --------------------------------
  # These fields had been entered by hand in the UI; as long as the config did not manage them,
  # Terraform tried to DELETE them on every apply. By bringing them into the config we put them
  # under management — now whatever the config says goes. (During a rebrand the values change here.)
  # `try(..., null)`: if there is no profile section, the field stays null as if unmanaged.
  name        = try(local.org_config.profile.name, null)
  description = try(local.org_config.profile.description, null)
  blog        = try(local.org_config.profile.blog, null)
  location    = try(local.org_config.profile.location, null)

  # Until now `read` — meaning everyone added to the org, even if on no team, could read all
  # repos. With `none` the only source of access becomes team membership (ROADMAP Phase 6 /
  # ACCESS-MODEL least-privilege principle).
  #
  # ⚠️ Narrowing this is not a SILENT operation, it is an ACCESS REMOVAL operation.
  # When applied on 2026-08-18, `medine2906` lost visibility of two pilot repos — their access
  # there came from the org default. Expected behavior, but the cost falls on a person. If this
  # value is going to be narrowed again, the question "who depends on this default?" must be
  # answered first; before the apply, not after.
  default_repository_permission = "none"

  # --- Repo creation permission ---------------------------------------------
  # The 2026-08-18 import showed `members_can_create_public_repositories = true`:
  # any org member could create a PUBLIC repo. The shortest path to a code leak.
  #
  # ⚠️ GitHub CANNOT say "only mentors may create". At the org level, repo creation permission
  # is binary: either all members, or only ORG OWNERs. There is no team-based middle tier.
  #   → https://docs.github.com/en/organizations/managing-organization-settings/restricting-repository-creation-in-your-organization
  #   → https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization
  #
  # `false` = only org owners. Since today the only owner is `uslanozan`, this gives the same
  # result as "only mentors", but if a mentor who is NOT an owner joins, they will not be able
  # to create a repo — this is an accepted limitation, because the real rule is this:
  #
  #   Repos are born from config, not from a human's hand. A file is added into
  #   `config/repositories/*.yml`, a PR is opened, apply creates the repo. Creating a repo by
  #   hand is a rogue path anyway; closing it does not break the model, it enforces it.
  #
  # 🚨 THE COST OF THE "let's make the mentor an org owner" SOLUTION — not small:
  # Being an org owner does not grant repo creation permission, it grants full authority over
  # EVERYTHING IN THE ORG: admin on every repo, exempt on every protected branch (with Decision E,
  # `enforce_admins = false`), adding/removing members, changing org settings, deleting repos.
  # The root of the incident we had on 2026-08-15 was exactly this.
  #
  # So "making someone an owner just so they can create a repo" is tearing down the wall to open
  # a door. The number of owners must be kept deliberate (ACCESS-MODEL: at most around 3) and
  # ownership must be granted NOT from the need to create repos, but from the need to administer
  # the org. Whoever is an owner shows up in `terraform output branch_protection_bypass`.
  #
  # ⚠️ NOT VERIFIED: This setting should not affect the GitHub App — the App is not an org MEMBER,
  # but an installed integration. But it has not been tested live. If Terraform creating a new repo
  # returns `403` after this, that is the reason; in that case these three lines are reverted. The
  # next repo creation should therefore be watched carefully.
  members_can_create_repositories         = false
  members_can_create_public_repositories  = false
  members_can_create_private_repositories = false

  # --- Security defaults for new repos --------------------------------------
  # In the 2026-08-18 import ALL SIX came out `false` — meaning every new repo created from config
  # was born with zero security features. The per-repo settings in the module
  # (`vulnerability_alerts`, `secret_scanning`) cover EXISTING repos; the values here cover repos
  # that DO NOT YET EXIST. The two protect different time windows, one does not replace the other.
  dependabot_alerts_enabled_for_new_repositories           = true
  dependabot_security_updates_enabled_for_new_repositories = true
  dependency_graph_enabled_for_new_repositories            = true

  # ⚠️ The secret scanning org default applies only to PUBLIC repos; private repos require GHAS.
  # Enabling it as an org setting does not prevent creating a private repo, the feature just is not
  # enabled on that repo.
  secret_scanning_enabled_for_new_repositories                 = true
  secret_scanning_push_protection_enabled_for_new_repositories = true

  # advanced_security → requires a GHAS (Enterprise) license. Deliberately `false`.
  # To be reconsidered if we move to the Team plan (ROADMAP Phase 7).
  advanced_security_enabled_for_new_repositories = false
}
