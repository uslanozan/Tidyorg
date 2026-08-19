# =============================================================================
# Kök Çıktılar
# =============================================================================
# Konfigürasyondan üretilen kaynakların özeti. `terraform output` ile okunabilir;
# ileride dashboard bu değerleri HCP API üzerinden çekebilir.
# =============================================================================

output "repositories" {
  description = "Config'den üretilen repo'ların adresleri ve takımları"
  value = {
    for name, repo in module.repositories : name => {
      url        = repo.repo_html_url
      clone_url  = repo.repo_url
      ssh_url    = repo.repo_ssh_url
      full_name  = repo.repo_full_name
      branch     = repo.default_branch
      mentors    = repo.mentors_team_slug
      developers = repo.developers_team_slug
    }
  }
}

output "repository_count" {
  description = "Konfigürasyondan yönetilen repo sayısı"
  value       = length(module.repositories)
}

output "org_admin_team" {
  description = "head-of-engineering rolünü taşıyan organizasyon takımı"
  value       = github_team.platform_admins.slug
}

# =============================================================================
# Bypass görünürlüğü
# =============================================================================
# `enforce_admins` kalıcı olarak `false` (ROADMAP Karar E). Muafiyet teknik olarak
# kapatılmadığına göre geriye tek kontrol olarak GÖRÜNÜRLÜK kalıyor: "şu an kim,
# hangi repoda, hangi dalda kuralları atlayabiliyor?"
#
# Bu output o sorunun cevabını üretiyor. 2026-08-15'te bir kişinin her repoda admin
# olduğu ancak `.tf` dosyaları okunarak anlaşılabiliyordu; olayın aylarca fark
# edilmeme sebebi buydu.
# =============================================================================

locals {
  # `org_owners` ve `head_of_engineering` listeleri people.tf'te tanımlı ve artık
  # Terraform tarafından ZORLANIYOR (`github_membership.people`) — 2026-08-18'e
  # kadar yalnızca beyandılar.
  #
  # Tek istisna `local.unmanaged_people`: break-glass gereği yönetim dışında
  # bırakılan kişiler. Onların org rolü hâlâ beyandır ve arayüzden değiştirilirse
  # plan sessiz kalır. Rapor bunu `_uyari` alanında ismen söylüyor.
  unenforced_owners = sort([
    for user in local.org_owners : user
    if contains(local.unmanaged_people, user)
  ])

  # Hiç korumalı dalı olmayan repo'lar.
  #
  # Bu liste raporun bir zayıflığını kapatıyor: `repolar` haritasında böyle bir repo
  # `{}` olarak görünüyordu ve `{}` iki farklı şeyi aynı biçimde söylüyordu —
  # "burada atlanacak kural yok" ile "endişelenecek bir şey yok". İlki bir ALARM,
  # ikincisi sessizlik. 2026-08-18'de `pilot-access-test` eklenince fark edildi.
  #
  # Boş harita alarm olmalı: korumalı dalı olmayan repo'da bypass sorusu anlamsızdır,
  # çünkü zaten herkes her şeyi yapabilir.
  unprotected_repos = sort([
    for repo_name, _ in local.repos : repo_name
    if length(local.protected_branches[repo_name]) == 0
  ])
}

output "branch_protection_bypass" {
  description = <<-EOT
    Korumalı dal kurallarını kim atlayabilir — repo × dal kırılımında.

    `enforce_admins = false` iken repo'da admin yetkisi olan herkes PR zorunluluğunu,
    onay sayısını, status check'i, force push ve dal silme korumasını atlar. Bu
    kapsam 2026-08-17'de canlı doğrulandı (pilot-verification.md 6.5).

    Okuma sırası:
      korumasiz_repolar → hiç korumalı dalı olmayanlar. ÖNCE buraya bakılır:
                          bu repo'larda bypass sorusu anlamsızdır, koruma yoktur.
      repolar           → korumalı dalı olanlarda kim, hangi dalda muaf.
  EOT

  value = {
    # 2026-08-18'e kadar bu alan "org rolleri hiç zorlanmıyor, hepsi beyan" diyordu.
    # `github_membership.people` devreye girince kapsam daraldı: artık yalnızca
    # break-glass için yönetim dışı bırakılanlar beyan.
    _uyari = length(local.unenforced_owners) == 0 ? "Tüm org rolleri Terraform tarafından zorlanıyor." : join(" ", [
      "Şu org owner'ın rolü Terraform tarafından ZORLANMIYOR:",
      "${join(", ", local.unenforced_owners)}.",
      "Break-glass gereği bilerek yönetim dışında (people.tf → unmanaged_people):",
      "tüm owner'ları Terraform'a bağlamak, hatalı bir apply'da geri dönüşü olmayan",
      "kilitlenme riski taşır. Bedeli görünürlük: bu kişinin rolü arayüzden",
      "değiştirilirse plan sessiz kalır. Diğer herkes zorlanıyor.",
    ])

    organizasyon_geneli = {
      org_owner           = local.org_owners
      head_of_engineering = local.head_of_engineering
      not                 = "Bu iki grup HER repo'da admin'dir; repo bazlı listede tekrar görünür."
    }

    # `repolar` altında bu repo'lar `{}` olarak görünür — ve boş harita tek başına
    # yanıltıcıdır: "atlanacak kural yok" ile "sorun yok" aynı biçimde okunuyor.
    # Burada ayrıca listelenmelerinin sebebi bu; sessizlik değil alarm olmalılar.
    korumasiz_repolar = {
      liste = local.unprotected_repos
      not = length(local.unprotected_repos) == 0 ? "Her repo'nun en az bir korumalı dalı var." : join(" ", [
        "Bu repo'larda HİÇBİR dal korunmuyor — yani bypass sorusu anlamsız,",
        "herkes zaten her şeyi yapabilir. Free plan'de private repo'da branch",
        "protection çalışmadığı için bu beklenen bir durum olabilir; beklenen",
        "olması görünmez olmasını gerektirmez. Public bir repo bu listedeyse",
        "gerçek bir açıktır.",
      ])
    }

    repolar = {
      for repo_name, repo in local.repos : repo_name => {
        for branch, rules in local.protected_branches[repo_name] : branch => {
          enforce_admins = try(rules.enforce_admins, false)

          # enforce_admins true ise kimse muaf değildir; false ise repo'da admin
          # yetkisi taşıyan herkes muaftır.
          tum_kurallardan_muaf = try(rules.enforce_admins, false) ? [] : sort(distinct(concat(
            try(repo.mentors, []),
            local.head_of_engineering,
            local.org_owners,
          )))

          # Bu roller ayrıca push allowlist'inde de yazılı — muafiyetten bağımsız
          # ikinci bir kapı (bkz. rbac-and-permissions.md Bölüm 3).
          push_allowlist_rolleri = try(rules.push_allowed_roles, [])
        }
      }
    }
  }
}
