# =============================================================================
# Organizasyon Seviyesi Takım Üyelikleri
# =============================================================================
# Yalnızca `platform-admins` üyelikleri burada tutulur — head-of-engineering rolünün
# teknik karşılığı bu takımdır (bkz. ACCESS-MODEL.md, Karar 12).
#
# Repo bazlı üyelikler (mentör ve developer) buraya yazılmaz; onlar
# terraform/config/ altındaki konfigürasyondan üretilir.
# =============================================================================

# 2026-08-15 — `paitblack` (Emre) bu takımdan ÇIKARILDI. Projeden ayrıldı ve artık
# yalnızca `developer` rolünde: repo config'lerindeki `developers` listelerinden gelen
# `<repo>-devs` takımı (push) tek erişimi.
#
# Neden önemliydi: bu takım head-of-engineering rolünün taşıyıcısı (bkz. teams.tf).
# Üyelik durduğu sürece kişi HER repo'da admin oluyordu; `enforce_admins = false`
# olduğu için de korumalı dallara doğrudan push atıp PR onay kuralını atlayabiliyordu.
# Yani "direct push yasağı" ona hiç uygulanmıyordu — kural değil, rol atamasıydı sorun.
#
# Org seviyesindeki üyelik ayrıca org-membership.tf içinde `member`a sabitlendi;
# org owner kalsaydı bu takımdan çıkmak tek başına yetmezdi.

# Config'de head-of-engineering rolünde; takım üyeliği de bunu yansıtmalı.
resource "github_team_membership" "ozan_admin" {
  team_id  = github_team.platform_admins.id
  username = "uslanozan"
  role     = "maintainer"
}
