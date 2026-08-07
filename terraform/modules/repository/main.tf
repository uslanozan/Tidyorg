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

resource "github_issue_label" "this" {
  for_each = local.active ? { for l in var.labels : l.name => l } : {}

  repository  = github_repository.this.name
  name        = each.value.name
  color       = each.value.color
  description = each.value.description
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

  depends_on = [github_branch.default]
}
