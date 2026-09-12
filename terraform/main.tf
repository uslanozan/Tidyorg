terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# NOTE: Backend/state is in a separate file (backend.tf) — deliberate.
# The live system uses the HCP cloud backend; the Docker image REPLACES this file with a
# local backend at entrypoint (state on a mount volume). This way the same engine can be
# deployed both to HCP and into an isolated container. See backend.tf and docker/entrypoint.

provider "github" {
  owner = var.github_org_name

  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = var.github_app_pem_file
  }
}