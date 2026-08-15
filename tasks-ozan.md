# 📦 Ozan — Repository & Workflow

**Rol:** Geliştiricilerin günlük kullanacağı her şeyi kurar — şablonlar, CI/CD, iş akışı rehberleri  
**Alan:** Repo modülü, issue/PR templates, CI/CD workflows, DX dokümantasyonu, Linear/ClickUp  
**Tahmini Süre:** 4 hafta

> **Durum (2026-08-08):** Hafta 1–3 tamamlandı. Hafta 4 **ertelendi** — dış entegrasyonlar
> ek özellik olarak sonraya bırakıldı, kalan çekirdek işler yeni yol haritasına taşındı.
> Bkz. [`ROADMAP.md`](ROADMAP.md).

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

- [x] ✅ **Hafta Sonu Sync:** Emre'nin PR'larını review et _(2026-08-07'de yapıldı; düzeltmeler `docs/engineering-standards-fixes` ve `feat/branch-protection-fixes` branch'lerinde)_

---

## Hafta 2 — Repository Module & CI/CD Workflows

### 🔧 Terraform Repository Modülü
- [x] `terraform/modules/repository/variables.tf` — Input değişkenleri
  - [x] `name` (string, zorunlu)
  - [x] `description` (string, zorunlu)
  - [x] `language` (string: go/python/typescript/php)
  - [x] `visibility` (string: private/public, default: private)
  - [x] ~~`team_access` (map: team_name → permission)~~ → _rol tabanlı yapıya çevrildi:_ `mentors` + `developers` + `role_permissions` _(gerekçe: `ACCESS-MODEL.md`)_
  - [x] `has_issues`, `has_projects`, `has_wiki` (bool, defaults)
  - [x] `template_repo` (object, opsiyonel) — _tanımlı ama henüz kullanılmıyor_
  - [x] ~~`branch_protection` (object)~~ → _dal başına kural veren_ `protected_branches` _haritası_
  - [x] _(ek)_ `archived`, `code_owners`, `org_admin_team_slug`, `manage_codeowners_file`
- [x] `terraform/modules/repository/main.tf` — Ana modül
  - [x] `github_repository` resource — repo oluşturma
    - [x] Auto-init, default branch _(gitignore template kullanılmadı — repo'lar config'den doğuyor)_
    - [x] _(ek)_ `lifecycle { prevent_destroy = true }`
  - [x] `github_team_repository` resource — team erişimi
    - [x] _(ek)_ `github_team` — repo başına `<repo>-mentors` ve `<repo>-devs` takımları
    - [x] _(ek)_ `github_team_repository.org_admins` — head-of-engineering org geneli erişimi
  - [x] `github_branch_default` — default branch ayarı
  - [x] `github_issue_labels` — standart label seti
    - [x] type: labels (bug, feature, chore, docs)
    - [x] priority: labels (critical, high, medium, low)
    - [x] status: labels (in-review, blocked, ready)
    - [ ] lang: labels (go, python, typescript) — _eklenmedi; dil zaten config'de `language` alanında_
    - [x] onboarding: labels (good first issue, help wanted)
  - [x] _(ek)_ `github_branch_protection` — dal başına, `for_each` ile
  - [x] _(ek)_ `github_repository_file` — CODEOWNERS repo içine yazılıyor
- [x] `terraform/modules/repository/outputs.tf` — Output'lar
  - [x] `repo_url`, `repo_full_name`, `repo_html_url`, `repo_ssh_url`
  - [x] _(ek)_ `repo_node_id`, `default_branch`, takım slug'ları ve ID'leri
- [x] _(plan dışı)_ `terraform/modules/repository/versions.tf` — provider beyanı

### 🔧 Pilot Repo Tanımı
- [x] `terraform/repositories.tf` — Modülü kullanarak pilot repo
  - _Sabit `module` bloğu yerine config'den üretim:_ `yamldecode` + `for_each`.
    Dosyada tek bir repo adı veya kişi adı yok.
  - _Repo adı `pilot-intern-api` değil **`pilot-intern-web`**: Emre aynı isimli repo'yu
    `branch-protection.tf` içinde elle oluşturmuştu, çakışmayı önlemek için ayrı tutuldu._
  ```yaml
  # terraform/config/organization.yml
  repositories:
    pilot-intern-web:
      description: "Pilot proje — repository modülünün uçtan uca doğrulanması"
      language: typescript
      mentors: [uslanozan]
      developers: [paitblack]
  ```
- [x] _(plan dışı)_ `terraform/config/organization.yml` — canlı konfigürasyon
- [x] _(plan dışı)_ `terraform/config/organization.example.yml` — şema referansı
- [x] _(plan dışı)_ `terraform apply` — 25 kaynak canlıya alındı, GitHub'dan doğrulandı
      _(bkz. `docs/pilot-verification.md`)_

### 📝 CI/CD Workflow Templates
- [x] `templates/.github/workflows/ci.yml` — Temel CI pipeline
  - [x] Tetikleyici: `pull_request` + `push to develop`
  - [x] Concurrency grubu (aynı branch'te çoklu run engelleme)
  - [x] _(ek)_ `detect` job'u — dil job'ları yalnızca ilgili manifest varsa çalışıyor
  - [x] _(ek)_ `ci/test` toplayıcı job'u — branch protection'ın beklediği status check adı
  - [x] Go job:
    - [x] `actions/setup-go@v5`
    - [x] Cache: `~/go/pkg/mod` _(setup-go'nun yerleşik `cache: true` özelliğiyle)_
    - [x] `golangci/golangci-lint-action` ile lint
    - [x] `go test ./...` ile test
    - [x] `go build ./...` ile build
  - [x] Python job:
    - [x] `actions/setup-python@v5`
    - [x] Cache: `~/.cache/pip` _(setup-python'ın `cache: pip` özelliğiyle)_
    - [x] `ruff check .` ile lint
    - [x] `pytest` ile test
  - [x] TypeScript job:
    - [x] `actions/setup-node@v4`
    - [x] Cache: `node_modules` _(setup-node'un `cache: npm` özelliğiyle)_
    - [x] `eslint .` ile lint
    - [x] `prettier --check .` ile format
    - [x] `jest` veya `vitest` ile test _(`npm test --if-present`)_
    - [x] `tsc --noEmit` ile type check
  - [x] PHP/Laravel job:
    - [x] `phpstan analyse` ile static analysis
    - [x] `pint --test` ile format
    - [x] `phpunit` ile test

- [x] `templates/.github/workflows/release.yml` — Release workflow
  - [x] Tetikleyici: main'e push veya manual dispatch
  - [x] Semantic version tag oluşturma (otomatik, Conventional Commits'ten türetiliyor)
  - [x] GitHub Release oluşturma (auto-generated changelog)
  - [x] Docker build & push step (opsiyonel, koşullu — yalnızca `Dockerfile` varsa)

- [x] `templates/.github/dependabot.yml` — Dependabot config
  - [x] Go modules: haftalık
  - [x] npm: haftalık
  - [x] pip: haftalık
  - [x] GitHub Actions: haftalık
  - [x] _(ek)_ composer: haftalık
  - [x] PR label: `type: chore`
  - [x] Max open PRs: 5

> ⚠️ **Dağıtım eksik:** Bu üç dosya yazıldı ancak hiçbir repo'ya dağıtılmıyor.
> Modül yalnızca CODEOWNERS yazıyor. Workflow dağıtımının repo bazında konfigüre
> edilebilir olması kararlaştırıldı — bkz. `TODO.md`.

- [ ] ✅ **Hafta Sonu Sync:** Emre ile birlikte branch protection + CI test et
  - [ ] Pilot repo'da PR aç _(doğrudan commit ile test edildi, PR akışı henüz denenmedi)_
  - [ ] CI workflow tetiklendi mi?
  - [ ] Lint/test adımları çalışıyor mu?
  - [ ] Onay olmadan merge engellenmiş mi? _(ikinci bir GitHub hesabı gerekiyor — `TODO.md`)_
  - [x] _(ek)_ `prevent_destroy` doğrulandı
  - [x] _(ek)_ Mentörün korumalı dala doğrudan yazabildiği doğrulandı

---

## Hafta 3 — Developer Experience Dokümantasyonu

### 📝 Ana İş Akışı Dokümanı
- [x] `docs/workflow-guide.md` — Master document
  - [x] Genel akış diyagramı (Mermaid)
  - [x] Günlük geliştirme döngüsü (branch aç → commit → PR → review → merge)
  - [x] PR → Review → Merge → Deploy akışı _(sequence diyagramı)_
  - [x] Release süreci özeti
  - [x] Hotfix süreci özeti
  - [x] Tüm detay dokümanlara linkler _("ne zaman okunur" sütunlu harita)_
  - [x] _(ek)_ **Yetki akışı** — config → PR → plan → apply. Plan yazıldığında bu akış yoktu.
  - [x] _(ek)_ `ci/test` isim kilidi uyarısı

### 📝 Onboarding Rehberi
- [x] `docs/onboarding.md` — Yeni geliştirici katılım rehberi
  - [x] "İlk Gün" checklist _(davet artık elle gönderilmiyor — mentör config'e ekliyor)_
  - [x] "İlk PR'ınız" — adım adım rehber (komutlarla)
  - [x] Commit message örnekleri
  - [x] Review sürecinde ne beklenmeli?
  - [x] Sıkça Sorulan Sorular (FAQ) — 8 soru

### 📝 Code Review Rehberi
- [x] `docs/code-review-guide.md`
  - [x] Reviewer nelere bakmalı? (doğruluk, güvenlik, okunabilirlik, performans, test)
  - [x] PR sahibi PR'ı nasıl hazırlamalı? (küçük PR'lar, açıklayıcı description)
  - [x] Yapıcı geri bildirim verme kuralları _(`blocker:` / `öneri:` / `soru:` / `nit:` ön ekleri)_
  - [x] Review SLA'ları — 1 iş günü _(öneri olarak yazıldı, ekip teyit etmeli)_
  - [x] "Request Changes" vs "Approve" ne zaman verilmeli? _(karar tablosu)_
  - [x] _(ek)_ Onay kurallarının repo bazında değiştiği; CODEOWNERS'ın elle düzenlenemeyeceği

### 📝 Release Process
- [x] `docs/release-process.md`
  - [x] SemVer açıklaması ve örnekler
  - [x] Release branch oluşturma
  - [x] Changelog oluşturma _(ayrı `CHANGELOG.md` tutulmuyor — GitHub Release notları tek kaynak)_
  - [x] Git tag oluşturma
  - [x] GitHub Release oluşturma
  - [x] _(ek)_ Yazılan `release.yml`'ın adım adım açıklaması ve sorun giderme

### 📝 Plan Dışı Dokümanlar _(konuşulan kararlardan doğdu)_
- [x] `docs/config-guide.md` — Config'i kim nasıl değiştirir; dashboard'un spec'i
- [x] `docs/runbook.md` — Operasyonel senaryolar (offboarding, repo kapatma, drift, acil erişim kesme)
- [x] `docs/adr/004-config-driven-access-management.md` — Neden safe-settings/native ruleset/IDP değil
- [x] `docs/pilot-verification.md` — Uçtan uca doğrulama raporu + ekran görüntüleri
- [x] `ACCESS-MODEL.md` — Erişim modeli ve verilen kararlar
- [x] `TODO.md` — Engelli ve bekleyen işler

- [x] ✅ **Hafta Sonu Sync:** Emre'nin dokümanlarını review et
  - [x] Dört doküman incelendi, düzeltmeler `docs/engineering-standards-fixes` branch'inde
  - [ ] Cross-reference'lar — benim dokümanlarım Emre'ninkilere link veriyor, tersi henüz yok

---

## Hafta 4 — Temizlik, Config Yapısı & GitOps

> **Not:** Emre'nin ayrılmasıyla Faz 3 (GitOps döngüsü) bu haftaya eklendi.
> Medine bu hafta dashboard iskeletini ve giriş akışını kuruyor — bağımsız.

### 🧹 Faz 0 — Kalan temizlik
- [x] **`pilot-intern-api`'yi modüle taşı** _(2026-08-15)_
  - [x] Repo'yu `config/repositories/pilot-intern-api.yml` olarak tanımla
  - [x] `terraform state mv` ile kaydı modül altına taşı — **silme/yeniden yaratma yok**
  - [x] `branch-protection.tf`'teki ham `github_repository` ve iki `github_branch_protection`
        bloğunu kaldır
  - [x] `plan` → 0 destroy, yalnızca yeni modül kaynakları (takımlar, labels, CODEOWNERS)
  - [x] _(ek)_ GitHub App'e `issues:write` izni eklendi — labels 403 hatası giderildi
  - [x] Apply tamamlandı: 1 added, 2 changed, 0 destroyed
- [ ] **Bekleyen üç branch'i push et ve PR aç** _(dogfooding)_
  - [ ] `feat/repository-module`
  - [ ] `docs/engineering-standards-fixes`
  - [ ] `feat/branch-protection-fixes`

### 🔧 Faz 1 — Config yapısını repo başına dosyaya böl _(2026-08-15)_
- [x] Dizin yapısını kur:
  ```
  terraform/config/
  ├── organization.yml          # roller, defaults, people
  └── repositories/
      ├── pilot-intern-web.yml
      └── pilot-intern-api.yml
  ```
- [x] `repositories.tf`'i `fileset()` + `yamldecode` ile besle — dosya adı = repo adı
- [x] `organization.example.yml`'i yeni yapıya göre güncelle
- [x] `plan` çıktısının **değişmediğini** doğrula — `0 to add, 2 to change (kalıcı drift), 0 to destroy`
- [x] [`docs/config-guide.md`](docs/config-guide.md)'yi yeni yapıya göre güncelle

**Neden:** Dashboard'un ön koşulu. İki mentör aynı anda düzenlediğinde tek dosyada
çakışırlar, ayrı dosyalarda çakışmazlar.

### 🔄 Faz 3 — GitOps döngüsü _(Emre'den devralındı)_

Dokümanların anlattığı "PR → plan → apply" akışı şu an elle çalışıyor. Otomatikleşmeli.
Dashboard'un PR açması ancak bu döngü varsa anlamlı — plan çıktısı buradan gelecek.

- [x] `.github/workflows/terraform-plan.yml` — PR tetikli _(2026-08-15)_
  - [x] `terraform fmt -check -recursive`
  - [x] `terraform validate`
  - [x] `terraform plan`
  - [x] Plan çıktısını PR yorumu olarak yaz — **`destroy` sayısı görünür olmalı**
- [x] `.github/workflows/terraform-apply.yml` — `main` merge tetikli _(2026-08-15)_
- [ ] GitHub Secrets: `TF_API_TOKEN` _(HCP team token)_
- [x] Concurrency grubu — iki apply aynı anda çalışmasın _(2026-08-15)_
- [x] Bu repo'nun kendi branch protection'ını config'den yönet (dogfooding) _(2026-08-15)_

- [ ] ✅ **Hafta Sonu Sync:** Config bölünmesi sonrası CODEOWNERS kurallarını yaz;
      GitOps'u Medine ile birlikte test et (dashboard PR açıyor mu, plan yorumu düşüyor mu?)

---

## Hafta 5 — Şablon Dağıtımı & GitHub App

> **Not:** Emre'nin ayrılmasıyla Faz 4 (GitHub App) bu haftaya eklendi.
> Medine bu hafta config'i okuyup projeleri gösteren ekranları yazıyor — bağımsız.
> **Faz 4 (GitHub App) 2026-08-15'te tamamlandı.** Şablon dağıtımı (Faz 2) sırada.

### 📦 Faz 2 — `templates/` klasörünü canlıya çıkar
- [ ] Config şemasına `files` ve `workflows` alanlarını ekle
  ```yaml
  defaults:
    files:
      contributing: seed        # strict | seed | none
      security: seed
      editorconfig: seed
      issue_templates: strict
      pr_template: strict
    workflows: [ci]             # ci | release | dependabot
  ```
- [ ] Modülde `github_repository_file` ile dağıtımı kur _(CODEOWNERS mekanizmasının aynısı)_
- [ ] **`strict` modu** — Terraform içeriği sahiplenir, elle değişiklik geri alınır
  - [ ] `.github/CODEOWNERS` _(zaten var)_
  - [ ] `.github/ISSUE_TEMPLATE/*`
  - [ ] `.github/PULL_REQUEST_TEMPLATE.md`
  - [ ] `.github/workflows/*`
  - [ ] `.github/dependabot.yml`
- [ ] **`seed` modu** — yalnızca ilk oluşturmada yazılır, repo sonra değiştirebilir
      _(`lifecycle { ignore_changes = [content] }`)_
  - [ ] `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`, `README.md`
- [ ] **Tutarlılık doğrulaması** — `workflows` içinde `ci` yoksa `require_status_checks`
      da boş olmalı. Modül bunu `precondition` ile hata olarak vermeli; aksi halde PR'lar
      hiç raporlanmayacak bir check'i sonsuza kadar bekler.
- [ ] Pilot repo'da doğrula
  - [ ] PR açınca şablon dolu geliyor mu?
  - [ ] Issue template'leri görünüyor mu?
  - [ ] `ci/test` raporlanıyor mu?
- [ ] [`docs/onboarding.md`](docs/onboarding.md)'deki "PR şablonu otomatik dolar" iddiası
      artık doğru — dokümanı gözden geçir

- [ ] ✅ **Hafta Sonu Sync:** App devreye girince dağıtımı yeni kimlikle test et

- [x] Doğrula: yeni `apply` sonrası commit'ler bot adına görünmeli (2026-08-15)
- [x] [`docs/notes/github-auth-strategy.md`](docs/notes/github-auth-strategy.md)'yi
      "uygulandı" olarak güncelle (2026-08-15)

**Dashboard için ayrı App gerekmez.** Dashboard kullanıcının kendi kimliğiyle çalışır
(Device Flow). Bu App yalnızca Terraform içindir.

### 🔑 Dashboard için OAuth App (Device Flow)

- [ ] Device Flow destekleyen bir GitHub OAuth App oluştur
  - Yalnızca `client_id` gerekir; `client_secret` saklanmayacak
  - Ayarlarda **"Enable Device Flow"** işaretli olmalı
- [ ] `client_id`'yi Medine ile paylaş (`VITE_GITHUB_CLIENT_ID` env değişkeni olarak)

---

## Hafta 6 — Güvenlik Ayarları & Dashboard Desteği

> **Paralel:** Medine bu hafta dashboard yazma modunu kuruyor (PR akışı). Bağımsız.

### 🔒 Repo güvenlik ayarları
- [ ] Modüle `vulnerability_alerts` ekle _(Dependabot uyarıları)_
- [ ] Uygun olduğunda `security_and_analysis` blokları
- [ ] [`docs/security-policy.md`](docs/security-policy.md)'deki durum tablosunu güncelle —
      "planlandı" olan maddeler "aktif" olacak

### 👤 `people` → organizasyon üyeliği
- [ ] `github_membership` ile org üyeliğini config'den yönet
- [ ] ⚠️ **Riskli:** mevcut owner yetkilerini etkileyebilir. Önce `plan`'ı dikkatle
      incele, gerekirse `import` ile mevcut üyelikleri state'e al.
- [ ] `docs/onboarding.md`'deki "davet otomatik gelir" iddiası artık doğru

### 🧩 Dashboard desteği
- [ ] Config için JSON Schema yaz — dashboard kaydetmeden önce doğrulama yapabilsin
  - _YAML ayrıştırıldığında JSON ile aynı veri modeline dönüştüğü için aynı şema her
    ikisini de doğrular. Depoda saklanan format her zaman YAML; dönüştürme yok._
  - _Medine ihtiyaç duyarsa şemayı değiştirebilir._
- [ ] Anlamsal kuralları tanımla: her repo'nun tam bir mentörü olmalı, arşiv repo'ya
      developer eklenemez, `required_reviews` developer sayısını aşamaz
- [ ] **Dosya sahipliği ayrımını uygula** _(ACCESS-MODEL Karar 16)_
  - [ ] `config/repositories/*.yml` makine sahipli — yorum satırı konmayacak, dashboard
        serbestçe yeniden üretebilecek
  - [ ] `config/organization.yml` insan sahipli — yorumlar burada kalacak, dashboard
        dokunmayacak

### 🧪 Bekleyen testler
- [ ] İkinci hesapla engelleme testleri _(bkz. [`TODO.md`](TODO.md))_
- [ ] Sonuçları [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6'ya işle

- [ ] ✅ **Hafta Sonu Sync:** Medine ile dashboard okuma + yazma modunu birlikte gözden geçir

---

## Hafta 7 — Finalizasyon

> **Paralel:** Medine bu hafta plan önizleme ekranını ve UX parlatmayı yapıyor.

- [ ] **README.md** — Medine review etsin
  - [ ] Proje açıklaması, hızlı başlangıç, klasör yapısı, katkı linki
  - [ ] Mimari özet: kod katmanı / veri katmanı ayrımı
- [ ] **Doküman bakımı**
  - [ ] Cross-reference'ları tamamla — dokümanlar arası tutarlı linkler
  - [ ] `ROADMAP.md` ve `TODO.md`'yi güncelle
  - [ ] Değişen davranışları dokümanlara yansıt
- [ ] **Uçtan uca pilot test** _(Medine ile ortak)_
  - [ ] Config'den sıfırdan yeni repo aç
  - [ ] Şablonlar geldi mi, CI tetiklendi mi, label'lar doğru mu?
  - [ ] Dashboard'dan bir kişi ekle → PR → plan → apply → GitHub'da gör
- [ ] **Sunum hazırlığı**
  - [ ] Problem tanımı ve çözüm mimarisi
  - [ ] Kod/veri katmanı ayrımı ve dashboard demosu
  - [ ] Pilotta bulunan iki hata — beyan temelli yönetimin somut faydası
  - [ ] Piyasa karşılaştırması _(safe-settings, native ruleset, IDP — `adr/004`)_
  - [ ] Sonraki adımlar ve bilinen kısıtlar

---

## ⏸️ Ertelenen — Ek Özellikler

> Sistemin çalışması için gerekli değil. Çekirdek işler bittiğinde ele alınacak.

## Hafta 8+ — Entegrasyonlar & Proje Yönetimi

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

> _README, pilot test ve sunum hazırlığı **Hafta 7**'ye taşındı._

---

## Her Hafta Tekrarlanan Görevler
- [ ] Medine'nin PR'larını review et (dashboard PR'ları)
- [ ] Kendi değişikliklerini PR ile yap (dogfooding)
- [ ] Terraform kodlarını `terraform fmt` ile formatla
- [ ] Dokümanlar arası internal linkler ekle (cross-referencing)
- [ ] Hafta sonu sync toplantısı (Medine ile)
