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
      condition = length(local.people_with_repo_scoped_roles) == 0
      error_message = join(" ", [
        "config/people.yml -> `roles` may only carry ORGANIZATION-SCOPED roles",
        "(today: ${join(", ", local.org_scoped_roles)}).",
        "Repository-scoped roles live in the `mentors` / `developers` lists inside",
        "config/repositories/*.yml; such a role written into `people` does nothing,",
        "but it misleads whoever reads the file - the config lies silently.",
        "Invalid assignments: ${join(" · ", local.people_with_repo_scoped_roles)}",
      ])
    }

    precondition {
      condition = length(local.people_without_org_role) == 0
      error_message = join(" ", [
        "config/people.yml -> `org_role` must be WRITTEN OUT for every person (`admin` or `member`).",
        "An error is raised instead of falling back to a default: the org role decides",
        "whether a person can bypass every rule, branch protection included - having",
        "been forgotten is not the same thing as being deliberately `member`.",
        "Missing for: ${join(", ", local.people_without_org_role)}",
      ])
    }

    precondition {
      condition = length(local.people_with_invalid_org_role) == 0
      error_message = join(" ", [
        "config/people.yml -> `org_role` accepts only these values:",
        "${join(", ", local.valid_org_roles)}.",
        "⚠️ The GitHub UI shows this role as \"Owner\" but the API expects `admin` -",
        "writing `org_role: owner` is a natural mistake, and without this validation it",
        "would pass plan and blow up during APPLY.",
        "Invalid values: ${join(" · ", local.people_with_invalid_org_role)}",
      ])
    }

    precondition {
      condition = length(local.repo_people_missing_from_people) == 0
      error_message = join(" ", [
        "Everyone named in config/repositories/*.yml MUST ALSO BE DEFINED in",
        "config/people.yml. Otherwise a person enters the org silently: the module",
        "creates a team membership, GitHub sends an automatic invitation, yet they",
        "never appear on the central list. The price is paid at offboarding - removing",
        "them means finding EVERY repository file that names them, and a single missed",
        "entry leaves them in the organization. Add to the organization first, then",
        "assign to a repository.",
        "Missing from people.yml: ${join(", ", local.repo_people_missing_from_people)}",
      ])
    }
  }
}
