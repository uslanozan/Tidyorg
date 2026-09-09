/**
 * terraform/config/ altındaki YAML dosyalarının TypeScript karşılıkları.
 * Şema kaynağı: terraform/config/repository.example.yml ve organization.yml.
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

/** organization.yml → defaults.labels ve repo bazlı labels girdisi. */
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

/** Şablon dağıtım modu — terraform/config/organization.yml → defaults.files. */
export type TemplateMode = 'strict' | 'seed' | 'none'

/** config/repositories/<repo>.yml — yalnızca varsayılandan farklı alanlar yazılır. */
export interface RepoConfig {
  description: string
  language: Language
  mentors: string[]
  developers?: string[]
  /** Salt-okunur (pull) erişimi olan kişiler. Org config'inde `viewer` rolü. */
  viewers?: string[]
  visibility?: Visibility
  archived?: boolean
  has_issues?: boolean
  has_projects?: boolean
  has_wiki?: boolean
  auto_init?: boolean
  default_branch?: string
  /**
   * Dal bazında koruma ezmesi. `null` özel anlam taşır: o dal için varsayılan
   * koruma tamamen KALDIRILIR (terraform/repositories.tf → `!= null` filtresi).
   */
  protected_branches?: Record<string, ProtectedBranchRule | null>
  code_owners?: Record<string, string[]>
  /** Şablon dosyası → mod. Org varsayılanının üstüne sığ merge edilir. */
  files?: Record<string, TemplateMode>
  workflows?: string[]
  /** Dependabot güvenlik uyarıları. Org varsayılanı: açık. */
  vulnerability_alerts?: boolean
  /** Secret scanning + push protection (yalnızca public repo'da ücretsiz). */
  secret_scanning?: boolean
  /** Repo'ya özel etiket seti — verilirse org varsayılanının yerine geçer. */
  labels?: RepoLabel[]
}

/** Bir repo config dosyası + GitHub'daki kimliği (yazma için `sha` şart). */
export interface Project {
  /** Repo adı = dosya adı (uzantısız). */
  name: string
  /** Repo kökünden yol: terraform/config/repositories/<name>.yml */
  path: string
  /** Contents API blob sha'sı — yazarken çakışma korumasında kullanılır. */
  sha: string
  config: RepoConfig
  /** Ayrıştırma başarısızsa dolu olur; kart bozuk olduğunu gösterir. */
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
  workflows?: string[]
  labels?: RepoLabel[]
}

export interface OrgConfig {
  version: number
  organization: string
  roles: Record<string, OrgRoleDefinition>
  org_admin_team: string
  defaults: OrgDefaults
}

/**
 * config/people.yml — SADECE org üyeliği (yetki taşımaz). Makine-sahipli;
 * dashboard `members` listesine ekler/çıkarır.
 */
export interface PeopleConfig {
  version: number
  members: string[]
}

/**
 * config/privileged.yml — org owner'lar + org kapsamlı roller.
 * İnsan-sahipli, CODEOWNERS korumalı. 🔒 Dashboard OKUR, asla yazmaz.
 */
export interface PrivilegedConfig {
  version: number
  org_owners: string[]
  /** rol adı → o rolü taşıyan login'ler (bugün tek rol: head-of-engineering). */
  roles: Record<string, string[]>
}

export type ProjectRole = 'mentor' | 'developer' | 'viewer'

/** "Bu kişi hangi projede, hangi rolde?" görünümünün satırı. */
export interface Membership {
  project: string
  role: ProjectRole
}
