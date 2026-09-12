# =============================================================================
# Root Outputs
# =============================================================================
# A summary of the resources generated from configuration. Readable via
# `terraform output`; in the future the dashboard may pull these values through
# the HCP API.
# =============================================================================

output "repositories" {
  description = "URLs and teams of the repositories generated from config"
  value = {
    for name, repo in module.repositories : name => {
      url        = repo.repo_html_url
      clone_url  = repo.repo_url
      ssh_url    = repo.repo_ssh_url
      full_name  = repo.repo_full_name
      branch     = repo.default_branch
      mentors    = repo.mentors_team_slug
      developers = repo.developers_team_slug
    }
  }
}

output "repository_count" {
  description = "Number of repositories managed from configuration"
  value       = length(module.repositories)
}

output "org_admin_team" {
  description = "Organization team carrying the head-of-engineering role"
  value       = github_team.platform_admins.slug
}

# =============================================================================
# Bypass visibility
# =============================================================================
# `enforce_admins` is permanently `false` (ROADMAP Decision E). Since the
# exemption is not technically closed, the only remaining control is VISIBILITY:
# "right now, who can skip the rules, on which repo, on which branch?"
#
# This output produces the answer to that question. On 2026-08-15 the fact that a
# person was admin on every repo could only be understood by reading the `.tf`
# files; that is why the incident went unnoticed for months.
# =============================================================================

locals {
  # The `org_owners` and `head_of_engineering` lists are defined in people.tf and
  # are now ENFORCED by Terraform (`github_membership.people`) — until 2026-08-18
  # they were only declarations.
  #
  # The one exception is `local.unmanaged_people`: people left outside management
  # as break-glass. Their org role is still a declaration, and if it is changed
  # through the UI the plan stays silent. The report names them in the `_warning`
  # field.
  unenforced_owners = sort([
    for user in local.org_owners : user
    if contains(local.unmanaged_people, user)
  ])

  # Repositories with no protected branch at all.
  #
  # This list closes a weakness of the report: in the `repositories` map such a
  # repo showed up as `{}`, and `{}` said two different things in the same form —
  # "there is no rule to bypass here" and "there is nothing to worry about". The
  # first is an ALARM, the second is silence. It was noticed on 2026-08-18 when
  # `pilot-access-test` was added.
  #
  # An empty map must be an alarm: the bypass question is meaningless in a repo with
  # no protected branch, because everyone can already do everything.
  unprotected_repos = sort([
    for repo_name, _ in local.repos : repo_name
    if length(local.protected_branches[repo_name]) == 0
  ])
}

output "branch_protection_bypass" {
  description = <<-EOT
    Who can bypass branch protection rules, broken down by repository x branch.

    While `enforce_admins = false`, anyone with admin permission on a repository
    bypasses the pull request requirement, the review count, status checks, force
    push protection and branch deletion protection. This scope was verified live on
    2026-08-17 (see pilot-verification.md 6.5).

    Reading order:
      unprotected_repos → repositories with no protected branch at all. Look here
                          FIRST: asking who can bypass is meaningless there,
                          because there is no protection to bypass.
      repositories      → for repositories that do have protection, who is exempt
                          on which branch.
  EOT

  value = {
    # Until 2026-08-18 this field said "org roles are not enforced at all, they are
    # all declarations". Once `github_membership.people` came into play the scope
    # narrowed: now only those left outside management for break-glass are
    # declarations.
    _warning = length(local.unenforced_owners) == 0 ? "Every org role is enforced by Terraform." : join(" ", [
      "The role of this org owner is NOT ENFORCED by Terraform:",
      "${join(", ", local.unenforced_owners)}.",
      "Deliberately left unmanaged as break-glass (people.tf -> unmanaged_people):",
      "binding every owner to Terraform risks an irreversible lockout on a faulty",
      "apply. The price is visibility: if this person's role is changed through the",
      "UI, the plan stays silent. Everyone else is enforced.",
    ])

    organization_wide = {
      org_owner           = local.org_owners
      head_of_engineering = local.head_of_engineering
      note                = "Both groups are admin on EVERY repository; they appear again in the per-repository list."
    }

    # Under `repositories` these repos show up as `{}` — and an empty map on its own
    # is misleading: "no rule to bypass" and "no problem" read the same way. That is
    # why they are listed separately here; they must be an alarm, not silence.
    unprotected_repos = {
      list = local.unprotected_repos
      note = length(local.unprotected_repos) == 0 ? "Every repository has at least one protected branch." : join(" ", [
        "NO branch is protected in these repositories, so asking who can bypass is",
        "meaningless: everyone can already do everything. This may be expected,",
        "because branch protection does not work on private repositories on the Free",
        "plan; being expected does not justify being invisible. A public repository",
        "on this list is a real gap.",
      ])
    }

    repositories = {
      for repo_name, repo in local.repos : repo_name => {
        for branch, rules in local.protected_branches[repo_name] : branch => {
          enforce_admins = try(rules.enforce_admins, false)

          # If enforce_admins is true, no one is exempt; if false, everyone with
          # admin permission on the repo is exempt.
          exempt_from_all_rules = try(rules.enforce_admins, false) ? [] : sort(distinct(concat(
            try(repo.mentors, []),
            local.head_of_engineering,
            local.org_owners,
          )))

          # These roles are also written in the push allowlist — a second gate,
          # independent of the exemption (see rbac-and-permissions.md Section 3).
          push_allowlist_roles = try(rules.push_allowed_roles, [])
        }
      }
    }
  }
}
