# =============================================================================
# Repo'lar — konfigürasyondan üretilir
# =============================================================================
# Bu dosyada hiçbir repo adı, kişi adı veya kural değeri yazmaz. Hepsi
# config/organization.yml içinden gelir. Yeni bir repo eklemek için buraya
# dokunulmaz; config'e bir satır eklenir.
#
# Bkz. ACCESS-MODEL.md — "Kod katmanı / veri katmanı ayrımı"
# =============================================================================

# Config, Terraform'un çalışma dizini içinde durmalıdır. HCP Terraform'da CLI ile
# başlatılan run'larda yalnızca çalışma dizini paketlenip yüklenir; üst dizindeki
# bir dosya uzak tarafta bulunamaz. Config ileride ayrı bir repo'ya taşınırsa,
# CI bu dosyayı apply'dan önce buraya yerleştirmelidir.
variable "config_file" {
  type        = string
  description = "Organizasyon konfigürasyon dosyasının yolu"
  default     = "config/organization.yml"
}

locals {
  org_config = yamldecode(file("${path.module}/${var.config_file}"))

  repo_defaults = local.org_config.defaults
  repos         = local.org_config.repositories

  # Rol adı → GitHub repo yetkisi. Yetkinin anlamı config'de tanımlıdır.
  role_permissions = {
    for role, cfg in local.org_config.roles : role => cfg.repo_permission
  }

  # Dal koruması iki katmanlıdır: defaults tabanı verir, repo yalnızca farklı
  # olan alanı yazarak ezer. merge() sığ birleştirdiği için dal bazında tek tek
  # birleştirmek gerekir; aksi halde repo bir dalı ezdiğinde o dalın diğer tüm
  # alanları kaybolurdu.
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
    }
  }
}

module "repositories" {
  source   = "./modules/repository"
  for_each = local.repos

  org_name = local.org_config.organization

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

  mentors     = try(each.value.mentors, [])
  developers  = try(each.value.developers, [])
  code_owners = try(each.value.code_owners, {})

  role_permissions    = local.role_permissions
  org_admin_team_slug = local.org_config.org_admin_team

  protected_branches = local.protected_branches[each.key]
  labels             = try(each.value.labels, local.repo_defaults.labels)
}
