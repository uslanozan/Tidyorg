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
}
