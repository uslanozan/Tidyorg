/**
 * TypeScript representations of YAML files under terraform/config/.
 * Schema source: terraform/config/repository.example.yml and organization.yml.
 */

export const LANGUAGES = [
  'go',
  'python',
  'typescript',
  'javascript',
  'php',
  'java',
  'cpp',
  'csharp',
  'c',
  'rust',
  'ruby',
  'kotlin',
  'swift',
  'scala',
  'dart',
  'elixir',
  'shell',
  'hcl',
  'html',
  'css',
  'vue',
  'lua',
  'r',
  'perl',
  'haskell',
  'clojure',
  'groovy',
] as const
export type Language = (typeof LANGUAGES)[number]

export type Visibility = 'public' | 'private'

/** organization.yml → defaults.labels and repo-level labels entry. */
export interface RepoLabel {
  name: string
  color: string
  description?: string
}

export interface ProtectedBranchRule {
  required_reviews?: number
  require_code_owner_review?: boolean
  dismiss_stale_reviews?: boolean
  require_status_checks?: string[]
  require_conversation_resolution?: boolean
  allow_force_push?: boolean
  allow_deletions?: boolean
  push_allowed_roles?: string[]
}

/** Template distribution mode — terraform/config/organization.yml → defaults.files. */
export type TemplateMode = 'strict' | 'seed' | 'none'

/** config/repositories/<repo>.yml — only fields differing from defaults are written. */
export interface RepoConfig {
  description: string
  language: Language
  mentors: string[]
  developers?: string[]
  /** Users with read-only (pull) access. `viewer` role in org config. */
  viewers?: string[]
  visibility?: Visibility
  archived?: boolean
  has_issues?: boolean
  has_projects?: boolean
  has_wiki?: boolean
  auto_init?: boolean
  default_branch?: string
  /**
   * Per-branch protection override. `null` has a special meaning: default protection
   * is completely REMOVED for that branch (terraform/repositories.tf → `!= null` filter).
   */
  protected_branches?: Record<string, ProtectedBranchRule | null>
  code_owners?: Record<string, string[]>
  /** Template file → mode. Shallow merged on top of org defaults. */
  files?: Record<string, TemplateMode>
  workflows?: string[]
  /** Dependabot security alerts. Org default: enabled. */
  vulnerability_alerts?: boolean
  /** Secret scanning + push protection (free for public repos only). */
  secret_scanning?: boolean
  /** Repo-specific label set — if provided, replaces org defaults. */
  labels?: RepoLabel[]
}

/** A repo config file + its identity on GitHub (`sha` is required for writing). */
export interface Project {
  /** Repo name = file name (without extension). */
  name: string
  /** Path from repo root: terraform/config/repositories/<name>.yml */
  path: string
  /** Contents API blob sha — used for conflict protection when writing. */
  sha: string
  config: RepoConfig
  /** Populated if parsing fails; indicates to card that it is corrupted. */
  parseError?: string
}

export interface OrgRoleDefinition {
  scope: 'organization' | 'repository'
  repo_permission: string
  bypass_branch_protection: boolean
}

export interface OrgDefaults {
  visibility?: Visibility
  has_issues?: boolean
  has_projects?: boolean
  has_wiki?: boolean
  auto_init?: boolean
  default_branch?: string
  vulnerability_alerts?: boolean
  secret_scanning?: boolean
  protected_branches?: Record<string, ProtectedBranchRule>
  /** Template file → distribution mode (strict/seed/none). */
  files?: Record<string, TemplateMode>
  workflows?: string[]
  labels?: RepoLabel[]
}

/** organization.yml → profile: cosmetic org identity shown in GitHub UI. */
export interface OrgProfile {
  name?: string
  description?: string
  blog?: string
  location?: string
}

export interface OrgConfig {
  version: number
  /** No longer written in config; org name comes from TF_VAR_github_org_name. Dashboard uses CONFIG_OWNER. */
  organization?: string
  roles: Record<string, OrgRoleDefinition>
  org_admin_team: string
  defaults: OrgDefaults
  profile?: OrgProfile
}

/**
 * config/people.yml — org membership ONLY (carries no permissions). Machine-owned;
 * dashboard adds/removes from `members` list.
 */
export interface PeopleConfig {
  version: number
  members: string[]
}

/**
 * config/privileged.yml — org owners + org-wide roles.
 * Human-owned, CODEOWNERS-protected. 🔒 Dashboard READS, never writes.
 */
export interface PrivilegedConfig {
  version: number
  org_owners: string[]
  /** role name → logins holding that role (currently single role: head-of-engineering). */
  roles: Record<string, string[]>
}

export type ProjectRole = 'mentor' | 'developer' | 'viewer'

/** Row in the "Which project is this user in, with what role?" view. */
export interface Membership {
  project: string
  role: ProjectRole
}
