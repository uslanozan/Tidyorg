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
  description = "Platform Administrators — head-of-engineering rolü"
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
        "config/organization.yml → `people.*.roles` yalnızca ORG KAPSAMLI rol taşıyabilir",
        "(bugün: ${join(", ", local.org_scoped_roles)}).",
        "Repo kapsamlı roller config/repositories/*.yml içindeki `mentors` / `developers`",
        "listelerinde yaşar; `people`'a yazılan böyle bir rol hiçbir şey yapmaz ama",
        "dosyayı okuyan kişiyi yanıltır — config sessizce yalan söyler.",
        "Hatalı atamalar: ${join(" · ", local.people_with_repo_scoped_roles)}",
      ])
    }

    precondition {
      condition = length(local.people_without_org_role) == 0
      error_message = join(" ", [
        "config/organization.yml → `people` altındaki her kişide `org_role` YAZILI olmalı",
        "(`admin` veya `member`). Varsayılana düşürmek yerine hata veriliyor: org rolü,",
        "kişinin branch protection dahil her kuralı atlayıp atlayamayacağını belirler —",
        "unutulmuş olması ile bilinçli `member` olması aynı şey değildir.",
        "Eksik olanlar: ${join(", ", local.people_without_org_role)}",
      ])
    }
  }
}
