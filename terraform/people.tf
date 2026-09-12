# =============================================================================
# People — organization membership and org-wide roles
# =============================================================================
# Two files, two ownerships. This split IS THE PRIVILEGE-ESCALATION GATE:
#
#   config/people.yml       → org membership (who is in the org). Machine-owned;
#                             written by the dashboard. CANNOT EXPRESS privilege.
#   config/privileged.yml   → org owners + org-wide roles
#                             (head-of-engineering). Human-owned, CODEOWNERS
#                             protected; the dashboard NEVER writes it.
#
# Why it was split (secure by construction): the root of the 2026-08-15 incident
# was that a person kept being admin on every repository as long as their org role
# stayed owner. Escalation could be done with a single line of YAML, through the
# SAME approval path as adding an intern. Now the field that expresses escalation
# lives in a separate file the dashboard cannot write — it relies on making it
# inexpressible, not on policing it.
#
#   Org membership → is the person in the org, an owner? → people.yml + privileged.yml
#   Repo access    → what can they do in which repo?     → config/repositories/*.yml
#
# The repo file CANNOT ANSWER the question "is this person an org owner" — and if
# they are, every line in there is void, because an org owner overrides everything
# including branch protection.
# =============================================================================

locals {
  # --- Org membership (machine-owned) -----------------------------------------
  # A simple list: the dashboard adds/removes a line. It carries no privilege — a
  # person being here only means "org member". Ownership comes from privileged.yml.
  members = try(yamldecode(file("${local.config_dir}/people.yml")).members, [])

  # --- Privileges (human-owned, CODEOWNERS protected) -------------------------
  privileged        = try(yamldecode(file("${local.config_dir}/privileged.yml")), {})
  privileged_owners = try(local.privileged.org_owners, [])
  privileged_roles  = try(local.privileged.roles, {}) # role name => [login]

  # ---------------------------------------------------------------------------
  # BREAK-GLASS — deliberately left outside management
  # ---------------------------------------------------------------------------
  # At least one org owner must stay OUTSIDE Terraform. Reason: if a faulty config
  # or a broken apply demotes all owners to `member`, no one is left to recover the
  # organization — and whoever would re-promote that person must also be an owner.
  # The lockout is irreversible.
  #
  # ⚠️ The price of this is visibility: this person's org role is NOT ENFORCED by
  # Terraform, only declared in config. If it is changed through the UI, the plan
  # stays silent. The bypass report (outputs.tf) says this explicitly.
  unmanaged_people = ["uslanozan"]

  managed_members = [
    for u in local.members : u
    if !contains(local.unmanaged_people, u)
  ]

  # ---------------------------------------------------------------------------
  # Derived org roles
  # ---------------------------------------------------------------------------
  # Org owner = a person listed in privileged.yml AND actually an org member.
  org_owners = sort([
    for u in local.members : u
    if contains(local.privileged_owners, u)
  ])

  # head-of-engineering holders come from privileged.roles.
  head_of_engineering = sort(try(local.privileged_roles["head-of-engineering"], []))

  # Role names defined as org-scoped in organization.yml. Only these may be written
  # into privileged.roles; the rule is not hardcoded, it derives from `roles.*.scope`.
  org_scoped_roles = sort([
    for role, cfg in local.org_config.roles : role
    if try(cfg.scope, "repository") == "organization"
  ])

  # ---------------------------------------------------------------------------
  # VALIDATION — catch silent contradictions at plan time
  # ---------------------------------------------------------------------------

  # 1) privileged.roles may only carry an ORG-SCOPED role name. Writing a
  #    repo-scoped role (mentor/developer) here is meaningless — the real repo
  #    permission lives in config/repositories/*.yml.
  privileged_invalid_roles = sort([
    for role in keys(local.privileged_roles) : role
    if !contains(local.org_scoped_roles, role)
  ])

  # 2) EVERYONE named in privileged.yml (whether owner or role holder) must also be
  #    an org member in people.yml. Privilege cannot precede membership: a person is
  #    first added to the organization, then promoted. Otherwise privileged.yml
  #    would call someone who is not in the org an owner, and it would silently be
  #    void.
  privileged_people = sort(distinct(concat(
    local.privileged_owners,
    flatten([for role, users in local.privileged_roles : users]),
  )))

  privileged_not_members = sort([
    for u in local.privileged_people : u
    if !contains(local.members, u)
  ])

  # 3) People referenced in repo files but not present in people.yml.
  #
  #    These used to slip silently into the org: the module produces a
  #    `github_team_membership`, and GitHub then auto-invites the person. They join
  #    the org as a `member` but NEVER appear in the central list. During
  #    offboarding you have to find EVERY repo file their name appears in; a single
  #    missed record keeps the person in the org. Instead of auto-producing
  #    membership, we ERROR (fail-fast).
  people_referenced_in_repos = toset(flatten([
    for repo_name, repo in local.repos : concat(
      try(repo.mentors, []),
      try(repo.developers, []),
    )
  ]))

  repo_people_missing_from_people = sort([
    for user in local.people_referenced_in_repos : user
    if !contains(local.members, user)
  ])
}

# --- Organization membership -------------------------------------------------
#
# `github_membership` UPDATES the role of an existing member, and SENDS an invite
# for a new person. So adding a line to `people.yml` produces a real org invite.
#
# ⚠️ `config/organization.example.yml` must therefore never be fed into `for_each`:
# the example users inside it would get real invites. The config directory that is
# read is set by `var.config_path` (local.config_dir); the example files are not
# there.
resource "github_membership" "people" {
  for_each = toset(local.managed_members)

  username = each.key

  # The org role now DERIVES from privileged.yml: `admin` if in the owner list,
  # otherwise `member`. The membership file itself cannot express the role (secure
  # by construction).
  role = contains(local.privileged_owners, each.key) ? "admin" : "member"

  # A person removed from people.yml is ACTUALLY removed from the organization
  # (evict). This is safe: (a) every change goes through PR + apply, not
  # sudden/accidental; (b) member eviction is REVERSIBLE — adding them back to
  # people.yml sends a new invite. (Because repo deletion is irreversible, there is
  # a separate, deliberate path there; membership does not need it.) This way the
  # dashboard's "remove from org" action does what it promises.
  downgrade_on_destroy = false
}

# --- head-of-engineering team ------------------------------------------------
#
# `platform-admins` is the technical carrier of the head-of-engineering role
# (teams.tf): the module gives this team admin on every repo, and the
# `head-of-engineering` inside `push_allowed_roles` resolves to it.
#
# Membership is produced from privileged.roles["head-of-engineering"]. The reason
# this role lives in privileged.yml (CODEOWNERS protected) is: it gives its holder
# admin + branch protection bypass on every repo — so it must not be an escalation
# grantable with a single line in people.yml.
resource "github_team_membership" "platform_admins" {
  for_each = toset(local.head_of_engineering)

  team_id  = github_team.platform_admins.id
  username = each.value
  role     = "maintainer"
}
