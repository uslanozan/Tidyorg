> [!CAUTION]
> **[DEPRECATED]** Emre projeden ayrılmıştır. Bu dosya tarihsel kayıt olarak saklanmaktadır.
> Dashboard kısmı `tasks-medine.md` dosyasına taşınmıştır. Geri kalan fazlar (GitOps, GitHub App vb.) Ozan tarafından üstlenilecektir.
> Son güncelleme: 2026-08-15

---

# 🔧 Emre — Organizasyon & Kurallar

**Rol:** Organizasyonun iskeletini kurar — takımlar, yetkiler, dal korumaları, güvenlik politikaları  
**Alan:** Terraform core, RBAC, branch protection, güvenlik, Slack entegrasyonu  
**Tahmini Süre:** 4 hafta

> **Durum (2026-08-08):** Hafta 1–3 tamamlandı. Hafta 4 **ertelendi** — dış entegrasyonlar
> (Slack) ek özellik olarak sonraya bırakıldı; GitOps workflow'ları ve ADR'lar yeni
> yol haritasına taşındı. Bkz. [`ROADMAP.md`](ROADMAP.md).

---

## ✅ Hafta 1 — Terraform Temeli & Takım Yapısı — TAMAMLANDI

### 🔧 Terraform Kurulumu
- [x] Terraform CLI kurulumu (bilgisayara yükle)
- [x] [HCP Terraform (Cloud)](https://app.terraform.io) hesabı aç (ücretsiz)
  - [x] Organization oluştur: `tidyorg-infra`
  - [x] Workspace oluştur: `github-management`
- [x] GitHub Personal Access Token (PAT) oluştur
  - [x] Scope'lar: `repo`, `admin:org`, `read:org`, `delete_repo`
  - [x] Token'ı HCP Terraform'da Environment Variable olarak kaydet (`TF_VAR_github_token`, Sensitive işaretle)
  - ⚠️ _Terraform'un yaptığı commit'ler bu kişisel token yüzünden `paitblack` adına
    görünüyor. GitHub App'e geçiş yol haritasında — bkz. `docs/pilot-verification.md` Bölüm 5._

### 🔧 Terraform Core Dosyaları
- [x] `terraform/main.tf` — Provider & backend konfigürasyonu
  - [x] `integrations/github` provider tanımı (`~> 6.0`)
  - [x] HCP Terraform Cloud backend tanımı
  - [x] `provider "github"` bloğu
- [x] `terraform/variables.tf` — Değişken tanımları
  - [x] `github_token` (sensitive)
  - [x] `github_org_name`
  - [ ] ~~Default branch protection ayarları~~ → _config'e taşındı:_ `config/organization.yml` → `defaults.protected_branches`
  - [ ] ~~Default label listesi~~ → _config'e taşındı:_ `defaults.labels`
- [ ] `terraform/outputs.tf` — Output tanımları — **dosya boş, sadece yorum satırı var**
  - [ ] Oluşturulan team ID'leri
  - [ ] Oluşturulan repo URL'leri
  - _(Modül seviyesinde çıktılar mevcut: `modules/repository/outputs.tf`. Kök seviyede
    toplu çıktı henüz yok — yol haritasında.)_
- [x] `terraform/terraform.tfvars.example` — Örnek değişken dosyası (secret yok)
- [x] İlk `terraform init` çalıştır — provider indirilmeli, hata yok
- [x] İlk `terraform plan` çalıştır — boş plan, hata yok

### 🔧 Takım Yapısı (RBAC)
- [x] `terraform/teams.tf` — Takım tanımları _(10 takım canlıda, state'te doğrulandı)_
  - [x] `platform-admins` (privacy: closed)
  - [x] `core-engineering` (privacy: closed)
  - [x] `backend-team` (parent: core-engineering)
  - [x] `frontend-team` (parent: core-engineering)
  - [x] `devops-team` (parent: core-engineering)
  - [x] `tech-leads` (privacy: closed)
  - [x] `interns-2026` (privacy: closed)
  - [x] `interns-backend` (parent: interns-2026)
  - [x] `interns-frontend` (parent: interns-2026)
  - [x] `external-collaborators` (privacy: closed)
  - ⚠️ _Bu takımlar `ACCESS-MODEL.md`'deki rol tabanlı modelle örtüşmüyor. Yeni modelde
    yetki repo başına üretilen `<repo>-mentors` / `<repo>-devs` takımlarından geliyor.
    Bu 10 takımın akıbeti yol haritasında karara bağlanacak._
- [x] `terraform/team-memberships.tf` — Test üyelikleri
  - [x] Kendini uygun takımlara ekle
  - [x] Ozan'ı uygun takımlara ekle
- [x] `terraform plan` → planı incele
- [x] ✅ **Hafta Sonu Sync:** Ozan'ın PR'larını review et _(PR #1 ve #2 merge edildi)_

### 📖 Öğrenme Kaynakları
- [Terraform Get Started](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)
- [GitHub Provider Docs](https://registry.terraform.io/providers/integrations/github/latest/docs)
- [HCL Syntax](https://developer.hashicorp.com/terraform/language/syntax)

---

## ✅ Hafta 2 — Branch Protection & Org Templates — TAMAMLANDI

### 🔧 Branch Protection Kuralları
- [x] `terraform/branch-protection.tf` — Dal koruma kuralları
  - [x] `main` branch koruması:
    - [x] PR zorunlu, min 2 onay
    - [x] Stale review dismiss: true
    - [x] CI status checks zorunlu
    - [x] Force push yasak
    - [x] Branch silme yasak
    - [x] Admin enforcement: true — ⚠️ **`false` olmalı.** Bu ayarla mentörler `main`'e
      push atamıyor; `ACCESS-MODEL.md`'de mentörün her dala push atabilmesi kararlaştırıldı.
      Modül tarafında zaten `false`; yalnızca bu elle yazılmış kural uyumsuz.
  - [x] `develop` branch koruması:
    - [x] PR zorunlu, min 1 onay
    - [x] CI status checks zorunlu
    - [x] Force push yasak
    - [x] Admin enforcement: false
- [x] `terraform plan` + gözden geçir

> ⚠️ Bu dosya ayrıca `pilot-intern-api` repo'sunu ham `github_repository` bloğuyla
> oluşturuyor. O repo config'den yönetilmiyor; label'ı, takımı, CODEOWNERS'ı yok.
> Modüle taşınması yol haritasında.

### 📝 Organizasyon Şablon Dosyaları
- [x] `templates/.github/CODEOWNERS` — Dosya sahipliği kuralları
  ```
  *                       @org/core-engineering
  /infrastructure/        @org/devops-team
  /terraform/             @org/devops-team
  /.github/workflows/     @org/devops-team @org/tech-leads
  /docs/                  @org/tech-leads
  ```
- [x] `templates/CONTRIBUTING.md` — Katkıda bulunma rehberi _(iki dilli EN · TR)_
  - [x] Geliştirme ortamı kurulumu
  - [x] Branch açma kuralları
  - [x] Commit message formatı
  - [x] PR açma adımları
  - [x] Code review süreci
- [x] `templates/SECURITY.md` — Güvenlik politikası _(iki dilli EN · TR)_
  - [x] Güvenlik açığı nasıl bildirilir?
  - [x] Responsible disclosure
  - [x] Güvenlik açığı ciddiyet seviyeleri _(desteklenen sürüm tablosu olarak)_
- [x] `templates/.editorconfig` — Editör tutarlılık ayarları
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
  - _Engelli: her ikimiz de org owner olduğumuz için kurallar bize uygulanmıyor.
    Yalnızca `developer` rolüne sahip bir hesap gerekiyor — bkz. `TODO.md`._

---

## ✅ Hafta 3 — Dokümantasyon (Kurallar & Güvenlik) — TAMAMLANDI

### 📝 Branching Strategy Dokümanı
- [x] `docs/branching-strategy.md`
  - [x] Modified GitFlow açıklaması ve neden seçildiği
  - [x] Branch akış diyagramı (Mermaid gitGraph)
  - [x] Branch isimlendirme kuralları tablosu — _`feature/` → `feat/` olarak düzeltildi
    (`docs/engineering-standards-fixes` branch'inde)_
  - [x] Günlük iş akışı — terminal komutlarıyla adım adım
  - [x] Hotfix acil durum senaryosu
  - [x] Release hazırlık süreci — _detay `docs/release-process.md`'ye taşındı_
  - [x] Merge stratejisi (squash vs merge commit ne zaman?)

### 📝 Commit Convention Dokümanı
- [x] `docs/commit-convention.md`
  - [x] Conventional Commits formatı
  - [x] Type'lar tablosu (feat, fix, chore, refactor, docs, test, ci, perf)
  - [x] Scope örnekleri
  - [x] İyi vs kötü commit mesajı örnekleri
  - [x] SemVer ile ilişkisi (feat → minor, fix → patch, BREAKING → major)

### 📝 Güvenlik Politikası Dokümanı
- [x] `docs/security-policy.md`
  - [x] Secret management kuralları (GitHub Secrets, `.env` dosyaları)
  - [x] Dependabot yapılandırma rehberi
  - [x] Code scanning (CodeQL) kurulumu
  - [x] Push protection (secret leak engelleme)
  - [x] Güvenlik açığı raporlama süreci
  - ⚠️ _Doküman aktif olmayan korumaları aktifmiş gibi anlatıyordu; durum tablosu eklendi
    (`docs/engineering-standards-fixes` branch'inde). Push protection ve CodeQL private
    repo'larda GitHub Advanced Security gerektiriyor._

### 📝 RBAC Dokümanı
- [x] `docs/rbac-and-permissions.md`
  - [x] Takım hiyerarşisi diyagramı (Mermaid)
  - [x] Yetki matrisi tablosu (her rol neyi yapabilir?)
  - [x] "Yeni kişi nasıl eklenir?" adım adım rehber
  - [x] "Yetki nasıl değiştirilir?" rehber
  - [x] "Kişi ayrıldığında ne yapılmalı?" checklist
  - ⚠️ _Sabit takım hiyerarşisi yerine rol tabanlı modele göre yeniden yazıldı
    (`docs/engineering-standards-fixes` branch'inde). Merge bekliyor._

- [ ] ✅ **Hafta Sonu Sync:** Ozan'ın dokümanlarını review et, cross-reference'ları kontrol et
  - _Ozan'ın 7 dokümanı 2026-08-08'de yazıldı, review bekliyor._

---

## Hafta 4 — GitOps Döngüsü

> **Paralel:** Ozan bu hafta config'i repo başına dosyaya bölüyor (Faz 1). İki iş
> bağımsız; hafta sonunda birleşiyor.

### 🔧 Faz 3 — Bu repo'nun CI/CD'si
Dokümanların anlattığı "PR → plan → apply" akışı şu an elle çalışıyor. Otomatikleşmeli.

- [ ] `.github/workflows/terraform-plan.yml` — PR tetikli
  - [ ] `terraform fmt -check -recursive`
  - [ ] `terraform validate`
  - [ ] `terraform plan`
  - [ ] Plan çıktısını PR yorumu olarak yaz — **`destroy` sayısı görünür olmalı**
- [ ] `.github/workflows/terraform-apply.yml` — `main` merge tetikli
- [ ] GitHub Secrets: `TF_API_TOKEN` _(HCP team token)_
- [ ] Concurrency grubu — iki apply aynı anda çalışmasın

**Neden önemli:** Dashboard'un PR açması ancak bu döngü varsa anlamlı. Şu an dashboard
PR açsa bile kimse `plan` çıktısını görmez.

### 🧹 Faz 0 — Kalan temizlik
- [ ] **`pilot-intern-api`'yi modüle taşı** _(Ozan ile ortak)_
      Senin `branch-protection.tf`'indeki ham `github_repository` bloğu kaldırılacak,
      repo config'den yönetilecek. `terraform state mv` ile — silme/yeniden yaratma yok.
- [ ] **Ozan'ın bekleyen PR'larını review et**
  - [ ] `feat/repository-module` — Hafta 2'nin tamamı
  - [ ] `docs/engineering-standards-fixes` — senin dokümanlarına düzeltmeler
  - [ ] `feat/branch-protection-fixes` — senin şablonlarına düzeltmeler
- [ ] **Ozan'ın 7 dokümanını review et** _(Hafta 3'ten devreden)_

- [ ] ✅ **Hafta Sonu Sync:** Config bölünmesi sonrası bu repo'nun CODEOWNERS kurallarını
      birlikte yaz — `terraform/*.tf` insan onayına, `terraform/config/**` mentör onayına

---

## Hafta 5 — GitHub App & Kimlik

> **Paralel:** Ozan şablon ve workflow dağıtımını kuruyor (Faz 2).

### 🔐 Faz 4 — Kişisel token bağımlılığını bitir
Şu an tüm otomasyon senin kişisel token'ına bağlı ve Terraform'un attığı commit'ler
`paitblack` adına görünüyor _(kanıt: [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 5)_.
Sen ayrılırsan sistem durur.

- [ ] Org'da GitHub App oluştur: `tidyorg-infra-bot`
  - [ ] İzinler: `administration: write`, `contents: write`, `members: write`, `metadata: read`
  - [ ] Organizasyon geneli kurulum
- [ ] Private key'i HCP Terraform'a ve GitHub Secrets'a koy
- [ ] Terraform provider'ı App kimliğine geçir _(`app_auth` bloğu)_
- [ ] Doğrula: yeni bir `apply` sonrası commit'ler bot adına görünmeli
- [ ] [`docs/notes/github-auth-strategy.md`](docs/notes/github-auth-strategy.md)'yi
      "uygulandı" olarak güncelle

> **Dashboard için ikinci App gerekmiyor.** Dashboard kullanıcının kendi kimliğiyle
> çalışacak (device flow), kendi token'ı olmayacak — bkz. `ACCESS-MODEL.md` Karar 15.
> Bu App yalnızca Terraform içindir.

### 🔑 Dashboard için OAuth kimliği
- [ ] Device flow'u destekleyen bir GitHub App veya OAuth App oluştur
      _(yalnızca `client_id` gerekir; `client_secret` saklanmayacak)_
- [ ] Ayarlarda **"Enable Device Flow"** işaretle

### 🔒 Bu repo'yu kendi sistemimizle yönet _(dogfooding)_
- [ ] Bu repo'yu `config/repositories/` altına ekle
- [ ] Branch protection'ı config'den gelsin — elle ayarlanmış kural kalmasın

---

## Hafta 6 — Dashboard: Okuma ve Yazma

> **Paralel:** Ozan güvenlik ayarlarını ve config JSON Schema'sını yazıyor.

> **Mimari:** Dashboard'un kendi token'ı yok. Kullanıcı device flow ile giriş yapar,
> işlemler onun kimliğiyle yapılır. Sunucu tarafında saklanan sır yok; yetkilendirmeyi
> GitHub'ın kendisi uyguluyor. Ayrıntı: `ACCESS-MODEL.md` Karar 15.
>
> Gerekirse küçük bir backend eklenebilir — Ozan ile kararlaştırılacak.

### 🖥️ Faz 5a — Okuma modu
Risksiz başlangıç: değer üretir, hiçbir şeyi değiştirmez.

- [ ] Proje iskeleti — bu repo içinde `dashboard/` klasörü _(framework seçimi sende)_
- [ ] **GitHub device flow** ile giriş — `client_secret` saklanmıyor
- [ ] Kullanıcının rolünü config'den oku _(head-of-engineering / mentor / developer)_
- [ ] Repo listesi: her repo'nun mentörü, developer'ları, kuralları
- [ ] Kişi görünümü: bir kişinin hangi projelerde olduğu

### ✍️ Faz 5b — Yazma (PR akışı)
- [ ] Contents API üzerinden dosya yazma — **kullanıcının token'ıyla**
- [ ] **Kayıp güncelleme koruması:** dosyanın `sha`'sını gönder; 409 dönerse oku ve
      tekrar dene
- [ ] Branch aç + PR aç _(doğrudan `main`'e yazma yok)_
- [ ] YAML doğrudan yazılır — JSON'a dönüştürme yok. `config/repositories/*.yml`
      makine sahiplidir, serbestçe yeniden üretilebilir.
- [ ] Ozan'ın JSON Schema'sı ile kaydetmeden önce doğrulama
      _(şemayı Ozan yazacak; ihtiyacın olursa değiştirebilirsin)_
- [ ] **Yetkilendirme** — kullanıcının kendi token'ı olduğu için GitHub zaten uyguluyor.
      Arayüzde başkasının repo'sunu göstermemek yine de iyi bir pratik; CODEOWNERS
      merge anında ikinci savunma hattı.

- [ ] ✅ **Hafta Sonu Sync:** Okuma modunu birlikte gözden geçir

---

## Hafta 7 — Dashboard: Önizleme ve Uygulama

> **Paralel:** Ozan README, doküman bakımı ve sunum yapısı üzerinde.

### 👁️ Faz 5c — Plan görünümü
> HCP API entegrasyonu **gerekmiyor.** Faz 3'teki workflow zaten `plan` çıktısını PR'a
> yorum olarak yazıyor; dashboard onu okuyup gösterir.

- [ ] Açılan PR'ın yorumlarını kullanıcının token'ıyla oku
- [ ] Plan özetini anlaşılır biçimde göster:
      _"2 kişi çıkarılacak, 1 kişi eklenecek, 0 kaynak silinecek"_
- [ ] `destroy` içeren planlarda belirgin uyarı
- [ ] PR henüz plan üretmediyse "bekleniyor" durumu

### ⚡ Faz 5d — Hızlı yol _(değerlendirilecek)_
Düşük riskli işlemlerde PR beklemeden uygulama. Yükseltilmiş yetki gerektirdiği için
küçük bir servis gerekebilir — **Ozan ile birlikte karar verilecek.**

- [ ] İhtiyaç var mı? PR akışı yeterince hızlıysa bu adım atlanabilir
- [ ] Gerekiyorsa: **anında** → kişi ekleme/çıkarma, mentör atama;
      **PR zorunlu** → rol tanımı değişikliği, repo arşivleme
      _(rol tanımı tek satırla tüm organizasyonu etkiler)_
- [ ] Acil erişim kesme akışı — [`docs/runbook.md`](docs/runbook.md) 1.5'teki sıralamaya
      uygun

### 🧪 Ortak
- [ ] **Uçtan uca pilot test** _(Ozan ile)_
- [ ] **Sunum — canlı demo** _(Terraform apply + dashboard gösterimi)_
- [ ] **README.md** — Ozan'ın taslağını review et

---

## ⏸️ Ertelenen — Ek Özellikler

> Sistemin çalışması için gerekli değil. Çekirdek işler bittiğinde ele alınacak.

## Hafta 8+ — Slack Entegrasyonu & ADR'lar

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

> _GitOps workflow'ları **Hafta 4**'e, pilot test / sunum / README review **Hafta 7**'ye
> taşındı._

### 📝 ADR'lar (Architecture Decision Records)
- [ ] `docs/adr/001-branching-strategy.md` — Neden Modified GitFlow?
- [ ] `docs/adr/002-terraform-for-github.md` — Neden Terraform?
- _Küçük işler; kararlar zaten uygulanmış durumda, yalnızca yazılı kayıt eksik.
  Boşluk bulunca yazılabilir._

### 🔐 Ruleset'e geçiş _(Team planı geldiğinde)_
- [ ] `github_repository_ruleset` / `github_organization_ruleset` değerlendirmesi
- [ ] `docs/adr/005-rulesets-vs-branch-protection.md`
- _Katmanlanabilir kurallar ve `bypass_actors` modele daha uygun — bkz. `ACCESS-MODEL.md`_

---

## Her Hafta Tekrarlanan Görevler
- [ ] Ozan'ın PR'larını review et
- [ ] Kendi değişikliklerini PR ile yap (dogfooding)
- [ ] Terraform kodlarını `terraform fmt` ile formatla
- [ ] Hafta sonu sync toplantısı
