# --- Ana Takımlar (Root Teams) ---

resource "github_team" "platform_admins" {
  name        = "platform-admins"
  description = "Platform Administrators (Org-wide settings)"
  privacy     = "closed"
}

resource "github_team" "core_engineering" {
  name        = "core-engineering"
  description = "Core Engineering Team"
  privacy     = "closed"
}

resource "github_team" "tech_leads" {
  name        = "tech-leads"
  description = "Technical Leads and Review Authority"
  privacy     = "closed"
}

resource "github_team" "interns_2026" {
  name        = "interns-2026"
  description = "2026 Interns Batch"
  privacy     = "closed"
}

resource "github_team" "external_collaborators" {
  name        = "external-collaborators"
  description = "External Collaborators and Contractors"
  privacy     = "closed"
}

# --- Alt Takımlar (Core Engineering Altında) ---

resource "github_team" "backend_team" {
  name           = "backend-team"
  description    = "Backend Development Team"
  privacy        = "closed"
  parent_team_id = github_team.core_engineering.id
}

resource "github_team" "frontend_team" {
  name           = "frontend-team"
  description    = "Frontend Development Team"
  privacy        = "closed"
  parent_team_id = github_team.core_engineering.id
}

resource "github_team" "devops_team" {
  name           = "devops-team"
  description    = "DevOps and Infrastructure Team"
  privacy        = "closed"
  parent_team_id = github_team.core_engineering.id
}

# --- Alt Takımlar (Interns 2026 Altında) ---

resource "github_team" "interns_backend" {
  name           = "interns-backend"
  description    = "Backend Interns"
  privacy        = "closed"
  parent_team_id = github_team.interns_2026.id
}

resource "github_team" "interns_frontend" {
  name           = "interns-frontend"
  description    = "Frontend Interns"
  privacy        = "closed"
  parent_team_id = github_team.interns_2026.id
}