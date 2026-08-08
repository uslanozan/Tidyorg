# =============================================================================
# Organizasyon Seviyesi Takım Üyelikleri
# =============================================================================
# Yalnızca `platform-admins` üyelikleri burada tutulur — head-of-engineering rolünün
# teknik karşılığı bu takımdır (bkz. ACCESS-MODEL.md, Karar 12).
#
# Repo bazlı üyelikler (mentör ve developer) buraya yazılmaz; onlar
# terraform/config/ altındaki konfigürasyondan üretilir.
# =============================================================================

resource "github_team_membership" "emre_admin" {
  team_id  = github_team.platform_admins.id
  username = "paitblack"
  role     = "maintainer"
}

# Config'de her ikisi de head-of-engineering rolünde; takım üyeliği de bunu yansıtmalı.
resource "github_team_membership" "ozan_admin" {
  team_id  = github_team.platform_admins.id
  username = "uslanozan"
  role     = "maintainer"
}
