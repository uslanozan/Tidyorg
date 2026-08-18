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
  # ⚠️ `people` bölümü Terraform tarafından HENÜZ TÜKETİLMİYOR. Aşağıdaki iki liste
  # bu yüzden "config'de beyan edilen" durumdur, GitHub'dan doğrulanmış değil.
  # Faz 6'nın `github_membership` işi bitince gerçeğe bağlanacak — o güne kadar
  # rapor bunu açıkça söylüyor (bkz. output içindeki `_uyari` alanı).
  declared_org_owners = sort([
    for user, cfg in try(local.org_config.people, {}) :
    user if try(cfg.org_role, "member") == "admin"
  ])

  declared_head_of_engineering = sort([
    for user, cfg in try(local.org_config.people, {}) :
    user if contains(try(cfg.roles, []), "head-of-engineering")
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
    _uyari = join(" ", [
      "org_owner listesi config'deki `people` bölümünden okunuyor ve o bölüm henüz",
      "Terraform tarafından zorlanmıyor — yani beyan, doğrulanmış gerçek değil.",
      "Faz 6 tamamlanınca bu uyarı kalkacak.",
    ])

    organizasyon_geneli = {
      org_owner           = local.declared_org_owners
      head_of_engineering = local.declared_head_of_engineering
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
            local.declared_head_of_engineering,
            local.declared_org_owners,
          )))

          # Bu roller ayrıca push allowlist'inde de yazılı — muafiyetten bağımsız
          # ikinci bir kapı (bkz. rbac-and-permissions.md Bölüm 3).
          push_allowlist_rolleri = try(rules.push_allowed_roles, [])
        }
      }
    }
  }
}
