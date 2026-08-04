# 🔧 Emre — Organizasyon & Kurallar

**Rol:** Organizasyonun iskeletini kurar — takımlar, yetkiler, dal korumaları, güvenlik politikaları  
**Alan:** Terraform core, RBAC, branch protection, güvenlik, Slack entegrasyonu  
**Tahmini Süre:** 4 hafta

---

## Hafta 1 — Terraform Temeli & Takım Yapısı

### 🔧 Terraform Kurulumu
- [ ] Terraform CLI kurulumu (bilgisayara yükle)
- [ ] [HCP Terraform (Cloud)](https://app.terraform.io) hesabı aç (ücretsiz)
  - [ ] Organization oluştur: `tidyorg-infra`
  - [ ] Workspace oluştur: `github-management`
- [ ] GitHub Personal Access Token (PAT) oluştur
  - [ ] Scope'lar: `repo`, `admin:org`, `read:org`, `delete_repo`
  - [ ] Token'ı HCP Terraform'da Environment Variable olarak kaydet (`TF_VAR_github_token`, Sensitive işaretle)

### 🔧 Terraform Core Dosyaları
- [ ] `terraform/main.tf` — Provider & backend konfigürasyonu
  - [ ] `integrations/github` provider tanımı (`~> 6.0`)
  - [ ] HCP Terraform Cloud backend tanımı
  - [ ] `provider "github"` bloğu
- [ ] `terraform/variables.tf` — Değişken tanımları
  - [ ] `github_token` (sensitive)
  - [ ] `github_org_name`
  - [ ] Default branch protection ayarları
  - [ ] Default label listesi
- [ ] `terraform/outputs.tf` — Output tanımları
  - [ ] Oluşturulan team ID'leri
  - [ ] Oluşturulan repo URL'leri
- [ ] `terraform/terraform.tfvars.example` — Örnek değişken dosyası (secret yok)
- [ ] İlk `terraform init` çalıştır — provider indirilmeli, hata yok
- [ ] İlk `terraform plan` çalıştır — boş plan, hata yok

### 🔧 Takım Yapısı (RBAC)
- [ ] `terraform/teams.tf` — Takım tanımları
  - [ ] `platform-admins` (privacy: closed)
  - [ ] `core-engineering` (privacy: closed)
  - [ ] `backend-team` (parent: core-engineering)
  - [ ] `frontend-team` (parent: core-engineering)
  - [ ] `devops-team` (parent: core-engineering)
  - [ ] `tech-leads` (privacy: closed)
  - [ ] `interns-2026` (privacy: closed)
  - [ ] `interns-backend` (parent: interns-2026)
  - [ ] `interns-frontend` (parent: interns-2026)
  - [ ] `external-collaborators` (privacy: closed)
- [ ] `terraform/team-memberships.tf` — Test üyelikleri
  - [ ] Kendini uygun takımlara ekle
  - [ ] Ozan'ı uygun takımlara ekle
- [ ] `terraform plan` → planı incele
- [ ] ✅ **Hafta Sonu Sync:** Ozan'ın PR'larını review et

### 📖 Öğrenme Kaynakları
- [Terraform Get Started](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)
- [GitHub Provider Docs](https://registry.terraform.io/providers/integrations/github/latest/docs)
- [HCL Syntax](https://developer.hashicorp.com/terraform/language/syntax)

---

## Hafta 2 — Branch Protection & Org Templates

### 🔧 Branch Protection Kuralları
- [ ] `terraform/branch-protection.tf` — Dal koruma kuralları
  - [ ] `main` branch koruması:
    - [ ] PR zorunlu, min 2 onay
    - [ ] Stale review dismiss: true
    - [ ] CI status checks zorunlu
    - [ ] Force push yasak
    - [ ] Branch silme yasak
    - [ ] Admin enforcement: true
  - [ ] `develop` branch koruması:
    - [ ] PR zorunlu, min 1 onay
    - [ ] CI status checks zorunlu
    - [ ] Force push yasak
    - [ ] Admin enforcement: false
- [ ] `terraform plan` + gözden geçir

### 📝 Organizasyon Şablon Dosyaları
- [ ] `templates/.github/CODEOWNERS` — Dosya sahipliği kuralları
  ```
  *                       @org/core-engineering
  /infrastructure/        @org/devops-team
  /terraform/             @org/devops-team
  /.github/workflows/     @org/devops-team @org/tech-leads
  /docs/                  @org/tech-leads
  ```
- [ ] `templates/CONTRIBUTING.md` — Katkıda bulunma rehberi
  - [ ] Geliştirme ortamı kurulumu
  - [ ] Branch açma kuralları
  - [ ] Commit message formatı
  - [ ] PR açma adımları
  - [ ] Code review süreci
- [ ] `templates/SECURITY.md` — Güvenlik politikası
  - [ ] Güvenlik açığı nasıl bildirilir?
  - [ ] Responsible disclosure
  - [ ] Güvenlik açığı ciddiyet seviyeleri
- [ ] `templates/.editorconfig` — Editör tutarlılık ayarları
  ```ini
  root = true
  [*]
  indent_style = space
  indent_size = 2
  end_of_line = lf
  charset = utf-8
  trim_trailing_whitespace = true
  insert_final_newline = true
  [*.{go}]
  indent_style = tab
  [*.md]
  trim_trailing_whitespace = false
  ```
- [ ] ✅ **Hafta Sonu Sync:** Ozan ile birlikte branch protection test et
  - [ ] main'e direkt push dene → reddedilmeli
  - [ ] develop'a direkt push dene → reddedilmeli
  - [ ] PR aç, onay olmadan merge dene → başarısız olmalı

---

## Hafta 3 — Dokümantasyon (Kurallar & Güvenlik)

### 📝 Branching Strategy Dokümanı
- [ ] `docs/branching-strategy.md`
  - [ ] Modified GitFlow açıklaması ve neden seçildiği
  - [ ] Branch akış diyagramı (Mermaid)
  - [ ] Branch isimlendirme kuralları tablosu (feature/, fix/, hotfix/, vb.)
  - [ ] Günlük iş akışı — terminal komutlarıyla adım adım
  - [ ] Hotfix acil durum senaryosu
  - [ ] Release hazırlık süreci
  - [ ] Merge stratejisi (squash vs merge commit ne zaman?)

### 📝 Commit Convention Dokümanı
- [ ] `docs/commit-convention.md`
  - [ ] Conventional Commits formatı
  - [ ] Type'lar tablosu (feat, fix, chore, refactor, docs, test, ci, perf)
  - [ ] Scope örnekleri
  - [ ] İyi vs kötü commit mesajı örnekleri
  - [ ] SemVer ile ilişkisi (feat → minor, fix → patch, BREAKING → major)

### 📝 Güvenlik Politikası Dokümanı
- [ ] `docs/security-policy.md`
  - [ ] Secret management kuralları (GitHub Secrets, `.env` dosyaları)
  - [ ] Dependabot yapılandırma rehberi
  - [ ] Code scanning (CodeQL) kurulumu
  - [ ] Push protection (secret leak engelleme)
  - [ ] Güvenlik açığı raporlama süreci

### 📝 RBAC Dokümanı
- [ ] `docs/rbac-and-permissions.md`
  - [ ] Takım hiyerarşisi diyagramı (Mermaid)
  - [ ] Yetki matrisi tablosu (her rol neyi yapabilir?)
  - [ ] "Yeni kişi nasıl eklenir?" adım adım rehber
  - [ ] "Yetki nasıl değiştirilir?" rehber
  - [ ] "Kişi ayrıldığında ne yapılmalı?" checklist

- [ ] ✅ **Hafta Sonu Sync:** Ozan'ın dokümanlarını review et, cross-reference'ları kontrol et

---

## Hafta 4 — Slack Entegrasyonu, Actions & Finalizasyon

### 🔧 Slack Entegrasyonu
- [ ] `integrations/slack/notification-setup.md` — Slack bildirim rehberi
  - [ ] GitHub + Slack App kurulumu
  - [ ] Kanal bazlı bildirim routing tablosu
  - [ ] Bildirim filtreleme kuralları
- [ ] `integrations/slack/github-actions-slack.yml` — Slack bildirim Actions
  - [ ] CI failure → `#dev-alerts` bildirim workflow
  - [ ] PR merged → `#dev-pull-requests` bildirim workflow
  - [ ] Release published → `#releases` bildirim workflow
  - [ ] Security alert → `#security-alerts` bildirim workflow

### 🔧 Bu Repo'nun CI/CD'si (GitOps)
- [ ] `.github/workflows/terraform-plan.yml` — PR tetikli
  - [ ] `terraform fmt -check`
  - [ ] `terraform validate`
  - [ ] `terraform plan`
  - [ ] Plan çıktısını PR yorumu olarak yaz
- [ ] `.github/workflows/terraform-apply.yml` — main merge tetikli
  - [ ] `terraform apply -auto-approve`
- [ ] GitHub Secrets'a token'ları ekle (`TF_API_TOKEN`, `TF_VAR_GITHUB_TOKEN`)

### 📝 ADR'lar (Architecture Decision Records)
- [ ] `docs/adr/001-branching-strategy.md` — Neden Modified GitFlow?
- [ ] `docs/adr/002-terraform-for-github.md` — Neden Terraform?

### 🤝 Ortak Çalışma
- [ ] Pilot test — Ozan ile birlikte tüm sistemi test et
  - [ ] Terraform apply → org yapısı doğru mu?
  - [ ] Yetki testi: intern, developer, admin rolleri
  - [ ] Branch protection testi
  - [ ] CI workflow testi (Ozan'ın yazdığı)
- [ ] Sunum — Canlı demo hazırlığı (Terraform apply gösterimi)
- [ ] README.md — Ozan'ın taslağını review et

---

## Her Hafta Tekrarlanan Görevler
- [ ] Ozan'ın PR'larını review et
- [ ] Kendi değişikliklerini PR ile yap (dogfooding)
- [ ] Terraform kodlarını `terraform fmt` ile formatla
- [ ] Hafta sonu sync toplantısı
