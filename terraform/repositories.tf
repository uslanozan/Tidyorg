# =============================================================================
# Repo'lar — konfigürasyondan üretilir (repo başına ayrı dosya)
# =============================================================================
# Bu dosyada hiçbir repo adı, kişi adı veya kural değeri yazmaz.
# Yeni bir repo eklemek için: config/repositories/<repo-adı>.yml oluştur.
# Dosya adı = repo adı. Benzersizlik doğal olarak garanti edilir.
#
# Bkz. ACCESS-MODEL.md — "Kod katmanı / veri katmanı ayrımı"
# Bkz. ROADMAP.md — Faz 1 (config yapısını böl)
# =============================================================================

locals {
  org_config = yamldecode(file("${path.module}/config/organization.yml"))

  # Her .yml dosyasını oku; dosya adının .yml uzantısını at → repo adı olur.
  # config/repositories/pilot-intern-web.yml → "pilot-intern-web"
  repos = {
    for f in fileset("${path.module}/config/repositories", "*.yml") :
    trimsuffix(f, ".yml") => yamldecode(
      file("${path.module}/config/repositories/${f}")
    )
  }

  repo_defaults = local.org_config.defaults

  # Rol adı → GitHub repo yetkisi. Yetkinin anlamı config'de tanımlıdır.
  role_permissions = {
    for role, cfg in local.org_config.roles : role => cfg.repo_permission
  }

  # Dal koruması iki katmanlıdır: defaults tabanı verir, repo yalnızca farklı
  # olan alanı yazarak ezer. merge() sığ birleştirdiği için dal bazında tek tek
  # birleştirmek gerekir; aksi halde repo bir dalı ezdiğinde o dalın diğer tüm
  # alanları kaybolurdu.
  #
  # KALDIRMA KAÇIŞI — repo, bir dalı `null` yazarak varsayılandan düşürebilir:
  #
  #   protected_branches:
  #     develop:            # ya da açıkça `develop: null`
  #
  # Buna ihtiyaç var çünkü anahtarlar birleştiriliyor: kaldırma kaçışı olmasa bir
  # repo `defaults` içindeki bir dal kuralından asla kurtulamazdı. Kontrol düzlemi
  # repolarında `develop` dalı hiç yok (Karar F) — kural kalsaydı var olmayan bir
  # dala işaret eden ölü bir koruma olurdu.
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
      # `try(...) == null` yalnızca repo o dalı AÇIKÇA null yazdığında doğrudur;
      # hiç yazmadığında sentinel döner ve dal korunmaya devam eder.
      if try(repo.protected_branches[branch], "inherit") != null
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

  # `files` düz bir harita (mantıksal ad → mod), o yüzden sığ merge doğru:
  # repo yalnızca değiştirmek istediği anahtarı yazar, gerisi defaults'tan gelir.
  # protected_branches'teki dal bazında birleştirme derdi burada yok.
  files = merge(
    try(local.repo_defaults.files, {}),
    try(each.value.files, {}),
  )

  # `workflows` bir liste — repo yazarsa tamamen ezer, kısmi birleştirme yok.
  # "ci'yi çıkar ama release'i ekle" gibi bir ara durum anlamsız olurdu.
  workflows = try(each.value.workflows, local.repo_defaults.workflows, [])
}
