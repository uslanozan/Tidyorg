# Test amaçlı pilot repo (Ozan'ın modülüyle de birleşebilir)
resource "github_repository" "pilot_project" {
  name        = "pilot-intern-api"
  description = "Pilot project for testing branch protections"
  visibility  = "public" # FREE PLANDA KORUMA TESTİ İÇİN PUBLIC OLMALI
  auto_init   = true
}

# --- main Branch Koruması ---
resource "github_branch_protection" "main_protection" {
  repository_id = github_repository.pilot_project.node_id
  pattern       = "main"

  # false: mentörler ve head-of-engineering korumalı dala doğrudan push atabilmelidir.
  # true olduğunda admin yetkisindeki mentörler de engellenir ve ACCESS-MODEL.md'de
  # tanımlanan davranış bozulur. Modül tarafında da false.
  enforce_admins = false

  allows_deletions    = false # Dal silinemez
  allows_force_pushes = false # Force push yasak

  # PR ve Onay Kuralları
  required_pull_request_reviews {
    dismiss_stale_reviews           = true # Yeni commit gelince eski onayı düşür
    required_approving_review_count = 2    # Min 2 onay
  }

  # CI Status Checks
  required_status_checks {
    strict   = true
    contexts = ["ci/test"] # Ozan'ın yazacağı CI Actions adıyla eşleşmeli
  }
}

# --- develop Branch Koruması ---
# (Önce repoda develop adında bir dal oluşturmamız gerekiyor)
resource "github_branch" "develop" {
  repository = github_repository.pilot_project.name
  branch     = "develop"
}

resource "github_branch_protection" "develop_protection" {
  repository_id       = github_repository.pilot_project.node_id
  pattern             = github_branch.develop.branch
  enforce_admins      = false # Adminler bypass edebilir
  allows_deletions    = false
  allows_force_pushes = false

  required_pull_request_reviews {
    required_approving_review_count = 1 # Min 1 onay
  }

  required_status_checks {
    strict   = true
    contexts = ["ci/test"]
  }
}