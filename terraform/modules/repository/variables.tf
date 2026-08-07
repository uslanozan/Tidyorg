# =============================================================================
# Repository Modülü — Girdiler
# =============================================================================
# Bu modülün girdileri config/organization.yml şemasını birebir yansıtır.
# Amaç: dashboard'un ürettiği veri, dönüşüm gerektirmeden modüle akabilsin.
# Bkz. ACCESS-MODEL.md
# =============================================================================

# --- Kimlik ---------------------------------------------------------------

variable "org_name" {
  type        = string
  description = "GitHub organizasyon adı (takım slug'larını kurmak için gerekir)"
}

variable "name" {
  type        = string
  description = "Repo adı"
}

variable "description" {
  type        = string
  description = "Repo açıklaması"
}

variable "language" {
  type        = string
  description = "Ana programlama dili — CI şablonu ve label seçimini etkiler"

  validation {
    condition     = contains(["go", "python", "typescript", "php"], var.language)
    error_message = "language şu değerlerden biri olmalı: go, python, typescript, php."
  }
}

# --- Repo ayarları --------------------------------------------------------

variable "visibility" {
  type        = string
  description = "Repo görünürlüğü"
  default     = "private"

  validation {
    condition     = contains(["private", "public"], var.visibility)
    error_message = "visibility 'private' veya 'public' olmalı."
  }
}

variable "archived" {
  type        = bool
  description = "Repo arşivlenmiş mi? Silme yerine arşivleme tercih edilir."
  default     = false
}

variable "has_issues" {
  type        = bool
  description = "Issues sekmesi açık mı"
  default     = true
}

variable "has_projects" {
  type        = bool
  description = "Projects sekmesi açık mı"
  default     = false
}

variable "has_wiki" {
  type        = bool
  description = "Wiki sekmesi açık mı"
  default     = false
}

variable "auto_init" {
  type        = bool
  description = "Repo ilk commit ile oluşturulsun mu (default branch'in var olabilmesi için gerekir)"
  default     = true
}

variable "default_branch" {
  type        = string
  description = "Varsayılan dal"
  default     = "develop"
}

variable "template_repo" {
  type = object({
    owner      = string
    repository = string
  })
  description = "Repo'nun türetileceği template repo (opsiyonel)"
  default     = null
}

# --- Kişiler ve roller ----------------------------------------------------

variable "mentors" {
  type        = list(string)
  description = <<-EOT
    Repo'nun mentörlerinin GitHub kullanıcı adları.
    Bugün tek eleman beklenir; tekil alanı sonradan listeye çevirmek hem config'i
    hem modülü kıracağı için baştan liste olarak tanımlanmıştır.
  EOT
  default     = []
}

variable "developers" {
  type        = list(string)
  description = "Repo'da çalışan developer'ların GitHub kullanıcı adları (many-to-many)"
  default     = []
}

variable "role_permissions" {
  type        = map(string)
  description = <<-EOT
    Rol adı → GitHub repo yetkisi eşlemesi. Config'in `roles` bölümünden gelir.
    Yetkinin ne anlama geldiği tek yerde tanımlıdır; modül burayı okur.
  EOT
  default = {
    mentor    = "admin"
    developer = "push"
  }
}

variable "org_admin_team_slug" {
  type        = string
  description = "head-of-engineering rolünü taşıyan organizasyon seviyesi takımın slug'ı"
  default     = "platform-admins"
}

# --- Dal koruma -----------------------------------------------------------

variable "protected_branches" {
  type = map(object({
    required_reviews                = optional(number, 1)
    require_code_owner_review       = optional(bool, false)
    dismiss_stale_reviews           = optional(bool, true)
    require_status_checks           = optional(list(string), [])
    require_conversation_resolution = optional(bool, false)
    allow_force_push                = optional(bool, false)
    allow_deletions                 = optional(bool, false)
    push_allowed_roles              = optional(list(string), [])
    enforce_admins                  = optional(bool, false)
  }))
  description = <<-EOT
    Dal adı (pattern) → koruma kuralları.

    `enforce_admins` varsayılan olarak false'tur: true olsaydı admin yetkisindeki
    mentörler de korumalı dala push atamazdı ve ACCESS-MODEL.md'de tanımlanan
    davranış bozulurdu.

    `push_allowed_roles` kişi listesi değil ROL listesi alır; kişi değiştiğinde
    kural metni değişmez.
  EOT
  default     = {}
}

# --- Etiketler ve sahiplik ------------------------------------------------

variable "labels" {
  type = list(object({
    name        = string
    color       = string
    description = optional(string, "")
  }))
  description = "Repo'da oluşturulacak standart label seti"
  default     = []
}

variable "code_owners" {
  type        = map(list(string))
  description = <<-EOT
    Yol → sahip listesi. OPSİYONEL; yalnızca içinde gerçekten ayrışma olan
    repo'larda (monorepo vb.) kullanılır. Boş bırakılırsa CODEOWNERS tüm dosyaları
    mentör takımına yönlendirir.

    DİKKAT: Bu tanım merge YETKİSİNİ kısıtlamaz. GitHub'da write yetkisi daima repo
    geneline verilir. Buradaki tanım yalnızca "şu yol değiştiyse şu kişinin ONAYI
    gerekir" anlamına gelir ve ancak require_code_owner_review true iken zorlayıcıdır.
  EOT
  default     = {}
}

variable "manage_codeowners_file" {
  type        = bool
  description = <<-EOT
    CODEOWNERS dosyası repo içine Terraform tarafından yazılsın mı?
    require_code_owner_review kullanan repo'larda true olmalıdır; CODEOWNERS
    dosyası yoksa o ayar hiçbir şey zorlamaz.
  EOT
  default     = true
}
