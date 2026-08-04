# Tidyorg GitHub Infrastructure — Implementation Plan

Şirket genelinde standart bir GitHub geliştirme iş akışı (workflow) tasarlamak ve bunu **Infrastructure as Code (IaC)** prensipleriyle Terraform kullanarak kodlamak. Sonuç olarak her yeni proje, ekip veya stajyer grubu için tekrarlanabilir, güvenli ve denetlenebilir bir altyapı oluşturmak.

## Proje Özeti

| Özellik | Değer |
|---|---|
| **Hedef Kitle** | 50+ kişilik organizasyon (çoklu ekipler, stajyerler, dış paydaşlar) |
| **Teknolojiler** | Go, Python, TypeScript/Node.js, PHP/Laravel + çoklu microservice |
| **IaC Aracı** | Terraform (HashiCorp) + GitHub Provider |
| **Branching** | Modified GitFlow (mevcut ekip deneyimine dayalı) |
| **Versiyonlama** | Semantic Versioning (v1.2.3) |
| **Süre** | ~1 ay (acele yok) |
| **Ekip** | 2 kişi |

---

## User Review Required

> [!IMPORTANT]
> **Branching Stratejisi Kararı:** Mevcut projenizde GitFlow (main + develop) kullanıyorsunuz. Yeni sistem için iki seçenek öneriyorum:
> 1. **Modified GitFlow** (mevcut deneyiminize yakın): `main` + `develop` + feature branches. Büyük organizasyonlar için stabil, release yönetimi kolay.
> 2. **Trunk-Based Development**: Sadece `main` + kısa ömürlü feature branches. Daha basit ama CI/CD olgunluğu gerektirir.
> 
> **Önerim:** Organizasyon büyük ve çoklu microservice var → **Modified GitFlow** ile devam edelim. Sizin mevcut deneyiminize de uyuyor.

> [!WARNING]
> **GitHub Plan Gereksinimi:** Branch protection rules ve Rulesets gibi özellikler GitHub **Free** planda sadece **public** repolar için çalışır. **Private** repolarda kullanmak için **GitHub Team** ($4/user/ay) veya **Enterprise** plan gerekir. Organizasyonunuzun planını kontrol edin.

> [!IMPORTANT]
> **Terraform State Yönetimi:** 2 kişi çalıştığınız için Terraform state dosyasını paylaşmanız şart. İki seçenek:
> 1. **(Önerilen)** **HCP Terraform (Terraform Cloud)** — Ücretsiz, 500 resource'a kadar. En kolay setup.
> 2. **AWS S3 + DynamoDB** — Eğer şirkette AWS varsa. Daha kurumsal ama setup karmaşık.

## Open Questions

> [!IMPORTANT]
> 1. **GitHub Organization adı ne olacak?** (örn: `tidyorg-tech`, `tidyorg-dev`)
> 2. **GitHub planınız ne?** (Free, Team, Enterprise) — Branch protection ve Rulesets için kritik.
> 3. **Pilot test organizasyonu için ayrı bir org mu açacaksınız yoksa mevcut org altında test repo mu?**
> 4. **Şirketteki mevcut takım yapısı nasıl?** (Backend, Frontend, DevOps, Mobile vb. kaç takım var?)
> 5. **Terraform state için HCP Terraform (Cloud) kullanmak uygun mu?**

---

## Proposed Changes

Proje 7 fazda organize edilmiştir. Her faz bağımsız olarak geliştirilebilir ve test edilebilir.

---

### Faz 1: Foundation & Terraform Setup

Bu fazda Terraform altyapısı kurulur ve GitHub Provider bağlantısı yapılır.

#### [NEW] [main.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/main.tf)
Terraform provider konfigürasyonu. GitHub'a bağlanma ayarları.
```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  # HCP Terraform (Cloud) backend — 2 kişinin state paylaşması için
  cloud {
    organization = "tidyorg-infra"
    workspaces {
      name = "github-management"
    }
  }
}

provider "github" {
  owner = var.github_org_name
  token = var.github_token
}
```

#### [NEW] [variables.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/variables.tf)
Tüm değişken tanımları. Token'lar, org adı, default ayarlar.

#### [NEW] [outputs.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/outputs.tf)
Terraform çıktıları — oluşturulan repo URL'leri, team ID'leri vb.

#### [NEW] [.gitignore](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/.gitignore)
Terraform state dosyaları, `.terraform/` dizini, `.tfvars` gibi hassas dosyaların git'e eklenmemesi.

#### [NEW] [terraform.tfvars.example](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/terraform.tfvars.example)
Örnek değişken dosyası (gerçek token'lar olmadan). Onboarding için referans.

**Klasör Yapısı:**
```
Tidyorg/
├── terraform/
│   ├── main.tf                    # Provider & backend config
│   ├── variables.tf               # Variable definitions
│   ├── outputs.tf                 # Output values
│   ├── terraform.tfvars.example   # Example variables (no secrets)
│   ├── organization.tf            # Org-level settings
│   ├── teams.tf                   # Team definitions & memberships
│   ├── repositories.tf            # Repository definitions
│   ├── branch-protection.tf       # Branch protection rules
│   └── modules/
│       ├── repository/            # Reusable repo module
│       │   ├── main.tf
│       │   ├── variables.tf
│       │   └── outputs.tf
│       └── team/                  # Reusable team module
│           ├── main.tf
│           ├── variables.tf
│           └── outputs.tf
├── templates/                     # GitHub template repo files
│   ├── .github/
│   │   ├── ISSUE_TEMPLATE/
│   │   ├── PULL_REQUEST_TEMPLATE.md
│   │   ├── workflows/
│   │   └── CODEOWNERS
│   ├── README.md
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   └── .editorconfig
├── docs/                          # Workflow documentation
│   ├── workflow-guide.md
│   ├── onboarding.md
│   ├── branching-strategy.md
│   ├── code-review-guide.md
│   ├── release-process.md
│   └── adr/                      # Architecture Decision Records
├── integrations/                  # Harici araç entegrasyonları
│   ├── linear/                    # Linear entegrasyonu
│   ├── slack/                     # Slack entegrasyonu
│   └── docs/                      # Entegrasyon rehberleri
├── presentation/                  # Sunum dosyaları
└── README.md                      # Proje ana README
```

---

### Faz 2: Organization & RBAC (Role-Based Access Control)

Takım yapısı, yetki hiyerarşisi ve üyelik yönetimi.

#### [NEW] [teams.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/teams.tf)
Tüm organizasyon takımlarının tanımları.

**Önerilen Takım Hiyerarşisi:**

```
Organization Owners (2-3 kişi max)
│
├── @org/platform-admins          → Admin (org-wide settings, emergency access)
│
├── @org/core-engineering         → Maintain (tüm repolarda)
│   ├── @org/backend-team         → Write (backend repoları)
│   ├── @org/frontend-team        → Write (frontend repoları)
│   ├── @org/devops-team          → Admin (infra repoları), Write (diğer)
│   └── @org/mobile-team          → Write (mobile repoları)
│
├── @org/tech-leads               → Maintain (review authority)
│
├── @org/interns-2026             → Read (tüm), Triage (atanan projeler)
│   ├── @org/interns-backend      → Write (sadece intern projeleri)
│   └── @org/interns-frontend     → Write (sadece intern projeleri)
│
└── @org/external-collaborators   → Read (sadece ilgili repolar)
```

**Yetki Matrisi:**

| Rol | Repo Erişimi | Branch Push | PR Açma | PR Onaylama | Merge | Repo Ayarları |
|---|---|---|---|---|---|---|
| **Owner** | Admin | ✅ (hepsi) | ✅ | ✅ | ✅ | ✅ |
| **Platform Admin** | Admin | ✅ (hepsi) | ✅ | ✅ | ✅ | ✅ |
| **Tech Lead** | Maintain | ❌ main/develop | ✅ | ✅ | ✅ | ❌ |
| **Developer** | Write | ❌ main/develop | ✅ | ✅ | ✅ (onay sonrası) | ❌ |
| **Intern** | Read/Triage | ❌ main/develop | ✅ (atanan repo) | ❌ | ❌ | ❌ |
| **External** | Read | ❌ | ✅ (fork ile) | ❌ | ❌ | ❌ |

#### [NEW] [team-memberships.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/team-memberships.tf)
Takım üyeliklerinin yönetimi. Yeni bir kişi eklemek = bu dosyaya bir satır eklemek.

---

### Faz 3: Repository Standards & Templates

Yeni projeler için standart dosya şablonları ve repo oluşturma modülü.

#### [NEW] [modules/repository/main.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/modules/repository/main.tf)
Tekrarlanabilir repo modülü. Bir repo oluşturduğunuzda otomatik olarak:
- Branch protection kuralları eklenir
- Default label'lar oluşturulur
- Team erişimleri ayarlanır
- Template'den dosyalar kopyalanır

```hcl
# Kullanım örneği (repositories.tf'de):
module "backend_api" {
  source = "./modules/repository"

  name        = "backend-user-service"
  description = "User authentication and profile management service"
  language    = "go"           # go | python | typescript | php
  visibility  = "private"
  team_access = {
    "backend-team"    = "push"
    "interns-backend" = "pull"
    "tech-leads"      = "maintain"
  }
  branch_protection = {
    required_reviews = 1
    enforce_admins   = true
    require_ci       = true
  }
}
```

#### [NEW] [.github/ISSUE_TEMPLATE/bug_report.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/ISSUE_TEMPLATE/bug_report.yml)
YAML-based issue form (dropdown, required fields destekli). Hata raporları için zorunlu alanlar:
- Hata açıklaması
- Tekrar adımları
- Beklenen davranış
- Gerçekleşen davranış
- Ortam bilgisi (OS, browser, version)
- Ekran görüntüsü (opsiyonel)

#### [NEW] [.github/ISSUE_TEMPLATE/feature_request.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/ISSUE_TEMPLATE/feature_request.yml)
Özellik talebi formu. Alanlar:
- Özellik açıklaması
- İş değeri / motivasyon
- Kabul kriterleri
- Tasarım notları (opsiyonel)

#### [NEW] [.github/ISSUE_TEMPLATE/config.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/ISSUE_TEMPLATE/config.yml)
Template seçici konfigürasyonu. Boş issue açmayı yasaklama, harici link'ler ekleme.

#### [NEW] [.github/PULL_REQUEST_TEMPLATE.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/PULL_REQUEST_TEMPLATE.md)
PR şablonu. Kısa ve pratik:
- **Ne değişti?** (What)
- **Neden değişti?** (Why)
- **Nasıl test edildi?** (How)
- **Checklist** (testler, lint, docs güncellendi mi?)
- **İlgili Issue** (Closes #123)

#### [NEW] [.github/CODEOWNERS](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/CODEOWNERS)
Örnek CODEOWNERS dosyası:
```
# Default: Core engineering review gerekir
*                       @org/core-engineering

# Altyapı dosyaları: sadece DevOps onaylayabilir
/infrastructure/        @org/devops-team
/terraform/             @org/devops-team
*.dockerfile            @org/devops-team
docker-compose*.yml     @org/devops-team

# CI/CD pipeline'ları: DevOps + Tech Leads
/.github/workflows/     @org/devops-team @org/tech-leads

# Dokümantasyon: herkes katkıda bulunabilir ama review gerekli
/docs/                  @org/tech-leads
```

#### [NEW] [templates/CONTRIBUTING.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/CONTRIBUTING.md)
Katkıda bulunma rehberi: branch açma, commit yazma, PR açma adımları.

#### [NEW] [templates/SECURITY.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/SECURITY.md)
Güvenlik açığı raporlama politikası.

#### [NEW] [templates/.editorconfig](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.editorconfig)
Tüm editörler için tutarlı kod formatlama (indent, charset, line ending).

---

### Faz 4: Branch Protection & Merge Strategy

#### [NEW] [branch-protection.tf](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/terraform/branch-protection.tf)
Tüm repolara uygulanacak standart dal koruma kuralları.

**Branching Stratejisi (Modified GitFlow):**

```
main (production-ready, always stable)
 │
 └── develop (active development, integration branch)
      │
      ├── feature/user-auth      (yeni özellik)
      ├── fix/login-bug           (hata düzeltme)
      ├── chore/update-deps       (bakım)
      └── hotfix/critical-fix     (acil düzeltme → main'den branch)
```

**Branch İsimlendirme Kuralları:**
| Prefix | Kullanım | Base Branch |
|---|---|---|
| `feature/` | Yeni özellik | `develop` |
| `fix/` | Hata düzeltme | `develop` |
| `chore/` | Bakım, refactor | `develop` |
| `docs/` | Dokümantasyon | `develop` |
| `hotfix/` | Acil prod düzeltme | `main` |
| `release/` | Yayın hazırlık | `develop` |

**Branch Protection Kuralları:**

| Kural | `main` | `develop` |
|---|---|---|
| Direct push yasak | ✅ | ✅ |
| PR zorunlu | ✅ | ✅ |
| Min. onay sayısı | 2 | 1 |
| Stale review dismiss | ✅ | ✅ |
| CI checks zorunlu | ✅ | ✅ |
| Force push yasak | ✅ | ✅ |
| Branch silme yasak | ✅ | ✅ |
| Admin'ler de kurallara tabi | ✅ | ❌ |
| Signed commits | Opsiyonel | ❌ |

**Merge Stratejisi:**
- `feature → develop`: **Squash and Merge** (temiz commit geçmişi)
- `develop → main`: **Merge Commit** (release noktalarını görmek için)
- `hotfix → main`: **Merge Commit** + sonra `main → develop` merge

**Commit Message Convention (Conventional Commits):**
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type | Açıklama | SemVer Etkisi |
|---|---|---|
| `feat` | Yeni özellik | MINOR (v1.**1**.0) |
| `fix` | Hata düzeltme | PATCH (v1.0.**1**) |
| `chore` | Bakım, config | Yok |
| `refactor` | Kod iyileştirme | Yok |
| `docs` | Dokümantasyon | Yok |
| `test` | Test ekleme | Yok |
| `ci` | CI/CD değişikliği | Yok |
| `perf` | Performans | PATCH |
| `BREAKING CHANGE` | Kırılma değişikliği | MAJOR (v**2**.0.0) |

---

### Faz 5: CI/CD & Automation (GitHub Actions)

#### [NEW] [templates/.github/workflows/ci.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/workflows/ci.yml)
Temel CI pipeline. PR açıldığında otomatik çalışır:
1. **Lint** — Kod standartlarına uygunluk kontrolü
2. **Test** — Birim ve entegrasyon testleri
3. **Build** — Derleme/paketleme kontrolü
4. **Security Scan** — Bağımlılık güvenlik taraması

Dil bazında tool'lar:
| Dil | Linter | Test | Build |
|---|---|---|---|
| Go | `golangci-lint` | `go test` | `go build` |
| Python | `ruff` | `pytest` | — |
| TypeScript | `eslint` + `prettier` | `jest` / `vitest` | `tsc --noEmit` |
| PHP/Laravel | `phpstan` + `pint` | `phpunit` | — |

#### [NEW] [templates/.github/workflows/release.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/workflows/release.yml)
Release workflow. `develop → main` merge sonrası:
1. Semantic version tag oluşturma (otomatik)
2. GitHub Release oluşturma (changelog ile)
3. (Opsiyonel) Docker image build & push

#### [NEW] [templates/.github/workflows/dependabot.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/templates/.github/dependabot.yml)
Dependabot konfigürasyonu — haftalık bağımlılık güncelleme PR'ları.

#### [NEW] [.github/workflows/terraform-plan.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/.github/workflows/terraform-plan.yml)
**Bu repo'nun kendi CI/CD'si.** PR açıldığında `terraform plan` çalıştırıp sonucu PR'a yorum olarak yazar.

#### [NEW] [.github/workflows/terraform-apply.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/.github/workflows/terraform-apply.yml)
`main` branch'e merge olduğunda `terraform apply` çalıştırır — GitHub org gerçekten güncellenir.

---

### Faz 6: Documentation & Governance

#### [NEW] [docs/workflow-guide.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/workflow-guide.md)
Ana iş akışı dokümanı. Tüm süreçlerin adım adım açıklaması:
- Günlük geliştirme döngüsü
- PR açma ve review süreci
- Release süreci
- Hotfix süreci

#### [NEW] [docs/onboarding.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/onboarding.md)
Yeni geliştirici katılım rehberi:
- GitHub org'a davet süreci
- Geliştirme ortamı kurulumu
- İlk PR'ınızı açma rehberi
- Commit message standartları
- Code review beklentileri

#### [NEW] [docs/branching-strategy.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/branching-strategy.md)
Branching stratejisinin detaylı açıklaması, diyagramlar ve örneklerle.

#### [NEW] [docs/code-review-guide.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/code-review-guide.md)
Code review rehberi:
- Review yapan kişi nelere bakmalı?
- Review isteyen kişi PR'ını nasıl hazırlamalı?
- Yapıcı geri bildirim verme kuralları
- Review SLA'ları (ne kadar sürede review edilmeli?)

#### [NEW] [docs/release-process.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/release-process.md)
Release ve versiyonlama süreci. SemVer kullanımı, changelog oluşturma.

#### [NEW] [docs/security-policy.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/security-policy.md)
Güvenlik politikaları:
- Secret management (GitHub Secrets, `.env` dosyaları)
- Dependabot yapılandırması
- Code scanning (CodeQL)
- Push protection (secret leak engelleme)

#### [NEW] [docs/adr/001-branching-strategy.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/adr/001-branching-strategy.md)
Architecture Decision Record — Neden Modified GitFlow seçildi?

#### [NEW] [docs/adr/002-terraform-for-github.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/adr/002-terraform-for-github.md)
ADR — Neden Terraform ile GitHub yönetimi?

#### [NEW] [docs/labels.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/labels.md)
Standart label seti dokümantasyonu.

**Önerilen Label Seti:**

| Label | Renk | Kategori | Açıklama |
|---|---|---|---|
| `type: bug` | 🔴 `#d73a4a` | Type | Hata raporu |
| `type: feature` | 🟢 `#0e8a16` | Type | Yeni özellik |
| `type: chore` | 🟡 `#fbca04` | Type | Bakım/config |
| `type: docs` | 🔵 `#0075ca` | Type | Dokümantasyon |
| `priority: critical` | 🔴 `#b60205` | Priority | Acil |
| `priority: high` | 🟠 `#d93f0b` | Priority | Yüksek |
| `priority: medium` | 🟡 `#fbca04` | Priority | Orta |
| `priority: low` | 🟢 `#0e8a16` | Priority | Düşük |
| `status: in-review` | 🟣 `#5319e7` | Status | İnceleniyor |
| `status: blocked` | ⚫ `#000000` | Status | Bloklanmış |
| `status: ready` | 🟢 `#0e8a16` | Status | Hazır |
| `lang: go` | 🔵 `#00ADD8` | Language | Go projesi |
| `lang: python` | 🔵 `#3572A5` | Language | Python projesi |
| `lang: typescript` | 🔵 `#3178C6` | Language | TypeScript projesi |
| `good first issue` | 🟢 `#7057ff` | Onboarding | Yeni başlayanlar için |
| `help wanted` | 🟢 `#008672` | Onboarding | Yardım isteniyor |

#### [NEW] [docs/github-projects.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/github-projects.md)
GitHub Projects (Board) yapılandırması:
- **Backlog** → **Todo** → **In Progress** → **In Review** → **Done** kolonları
- Otomatik kolon geçişleri (PR açıldığında → In Review)
- Sprint/Milestone bazlı filtreleme
- Issue'dan PR'a bağlantı

#### [NEW] [README.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/README.md)
Projenin ana README'si. Kurulum, kullanım ve katkıda bulunma rehberi.

---

### Faz 7: External Integrations (Linear / ClickUp / Slack)

GitHub workflow'unu harici proje yönetimi ve iletişim araçlarına bağlama. Bu faz, ekiplerin tercih ettiği araçları GitHub ile senkronize tutmayı sağlar.

> [!NOTE]
> Bu faz bir "gelecek yatırımı" olarak tasarlanmıştır. Temel altyapı (Faz 1-6) tamamlandıktan sonra uygulanır. Hangi araçların kullanılacağı organizasyonun tercihine bağlıdır.

#### 7a. Linear Entegrasyonu

**Neden Linear?** Modern mühendislik ekiplerinde en popüler issue tracker. GitHub Issues'tan daha güçlü sprint planlama, roadmap ve OKR takibi sunar.

#### [NEW] [integrations/linear/github-sync.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/integrations/linear/github-sync.md)
Linear ↔ GitHub senkronizasyon rehberi:
- **Linear → GitHub:** Linear'da issue oluşturulduğunda otomatik GitHub Issue/Branch oluşturma
- **GitHub → Linear:** PR merge edildiğinde Linear issue'yu otomatik kapatma
- Linear'ın native GitHub entegrasyonunu kullanma (Settings → Integrations → GitHub)
- Branch adını Linear issue ID'si ile eşleştirme (örn: `feat/LIN-123-user-auth`)

#### [NEW] [integrations/linear/workflows.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/integrations/linear/workflows.yml)
Linear webhook'larını dinleyen GitHub Actions workflow'u:
- Issue state değişikliklerini GitHub Projects board'una yansıtma
- Linear label'larını GitHub label'larına mapping

#### 7b. ClickUp Entegrasyonu (Alternatif)

#### [NEW] [integrations/clickup/github-sync.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/integrations/clickup/github-sync.md)
ClickUp ↔ GitHub senkronizasyon rehberi:
- ClickUp'ın native GitHub entegrasyonunu yapılandırma
- PR'ları ClickUp task'larına bağlama (commit mesajında `CU-xxxx`)
- ClickUp Automations ile GitHub event'lerini tetikleme
- Status mapping: ClickUp statuses ↔ GitHub Projects columns

#### 7c. Slack Entegrasyonu

**Neden Slack?** Gerçek zamanlı bildirimler ve ekip iletişimi. GitHub event'lerinin doğru kanallara yönlendirilmesi.

#### [NEW] [integrations/slack/notification-setup.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/integrations/slack/notification-setup.md)
Slack bildirim yapılandırması:
- **GitHub + Slack App** kurulumu (native entegrasyon)
- Kanal bazlı bildirim routing:
  | GitHub Event | Slack Kanalı |
  |---|---|
  | PR opened/merged | `#dev-pull-requests` |
  | PR review requested | DM to reviewer |
  | CI/CD failed | `#dev-alerts` |
  | Release published | `#releases` |
  | Security alert | `#security-alerts` |
  | Issue created | `#dev-issues` |
- Gereksiz bildirim gürültüsünü filtreleme kuralları
- Custom Slack bot (opsiyonel) — `/deploy`, `/release-notes` gibi slash command'lar

#### [NEW] [integrations/slack/github-actions-slack.yml](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/integrations/slack/github-actions-slack.yml)
CI/CD sonuçlarını Slack'e gönderen reusable GitHub Actions workflow:
```yaml
# Örnek kullanım
- name: Notify Slack on CI Failure
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ CI Failed on ${{ github.repository }}",
        "blocks": [...]
      }
```

#### 7d. Webhook & API Gateway (İleri Seviye)

#### [NEW] [integrations/docs/webhook-architecture.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/integrations/docs/webhook-architecture.md)
Tüm entegrasyonları merkezi bir noktadan yönetme mimarisi:
- GitHub Webhooks → API Gateway → Linear/ClickUp/Slack
- Neden merkezi? Tek bir noktada loglama, retry logic, rate limiting
- İleride Zapier/n8n gibi no-code araçlarla genişletme seçeneği

#### [NEW] [docs/adr/003-external-integrations.md](file:///c:/Users/uslan/Desktop/Projects/Tidyorg/docs/adr/003-external-integrations.md)
ADR — Neden Linear/Slack tercih edildi? ClickUp vs Linear karşılaştırması, karar kriterleri.

---

## İş Bölümü — Alan Bazlı (Vertical Slice)

İş, **dosya bazlı** ayrılmıştır. Her kişi tamamen farklı dosyalara dokunur → **sıfır git conflict**.  
Her iki kişi de hem teknik (Terraform/YAML) hem dokümantasyon (Markdown) işi yapar.

### Emre — "Organizasyon & Kurallar"
Organizasyonun iskeletini kurar: takımlar, yetkiler, dal korumaları, güvenlik politikaları.

| Alan | Dosyalar |
|---|---|
| **Terraform** | `main.tf`, `variables.tf`, `outputs.tf`, `teams.tf`, `team-memberships.tf`, `branch-protection.tf`, `modules/team/` |
| **Templates** | `CODEOWNERS`, `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig` |
| **Docs** | `rbac-and-permissions.md`, `branching-strategy.md`, `commit-convention.md`, `security-policy.md` |
| **ADR'lar** | `001-branching-strategy.md`, `002-terraform-for-github.md` |
| **Integrations** | Slack (bildirim routing, Actions workflow) |

### Ozan — "Repository & Workflow"
Geliştiricilerin günlük kullanacağı her şeyi kurar: şablonlar, CI/CD, iş akışı rehberleri.

| Alan | Dosyalar |
|---|---|
| **Terraform** | `repositories.tf`, `modules/repository/`, `labels.tf` |
| **Templates** | Issue templates (`bug_report.yml`, `feature_request.yml`, `config.yml`), `PULL_REQUEST_TEMPLATE.md`, CI/CD workflows (`ci.yml`, `release.yml`, `dependabot.yml`) |
| **Docs** | `workflow-guide.md`, `onboarding.md`, `code-review-guide.md`, `release-process.md`, `github-projects.md`, `labels.md` |
| **ADR'lar** | `003-external-integrations.md` |
| **Integrations** | Linear / ClickUp (issue sync, webhook) |

### Ortak Çalışma Alanları
| Dosya | Nasıl? |
|---|---|
| `README.md` | Birlikte yazılır (Ozan taslak, Emre review) |
| Pilot Test | Birlikte yapılır |
| Sunum | Birlikte hazırlanır (Ozan yapı, Emre demo) |
| `.github/workflows/terraform-*.yml` | Emre yazar, Ozan review eder |

### Eş Zamanlı İlerleme Tablosu

| Hafta | Emre 🔧 | Ozan 📦 | Sync Noktası |
|---|---|---|---|
| **Hafta 1** | Terraform setup (`main.tf`, `variables.tf`) + `teams.tf` | Proje yapısı + `.gitignore` + Issue/PR templates | Hafta sonu: PR review |
| **Hafta 2** | `branch-protection.tf` + CODEOWNERS + CONTRIBUTING.md | `modules/repository/` + `repositories.tf` + CI/CD workflows | Hafta sonu: Birlikte test |
| **Hafta 3** | Branching strategy doc + commit convention doc + security doc | Workflow guide + onboarding doc + code review guide + release doc | Hafta sonu: Doküman review |
| **Hafta 4** | Slack entegrasyonu + `terraform-plan.yml` Actions + ADR'lar | Linear/ClickUp entegrasyonu + GitHub Projects doc + labels doc + ADR | Hafta sonu: Pilot test + Sunum hazırlığı |

> [!TIP]
> Her PR'da diğer kişi **zorunlu reviewer** olmalıdır. Bu hem kalitenizi artırır hem de tasarladığınız workflow'u kendiniz kullanmış olursunuz (dogfooding).

---

## Verification Plan

### Automated Tests
```bash
# Terraform format kontrolü
terraform fmt -check -recursive

# Terraform validation (syntax ve referans kontrolü)
terraform validate

# Terraform plan (dry-run — gerçekte değişiklik yapmaz)
terraform plan -out=tfplan

# (Pilot sonrası) Terraform apply
terraform apply tfplan
```

### Manual Verification
1. **Pilot Org Oluşturma:** Test organizasyonu açıp Terraform ile yönetme
2. **Yetki Testi:** Farklı rollerdeki kullanıcılarla (intern, developer, admin) erişim testleri
3. **Branch Protection Testi:** `main` ve `develop` dallarına doğrudan push denemesi (reddedilmeli)
4. **PR Workflow Testi:** Template'ten PR açma, review, CI check'lerin çalışması, merge
5. **CI/CD Testi:** Actions'ların doğru tetiklenmesi ve çalışması
6. **Onboarding Testi:** Dokümantasyonu takip ederek sıfırdan bir geliştirici ekleme
7. **Entegrasyon Testi:** Linear/Slack entegrasyonlarının doğru tetiklenmesi
8. **Sunum:** Tüm sistemi canlı demo ile sunma

---

## Repo İsimlendirme Standardı

```
<organizasyon>/<tip>-<alan>-<açıklama>

Örnekler:
  tidyorg/svc-user-auth           # Backend service
  tidyorg/svc-payment-gateway     # Backend service
  tidyorg/web-admin-dashboard     # Frontend web app
  tidyorg/web-landing-page        # Frontend web app
  tidyorg/mobile-ios-app          # Mobile app
  tidyorg/lib-shared-utils        # Shared library
  tidyorg/infra-github-mgmt      # Infrastructure
  tidyorg/docs-engineering-wiki   # Documentation
```

| Prefix | Açıklama |
|---|---|
| `svc-` | Backend service / microservice |
| `web-` | Frontend web application |
| `mobile-` | Mobile application |
| `lib-` | Shared library / package |
| `infra-` | Infrastructure / DevOps |
| `docs-` | Documentation |
| `tool-` | Internal tooling |
| `poc-` | Proof of concept (deneysel) |
