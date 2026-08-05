variable "github_token" {
  type        = string
  description = "GitHub Personal Access Token"
  sensitive   = true
}

variable "github_org_name" {
  type        = string
  description = "GitHub Organization Name"
  default     = "your-org" 
}