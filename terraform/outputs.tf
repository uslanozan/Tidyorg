# =============================================================================
# Kök Çıktılar
# =============================================================================
# Konfigürasyondan üretilen kaynakların özeti. `terraform output` ile okunabilir;
# ileride dashboard bu değerleri HCP API üzerinden çekebilir.
# =============================================================================

output "repositories" {
  description = "Config'den üretilen repo'ların adresleri ve takımları"
  value = {
    for name, repo in module.repositories : name => {
      url        = repo.repo_html_url
      clone_url  = repo.repo_url
      ssh_url    = repo.repo_ssh_url
      full_name  = repo.repo_full_name
      branch     = repo.default_branch
      mentors    = repo.mentors_team_slug
      developers = repo.developers_team_slug
    }
  }
}

output "repository_count" {
  description = "Konfigürasyondan yönetilen repo sayısı"
  value       = length(module.repositories)
}

output "org_admin_team" {
  description = "head-of-engineering rolünü taşıyan organizasyon takımı"
  value       = github_team.platform_admins.slug
}
