# 📦 Ozan — Repository & Workflow

**Rol:** Geliştiricilerin günlük kullanacağı her şeyi kurar — şablonlar, CI/CD, iş akışı rehberleri  
**Alan:** Repo modülü, issue/PR templates, CI/CD workflows, DX dokümantasyonu, Linear/ClickUp  
**Tahmini Süre:** 4 hafta

> **Durum (2026-08-18):** Hafta 1–5 tamamlandı. Emre'nin ayrılmasıyla Faz 3 (GitOps) ve
> Faz 4 (GitHub App) bu listeye geçti ve bitti. **Faz 2 (şablon dağıtımı) 2026-08-16'da
> canlıya çıktı.** Dış entegrasyonlar ek özellik olarak Hafta 8+'a bırakıldı.
>
> **Sıra değişti: Faz 2 → Faz 6 (güvenlik ayarları) → Faz 8 (repo topolojisi).**
> Faz 8'in "Medine yazma moduna geçmeden bitmeli" gerekçesi 2026-08-17'de düştü — tek
> mentör benim, split'in koruduğu sınırın bugün karşılığı yok ve split, henüz canlı
> doğrulanmamış testleri iki repoya böler. Faz 8 artık **koşula bağlı**: dashboard yazma
> modu ayrılırken ya da demo çıkarılırken. Gerekçeler: [`ROADMAP.md`](ROADMAP.md) Karar E–I.

---

## Hafta 1 — Proje Altyapısı & GitHub Templates

### 📦 Proje Yapısı
- [x] Klasör yapısını oluştur:
  ```
  Tidyorg/
  ├── terraform/
  │   ├── modules/
  │   │   ├── repository/
  │   │   └── team/
  │   └── templates/              # 2026-08-16'da repo kökünden buraya taşındı
  │       └── .github/            # sebep: HCP yalnızca working directory'yi paketliyor
  │           ├── ISSUE_TEMPLATE/
  │           └── workflows/
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
- [x] `terraform/templates/.github/ISSUE_TEMPLATE/bug_report.yml`
  - [x] Bug description (zorunlu, textarea)
  - [x] Steps to reproduce (zorunlu, textarea, pre-filled template)
  - [x] Expected behavior (zorunlu, textarea)
  - [x] Actual behavior (zorunlu, textarea)
  - [x] Severity dropdown (Critical / High / Medium / Low)
  - [x] Environment bilgisi (opsiyonel, textarea)
  - [x] Screenshots / Logs (opsiyonel, textarea)
  - [x] Auto-label: `type: bug`

- [x] `terraform/templates/.github/ISSUE_TEMPLATE/feature_request.yml`
  - [x] Feature description (zorunlu)
  - [x] Motivation / business value (zorunlu)
  - [x] Acceptance criteria (zorunlu)
  - [x] Alternative solutions (opsiyonel)
  - [x] Design notes / mockups (opsiyonel)
  - [x] Auto-label: `type: feature`

- [x] `terraform/templates/.github/ISSUE_TEMPLATE/config.yml`
  - [x] `blank_issues_enabled: false`
  - [x] Discussions linki
  - [x] Documentation linki
  - [x] _(ek)_ Security policy linki

### 📝 PR Template
- [x] `terraform/templates/.github/PULL_REQUEST_TEMPLATE.md`
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
- [x] `terraform/templates/.github/workflows/ci.yml` — Temel CI pipeline
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

- [x] `terraform/templates/.github/workflows/release.yml` — Release workflow
  - [x] Tetikleyici: main'e push veya manual dispatch
  - [x] Semantic version tag oluşturma (otomatik, Conventional Commits'ten türetiliyor)
  - [x] GitHub Release oluşturma (auto-generated changelog)
  - [x] Docker build & push step (opsiyonel, koşullu — yalnızca `Dockerfile` varsa)

- [x] `terraform/templates/.github/dependabot.yml` — Dependabot config
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
- [x] GitHub Secrets: `TF_API_TOKEN` _(HCP team token)_ _(2026-08-16)_
- [x] Concurrency grubu — iki apply aynı anda çalışmasın _(2026-08-15)_
- [x] Bu repo'nun kendi branch protection'ını config'den yönet (dogfooding) _(2026-08-15)_
- [x] **`terraform-plan.yml` düzeltildi** _(2026-08-16)_ — dosya **hiç çalışmamıştı**;
      91-109. satırlar `script: |` blok skalerinin dışına düşmüş, YAML geçersizdi.
      Girinti tek başına çözmüyor: template literal'in içindeki boşluk string'e dahil
      olup markdown tablosunu kod bloğuna çeviriyor. Satır dizisi + `join('\n')` ile
      çözüldü, 65536 karakter limiti için kısaltma eklendi.
      _Kendime ders: "tamamlandı" işaretlemeden önce çalıştığını görmek lazım._
- [x] **İlk canlı çalıştırma ikinci bir bug çıkardı** _(2026-08-16)_ — temiz plan
      `⚠️ Plan summary line not found` uyarısı veriyordu. Özet regex'i yalnızca
      `Plan: X to add...` satırını arıyor, Terraform ise değişiklik yokken o satırı hiç
      yazmıyor. Yani sistem **en sağlıklı olduğu anda** uyarı üretiyordu.
      `No changes` dalı eklendi; `Drift detected` satırları da sayılıp özete not düşülüyor.
- [x] **GitOps döngüsü uçtan uca doğrulandı** _(2026-08-16)_ — plan tetiklendi, yorum
      düştü, `Successful in 45s`. Kanıtlar:
      [`docs/pilot-verification.md`](docs/pilot-verification.md) **Bölüm 7**

### 🔐 Erişim düzeltmesi — Emre `developer` rolüne indirildi _(2026-08-15, plan dışı)_

Emre projeden ayrıldıktan sonra `develop`'a doğrudan push denendi ve **push geçti**.
İlk bakışta "direct push yasağı çalışmıyor" gibi göründü; değildi. Kural doğruydu,
**rol ataması yanlıştı.**

**Zincir neden kırılmıştı:**
1. [`terraform/team-memberships.tf`](terraform/team-memberships.tf) Emre'yi `platform-admins`
   takımında tutuyordu.
2. O takım `org_admin_team`, yani **head-of-engineering** rolünün taşıyıcısı.
3. Modül bu takıma [her repo'da admin](terraform/modules/repository/main.tf) veriyor.
4. `enforce_admins = false` (bilinçli tercih — mentörler push atabilsin diye) → **admin
   yetkisindeki herkes PR zorunluluğunu ve onay kuralını atlar.**
5. Üstüne `push_allowed_roles: [mentor, head-of-engineering]` onu push allowlist'ine
   açıkça koyuyordu.

Yani Emre `developer` olarak değil, `head-of-engineering` olarak push attı. Bu,
[`TODO.md`](TODO.md)'de "ikinci bir hesap gerekiyor, Emre'nin hesabı org owner olduğu için
aynı bypass sorununu yaşar" diye zaten öngörülmüş durumun ta kendisiydi.

- [x] `github_team_membership.emre_admin` kaldırıldı — `platform-admins` üyeliği bitti
- [x] `terraform/org-membership.tf` eklendi — org rolü `member` olarak **beyana bağlandı**
  - Takımdan çıkarmak tek başına yetmez: org owner branch protection dahil her şeyi ezer
  - `downgrade_on_destroy = true` — kaynak koddan kalkarsa org'dan atılmaz, member'a düşer
  - `uslanozan` bilerek yönetim dışında (break-glass; tek org owner'ı bağlamak lockout riski)
- [x] Repo tarafında değişiklik gerekmedi — üç repoda da zaten `developers: [paitblack]`
- [x] Apply: **1 added, 0 changed, 1 destroyed**; doğrulama planı `No changes`
- [ ] Emre'ye aynı push'u tekrar denet — ret davranışı ilk kez canlı doğrulanabilir
      _(sonucu [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6'ya işle)_

**Yan tespit:** Silinen üyeliğin GitHub'daki gerçek rolü `member`'dı, kodda `maintainer`
yazıyordu. O üyelik bir ara arayüzden elle değiştirilmiş — drift'in bir örneği daha.

> ⚠️ **Bu düzeltme `ci/test` blokajını görünür hale getirdi.** Bugüne kadar tüm PR'lar
> admin bypass'ıyla merge edildiği için fark edilmedi. Artık normal developer akışı devrede
> ve `require_status_checks: [ci/test]` hiçbir repoda karşılığı olmayan bir check bekliyor →
> **onaylanmış PR bile merge edilemez.** Faz 2'deki tutarlılık maddesi artık teorik değil,
> aktif blokaj. Kalıcı çözüm şablon dağıtımı; ara çözüm `require_status_checks`'i geçici
> boşaltmak.

- [ ] ✅ **Hafta Sonu Sync:** Config bölünmesi sonrası CODEOWNERS kurallarını yaz;
      GitOps'u Medine ile birlikte test et (dashboard PR açıyor mu, plan yorumu düşüyor mu?)

---

## Hafta 5 — Şablon Dağıtımı & Repo Topolojisi

> **Not:** Emre'nin ayrılmasıyla Faz 4 (GitHub App) bu haftaya eklendi.
> Medine bu hafta config'i okuyup projeleri gösteren ekranları yazıyor — bağımsız.
> **Faz 4 (GitHub App) 2026-08-15'te tamamlandı.**

> 🔴 **Bu haftanın sıralaması kritik: Faz 2 → Faz 8.** İkisi de bu haftaya sığmalı,
> çünkü Medine Hafta 6'da dashboard **yazma modunu** kuruyor ve Faz 8 ondan önce
> bitmeli — yoksa hareket eden bir hedefe göç etmek gerekir.
>
> Sıra neden bu yönde: **Faz 2, motor ile config şemasının birlikte evrildiği tek iş.**
> Repolar bölündükten sonra her yeni config alanı iki PR olur (önce motor + tag, sonra
> pin + kullanım). Şemayı tek repoda dondurup sonra bölmek, bölüp sonra şema değiştirmekten
> çok daha ucuz.

### 📦 Faz 2 — `terraform/templates/` klasörünü canlıya çıkar ✅ _(2026-08-16)_

**Sonuç: 27 kaynak, 3 repo, `0 destroy`.** Kanıtlar:
[`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 7.6–7.8.

- [x] Config şemasına `files` ve `workflows` alanları eklendi
- [x] Modülde `github_repository_file` ile dağıtım kuruldu
- [x] **`strict` modu** — `.github/ISSUE_TEMPLATE/*`, `PULL_REQUEST_TEMPLATE.md`,
      `dependabot.yml`, `workflows/ci.yml` _(CODEOWNERS ayrı kaynak, config'den üretiliyor)_
- [x] **`seed` modu** — `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`
      _(`README.md` şablonu yok — yazılırsa katalog + config'e birer satır yeter)_
- [x] **Tutarlılık doğrulaması** — `precondition` eklendi ve **test edildi**:
      `workflows: []` yapılınca plan hata verip durdu, repo + dal adını söyledi
- [x] Doğrulandı: **`ci/test` ilk kez raporlandı ve yeşil** (PR #17)
- [x] PR şablonu artık geliyor — [`docs/onboarding.md`](docs/onboarding.md)'deki
      "PR şablonu otomatik dolar" iddiası **nihayet doğru**

**Yol üstünde çözülen dört engel** _(hepsi plan ortasında patlayacak cinstendi)_:

1. `templates/` repo kökündeydi, **HCP yalnızca working directory'yi paketliyor** —
   `config/` ile yaşanan tuzağın aynısı. `terraform/templates/` altına taşındı.
2. `ci.yml` içinde 11 tane `${{ }}` — `templatefile()` patlardı, `file()` kullanıldı.
3. **`lifecycle` bloğu dinamik olamıyor** — `strict`/`seed` tek kaynakta yapılamaz,
   iki ayrı kaynak yazıldı.
4. App'in **`workflows` izni yoktu** — `.github/workflows/` ayrı bir izne bağlı,
   `contents: write` yetmiyor. İzin verildi, manifest ve README güncellendi.

- [x] ⚙️ **Dependabot gürültüsü çözüldü** _(2026-08-16)_ — dağıtım sonrası 5 adet
      `github-actions` PR'ı açılmıştı. Seçilen yol **`groups`**: `interval`'ı `monthly`
      yapmak güncellemeyi geciktirirdi, `open-pull-requests-limit` düşürmek ise PR'ları
      açmayıp sessizce kuyruğa alırdı — ikisi de gürültüyü değil güncellemeyi kısar.
      Gruplama PR sayısını düşürür, kapsamı düşürmez.
      Gruplama **bilerek asimetrik** — [`dependabot.yml`](terraform/templates/.github/dependabot.yml):
      - `gomod` / `npm` / `pip` / `composer` → `minor-and-patch` grubu.
        **Major dışarıda**, çünkü kütüphane major'ı kırıcı değişiklik demek; tek tek
        okunmalı, bir grubun içine karışmamalı.
      - `github-actions` → `patterns: ["*"]`, major dahil hepsi tek grup.
        Action major'ı (`checkout@v4 → v5`) rutin bakım; spam'ın kaynağı da buydu.

- [x] ✅ **Hafta Sonu Sync:** dağıtım yeni App kimliğiyle test edildi — commit'ler
      `tidyorg-infra-bot[bot]` adına düştü

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

### 🏗️ Faz 8 — Repo topolojisi: motor / durum ayrımı _(2026-08-16 kararı, 2026-08-17'de ertelendi)_

> ⏸️ **Ertelendi — koşula bağlandı (Karar I).** Tetikleyici: **dashboard yazma modu
> ayrılırken ya da demo çıkarılırken.** Takvime bağlı değil.
>
> **Neden:** ayrımın koruduğu şey "mentör motoru tek başına değiştiremesin" sınırı. Bugün
> tek mentör benim — sınırın karşı tarafında kimse yok, yani split bugün sıfır güvenlik
> kazandırıp gerçek maliyet getiriyor: her config alanı iki PR, ve **henüz canlı
> doğrulanmamış testler iki repoya bölünür**. Faz 6 ise tek repoda, bugünkü test
> zemininde bitirilebilir. Bu yüzden sıra Faz 6 → Faz 8 oldu.

Mekanik iş küçük — **yarım ile bir gün** — çünkü **state taşınmıyor**: aynı HCP workspace
kullanılmaya devam eder, yalnızca onu besleyen repo değişir.

**Neden:** Bu repo iki farklı yaşam döngüsü barındırıyor — **motor** (modül, şablon,
doküman: ürün gibi, sürümü var) ve **durum** (`config/*.yml`: operasyon, mentörün stajyer
eklemesi). Asıl zorlayıcı sebep ise `enforce_admins = false` kararı:

> **Tek repoda mentörü motordan ayıramıyoruz.** CODEOWNERS ile `config/` yoluna ayrı
> sahip koyabiliriz ama mentör onu da branch protection'ı da bypass ediyor — 2026-08-15'te
> canlı görüldü. Dashboard kullanıcının kendi kimliğiyle çalıştığı için (ACCESS-MODEL
> Karar 15), mentör olarak açılan bir dashboard PR'ı Terraform modülünü de değiştirip
> kendi kendine merge edebilir. Sınır ancak **repo sınırı** olabilir.
> Bu, [`ROADMAP.md`](ROADMAP.md) **K3'ü geçersiz kılıyor**.

```
Tidyorg          tidyorg-org-config
  MOTOR                                  DURUM
  modules/ · templates/ · docs/          config/organization.yml
  trunk-based + tag                      config/repositories/*.yml
  platform ekibi yazar                   ince terraform root
        │                                mentör + dashboard yazar
        └── ref = v1.0.0 ──────────────▶ trunk-based, PR → main → apply
```

**Yapılacaklar:**
- [ ] `tidyorg-org-config` repo'sunu **config'den** aç (dogfooding — bir YAML dosyası)
- [ ] `terraform/config/` klasörünü yeni repoya taşı
- [ ] Yeni repoda ince root: `cloud` bloğu + provider + modülü git ref ile çağır
      ```hcl
      module "repositories" {
        source = "git::https://github.com/your-org/Tidyorg.git//terraform/modules/repository?ref=v1.0.0"
        # ...
      }
      ```
- [ ] `terraform-plan.yml` + `terraform-apply.yml`'i config repo'ya taşı
- [ ] Motor repo'da ilk sürüm tag'ini kes (`v1.0.0`)
- [ ] Yetkileri ayır: mentörler config repo'da admin, **motor repo'da erişimsiz (ya da read)**
- [ ] ⚠️ Modül kaynağı erişimi: motor repo private'a dönerse `git::` kaynağı auth ister —
      Team planı geldiğinde (Faz 7) bu ayrıca çözülmeli
- [ ] [`docs/branching-strategy.md`](docs/branching-strategy.md)'ye kontrol düzlemi
      istisnasını yaz — ürün repoları `feat → develop → main`, kontrol düzlemi trunk-based
- [ ] `docs/adr/005-control-plane-repo-topology.md` yaz

**`release.yml` bu işte devreye alınacak** _(2026-08-17 kararı)_:
- [ ] `defaults.workflows` → `[ci, release]`
      **Neden şimdi değil:** `release.yml` Conventional Commits'ten semver türetip tag
      kesiyor. Faz 8'de motor repo zaten **tag ile sürümleniyor** (`ref=v1.0.0`) — yani
      sürümleme mekanizması o gün gerçek bir işe bağlanıyor. Bugün açılırsa üç pilot
      repoda karşılığı olmayan tag'ler üretir. Şablon yazılı ve hazır bekliyor.
      Takip: [`TODO.md`](TODO.md) → tutarsızlıklar.

**`develop` bu repoda zaten kalktı** _(Karar F — 2026-08-17, Faz 8'i beklemeden)_:
- [x] Bu repo'nun `develop` dalı silindi; koruma kuralı config'den `develop: null` ile
      kaldırıldı _(kaldırma escape hatch'i bu iş için eklendi — bkz. `repositories.tf`)_
      ⚠️ Öğrenilen: **koruma kuralı dala değil, isim desenine bağlı.** Config'den
      kaldırılmasaydı kural dal silindikten sonra da durur, `develop` yeniden açılırsa
      kendiliğinden devreye girerdi.
- [ ] Config repo trunk-based doğar — `develop` hiç açılmaz
- [ ] Motor repo trunk-based + tag devam eder — `develop` **eklenmez**
      _(partiler halinde yayın ihtiyacı doğarsa yeniden değerlendirilir; şimdiden kurulmaz)_
- [ ] Pilot repolar (`pilot-intern-api`, `pilot-intern-web`) `develop`'ta kalıyor —
      onlar ürün repo'su, kontrol düzlemi değil _(bkz. [`docs/branching-strategy.md`](docs/branching-strategy.md) 8.1)_

> **Not:** Bu madde başta "göçün içinde yapılır" diye planlanmıştı; gerekçe göç sırasında
> default branch ve workflow trigger'larının zaten elden geçecek olmasıydı. Faz 8 koşula
> bağlanınca bu repo için beklemenin anlamı kalmadı — `develop` → `main` boşluğunu elle
> yönetmek (merge edilen config'in canlıda olmaması) süresiz sürecekti.

**Bedeli — bilinçli kabul:** split sonrası yeni bir config alanı eklemek **iki PR** olur
(önce motor + tag, sonra pin + kullanım). Bugün tek PR. Faz 2'nin önce yapılmasının sebebi
tam olarak bu.

**Kazanç — `develop`'un veremediği güvenlik:** motor değişikliği tag'lenir ve **pin
yükselene kadar hiçbir repoya inmez**. Bugün `main`'e merge → apply → üç repoya birden
iniyor. Geri alma da pin'i düşürmeye iniyor.

---

## Hafta 6 — Güvenlik Ayarları & Dashboard Desteği

> **Paralel:** Medine bu hafta dashboard yazma modunu kuruyor (PR akışı).
> ~~⚠️ **Faz 8'e bağımlı**~~ — bu bağımlılık 2026-08-17'de düştü (Karar I). Faz 8 koşula
> bağlandığı için Faz 6 bugünkü tek repo zemininde yapılıyor.

### 🔒 Repo güvenlik ayarları
- [x] ✅ Modüle `vulnerability_alerts` eklendi _(2026-08-18)_ — config'den yönetiliyor
      (`defaults.vulnerability_alerts: true`), dört repoda da açık.
      ⚠️ **Bulgu: bu repo'da kapalıymış.** Yani kontrol düzleminin kendisi aylardır
      Dependabot zafiyet uyarısı almıyormuş. İki pilot repo'da açıktı — fark, bu repo'nun
      Terraform'dan **önce elle** açılmış olmasından geliyor. Elle kurulan her şeyin
      config'e alınana kadar denetlenmediğinin somut örneği.
- [x] ✅ `security_and_analysis` bloğu eklendi _(2026-08-18)_ — secret scanning +
      **push protection**. İkincisi asıl değerli olan: sızdırılmış anahtar repo'ya
      **girmeden** push reddedilir, sonradan uyarmaz.
      ⚠️ Yalnızca **public** repo'da ücretsiz; private repo GHAS (Enterprise) ister.
      Modül koşulu `visibility == "public"` içeriyor — `pilot-access-test` (private)
      sessizce atlandı ve apply **ilk denemede** geçti, `422` alınmadı.
      `advanced_security` bilerek hiç yönetilmiyor: public'te örtük açık, private'ta
      lisans ister; ikisinde de yönetmeye çalışmak hata.
- [x] ✅ **Org geneli güvenlik varsayılanları açıldı** _(2026-08-18)_ —
      `dependabot_alerts` · `dependabot_security_updates` · `dependency_graph` ·
      `secret_scanning` · `secret_scanning_push_protection` → `false` → `true`.
      Bunlar **yeni** repo'ları kapsıyor, modüldeki ayarlar **mevcut** repo'ları.
      İkisi farklı zaman dilimini koruyor, biri diğerinin yerine geçmez.
- [x] ✅ **`default_repository_permission` = `Read` → `None`** — **canlıda** _(2026-08-18)_.
      Değer kendi raporumuzda görünüyordu —
      [`04-collaborators-teams.png`](docs/images/pilot-verification/04-collaborators-teams.png)
      ekran görüntüsünde *"Base role: Read"*.
      **Yazma deliği yoktu, ama izolasyon da yoktu:** yeni gelen bir stajyer ilk günden
      org'daki tüm repo'ları görebiliyordu. Artık erişimin tek kaynağı takım üyeliği.
      Uygulama: [`terraform/org-settings.tf`](terraform/org-settings.tf) — `import` bloğuyla
      mevcut ayarlar state'e alındı, `plan` ile ~25 alanın hepsi karşılaştırıldı, sonra
      apply edildi. `plan` şimdi temiz.
      ⚠️ **Görülen sonuç:** `medine2906` iki pilot repo'ya erişimini kaybetti (yalnızca
      bu repo'nun `developers` listesinde). Beklenen davranış ama **dashboard testini
      etkiler** — takip [`TODO.md`](TODO.md)'de.
- [x] 🔑 ~~`billing_email` değerini arayüzden oku ve yaz~~ ✅ _(2026-08-18)_
      `github_organization_settings` tek alanı değil **org'un tüm ayar nesnesini** yönetir
      ve `billing_email` şemada **zorunlu**. Import sonrası plan onu boş okudu (App token'ı
      bu alanı okuyamıyor) — yani tahmini bir değerle apply edilseydi **org'un fatura
      e-postası sessizce değişirdi**. Arayüzden okunup yazıldı.
      💳 **Yan bulgu:** adres **ayrılan ekip üyesindeydi** — offboarding'de gözden kaçmış.
      Erişim 15 Ağustos'ta alınmıştı, fatura bildirimleri üç gün daha ona gitti.
      → Offboarding kontrol listesine madde eklenecek _(bkz. [`TODO.md`](TODO.md))_.
- [x] 🔑 ~~App'e `Organization → Administration: Read and write` izni ver~~ ✅ _(2026-08-18)_
      İlk apply `403 Resource not accessible by integration` verdi. App'te
      `Repository → Administration: write` vardı ama org ayarları için gereken izin **o
      değil**; GitHub `administration` ile `organization_administration`'ı ayrı tutuyor.
      **`Issues` ve `Workflows` 403'lerinin üçüncüsü** — örüntü net: geniş sanılan bir izin
      GitHub tarafında daha dar tanımlanmış. Yeni bir kaynak türüne ilk kez dokunurken izin
      tablosuna **önden** bakmak gerekiyor.
      İzin verildi, apply geçti. Manifest ve kurulum README'si güncellendi.
- [x] ✅ ~~`members_can_create_public_repositories = true`~~ — **kapatıldı** _(2026-08-18)_.
      Üçü de `false`: `repositories`, `public`, `private`. Artık yalnızca org owner elle
      repo açabilir; normal yol config'den geçiyor — dogfooding iddiası artık zorlanıyor.
      ⚠️ GitHub "sadece mentörler açsın" **diyemiyor**: org düzeyinde yetki ikili
      (tüm üyeler / yalnızca owner'lar), takım bazlı ara kademe yok. Bugün tek owner
      `uslanozan` olduğu için sonuç aynı; owner olmayan bir mentör gelirse repo açamaz.
      ✅ **Doğrulandı (2026-08-18):** ayar GitHub App'i **etkilemiyor.** Kısıt
      yürürlükteyken geçici bir repo config'den yaratıldı, `Creation complete after 11s`.
      Sebep: ayar org **üyelerini** hedefliyor; App org üyesi değil, kurulu bir
      entegrasyon ve kendi izinleriyle çalışıyor. Kısıtın istenen şekli tam olarak bu:
      **insan elle açamıyor, config açabiliyor.**
      🔗 [Restricting repository creation](https://docs.github.com/en/organizations/managing-organization-settings/restricting-repository-creation-in-your-organization)
      · [Roles in an organization](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization)
- [x] ✅ **`vulnerability_alerts` ayrı kaynağa taşındı** _(2026-08-18, test sırasında çıktı)_
      Apply, `github_repository.vulnerability_alerts` alanının **deprecate edildiğini**
      uyardı: *"Use the github_repository_vulnerability_alerts resource instead. This
      field will be removed in a future version."*
      Ayrı kaynağa geçildi (`github_repository_vulnerability_alerts`, `enabled` alanıyla).
      `4 to add, 0 to change` — yani geçiş mevcut ayarı bozmadı, sadece sahipliği taşıdı.
      **Ders:** deprecation uyarıları apply çıktısının sonunda görünüyor ve `Apply
      complete!` satırının gürültüsünde kolayca kaçıyor. Bugün ancak `grep` ile fark edildi.
- [x] ✅ ~~Org düzeyinde hiçbir güvenlik varsayılanı açık değil~~ — **kapatıldı**
      _(2026-08-18)_. Beşi `false` → `true` yapıldı; `advanced_security` bilerek `false`
      kaldı (GHAS/Enterprise lisansı ister). Detay yukarıdaki güvenlik maddelerinde.
- [x] 🔍 ✅ **"Kim bypass edebiliyor?" raporu** _(2026-08-18)_ —
      [`terraform/outputs.tf`](terraform/outputs.tf) → `branch_protection_bypass`.
      Repo × dal kırılımında muaf aktörleri listeliyor.
      **Karar E'nin (`enforce_admins` kalıcı `false`) doğrudan sonucu:** muafiyet teknik
      olarak kapatılmıyorsa geriye tek kontrol olarak *görünürlük* kalıyor. Emre'nin
      durumu 2026-08-15'te ancak `.tf` okunarak anlaşılabiliyordu — olayın aylarca fark
      edilmeme sebebi tam olarak buydu. Sunumda da güçlü bir demo olur.
      ⚠️ Rapor org kapsamlı listeyi `people`'dan okuyor ve **`people` henüz Terraform
      tarafından zorlanmıyor** — yani o kısım *beyan*, doğrulanmış gerçek değil. Output
      bunu `_uyari` alanında açıkça söylüyor; aşağıdaki `github_membership` işi bitince
      uyarı kalkacak.
      Bugünkü çıktı: her repo ve her dalda tek muaf aktör `uslanozan`.
- [x] ✅ [`docs/security-policy.md`](docs/security-policy.md) durum tablosu güncellendi
      _(2026-08-18)_ — Bölüm 5'ten ("Bunlara güvenmeyin") dört madde çıktı; yerine
      "5.1 Bu bölümden çıkanlar" tarihsel kaydı geldi. Tabloya iki yeni ⛔ eklendi
      (private repo'da secret scanning, `advanced_security`) ve
      `members_can_create_public_repositories` ⚠️ olarak girdi.

### 👤 `people` → organizasyon üyeliği

> **Bağlam (2026-08-15):** Emre'yi indirirken [`org-membership.tf`](terraform/org-membership.tf)
> tek kişilik bir **istisna dosyası** olarak açıldı. Bu kalıcı çözüm değil — her yeni üye
> için `.tf` düzenlemek gerekiyor ki bu, projenin "veri katmanı config'de" iddiasının tam
> tersi. Aşağıdaki iş bunu kapatır.

**Önce netleşen tasarım sorusu — iki katman çakışıyor mu?**

Hayır, üst üste biniyorlar. Farklı soruları cevaplıyorlar:

| Katman | Cevapladığı soru | Nerede tanımlı | Bugün tüketiliyor mu |
| :--- | :--- | :--- | :--- |
| **Org üyeliği** | Kişi org'da mı, **owner mı**? | `people` → şu an `org-membership.tf` | Yalnızca paitblack |
| **Repo erişimi** | Hangi repoda ne yapabilir? | `config/repositories/*.yml` | ✅ Tamamı |

Repo dosyası "bu kişi org owner mı" sorusunu **cevaplayamaz** — ve org owner branch
protection dahil her şeyi ezdiği için bu sorunun bir yerde cevaplanması zorunlu.
Emre olayının kökü tam olarak buydu.

**"Org'da developer, repo'da admin dersek ne olur?" — iki farklı okuma:**

- `people.X.roles: [developer]` + repo dosyasında `mentors: [X]` → **hiçbir şey olmaz.**
  `people` bölümünü Terraform hiç okumuyor ([`repositories.tf`](terraform/repositories.tf)
  yalnızca `defaults`, `roles`, `organization`, `org_admin_team` anahtarlarına dokunuyor).
  Repo dosyası kazanır, config sessizce yalan söyler. **Bugünkü en büyük tuzak bu.**
- `org_role: member` + repo dosyasında `mentors: [X]` → **çelişki değil, doğru kombinasyon.**
  Org'da sıradan üye, tek repoda admin — en az yetki ilkesinin kendisi.

Aynı katmanda iki yol varsa GitHub **en yükseği** uygular
(bkz. [`teams.tf`](terraform/teams.tf) yorumu). Org owner hepsini ezer.

**Sonuç kural:** `people` yalnızca kimlik + **org kapsamlı** rol taşır
(`org_role`, `head-of-engineering`). `mentor`/`developer` oraya **asla yazılmaz** —
onlar repo dosyalarının işi. [`organization.example.yml`](terraform/config/organization.example.yml)
bunu zaten böyle tarif ediyor, canlı config bu kurala uydurulmalı.

**Yapılacaklar:**
- [ ] `github_membership` ile org üyeliğini `people`'dan üret:
  ```hcl
  locals {
    # Break-glass: en az bir org owner Terraform dışında kalmalı.
    unmanaged_people = ["uslanozan"]
  }

  resource "github_membership" "people" {
    for_each = { for u, c in local.org_config.people : u => c
                 if !contains(local.unmanaged_people, u) }

    username             = each.key
    role                 = each.value.org_role
    downgrade_on_destroy = true
  }
  ```
- [ ] `platform-admins` üyeliğini de elle değil `people.roles`'tan üret — böylece
      offboarding tek satır YAML silmeye iner (bugün iki `.tf` dosyası düzenlemek gerekti):
  ```hcl
  resource "github_team_membership" "platform_admins" {
    for_each = toset([for u, c in local.org_config.people : u
                      if contains(try(c.roles, []), "head-of-engineering")])

    team_id  = github_team.platform_admins.id
    username = each.value
    role     = "maintainer"
  }
  ```
- [ ] Tamamlanınca `org-membership.tf` istisna dosyasını kaldır (state'te `moved` ile taşı)
- [ ] `people.roles` doğrulaması ekle — repo kapsamlı rol (`mentor`/`developer`) yazılırsa
      `precondition` ile hata ver; sessiz çelişki üretmesin
- [ ] ⚠️ **Riskli:** mevcut owner yetkilerini etkileyebilir. Önce `plan`'ı dikkatle
      incele, gerekirse `import` ile mevcut üyelikleri state'e al.
- [ ] ⚠️ `organization.example.yml`'i **asla** `for_each`'e sokma — içindeki `mentor-a`,
      `dev-1` gibi örnek kişilere gerçek org daveti gider
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
- [x] ~~Force push testi~~ ✅ **2026-08-17** — sonuç role göre ayrıştı: `developer`
      reddedildi, `mentor` geçti. Yani `enforce_admins = false` muafiyeti **force push ve
      dal silmeyi de kapsıyor** — Karar E'nin sanılandan geniş bir sonucu, bugüne kadar
      "PR/review kuralları" sanılıyordu.
- [x] ~~Drift düzeltme demosu~~ ✅ **2026-08-17** — `pilot-intern-web` `develop` onay
      sayısı arayüzden 1 → 2 yapıldı; `plan` bunu gerçek bir `~ update in-place` olarak
      gösterdi (kozmetik drift gürültüsünden ayırt edilebilir biçimde), `apply` geri aldı.
      **Sunumdaki drift demosu bu olacak.**
- [~] **Code owner testi — kısmen.** `developer` hesabı PR açtı ve kendi PR'ını merge
      edemedi; ancak bu `develop` üzerindeydi ve orada `require_code_owner_review: false`.
      Yani **onay zorunluluğu** kanıtlandı, **code owner mekanizması** değil. Tam kanıt
      için `main`'e açılan bir PR'ın *başka bir developer onayladığı halde* bloklu kalması
      gözlenmeli — **ikinci bir developer hesabı gerekiyor, tek bloklayan bu.**
- [ ] Sonuçları [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6'ya işle
      _(force push → 6.5, drift → 7, code owner → 6.5 kısmi olarak işlendi)_

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
  - [ ] `docs/adr/005-control-plane-repo-topology.md` — Faz 8'de yazılmadıysa burada yaz.
        Gerekçe zinciri: tek org → `develop` bir şey satın almıyor → ama
        `enforce_admins=false` mentörü tek repoda motordan ayırmayı imkânsız kılıyor →
        sınır repo sınırı olmak zorunda → config trunk-based, motor tag'li.
        Değerlendirilen alternatifler: tek repo trunk-based / path bazlı CODEOWNERS
        yönlendirmesi / iki repo. `adr/004` formatında.
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

### 🤖 Faz 9 — Otomasyon agent'ları _(2026-08-16'da konuşuldu, değerlendiriliyor)_

Diğer repolara karşı çalışan issue/review/güvenlik agent'ları. **Üçüncü tür artefakt:**
config bildirimseldir, motor onu uygular, agent'lar sürekli çalışır — Terraform değildir.

| Agent tipi | Nerede yaşar | Dağıtım |
| :--- | :--- | :--- |
| Olay güdümlü _(PR açıldı → review et)_ | Hedef repoda | **Faz 2'nin mekanizması** — config karar verir, modül workflow dosyasını yazar |
| Repo-üstü _(org geneli tarama)_ | Merkezi zamanlanmış workflow | Bu repoda ya da ayrı `tidyorg-automation` |

Şema Faz 2'nin doğal devamı — **yeni mekanizma gerekmiyor**:

```yaml
defaults:
  workflows: [ci]
  agents:
    review: true
    security: true
    triage: false
```

- [ ] ⚠️ **Ayrı GitHub App** — minimum izin: PR read/write, issues write, contents read.
      `tidyorg-infra-bot` kimliği (Administration + Contents + Members write) bir review
      agent'ına **asla** verilmez; birinin PR'a *"bu arada tüm branch protection'ları
      kaldır"* yazması yeterli olur. _(ROADMAP Karar H / K7)_
- [ ] `ACCESS-MODEL.md`'ye **"insan olmayan aktörler"** bölümü — bot'lar da rol taşır ve
      config'de görünür olmalı. Yoksa *"hangi bot neye erişebiliyor?"* sorusunun cevabı
      yine `.tf` okumakta olur: Emre olayının bot versiyonu.
- [ ] Agent altyapısı seçimi — karar verilince güncel referans dokümantasyonuna bakılacak
- [ ] Faz 2'nin `files`/`workflows` şemasını tasarlarken `agents` alanını **şimdiden
      düşün** (eklemek zorunda değilsin, ama şema onu kaldırabilecek şekilde kurulsun)

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
