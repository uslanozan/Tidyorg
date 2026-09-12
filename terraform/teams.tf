# =============================================================================
# Organization-Level Teams
# =============================================================================
# In the role-based model, permission comes from the per-repo `<repo>-mentors` and
# `<repo>-devs` teams (see terraform/modules/repository). At the organization level
# only a single team is needed.
#
# Discipline teams (backend/frontend/devops), tech-leads, interns-* and
# external-collaborators were removed — see ACCESS-MODEL.md, Decision 12.
#
# If discipline teams are wanted back in the future, they can be added as LABELS, but
# WITHOUT granting repo permission. When a person is given access through more than
# one team, GitHub applies the highest permission; if permission is granted, the
# least-privilege principle is silently pierced.
# =============================================================================

# The technical counterpart of the head-of-engineering role.
#
# CARRIER RESOURCE — cannot be deleted. The module looks this team up with
# `data "github_team"` and grants it admin access to every repo
# (`github_team_repository.org_admins`). Also, `push_allowed_roles: [head-of-engineering]`
# in branch protection resolves to this team. If it is deleted, apply fails and the
# mentors' push permission collapses too.
resource "github_team" "platform_admins" {
  name        = "platform-admins"
  description = "Platform Administrators - carries the head-of-engineering role"
  privacy     = "closed"

  # --- Validation of the `people` section -----------------------------------
  # The rules belong to people.tf, but the precondition sits here because this
  # resource is SINGULAR and always exists: `github_membership.people` is a `for_each`
  # and has no instance if config is empty — in which case the validation would never
  # run either. Attaching it to a singular resource guarantees the rule runs on every
  # plan.
  #
  # It is also meaningful: this team is the carrier of the head-of-engineering role,
  # so auditing that org-scoped roles are written in the right place is exactly its job.
  lifecycle {
    precondition { #! runs at the plan stage and stops a bad config.
      condition = length(local.privileged_invalid_roles) == 0
      error_message = join(" ", [
        "config/privileged.yml -> `roles` may only carry ORGANIZATION-SCOPED roles",
        "(today: ${join(", ", local.org_scoped_roles)}).",
        "Repository-scoped roles (mentor / developer) live in the `mentors` /",
        "`developers` lists inside config/repositories/*.yml; such a role written into",
        "privileged.yml does nothing but misleads whoever reads the file.",
        "Invalid roles: ${join(" · ", local.privileged_invalid_roles)}",
      ])
    }

    precondition {
      condition = length(local.privileged_not_members) == 0
      error_message = join(" ", [
        "Everyone named in config/privileged.yml (as an org owner or a role carrier)",
        "MUST ALSO be listed in config/people.yml. Privilege cannot precede membership:",
        "a person joins the organization first, then gets elevated. A privileged entry",
        "for someone who is not a member is silently void.",
        "Not members: ${join(", ", local.privileged_not_members)}",
      ])
    }

    precondition {
      condition = length(local.repo_people_missing_from_people) == 0
      error_message = join(" ", [
        "Everyone named in config/repositories/*.yml MUST ALSO be listed in",
        "config/people.yml (`members`). Otherwise a person enters the org silently: the",
        "module creates a team membership, GitHub sends an automatic invitation, yet",
        "they never appear on the central list. The price is paid at offboarding -",
        "removing them means finding EVERY repository file that names them, and a single",
        "missed entry leaves them in the organization. Add to the organization first,",
        "then assign to a repository.",
        "Missing from people.yml: ${join(", ", local.repo_people_missing_from_people)}",
      ])
    }
  }
}
