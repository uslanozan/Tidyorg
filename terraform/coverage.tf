# =============================================================================
# Coverage Check — Unmanaged Repositories (GIT-34)
# =============================================================================
# This file answers THIS question: "what is out there that I don't manage?"
#
# Note: this is a DIFFERENT thing from drift detection. The two are constantly
# confused:
#
#   Drift detection    → "did something I manage change?"  → looks at what IS in state
#   Coverage detection → "what am I not managing?"         → looks at what is NOT in state
#
# `terraform plan` NEVER shows a repository that is not in state — for it, that
# repo does not exist. Until now a repo could quietly enter the org and stay
# outside the scope of every control:
#
#   - Terraform does not see it (not in state)
#   - Org security defaults are not applied (`*_for_new_repositories` only touch
#     NEW repos; they do not touch existing ones)
#   - It does not appear in the bypass report (that report is generated from
#     `local.repos`, i.e. from CONFIG)
#   - And it goes unnoticed, because there is nowhere to look
#
# It happened live twice:
#   1. `vulnerability_alerts` was OFF on this repo (2026-08-18) — the one repo
#      opened by hand was the one repo that went unaudited.
#   2. `tmp-app-create-test` was left orphaned on GitHub after a `state rm`
#      (2026-08-18).
#
# The industry name for it: IaC coverage / unmanaged resources.
# See docs/notes/industry-terms.md §3, ROADMAP.md → "Who will protect the past?"
# =============================================================================

locals {
  # `data.github_organization.this` is DEFINED in org-settings.tf — it is used
  # there to manage org settings, and its `repositories` field has never been read
  # until now. No new data source is needed; no extra API call is created either.
  #
  # ⚠️ Whether the field returns `org/repo` or just `repo` can vary by provider
  # version. To tolerate both, the last segment is taken: the last element of the
  # `split` result, or the array itself when there is no separator. This keeps the
  # check from silently giving the WRONG answer if the field format changes — if it
  # were not normalized, "your-org/foo" would not match "foo" and EVERY repo would
  # look unmanaged.
  org_repo_names = sort([
    for full_name in data.github_organization.this.repositories :
    element(split("/", full_name), length(split("/", full_name)) - 1)
  ])

  managed_repo_names = sort(keys(local.repos))

  # THE REAL QUESTION: present in the org, absent from config.
  unmanaged_repos = sort(setsubtract(
    toset(local.org_repo_names),
    toset(local.managed_repo_names),
  ))

  # The reverse direction: present in config, absent from the org. Normally this
  # list means "a new repo not applied yet" — the data source is read during plan,
  # so the repo may not be created yet. NOT an alarm, information.
  # It should be empty after apply; if it is not, the repo was deleted from GitHub
  # by hand.
  declared_but_absent_repos = sort(setsubtract(
    toset(local.managed_repo_names),
    toset(local.org_repo_names),
  ))
}

# -----------------------------------------------------------------------------
# `check` block — why a WARNING, not an error
# -----------------------------------------------------------------------------
# A failed assert in a `check` block produces a **Warning** in the plan, it does
# NOT break the plan. This is deliberate:
#
#   - This is not a CONFIG error, it is an OBSERVATION about the world. Someone
#     transferring a repo into the org should not block the apply of an unrelated
#     intern being added. The preconditions in `people.tf` are fail-closed, because
#     those are config errors; this is fail-loud, because this is a finding.
#   - And the warning DOES NOT DISAPPEAR: the mechanism set up on 2026-08-18 carries
#     Terraform warnings into the PR comment (counted and listed) and, on apply,
#     into a `::warning::` annotation + step summary. So this block needs no new CI
#     code at all.
#
# ⚠️ The warning TITLE in the plan comment becomes Terraform's own text — "Check
# block assertion failed". The repo names are not in the title, they are in the
# body of the warning and in `terraform output repository_coverage`. Today there is
# a single `check` block, so the title creates no ambiguity; if a second one is
# added, the title in the comment stops being distinctive and the extractor in the
# plan comment must be widened to also capture the `check` name.
# -----------------------------------------------------------------------------

check "repository_coverage" {
  assert {
    condition = length(local.unmanaged_repos) == 0
    error_message = join(" ", [
      "${length(local.unmanaged_repos)} repository/repositories exist in the organization",
      "but are NOT in config/repositories/:",
      "${join(", ", local.unmanaged_repos)}.",
      "Nothing manages them: org security defaults do not apply (those only touch NEW",
      "repositories), they never appear in the branch protection bypass report, and no",
      "plan will ever mention them. Adopt each one (write config/repositories/<name>.yml,",
      "see TODO.md -> GIT-34 for the four-step procedure) or delete it deliberately.",
    ])
  }
}

output "repository_coverage" {
  description = <<-EOT
    Which repositories in the organization are outside Terraform's management.

    Answers a different question than drift detection: drift asks "did what I
    manage change?", coverage asks "what am I not managing at all?". A plan can
    never answer the second one, because an unmanaged repository does not exist
    as far as Terraform is concerned.

    Reading order:
      unmanaged -> the alarm. Present in the organization, absent from config.
                   Nothing enforces anything on these.
      declared_but_absent -> informational. Usually a repository declared in
                   config that has not been applied yet.
  EOT

  value = {
    unmanaged = {
      list  = local.unmanaged_repos
      count = length(local.unmanaged_repos)
      note = length(local.unmanaged_repos) == 0 ? join(" ", [
        "Every repository in the organization is managed from config.",
        "This is a real check, not an assumption: the list comes from the GitHub API,",
        "not from config.",
        ]) : join(" ", [
        "These repositories are in the organization but not in config/repositories/.",
        "Org security defaults do NOT cover them - those settings only apply to newly",
        "created repositories. They are also invisible to the bypass report, which is",
        "generated from config. Adopt or delete them deliberately; see TODO.md GIT-34.",
      ])
    }

    declared_but_absent = {
      list  = local.declared_but_absent_repos
      count = length(local.declared_but_absent_repos)
      note = length(local.declared_but_absent_repos) == 0 ? "Every repository declared in config exists in the organization." : join(" ", [
        "Declared in config but not present in the organization. During a plan this",
        "normally means 'not applied yet' - the data source is read before creation.",
        "If it persists after apply, the repository was deleted outside Terraform.",
      ])
    }

    # These two numbers declare the report's own scope: if one day the org has 40
    # repos and 4 show up here, the problem is not in the repos but in this check.
    _scope = {
      repositories_in_organization = length(local.org_repo_names)
      repositories_in_config       = length(local.managed_repo_names)
      note = join(" ", [
        "Archived repositories are included in the organization count and cannot be",
        "told apart here - the data source returns names only. An archived repository",
        "outside config still shows up as unmanaged, which is correct: archived is not",
        "the same as governed.",
      ])
    }
  }
}
