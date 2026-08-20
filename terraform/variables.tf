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