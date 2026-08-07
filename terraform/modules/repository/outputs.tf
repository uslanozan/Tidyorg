# =============================================================================
# Repository Modülü — Çıktılar
# =============================================================================

output "repo_full_name" {
  description = "org/repo biçiminde tam ad"
  value       = github_repository.this.full_name
}

output "repo_html_url" {
  description = "Tarayıcıda açılan repo adresi"
  value       = github_repository.this.html_url
}

output "repo_url" {
  description = "HTTPS klonlama adresi"
  value       = github_repository.this.http_clone_url
}

output "repo_ssh_url" {
  description = "SSH klonlama adresi"
  value       = github_repository.this.ssh_clone_url
}

output "repo_node_id" {
  description = "GraphQL node ID — branch protection ve ruleset tanımlarında kullanılır"
  value       = github_repository.this.node_id
}

output "default_branch" {
  description = "Repo'nun varsayılan dalı"
  value       = var.default_branch
}

output "mentors_team_slug" {
  description = "Mentör takımının slug'ı — CODEOWNERS ve push izinlerinde kullanılır"
  value       = github_team.mentors.slug
}

output "developers_team_slug" {
  description = "Developer takımının slug'ı"
  value       = github_team.developers.slug
}

output "team_ids" {
  description = "Oluşturulan takımların ID'leri"
  value = {
    mentors    = github_team.mentors.id
    developers = github_team.developers.id
  }
}
