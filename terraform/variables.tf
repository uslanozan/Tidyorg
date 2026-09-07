variable "github_org_name" {
  type        = string
  description = "GitHub Organization Name"
  default     = "your-org"
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