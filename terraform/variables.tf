variable "github_org_name" {
  type        = string
  description = "GitHub organization name to manage (required)."

  # Deliberately NO DEFAULT: the value is given explicitly via TF_VAR_github_org_name
  # (HCP/environment variable or terraform.tfvars). This way plan/apply does not run
  # without config provided (fail-fast) and a fork can NEVER target someone else's org.
}

variable "github_app_id" {
  type        = string
  description = "GitHub App ID (tidyorg-infra-bot)"
}

variable "github_app_installation_id" {
  type        = string
  description = "GitHub App Installation ID (organization installation)"
}

variable "github_app_pem_file" {
  type        = string
  description = "GitHub App private key (PEM contents, newlines escaped as \n)"
  sensitive   = true
}

# Organization billing email. The provider cannot READ this field (import returns
# it empty) but CAN write it, so an empty value applied would silently overwrite
# the org's real billing email. Therefore it is supplied out-of-band (HCP workspace
# variable TF_VAR_billing_email), never a personal address committed to the repo.
# Empty (the default) means "leave it unmanaged" — see org-settings.tf.
variable "billing_email" {
  type        = string
  description = "Organization billing email. Set via TF_VAR_billing_email (HCP). Empty = leave unmanaged."
  default     = ""
}

# Where the config/ directory lives. Empty means "next to the Terraform root"
# (${path.module}/config), which is the in-repo layout. A container mounts the
# user's config elsewhere (e.g. /config) and sets TF_VAR_config_path to point at it.
#
# The default cannot be "${path.module}/config" directly: Terraform forbids
# references in variable defaults. local.config_dir (repositories.tf) resolves it.
variable "config_path" {
  type        = string
  description = "Absolute or relative path to the config directory. Empty means the in-repo default (config next to the Terraform root)."
  default     = ""
}