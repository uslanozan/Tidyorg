# =============================================================================
# Kök Çıktılar
# =============================================================================
# Konfigürasyondan üretilen kaynakların özeti. `terraform output` ile okunabilir;
# ileride dashboard bu değerleri HCP API üzerinden çekebilir.
# =============================================================================

output "repositories" {
  description = "URLs and teams of the repositories generated from config"
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
  description = "Number of repositories managed from configuration"
  value       = length(module.repositories)
}

output "org_admin_team" {
  description = "Organization team carrying the head-of-engineering role"
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
  # plan sessiz kalır. Rapor bunu `_warning` alanında ismen söylüyor.
  unenforced_owners = sort([
    for user in local.org_owners : user
    if contains(local.unmanaged_people, user)
  ])

  # Hiç korumalı dalı olmayan repo'lar.
  #
  # Bu liste raporun bir zayıflığını kapatıyor: `repositories` haritasında böyle bir repo
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
    Who can bypass branch protection rules, broken down by repository x branch.

    While `enforce_admins = false`, anyone with admin permission on a repository
    bypasses the pull request requirement, the review count, status checks, force
    push protection and branch deletion protection. This scope was verified live on
    2026-08-17 (see pilot-verification.md 6.5).

    Reading order:
      unprotected_repos → repositories with no protected branch at all. Look here
                          FIRST: asking who can bypass is meaningless there,
                          because there is no protection to bypass.
      repositories      → for repositories that do have protection, who is exempt
                          on which branch.
  EOT

  value = {
    # 2026-08-18'e kadar bu alan "org rolleri hiç zorlanmıyor, hepsi beyan" diyordu.
    # `github_membership.people` devreye girince kapsam daraldı: artık yalnızca
    # break-glass için yönetim dışı bırakılanlar beyan.
    _warning = length(local.unenforced_owners) == 0 ? "Every org role is enforced by Terraform." : join(" ", [
      "The role of this org owner is NOT ENFORCED by Terraform:",
      "${join(", ", local.unenforced_owners)}.",
      "Deliberately left unmanaged as break-glass (people.tf -> unmanaged_people):",
      "binding every owner to Terraform risks an irreversible lockout on a faulty",
      "apply. The price is visibility: if this person's role is changed through the",
      "UI, the plan stays silent. Everyone else is enforced.",
    ])

    organization_wide = {
      org_owner           = local.org_owners
      head_of_engineering = local.head_of_engineering
      note                = "Both groups are admin on EVERY repository; they appear again in the per-repository list."
    }

    # `repositories` altında bu repo'lar `{}` olarak görünür — ve boş harita tek
    # başına yanıltıcıdır: "atlanacak kural yok" ile "sorun yok" aynı biçimde
    # okunuyor. Burada ayrıca listelenmelerinin sebebi bu; sessizlik değil alarm
    # olmalılar.
    unprotected_repos = {
      list = local.unprotected_repos
      note = length(local.unprotected_repos) == 0 ? "Every repository has at least one protected branch." : join(" ", [
        "NO branch is protected in these repositories, so asking who can bypass is",
        "meaningless: everyone can already do everything. This may be expected,",
        "because branch protection does not work on private repositories on the Free",
        "plan; being expected does not justify being invisible. A public repository",
        "on this list is a real gap.",
      ])
    }

    repositories = {
      for repo_name, repo in local.repos : repo_name => {
        for branch, rules in local.protected_branches[repo_name] : branch => {
          enforce_admins = try(rules.enforce_admins, false)

          # enforce_admins true ise kimse muaf değildir; false ise repo'da admin
          # yetkisi taşıyan herkes muaftır.
          exempt_from_all_rules = try(rules.enforce_admins, false) ? [] : sort(distinct(concat(
            try(repo.mentors, []),
            local.head_of_engineering,
            local.org_owners,
          )))

          # Bu roller ayrıca push allowlist'inde de yazılı — muafiyetten bağımsız
          # ikinci bir kapı (bkz. rbac-and-permissions.md Bölüm 3).
          push_allowlist_roles = try(rules.push_allowed_roles, [])
        }
      }
    }
  }
}
