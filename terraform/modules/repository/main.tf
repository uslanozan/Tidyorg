# =============================================================================
# Repository Modülü — Ana tanım
# =============================================================================
# Tek bir repo'nun tüm yaşam döngüsünü kurar:
#   repo → dallar → takımlar → üyelikler → label'lar → CODEOWNERS → dal koruması
#
# Kaynaklar arasındaki sıralamayı Terraform bağımlılık grafiğinden kendi çıkarır;
# burada elle bir sıra tanımlanmaz.
# =============================================================================

locals {
  # Rol adı → branch protection'ın anladığı aktör biçimi.
  # Kullanıcılar "/kullanici", takımlar "org/takim-slug" biçiminde yazılır.
  role_actors = {
    "mentor"              = "${var.org_name}/${github_team.mentors.slug}"
    "developer"           = "${var.org_name}/${github_team.developers.slug}"
    "head-of-engineering" = "${var.org_name}/${var.org_admin_team_slug}"
  }

  # Arşivlenmiş repo'da GitHub yazma işlemlerine izin vermez; koruma, label ve
  # dosya senkronizasyonu bu durumda devre dışı bırakılır.
  active = !var.archived

  codeowners_content = join("\n", concat(
    [
      "# Bu dosya Terraform tarafından üretilmiştir — elle düzenlemeyin.",
      "# Kaynak: config/organization.yml",
      "",
      "# Varsayılan sahiplik · Default ownership",
      "*                       @${var.org_name}/${github_team.mentors.slug}",
    ],
    length(var.code_owners) > 0 ? ["", "# Yola özel sahiplik · Path-specific ownership"] : [],
    [
      for path, owners in var.code_owners :
      format("%-23s %s", path, join(" ", [for o in owners : "@${o}"]))
    ],
    [""],
  ))

  # --- Şablon dağıtımı -----------------------------------------------------

  # Şablon ağacı hedef ağacı birebir yansıtır: templates/CONTRIBUTING.md dosyası
  # repo'da CONTRIBUTING.md olur. Bu yüzden ayrı bir "kaynak → hedef" eşlemesi
  # yok; anahtar hem şablondaki hem repo'daki yoldur.
  #
  # Katalog config'de değil burada: config'de dosya yolu yazmak, şablon ağacı her
  # değiştiğinde config'e dokunmayı gerektirirdi. Config yalnızca "hangi grup,
  # hangi modda" der.
  templates_root = "${path.module}/../../templates"

  file_catalog = {
    "CONTRIBUTING.md"                            = "contributing"
    "SECURITY.md"                                = "security"
    ".editorconfig"                              = "editorconfig"
    ".github/PULL_REQUEST_TEMPLATE.md"           = "pr_template"
    ".github/dependabot.yml"                     = "dependabot"
    ".github/ISSUE_TEMPLATE/bug_report.yml"      = "issue_templates"
    ".github/ISSUE_TEMPLATE/feature_request.yml" = "issue_templates"
    ".github/ISSUE_TEMPLATE/config.yml"          = "issue_templates"
  }

  # Repo yolu → mod. "none" olanlar ve arşiv repo'lar elenir.
  managed_files = local.active ? {
    for repo_path, group in local.file_catalog :
    repo_path => lookup(var.files, group, "none")
    if lookup(var.files, group, "none") != "none"
  } : {}

  seed_paths = toset([for p, mode in local.managed_files : p if mode == "seed"])

  # Workflow'lar daima strict — yönetişim dosyası (ROADMAP.md K1).
  workflow_paths = local.active ? toset([
    for name in var.workflows : ".github/workflows/${name}.yml"
  ]) : toset([])

  strict_paths = setunion(
    toset([for p, mode in local.managed_files : p if mode == "strict"]),
    local.workflow_paths,
  )
}

# --- Repo ------------------------------------------------------------------

resource "github_repository" "this" {
  name        = var.name
  description = var.description
  visibility  = var.visibility
  archived    = var.archived

  has_issues   = var.has_issues
  has_projects = var.has_projects
  has_wiki     = var.has_wiki

  # Default branch'in var olabilmesi için repo'nun ilk commit ile doğması gerekir.
  auto_init = var.auto_init

  # Merge stratejisi docs/branching-strategy.md ile hizalıdır:
  # feature → develop squash, release/hotfix → main merge commit.
  allow_squash_merge     = true
  allow_merge_commit     = true
  allow_rebase_merge     = false
  delete_branch_on_merge = true

  dynamic "template" {
    for_each = var.template_repo == null ? [] : [var.template_repo]
    content {
      owner      = template.value.owner
      repository = template.value.repository
    }
  }

  lifecycle {
    # Config'den bir repo satırının yanlışlıkla silinmesi repo'yu yok etmemeli.
    # Gerçekten silmek gerekirse bu bloğun bilinçli olarak kaldırılması gerekir.
    # Normal kullanımda silme yerine `archived: true` tercih edilir.
    prevent_destroy = true
  }
}

# --- Dallar ----------------------------------------------------------------

# auto_init "main" dalını oluşturur; varsayılan dal farklıysa onu ayrıca açarız.
resource "github_branch" "default" {
  count = var.default_branch == "main" ? 0 : 1

  repository    = github_repository.this.name
  branch        = var.default_branch
  source_branch = "main"
}

resource "github_branch_default" "this" {
  count = var.default_branch == "main" ? 0 : 1

  repository = github_repository.this.name
  branch     = github_branch.default[0].branch
}

# --- Takımlar --------------------------------------------------------------
# Yetki kişiye değil takıma verilir. Kişi projeden ayrıldığında tek üyelik
# silinir ve tüm erişimi sona erer.

resource "github_team" "mentors" {
  name        = "${var.name}-mentors"
  description = "${var.name} mentörleri — repo sorumluluğu"
  privacy     = "closed"
}

resource "github_team" "developers" {
  name        = "${var.name}-devs"
  description = "${var.name} geliştiricileri"
  privacy     = "closed"
}

resource "github_team_repository" "mentors" {
  team_id    = github_team.mentors.id
  repository = github_repository.this.name
  permission = lookup(var.role_permissions, "mentor", "admin")
}

# head-of-engineering rolü organizasyon geneli kapsama sahiptir: her repo'da
# admin yetkisi bulunur.
#
# Bu yetki aynı zamanda teknik bir zorunluluktur. GitHub, bir takımı branch
# protection'ın push izin listesine ancak o takımın repo'ya erişimi varsa kabul
# eder; erişimi yoksa isteği sessizce yok sayar. Bu kaynak olmadan
# push_allowed_roles içindeki "head-of-engineering" hiçbir zaman yerleşmez ve
# her plan'da tekrar uygulanmaya çalışılır (kalıcı drift).
data "github_team" "org_admins" {
  slug = var.org_admin_team_slug
}

resource "github_team_repository" "org_admins" {
  team_id    = data.github_team.org_admins.id
  repository = github_repository.this.name
  permission = lookup(var.role_permissions, "head-of-engineering", "admin")
}

resource "github_team_repository" "developers" {
  team_id    = github_team.developers.id
  repository = github_repository.this.name
  permission = lookup(var.role_permissions, "developer", "push")
}

resource "github_team_membership" "mentors" {
  for_each = toset(var.mentors)

  team_id  = github_team.mentors.id
  username = each.value
  role     = "maintainer"
}

resource "github_team_membership" "developers" {
  for_each = toset(var.developers)

  team_id  = github_team.developers.id
  username = each.value
  role     = "member"
}

# --- Label'lar -------------------------------------------------------------
# Tekil `github_issue_label` yerine çoğul `github_issue_labels` kullanılır.
#
# Sebep: GitHub yeni bir repo açarken kendi varsayılan label'larını da oluşturur
# (bug, documentation, enhancement, good first issue, help wanted, question...).
# Tekil kaynak her label için "oluştur" çağrısı yaptığından bu isimlerle çakışıp
# 422 already_exists hatası verir. Çoğul kaynak ise repo'nun label setinin
# tamamını yönetir: mevcutları günceller, eksikleri ekler, listede olmayanları
# siler. Böylece her repo aynı standart sete sahip olur ve GitHub'ın varsayılan
# label'ları temizlenir.

resource "github_issue_labels" "this" {
  count = local.active ? 1 : 0

  repository = github_repository.this.name

  dynamic "label" {
    for_each = var.labels
    content {
      name        = label.value.name
      color       = label.value.color
      description = label.value.description
    }
  }
}

# Tekil kaynaktan çoğul kaynağa geçişte, ilk apply'da oluşmuş olan label'lar
# state'ten çıkarılır ancak GitHub'dan SİLİNMEZ (destroy = false). Silinselerdi
# çoğul kaynak onları yeniden oluşturmak zorunda kalır, gereksiz bir sil-yarat
# turu yaşanırdı. Çoğul kaynak mevcut label'ları olduğu gibi devralır.
removed {
  from = github_issue_label.this

  lifecycle {
    destroy = false
  }
}

# --- CODEOWNERS ------------------------------------------------------------
# require_code_owner_review ayarı, repo'da bir CODEOWNERS dosyası yoksa hiçbir
# şey zorlamaz. Bu nedenle dosya konfigürasyondan üretilir.

resource "github_repository_file" "codeowners" {
  count = local.active && var.manage_codeowners_file ? 1 : 0

  repository          = github_repository.this.name
  branch              = var.default_branch
  file                = ".github/CODEOWNERS"
  content             = local.codeowners_content
  commit_message      = "chore(github): sync CODEOWNERS from configuration"
  overwrite_on_create = true

  depends_on = [github_branch.default]
}

# --- Şablon dağıtımı -------------------------------------------------------
# İki ayrı kaynak, çünkü `lifecycle` bloğu DİNAMİK OLAMAZ: `ignore_changes`
# değişkenden gelemez, `for_each` ile moda göre seçilemez. strict/seed ayrımını
# tek kaynakta yapmanın yolu yok — bu, Terraform'un bilinen bir kısıtıdır.
#
# `file()` kullanılıyor, `templatefile()` DEĞİL. Sebep: workflow şablonlarında
# GitHub Actions ifadeleri var (`${{ matrix.go-version }}` gibi) ve Terraform
# bunları kendi template sözdizimi sanıp ayrıştırma hatası verir. Şablonlar
# birebir kopyalanır; değişken enjekte edilmez.
#
# SATIR SONU NORMALİZASYONU — `replace(..., "\r\n", "\n")`
# Windows'ta `core.autocrlf=true` ile checkout, şablonları CRLF'e çevirir; Linux
# ve macOS'ta LF kalır. Normalize edilmezse `file()` okuduğu içerik platforma
# göre değişir ve **apply'ı kimin çalıştırdığına bağlı olarak** her seferinde
# tüm strict dosyalar "değişti" görünür.
#
# 2026-08-16'da canlı yaşandı: yalnızca dependabot.yml düzenlenmişken plan
# 18 dosyada değişiklik gösterdi; diff'in iki tarafı da birebir aynıydı.
# Bir kontrol düzlemi, çalıştıran makineye göre farklı sonuç üretmemeli.

# strict — Terraform içeriği sahiplenir. Elle yapılan değişiklik bir sonraki
# apply'da geri alınır. Yönetişim dosyaları ve tüm workflow'lar buradan geçer.
resource "github_repository_file" "strict" {
  for_each = local.strict_paths

  repository          = github_repository.this.name
  branch              = var.default_branch
  file                = each.value
  content             = replace(file("${local.templates_root}/${each.value}"), "\r\n", "\n")
  commit_message      = "chore(github): sync ${each.value} from templates"
  overwrite_on_create = true

  depends_on = [github_branch.default]
}

# seed — yalnızca ilk oluşturmada yazılır. Repo sonrasında içeriği kendine göre
# değiştirebilir; Terraform bir daha dokunmaz. İçerik dosyaları için.
resource "github_repository_file" "seed" {
  for_each = local.seed_paths

  repository          = github_repository.this.name
  branch              = var.default_branch
  file                = each.value
  content             = replace(file("${local.templates_root}/${each.value}"), "\r\n", "\n")
  commit_message      = "chore(github): seed ${each.value} from templates"
  overwrite_on_create = true

  lifecycle {
    # Dosya repo'ya devredildi. İçerik sürüklenmesi drift sayılmaz.
    ignore_changes = [content]
  }

  depends_on = [github_branch.default]
}

# --- Dal koruması ----------------------------------------------------------

resource "github_branch_protection" "this" {
  for_each = local.active ? var.protected_branches : {}

  repository_id = github_repository.this.node_id
  pattern       = each.key

  # false: mentörler (admin) korumalı dala push atabilmelidir.
  enforce_admins = each.value.enforce_admins

  allows_deletions    = each.value.allow_deletions
  allows_force_pushes = each.value.allow_force_push

  require_conversation_resolution = each.value.require_conversation_resolution

  required_pull_request_reviews {
    required_approving_review_count = each.value.required_reviews
    require_code_owner_reviews      = each.value.require_code_owner_review
    dismiss_stale_reviews           = each.value.dismiss_stale_reviews
  }

  dynamic "required_status_checks" {
    for_each = length(each.value.require_status_checks) > 0 ? [1] : []
    content {
      strict   = true
      contexts = each.value.require_status_checks
    }
  }

  dynamic "restrict_pushes" {
    for_each = length(each.value.push_allowed_roles) > 0 ? [1] : []
    content {
      push_allowances = [
        for role in each.value.push_allowed_roles :
        local.role_actors[role] if contains(keys(local.role_actors), role)
      ]
    }
  }

  lifecycle {
    # Tutarlılık kilidi. `ci/test` check'ini üreten şey templates/.github/workflows/ci.yml
    # içindeki toplayıcı job'dır; o workflow repo'ya dağıtılmazsa check HİÇ raporlanmaz
    # ve PR'lar sonsuza kadar bekler.
    #
    # Bu teorik bir uyarı değil: 2026-08-15'te erişim düzeltmesinden sonra normal
    # developer akışı devreye girdiğinde tam olarak bu yaşandı — onaylanmış PR bile
    # merge edilemedi (bkz. docs/pilot-verification.md Bölüm 6.4). Sessizce geçmemesi
    # için plan aşamasında hata veriyor.
    precondition {
      condition = (
        !contains(each.value.require_status_checks, "ci/test")
        || contains(var.workflows, "ci")
      )
      error_message = join(" ", [
        "Repo '${var.name}': '${each.key}' dalı 'ci/test' status check'ini zorunlu kılıyor",
        "ama workflows listesinde 'ci' yok — bu check hiçbir zaman raporlanmayacak ve",
        "PR'lar merge edilemeyecek. Ya config'de workflows listesine 'ci' ekleyin,",
        "ya da require_status_checks içinden 'ci/test' değerini çıkarın.",
      ])
    }
  }

  depends_on = [github_branch.default]
}
