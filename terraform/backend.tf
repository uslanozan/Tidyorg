# =============================================================================
# Backend / State — REPLACEABLE FILE
# =============================================================================
# The SINGLE place that determines where the engine's state is kept.
#
# Default: LOCAL state — requires no external service, works out of the box.
# In Docker the entrypoint always forces state to a LOCAL backend under /state
# (mount volume); that is why this file is excluded from the image (.dockerignore)
# and does not affect the container.
#
# To use a REMOTE backend (recommended for teams), replace the block below with
# your own backend or pass `terraform init -backend-config=...`. Examples:
#
#   # Terraform Cloud / HCP
#   cloud {
#     organization = "your-tf-org"
#     workspaces { name = "github-management" }
#   }
#
#   # AWS S3
#   backend "s3" {
#     bucket = "your-state-bucket"
#     key    = "tidyorg/terraform.tfstate"
#     region = "eu-west-1"
#   }
#
# `terraform {}` blocks are merged across files; required_providers/version are in
# main.tf. `backend`/`cloud` may appear only ONCE.
# =============================================================================

terraform {
  backend "local" {}
}
