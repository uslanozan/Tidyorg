# 📦 Ozan — Repository & Workflow

**Rol:** Geliştiricilerin günlük kullanacağı her şeyi kurar — şablonlar, CI/CD, iş akışı rehberleri  
**Alan:** Repo modülü, issue/PR templates, CI/CD workflows, DX dokümantasyonu, Linear/ClickUp  
**Tahmini Süre:** 4 hafta

---

## Hafta 1 — Proje Altyapısı & GitHub Templates

### 📦 Proje Yapısı
- [ ] Klasör yapısını oluştur:
  ```
  Tidyorg/
  ├── terraform/
  │   └── modules/
  │       ├── repository/
  │       └── team/
  ├── templates/
  │   └── .github/
  │       ├── ISSUE_TEMPLATE/
  │       └── workflows/
  ├── integrations/
  │   ├── linear/
  │   ├── clickup/
  │   ├── slack/
  │   └── docs/
  ├── docs/
  │   └── adr/
  └── presentation/
  ```
- [ ] `.gitignore` — Genel + Terraform kuralları
  ```gitignore
  # Terraform
  .terraform/
  *.tfstate
  *.tfstate.*
  *.tfvars
  !*.tfvars.example
  crash.log
  override.tf
  override.tf.json

  # IDE
  .vscode/
  .idea/
  *.swp

  # OS
  .DS_Store
  Thumbs.db
  ```
- [ ] İlk commit: `chore(repo): initialize project structure`

### 📝 Issue Templates (YAML Forms)
- [ ] `templates/.github/ISSUE_TEMPLATE/bug_report.yml`
  - [ ] Bug description (zorunlu, textarea)
  - [ ] Steps to reproduce (zorunlu, textarea, pre-filled template)
  - [ ] Expected behavior (zorunlu, textarea)
  - [ ] Actual behavior (zorunlu, textarea)
  - [ ] Severity dropdown (Critical / High / Medium / Low)
  - [ ] Environment bilgisi (opsiyonel, textarea)
  - [ ] Screenshots / Logs (opsiyonel, textarea)
  - [ ] Auto-label: `type: bug`

- [ ] `templates/.github/ISSUE_TEMPLATE/feature_request.yml`
  - [ ] Feature description (zorunlu)
  - [ ] Motivation / business value (zorunlu)
  - [ ] Acceptance criteria (zorunlu)
  - [ ] Alternative solutions (opsiyonel)
  - [ ] Design notes / mockups (opsiyonel)
  - [ ] Auto-label: `type: feature`

- [ ] `templates/.github/ISSUE_TEMPLATE/config.yml`
  - [ ] `blank_issues_enabled: false`
  - [ ] Discussions linki
  - [ ] Documentation linki

### 📝 PR Template
- [ ] `templates/.github/PULL_REQUEST_TEMPLATE.md`
  - [ ] "What does this PR do?" bölümü
  - [ ] "Why is this change needed?" bölümü + `Closes #` linki
  - [ ] "How was this tested?" bölümü
  - [ ] Checklist: tests pass, docs updated, conventional commits
  - [ ] Screenshots bölümü (UI değişiklikleri için)

- [ ] ✅ **Hafta Sonu Sync:** Emre'nin PR'larını review et

---

## Hafta 2 — Repository Module & CI/CD Workflows

### 🔧 Terraform Repository Modülü
- [ ] `terraform/modules/repository/variables.tf` — Input değişkenleri
  - [ ] `name` (string, zorunlu)
  - [ ] `description` (string, zorunlu)
  - [ ] `language` (string: go/python/typescript/php)
  - [ ] `visibility` (string: private/public, default: private)
  - [ ] `team_access` (map: team_name → permission)
  - [ ] `has_issues`, `has_projects`, `has_wiki` (bool, defaults)
  - [ ] `template_repo` (string, opsiyonel)
  - [ ] `branch_protection` (object: required_reviews, enforce_admins, require_ci)
- [ ] `terraform/modules/repository/main.tf` — Ana modül
  - [ ] `github_repository` resource — repo oluşturma
    - [ ] Auto-init, default branch, gitignore template
  - [ ] `github_team_repository` resource — team erişimi (for_each)
  - [ ] `github_branch_default` — default branch ayarı
  - [ ] `github_issue_labels` — standart label seti (for_each)
    - [ ] type: labels (bug, feature, chore, docs)
    - [ ] priority: labels (critical, high, medium, low)
    - [ ] status: labels (in-review, blocked, ready)
    - [ ] lang: labels (go, python, typescript)
    - [ ] onboarding: labels (good first issue, help wanted)
- [ ] `terraform/modules/repository/outputs.tf` — Output'lar
  - [ ] `repo_url`, `repo_full_name`, `repo_html_url`, `repo_ssh_url`

### 🔧 Pilot Repo Tanımı
- [ ] `terraform/repositories.tf` — Modülü kullanarak pilot repo
  ```hcl
  module "pilot_project" {
    source      = "./modules/repository"
    name        = "pilot-intern-api"
    description = "Pilot project for testing GitHub workflow"
    language    = "go"
    visibility  = "private"
    team_access = {
      "backend-team"    = "push"
      "interns-backend" = "pull"
      "tech-leads"      = "maintain"
    }
  }
  ```

### 📝 CI/CD Workflow Templates
- [ ] `templates/.github/workflows/ci.yml` — Temel CI pipeline
  - [ ] Tetikleyici: `pull_request` + `push to develop`
  - [ ] Concurrency grubu (aynı branch'te çoklu run engelleme)
  - [ ] Go job:
    - [ ] `actions/setup-go@v5`
    - [ ] Cache: `~/go/pkg/mod`
    - [ ] `golangci/golangci-lint-action` ile lint
    - [ ] `go test ./...` ile test
    - [ ] `go build ./...` ile build
  - [ ] Python job:
    - [ ] `actions/setup-python@v5`
    - [ ] Cache: `~/.cache/pip`
    - [ ] `ruff check .` ile lint
    - [ ] `pytest` ile test
  - [ ] TypeScript job:
    - [ ] `actions/setup-node@v4`
    - [ ] Cache: `node_modules`
    - [ ] `eslint .` ile lint
    - [ ] `prettier --check .` ile format
    - [ ] `jest` veya `vitest` ile test
    - [ ] `tsc --noEmit` ile type check
  - [ ] PHP/Laravel job:
    - [ ] `phpstan analyse` ile static analysis
    - [ ] `pint --test` ile format
    - [ ] `phpunit` ile test

- [ ] `templates/.github/workflows/release.yml` — Release workflow
  - [ ] Tetikleyici: main'e push veya manual dispatch
  - [ ] Semantic version tag oluşturma (otomatik)
  - [ ] GitHub Release oluşturma (auto-generated changelog)
  - [ ] Docker build & push step (opsiyonel, koşullu)

- [ ] `templates/.github/dependabot.yml` — Dependabot config
  - [ ] Go modules: haftalık
  - [ ] npm: haftalık
  - [ ] pip: haftalık
  - [ ] GitHub Actions: haftalık
  - [ ] PR label: `type: chore`
  - [ ] Max open PRs: 5

- [ ] ✅ **Hafta Sonu Sync:** Emre ile birlikte branch protection + CI test et
  - [ ] Pilot repo'da PR aç
  - [ ] CI workflow tetiklendi mi?
  - [ ] Lint/test adımları çalışıyor mu?
  - [ ] Onay olmadan merge engellenmiş mi?

---

## Hafta 3 — Developer Experience Dokümantasyonu

### 📝 Ana İş Akışı Dokümanı
- [ ] `docs/workflow-guide.md` — Master document
  - [ ] Genel akış diyagramı (Mermaid)
  - [ ] Günlük geliştirme döngüsü (branch aç → commit → PR → review → merge)
  - [ ] PR → Review → Merge → Deploy akışı
  - [ ] Release süreci özeti
  - [ ] Hotfix süreci özeti
  - [ ] Tüm detay dokümanlara linkler

### 📝 Onboarding Rehberi
- [ ] `docs/onboarding.md` — Yeni geliştirici katılım rehberi
  - [ ] "İlk Gün" checklist:
    - GitHub org davetini kabul et
    - 2FA'yı etkinleştir
    - SSH key ekle
    - Repo'yu klonla
    - Geliştirme ortamını kur
    - `.editorconfig` plugin'ini yükle
  - [ ] "İlk PR'ınız" — adım adım rehber (komutlarla)
  - [ ] Commit message örnekleri
  - [ ] Review sürecinde ne beklenmeli?
  - [ ] Sıkça Sorulan Sorular (FAQ)

### 📝 Code Review Rehberi
- [ ] `docs/code-review-guide.md`
  - [ ] Reviewer nelere bakmalı? (mantık, güvenlik, performans, okunabilirlik)
  - [ ] PR sahibi PR'ı nasıl hazırlamalı? (küçük PR'lar, açıklayıcı description)
  - [ ] Yapıcı geri bildirim verme kuralları
  - [ ] Review SLA'ları (örn: 24 saat içinde ilk review)
  - [ ] "Request Changes" vs "Approve" ne zaman verilmeli?

### 📝 Release Process
- [ ] `docs/release-process.md`
  - [ ] SemVer açıklaması ve örnekler
  - [ ] Release branch oluşturma
  - [ ] Changelog oluşturma
  - [ ] Git tag oluşturma
  - [ ] GitHub Release oluşturma

- [ ] ✅ **Hafta Sonu Sync:** Emre'nin dokümanlarını review et, cross-reference'ları kontrol et

---

## Hafta 4 — Entegrasyonlar, Proje Yönetimi & Finalizasyon

### 🔗 Linear Entegrasyonu
- [ ] `integrations/linear/github-sync.md` — Linear ↔ GitHub sync rehberi
  - [ ] Linear'ın GitHub entegrasyonunu aktifleştirme adımları
  - [ ] Branch adlandırma formatı: `feat/LIN-123-user-auth`
  - [ ] PR açıldığında → Linear issue otomatik "In Progress"
  - [ ] PR merge edildiğinde → Linear issue otomatik "Done"
  - [ ] Linear → GitHub issue mapping (opsiyonel)
- [ ] `integrations/linear/workflows.yml` — Linear webhook Actions
  - [ ] Issue state sync
  - [ ] Label mapping

### 🔗 ClickUp Entegrasyonu (Alternatif)
- [ ] `integrations/clickup/github-sync.md` — ClickUp ↔ GitHub sync rehberi
  - [ ] ClickUp GitHub entegrasyonu kurulumu
  - [ ] Commit mesajında `CU-xxxx` ile task bağlama
  - [ ] ClickUp Automations ile GitHub event tetikleme
  - [ ] Status mapping tablosu

### 📝 GitHub Projects & Labels
- [ ] `docs/github-projects.md` — GitHub Projects rehberi
  - [ ] Board yapısı: Backlog → Todo → In Progress → In Review → Done
  - [ ] Issue → PR bağlantısı nasıl kurulur?
  - [ ] Milestone kullanımı
  - [ ] Sprint planlama yaklaşımı
  - [ ] Otomasyon kuralları (PR açıldığında → In Review)
- [ ] `docs/labels.md` — Standart label seti rehberi
  - [ ] Tüm label'ların listesi, renkleri, kullanım alanları
  - [ ] Yeni label ekleme kuralları

### 📝 ADR
- [ ] `docs/adr/003-external-integrations.md` — Linear vs ClickUp karşılaştırması, karar kriterleri

### 🤝 Ortak Çalışma
- [ ] README.md — Taslağı yaz, Emre review etsin
  - [ ] Proje açıklaması
  - [ ] Hızlı başlangıç (Quick Start)
  - [ ] Klasör yapısı
  - [ ] Katkıda bulunma linki
- [ ] Pilot test — Emre ile birlikte tüm sistemi test et
  - [ ] Template'lerden repo oluştur
  - [ ] Issue template'leri çalışıyor mu?
  - [ ] PR template'i görünüyor mu?
  - [ ] CI workflow tetikleniyor mu?
  - [ ] Label'lar doğru atanmış mı?
- [ ] Sunum hazırlığı — Sunum yapısını oluştur
  - [ ] Problem tanımı
  - [ ] Çözüm mimarisi
  - [ ] Organizasyon & Yetki yapısı
  - [ ] Branching & PR workflow
  - [ ] CI/CD pipeline
  - [ ] Template repository demo
  - [ ] Terraform demo (Emre gösterir)
  - [ ] Entegrasyonlar
  - [ ] Sonuç & Sonraki adımlar
- [ ] Canlı demo senaryosu (Emre ile birlikte)

---

## Her Hafta Tekrarlanan Görevler
- [ ] Emre'nin PR'larını review et
- [ ] Kendi değişikliklerini PR ile yap (dogfooding)
- [ ] Dokümanlar arası internal linkler ekle (cross-referencing)
- [ ] Hafta sonu sync toplantısı
