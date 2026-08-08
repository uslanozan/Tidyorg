# Modülün hangi provider'ı kullandığı açıkça beyan edilmelidir. Aksi halde
# Terraform provider adından tahmin yürütüp eski `hashicorp/github` adresine
# gider ve aynı provider iki farklı kaynaktan indirilir.
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
