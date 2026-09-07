# =============================================================================
# Organizasyon Seviyesi Takımlar
# =============================================================================
# Rol tabanlı modelde yetki, repo başına üretilen `<repo>-mentors` ve `<repo>-devs`
# takımlarından gelir (bkz. terraform/modules/repository). Organizasyon seviyesinde
# yalnızca tek bir takım gereklidir.
#
# Disiplin takımları (backend/frontend/devops), tech-leads, interns-* ve
# external-collaborators kaldırıldı — bkz. ACCESS-MODEL.md, Karar 12.
#
# İleride disiplin takımları geri istenirse ETİKET olarak eklenebilir, ancak repo
# yetkisi VERİLMEDEN. GitHub bir kişiye birden fazla takım üzerinden erişim
# verildiğinde en yüksek yetkiyi uygular; yetki verilirse en az yetki ilkesi
# sessizce delinir.
# =============================================================================

# head-of-engineering rolünün teknik karşılığı.
#
# TAŞIYICI KAYNAK — silinemez. Modül bu takımı `data "github_team"` ile arıyor ve
# her repo'ya admin erişimi veriyor (`github_team_repository.org_admins`). Ayrıca
# branch protection'daki `push_allowed_roles: [head-of-engineering]` bu takıma
# çözümleniyor. Silinirse apply hata verir ve mentörlerin push izni de çöker.
resource "github_team" "platform_admins" {
  name        = "platform-admins"
  description = "Platform Administrators - carries the head-of-engineering role"
  privacy     = "closed"

  # --- `people` bölümünün doğrulaması ---------------------------------------
  # Kurallar people.tf'e ait ama precondition burada duruyor, çünkü bu kaynak
  # TEKİL ve her zaman var: `github_membership.people` bir `for_each` ve config
  # boşsa hiç örneği olmaz — o zaman doğrulama da hiç çalışmazdı. Tekil bir
  # kaynağa bağlamak, kuralın her plan'da işlemesini garanti ediyor.
  #
  # Ayrıca anlamlı: bu takım head-of-engineering rolünün taşıyıcısı, yani org
  # kapsamlı rollerin doğru yere yazıldığını denetlemek tam olarak onun işi.
  lifecycle {
    precondition { #! plan aşamasında çalışıp hatalı config'i durduruyor.
      condition = length(local.privileged_invalid_roles) == 0
      error_message = join(" ", [
        "config/privileged.yml -> `roles` may only carry ORGANIZATION-SCOPED roles",
        "(today: ${join(", ", local.org_scoped_roles)}).",
        "Repository-scoped roles (mentor / developer) live in the `mentors` /",
        "`developers` lists inside config/repositories/*.yml; such a role written into",
        "privileged.yml does nothing but misleads whoever reads the file.",
        "Invalid roles: ${join(" · ", local.privileged_invalid_roles)}",
      ])
    }

    precondition {
      condition = length(local.privileged_not_members) == 0
      error_message = join(" ", [
        "Everyone named in config/privileged.yml (as an org owner or a role carrier)",
        "MUST ALSO be listed in config/people.yml. Privilege cannot precede membership:",
        "a person joins the organization first, then gets elevated. A privileged entry",
        "for someone who is not a member is silently void.",
        "Not members: ${join(", ", local.privileged_not_members)}",
      ])
    }

    precondition {
      condition = length(local.repo_people_missing_from_people) == 0
      error_message = join(" ", [
        "Everyone named in config/repositories/*.yml MUST ALSO be listed in",
        "config/people.yml (`members`). Otherwise a person enters the org silently: the",
        "module creates a team membership, GitHub sends an automatic invitation, yet",
        "they never appear on the central list. The price is paid at offboarding -",
        "removing them means finding EVERY repository file that names them, and a single",
        "missed entry leaves them in the organization. Add to the organization first,",
        "then assign to a repository.",
        "Missing from people.yml: ${join(", ", local.repo_people_missing_from_people)}",
      ])
    }
  }
}
