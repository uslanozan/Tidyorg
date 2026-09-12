# =============================================================================
# Repositories — generated from configuration (one file per repo)
# =============================================================================
# No repo name, person name, or rule value is written in this file.
# To add a new repo: create config/repositories/<repo-name>.yml.
# File name = repo name. Uniqueness is naturally guaranteed.
#
# See ACCESS-MODEL.md — "Code layer / data layer separation"
# See ROADMAP.md — Phase 1 (split the config structure)
# =============================================================================

locals {
  # Location of the config directory. An empty `var.config_path` = in-repo layout
  # (${path.module}/config). A container mounts the user's config elsewhere
  # (e.g. /config) and points here with TF_VAR_config_path.
  config_dir = var.config_path != "" ? var.config_path : "${path.module}/config"

  org_config = yamldecode(file("${local.config_dir}/organization.yml"))

  # Read every .yml file; drop the .yml extension of the file name → it becomes the
  # repo name. config/repositories/pilot-intern-web.yml → "pilot-intern-web"
  #
  # ⚠️ `.example.yml` is DELIBERATELY excluded. Every file in this folder creates a
  # real repo; a file placed here as a schema example would open a live repo named
  # `repository.example`.
  #
  # This is not a theoretical concern: on 2026-08-15 a REAL org invite went to the
  # `dev-1` / `dev-2` aliases inside `organization.example.yml` — those usernames
  # really exist on GitHub. The assumption that example files are "harmless" broke
  # there; the repo-side equivalent of that same assumption is closed here.
  repos = {
    for f in fileset("${local.config_dir}/repositories", "*.yml") :
    trimsuffix(f, ".yml") => yamldecode(
      file("${local.config_dir}/repositories/${f}")
    )
    if !endswith(f, ".example.yml")
  }

  repo_defaults = local.org_config.defaults

  # Role name → GitHub repo permission. The meaning of the permission is defined in
  # config.
  role_permissions = {
    for role, cfg in local.org_config.roles : role => cfg.repo_permission
  }

  # Branch protection is two-layered: defaults provide the base, the repo overrides
  # only the field that differs by writing it. Because merge() is a shallow merge,
  # branches must be merged one by one; otherwise when a repo overrode one branch,
  # all the other fields of that branch would be lost.
  #
  # REMOVAL ESCAPE — a repo can drop a branch below the default by writing `null`:
  #
  #   protected_branches:
  #     develop:            # or explicitly `develop: null`
  #
  # This is needed because keys are merged: without the removal escape a repo could
  # never escape a branch rule inside `defaults`. Control-plane repos have no
  # `develop` branch at all (Decision F) — if the rule stayed, it would be dead
  # protection pointing at a branch that does not exist.
  protected_branches = {
    for repo_name, repo in local.repos :
    repo_name => {
      for branch in distinct(concat(
        keys(local.repo_defaults.protected_branches),
        keys(try(repo.protected_branches, {})),
      )) :
      branch => merge(
        try(local.repo_defaults.protected_branches[branch], {}),
        try(repo.protected_branches[branch], {}),
      )
      # `try(...) == null` is true only when the repo EXPLICITLY writes that branch
      # as null; when it writes nothing, the sentinel is returned and the branch
      # stays protected.
      if try(repo.protected_branches[branch], "inherit") != null
    }
  }
}

module "repositories" {
  source   = "./modules/repository"
  for_each = local.repos

  org_name = var.github_org_name

  name        = each.key
  description = each.value.description
  language    = each.value.language

  visibility     = try(each.value.visibility, local.repo_defaults.visibility)
  archived       = try(each.value.archived, false)
  has_issues     = try(each.value.has_issues, local.repo_defaults.has_issues)
  has_projects   = try(each.value.has_projects, local.repo_defaults.has_projects)
  has_wiki       = try(each.value.has_wiki, local.repo_defaults.has_wiki)
  auto_init      = try(each.value.auto_init, local.repo_defaults.auto_init)
  default_branch = try(each.value.default_branch, local.repo_defaults.default_branch)

  vulnerability_alerts = try(each.value.vulnerability_alerts, local.repo_defaults.vulnerability_alerts, true)
  secret_scanning      = try(each.value.secret_scanning, local.repo_defaults.secret_scanning, true)

  mentors     = try(each.value.mentors, [])
  developers  = try(each.value.developers, [])
  viewers     = try(each.value.viewers, [])
  code_owners = try(each.value.code_owners, {})

  role_permissions    = local.role_permissions
  org_admin_team_slug = local.org_config.org_admin_team

  protected_branches = local.protected_branches[each.key]
  labels             = try(each.value.labels, local.repo_defaults.labels)

  # `files` is a flat map (logical name → mode), so a shallow merge is correct:
  # the repo writes only the key it wants to change, the rest comes from defaults.
  # The per-branch merge concern in protected_branches does not exist here.
  files = merge(
    try(local.repo_defaults.files, {}),
    try(each.value.files, {}),
  )

  # `workflows` is a list — if the repo writes it, it fully overrides, no partial
  # merge. An in-between state like "remove ci but add release" would be
  # meaningless.
  workflows = try(each.value.workflows, local.repo_defaults.workflows, [])
}
