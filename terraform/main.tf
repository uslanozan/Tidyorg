terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# NOT: Backend/state ayrı dosyada (backend.tf) — bilinçli.
# Canlı sistem HCP cloud backend'i kullanır; Docker image'ı entrypoint'te bu dosyayı
# lokal backend'le DEĞİŞTİRİR (state mount volume'de). Böylece aynı motor hem HCP'ye
# hem izole bir konteynere kurulabilir. Bkz. backend.tf ve docker/entrypoint.

provider "github" {
  owner = var.github_org_name

  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = var.github_app_pem_file
  }
}