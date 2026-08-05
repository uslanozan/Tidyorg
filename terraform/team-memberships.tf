# Kendi üyeliğin - Platform Admin ve Backend Team
resource "github_team_membership" "emre_admin" {
  team_id  = github_team.platform_admins.id
  username = "paitblack"
  role     = "maintainer"
}

resource "github_team_membership" "emre_backend" {
  team_id  = github_team.backend_team.id
  username = "paitblack"
  role     = "member"
}

# Ozan'ın üyeliği - Tech Leads ve Backend Team
resource "github_team_membership" "ozan_tech_lead" {
  team_id  = github_team.tech_leads.id
  username = "uslanozan"
  role     = "maintainer"
}

resource "github_team_membership" "ozan_backend" {
  team_id  = github_team.backend_team.id
  username = "uslanozan"
  role     = "member"
}