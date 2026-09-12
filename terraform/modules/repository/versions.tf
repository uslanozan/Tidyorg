# Which provider the module uses must be declared explicitly. Otherwise Terraform
# guesses from the provider name and goes to the old `hashicorp/github` address,
# and the same provider ends up downloaded from two different sources.
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
