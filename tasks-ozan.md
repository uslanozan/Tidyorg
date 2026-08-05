# 📦 Ozan — Repository & Workflow

**Rol:** Geliştiricilerin günlük kullanacağı her şeyi kurar — şablonlar, CI/CD, iş akışı rehberleri  
**Alan:** Repo modülü, issue/PR templates, CI/CD workflows, DX dokümantasyonu, Linear/ClickUp  
**Tahmini Süre:** 4 hafta

---

## Hafta 1 — Proje Altyapısı & GitHub Templates

### 📦 Proje Yapısı
- [x] Klasör yapısını oluştur:
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
- [x] `.gitignore` — Genel + Terraform kuralları
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
- [x] İlk commit: `chore(repo): initialize project structure`

### 📝 Issue Templates (YAML Forms)
- [x] `templates/.github/ISSUE_TEMPLATE/bug_report.yml`
  - [x] Bug description (zorunlu, textarea)
  - [x] Steps to reproduce (zorunlu, textarea, pre-filled template)
  - [x] Expected behavior (zorunlu, textarea)
  - [x] Actual behavior (zorunlu, textarea)
  - [x] Severity dropdown (Critical / High / Medium / Low)
  - [x] Environment bilgisi (opsiyonel, textarea)
  - [x] Screenshots / Logs (opsiyonel, textarea)
  - [x] Auto-label: `type: bug`

- [x] `templates/.github/ISSUE_TEMPLATE/feature_request.yml`
  - [x] Feature description (zorunlu)
  - [x] Motivation / business value (zorunlu)
  - [x] Acceptance criteria (zorunlu)
  - [x] Alternative solutions (opsiyonel)
  - [x] Design notes / mockups (opsiyonel)
  - [x] Auto-label: `type: feature`

- [x] `templates/.github/ISSUE_TEMPLATE/config.yml`
  - [x] `blank_issues_enabled: false`
  - [x] Discussions linki
  - [x] Documentation linki
  - [x] _(ek)_ Security policy linki

### 📝 PR Template
- [x] `templates/.github/PULL_REQUEST_TEMPLATE.md`
  - [x] "What does this PR do?" bölümü → _"What changed?"_ olarak yazıldı
  - [x] "Why is this change needed?" bölümü + `Closes #` linki → _"Why?"_
  - [x] "How was this tested?" bölümü → _"Testing / Validation"_ + Validation notes alanı
  - [x] Checklist: tests pass, docs updated, conventional commits
  - [x] Screenshots bölümü (UI değişiklikleri için)
  - [x] _(ek)_ "Type of change" — SemVer etkisiyle birlikte
  - [x] _(ek)_ "Semantic commit checklist"
  - [x] _(ek)_ "Release impact" — migration/manuel adım uyarısı dahil

### 🌐 Dil Konvansiyonu _(plan dışı, Hafta 1'de karara bağlandı)_
- [x] `docs/notes/language-convention.md` — okunan Türkçe, çalıştırılan İngilizce, doldurulan iki dilli (English first)
- [x] Template'ler tek dosya içinde iki dilli hâle getirildi (`EN · TR`)

### 🔐 Auth Stratejisi _(plan dışı, Emre'nin görevini etkiliyor)_
- [x] `docs/notes/github-auth-strategy.md` — classic PAT yerine GitHub App önerisi
- [ ] Emre bu notu review etsin ve `tasks-emre.md`'deki PAT satırını güncellesin

- [ ] ✅ **Hafta Sonu Sync:** Emre'nin PR'larını review et _(Emre'nin henüz PR'ı yok — bekliyor)_

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
