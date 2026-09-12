# =============================================================================
# Backend / State — DEĞİŞTİRİLEBİLİR DOSYA
# =============================================================================
# Motorun state'i nerede tutulduğunu belirleyen TEK yer.
#
# Varsayılan: LOCAL state — hiçbir dış servis gerektirmez, kutudan çıkar çıkmaz
# çalışır. Docker'da entrypoint her durumda state'i /state (mount volume) altında
# LOCAL backend'e zorlar; bu yüzden dosya image'a alınmaz (.dockerignore) ve
# container'ı etkilemez.
#
# UZAK backend (ekipler için önerilir) kullanmak için aşağıdaki bloğu kendi
# backend'inle değiştir ya da `terraform init -backend-config=...` ver. Örnekler:
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
# `terraform {}` blokları dosyalar arası birleşir; required_providers/version
# main.tf'te. `backend`/`cloud` yalnızca BİR kez görünebilir.
# =============================================================================

terraform {
  backend "local" {}
}
