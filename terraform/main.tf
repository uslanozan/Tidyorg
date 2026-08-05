terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  cloud {
    organization = "tidyorg-infra"
    workspaces {
      name = "github-management"
    }
  }
}

provider "github" {
  owner = var.github_org_name
  token = var.github_token
}