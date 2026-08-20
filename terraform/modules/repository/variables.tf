# =============================================================================
# Repository Modülü — Girdiler
# =============================================================================
# Bu modülün girdileri config/organization.yml şemasını birebir yansıtır.
# Amaç: dashboard'un ürettiği veri, dönüşüm gerektirmeden modüle akabilsin.
# Bkz. ACCESS-MODEL.md
# =============================================================================

# --- Kimlik ---------------------------------------------------------------

variable "org_name" {
  type        = string
  description = "GitHub organization name (required to build team slugs)"
}

variable "name" {
  type        = string
  description = "Repository name"
}

variable "description" {
  type        = string
  description = "Repository description"
}

variable "language" {
  type        = string
  description = "Primary programming language - drives CI template and label selection"

  validation {
    condition     = contains(["go", "python", "typescript", "php"], var.language)
    error_message = "language must be one of: go, python, typescript, php."
  }
}

# --- Repo ayarları --------------------------------------------------------

variable "visibility" {
  type        = string
  description = "Repository visibility"
  default     = "private"

  validation {
    condition     = contains(["private", "public"], var.visibility)
    error_message = "visibility must be 'private' or 'public'."
  }
}

variable "archived" {
  type        = bool
  description = "Is the repository archived? Archiving is preferred over deletion."
  default     = false
}

variable "vulnerability_alerts" {
  type        = bool
  description = <<-EOT
    Dependabot security alerts. GitHub raises an alert when a known vulnerability
    appears in a dependency.

    Works on every plan and every visibility - no GHAS required. That is why the
    default is `true`: turning it off should be a deliberate decision, turning it
    on should not.

    WARNING: cannot be changed on an archived repository; GitHub makes an archived
    repository's settings read-only. Before archiving, leave this setting at its
    current value.
  EOT
  default     = true
}

variable "secret_scanning" {
  type        = bool
  description = <<-EOT
    Secret scanning + push protection. The second one is what actually matters: it
    rejects the push BEFORE a leaked key enters the repository, instead of warning
    afterwards.

    WARNING: free only on PUBLIC repositories. On a private repository it requires
    GitHub Secret Protection (a paid add-on, purchasable on Team and Enterprise).
    The module therefore applies the setting only while `visibility == "public"`;
    on a private repository it is skipped silently even when config says `true` -
    otherwise apply would fail with `422`.

    `advanced_security` is deliberately left unmanaged: implicitly on for public
    repositories, license-gated for private ones. Managing it would be wrong in
    both cases.
  EOT
  default     = true
}

variable "has_issues" {
  type        = bool
  description = "Is the Issues tab enabled"
  default     = true
}

variable "has_projects" {
  type        = bool
  description = "Is the Projects tab enabled"
  default     = false
}

variable "has_wiki" {
  type        = bool
  description = "Is the Wiki tab enabled"
  default     = false
}

variable "auto_init" {
  type        = bool
  description = "Create the repository with an initial commit (required for the default branch to exist)"
  default     = true
}

variable "default_branch" {
  type        = string
  description = "Default branch"
  default     = "develop"
}

variable "template_repo" {
  type = object({
    owner      = string
    repository = string
  })
  description = "Template repository to derive this repository from (optional)"
  default     = null
}

# --- Kişiler ve roller ----------------------------------------------------

variable "mentors" {
  type        = list(string)
  description = <<-EOT
    GitHub usernames of the repository's mentors.
    A single element is expected today; it is declared as a list from the start
    because turning a scalar field into a list later would break both the config
    and the module.
  EOT
  default     = []
}

variable "developers" {
  type        = list(string)
  description = "GitHub usernames of the developers working on the repository (many-to-many)"
  default     = []
}

variable "role_permissions" {
  type        = map(string)
  description = <<-EOT
    Role name -> GitHub repository permission mapping. Comes from the `roles`
    section of the config. What a permission means is defined in exactly one
    place; the module reads it from here.
  EOT
  default = {
    mentor    = "admin"
    developer = "push"
  }
}

variable "org_admin_team_slug" {
  type        = string
  description = "Slug of the organization-level team carrying the head-of-engineering role"
  default     = "platform-admins"
}

# --- Dal koruma -----------------------------------------------------------

variable "protected_branches" {
  type = map(object({
    required_reviews                = optional(number, 1)
    require_code_owner_review       = optional(bool, false)
    dismiss_stale_reviews           = optional(bool, true)
    require_status_checks           = optional(list(string), [])
    require_conversation_resolution = optional(bool, false)
    allow_force_push                = optional(bool, false)
    allow_deletions                 = optional(bool, false)
    push_allowed_roles              = optional(list(string), [])
    enforce_admins                  = optional(bool, false)
  }))
  description = <<-EOT
    Branch name (pattern) -> protection rules.

    `enforce_admins` defaults to false: were it true, mentors holding admin
    permission could not push to a protected branch either, breaking the behaviour
    defined in ACCESS-MODEL.md.

    `push_allowed_roles` takes a list of ROLES, not people; the rule text does not
    change when the people change.
  EOT
  default     = {}
}

# --- Etiketler ve sahiplik ------------------------------------------------

variable "labels" {
  type = list(object({
    name        = string
    color       = string
    description = optional(string, "")
  }))
  description = "Standard label set to create in the repository"
  default     = []
}

variable "code_owners" {
  type        = map(list(string))
  description = <<-EOT
    Path -> owner list. OPTIONAL; only used in repositories with genuine internal
    separation (monorepos and the like). Left empty, CODEOWNERS routes every file
    to the mentors team.

    CAUTION: this definition does not restrict merge PERMISSION. On GitHub, write
    access is always granted repository-wide. What is defined here only means "if
    this path changed, this person's APPROVAL is required", and it is enforcing
    only while require_code_owner_review is true.
  EOT
  default     = {}
}

variable "manage_codeowners_file" {
  type        = bool
  description = <<-EOT
    Should the CODEOWNERS file be written into the repository by Terraform?
    Must be true in repositories that use require_code_owner_review; without a
    CODEOWNERS file that setting enforces nothing.
  EOT
  default     = true
}

# --- Şablon dağıtımı -------------------------------------------------------

variable "files" {
  type        = map(string)
  description = <<-EOT
    Logical file name -> delivery mode.

      strict -> Terraform owns the content; manual edits are reverted on apply
      seed   -> written only on creation, the repository may change it afterwards
      none   -> never written

    Which file each logical name maps to is defined in the module's `file_catalog`
    local. File paths are never written in config, so the config does not have to
    be touched when the template tree changes.
  EOT
  default     = {}

  validation {
    condition     = alltrue([for mode in values(var.files) : contains(["strict", "seed", "none"], mode)])
    error_message = "every value in files must be 'strict', 'seed' or 'none'."
  }
}

variable "workflows" {
  type        = list(string)
  description = <<-EOT
    Names of the workflows to deliver to the repository (without extension).
    Source: templates/.github/workflows/<name>.yml

    Workflows are always written in `strict` mode - they are governance files.

    CAUTION: if `ci` is not in the list, the `ci/test` status check is never
    reported in that repository. If `ci/test` is required in protected_branches,
    the module raises an error via `precondition`.
  EOT
  default     = []
}
