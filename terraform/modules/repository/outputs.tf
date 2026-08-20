# =============================================================================
# Repository Modülü — Çıktılar
# =============================================================================

output "repo_full_name" {
  description = "Full name in org/repo form"
  value       = github_repository.this.full_name
}

output "repo_html_url" {
  description = "Repository URL opened in a browser"
  value       = github_repository.this.html_url
}

output "repo_url" {
  description = "HTTPS clone URL"
  value       = github_repository.this.http_clone_url
}

output "repo_ssh_url" {
  description = "SSH clone URL"
  value       = github_repository.this.ssh_clone_url
}

output "repo_node_id" {
  description = "GraphQL node ID - used in branch protection and ruleset definitions"
  value       = github_repository.this.node_id
}

output "default_branch" {
  description = "Default branch of the repository"
  value       = var.default_branch
}

output "mentors_team_slug" {
  description = "Slug of the mentors team - used in CODEOWNERS and push permissions"
  value       = github_team.mentors.slug
}

output "developers_team_slug" {
  description = "Slug of the developers team"
  value       = github_team.developers.slug
}

output "team_ids" {
  description = "IDs of the teams that were created"
  value = {
    mentors    = github_team.mentors.id
    developers = github_team.developers.id
  }
}
