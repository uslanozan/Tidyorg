# tidyorg — Açık Kaynak Yayın Planı

> **Durum:** ✅ Onaylandı (Ozan, 2026-09-07) · Uygulama planı
> **İlgili:** [`scope-and-architecture-2026-09-03.md`](scope-and-architecture-2026-09-03.md)
> (kararların gerekçesi) · [`ROADMAP.md`](../../ROADMAP.md) (Faz 8 repo bölmesi)
>
> Bu, `~/.claude/plans/` altındaki onaylı planın codebase'e kaydedilmiş kopyasıdır ki
> versiyonlanabilsin ve ekip görebilsin.

## Context

Bu proje bugün `your-org` org'unu Terraform ile yöneten, çalışan bir sistem
(engine + config + dashboard). Amaç: **markadan arındırıp `tidyorg` adıyla, tek bir Docker
image olarak açık kaynak yayınlamak** — herkes `docker run` ile kendi GitHub org'una çalıştırıp
kendi config'ini mount edebilsin, ve **dashboard tam yazma moduna** sahip olsun.

Süre kısıtı yok; sıra ve doğru mimari öncelikli. Kritik eksiklikler önce kapatılır.

### Verilen kararlar (2026-09-07)
| Karar | Seçim |
| :--- | :--- |
| Docker backend | **Lokal state + mount volume** (HCP gerektirmez; isteyen kendi backend'ini takar) |
| Dashboard yazma modu (v1) | **Tam yazma modu** (branch protection editörü + people/org üyelik yönetimi) |
| Git geçmişi | **Temiz/squash yeni public repo** (PII git log'da kalmasın) |
| İsim | **tidyorg** (CLI: `tidyorg`, paket: `tidyorg-dashboard`, image: `tidyorg`) |
| Kapsam dışı | 3rd party entegrasyonlar (Linear/ClickUp/Slack), AI/otomasyon bot'ları |

### Mimari (yayın sonrası)
```
tidyorg (engine)          config repo (kullanıcının)      tidyorg-dashboard
  PUBLIC                    PRIVATE                          PUBLIC
  terraform/modules/        config/organization.yml         React SPA
  terraform/templates/      config/people.yml               device flow (GitHub App)
  thin root + Dockerfile    config/privileged.yml           config'i okur, PR açar
  config.example/           config/repositories/*.yml
  ref=v1.0.0  ◀──────────── main.tf modülü ref ile çağırır
                            .github/workflows/ (plan+apply)
```
Tek Docker image = nginx (static dashboard `dist/`) + terraform CLI + entrypoint. Config
`-v ./config:/config` ile mount edilir; state `-v ./state:/state`.

---

## İş bölümü — iki kişi (Ozan: Terraform/engine, Medine: dashboard)

**Temel fikir:** Medine bu konuşmadaki kararların *gerekçesini* (2026-08-15 olayı, yükseltme
kapısı, secure-by-construction) bilmek zorunda **değil** — sonucu, yani **sözleşmeyi** bilmesi
yeterli. Ozan iki küçük handoff belgesi çıkarınca Medine tüm dashboard tarafını bağımsız yazar.

### Ozan'ın önce çıkaracağı iki handoff (Medine'nin ön koşulu)
- **Handoff A — Config şema sözleşmesi** _(Faz 1'in çıktısı, ~yarım gün)._ Hangi alan hangi
  dosyada: `people.yml` (yalnız üyelik), `privileged.yml` (**dashboard asla dokunmaz**),
  `repositories/*.yml` (tüm düzenlenebilir alanlar + `protected_branches` nested şekli).
  Medine yazma modunu buna göre hedefler; *neden* böyle bölündüğünü bilmesine gerek yok.
- **Handoff B — Auth karar listesi** _(4 madde)._ `client_id` = GitHub App; `scope` kaldırılıyor;
  token expiry OFF; App yalnızca config repo'ya kurulu. Ayrıca **GitHub App'i Ozan oluşturur**
  (org admin işi) ve `client_id`'yi Medine'ye verir.

### İki paralel hat

| Hat | Kim | İşler | Bağımlılık |
| :--- | :--- | :--- | :--- |
| **Engine/Terraform** | Ozan | Faz 1 (bölme + config_path), Faz 2 terraform tarafı (PII, hardcoding, örnekler), Faz 3.1/3.2 (backend + Dockerfile), Faz 6 (repo bölmesi), Faz 7 (fresh repo, LICENSE, GHCR) | — |
| **Dashboard** | Medine | Faz 2.3 dashboard (isim), Faz 3.3 runtime-config (`window.__ENV__`), Faz 4 (auth dönüşümü), Faz 5 (tam yazma modu + verify-yaml) | Faz 4 → Handoff B · Faz 5 → Handoff A |

### Medine'nin HEMEN başlayabilecekleri (sıfır bağımlılık)
- Dashboard markadan arındırma (Faz 2.3): `package.json`, UI başlıkları, localStorage anahtarları — mekanik `tidyorg → tidyorg`.
- Docker runtime-config altyapısı (Faz 3.3): `VITE_*` build'e gömülü olanları `window.__ENV__`'den okuyacak şekilde çevir.

### Sync noktaları
1. **Handoff A + B teslimi** — Medine'yi Faz 4/5 için açar. Ozan Faz 1'i bitirir bitirmez.
2. **Şema donması** — Faz 5 başlamadan `repositories/*.yml` ve `people.yml` alan seti dondurulur (yazma modu hareket eden hedefe göç etmesin).
3. **Entegrasyon** — Faz 3.2 Dockerfile, Medine'nin `dist/` çıktısını + runtime-config'i tüketir; birlikte test.

### Yalnızca Ozan (devredilemez — org admin + mimari bağlam)
Faz 1 terraform implementasyonu, backend/config_path, terraform PII + git history, GitHub App
oluşturma/kurulum, repo bölmesi, yayın. Medine'ye sözleşme gider, gerekçe değil.

---

## Faz 1 — Güvenlik temeli (her şeyin ön koşulu) 🔴

Tam yazma modu, yükseltme kapısı kapatılmadan **güvenli değil**. Bu faz önce gelir.

### 1.1 Dosya bölmesi: `privileged.yml` (yükseltme kapısı)
Bugün yükseltme iki alandan geliyor ([`terraform/people.tf`](../../terraform/people.tf) satır 55-63):
`org_role: admin` ve `roles: [head-of-engineering]`. İkisi de dashboard'ın yazabildiği
`people.yml`'da. Çözüm — *secure by construction*:

- **Yeni dosya `config/privileged.yml`** — org owner listesi + `head-of-engineering` taşıyıcıları.
  İnsan-sahipli, CODEOWNERS korumalı, **dashboard asla yazmaz.**
- `config/people.yml` → yalnızca org üyeliği (herkes implicit `member`). `org_role` ve
  `roles` alanları buradan **kaldırılır.**
- Engine ikisini merge eder: `privileged.yml`'da olan → `admin`/head-of-eng, olmayan → `member`.
- Değişecek: `terraform/people.tf` — `local.people` + yeni `local.privileged`;
  `org_owners`/`head_of_engineering` artık `privileged.yml`'dan türetilir; doğrulamalar
  (satır 65-127) güncellenir. `break-glass` (`unmanaged_people`) mantığı korunur.
- `.github/CODEOWNERS` → `privileged.yml`, tüm `*.tf`, `templates/` `platform-admins` onayına
  bağlı; `people.yml` ve `repositories/*.yml` serbest (dashboard yazar).

### 1.2 Config yolu parametrik
Bugün yol sabit: `${path.module}/config` (`repositories.tf:13,27`, `people.tf:24`). Docker mount için gerekli.
- `variable "config_path"` ekle (default `"${path.module}/config"`), üç `file()/fileset()` çağrı noktasına geçir.
- `people.tf:136`'teki **stale yorum** (var olmayan `var.config_file`) düzeltilir.

---

## Faz 2 — Markadan arındırma + genelleştirme (tidyorg)

### 2.1 🔴 PII / sır temizliği (git history dahil — bkz. Faz 7)
| Ne | Nerede |
| :--- | :--- |
| Kişisel Gmail | `org-settings.tf:101` `billing_email` → `var.billing_email` |
| App ID `4600282`, Installation ID `153844579` | `integrations/github-app/README.md`, `docs/daily-logs/OZAN_CREW_NOTES.md` |
| Gerçek handle'lar (30 dosyada 268×) | placeholder'a çevir ya da dosyayı sil (Faz 7 doküman kararı) |

### 2.2 Org'a özel hardcoding'i kaldır
- `variables.tf:4` — `github_org_name` default'unu **kaldır** (fail-fast) veya açık sahte placeholder.
- `imports.tf` — `Tidyorg` import'u kuruluma özel; `.example` olarak ship et veya "sil/yeniden yaz" diye belgele.
- `config/repositories/Tidyorg.yml:42-43` — hardcoded `your-org/platform-admins` slug'ı; org-türetilmiş hale getir.
- `org-settings.tf` org-id `import` bloğu → kuruluma özel, `.example`/koşullu.

### 2.3 İsim değişimi: tidyorg → tidyorg
- Terraform: org slug'ları config/example'da; HCP `cloud{}` zaten kalkıyor (Faz 3).
- Dashboard: `package.json`/`package-lock.json` `"name": "tidyorg-dashboard"`; UI başlıkları
  (`index.html:14`, `Login.tsx:95`, `AppShell.tsx:21`); localStorage anahtarları
  (`useAuth.tsx:17`, `useTheme.ts:5`) → `tidyorg.*`.
- Repo adı `Tidyorg` → `tidyorg` (dosya adı + referanslar).

### 2.4 Örnek + canlı config
- 🔴 `organization.example.yml:50-56` — gerçek handle'lar (`uslanozan`, `paitblack`) → `mentor-a`/`dev-1` (davet mayını).
- Canlı `people.yml`/`organization.yml`/repo config'leri → placeholder demo set'e indir veya `config.example/`'a taşıyıp gerçekleri config repo'ya bırak.
- `config.example/` referans olarak engine repo'da kalır (schema + `config-guide`).

---

## Faz 3 — Dockerize (tek image, lokal backend)

### 3.1 Backend takılabilir yap (1 numaralı blokör)
`main.tf:11-16` HCP `cloud{}` bloğu sabit `tidyorg-infra`'ya.
- `cloud{}` bloğunu koddan çıkar → varsayılan `backend "local"` (state `/state` mount'unda).
- Remote isteyene: entrypoint `BACKEND` env'ine göre `backend.tf` üretir/override eder, ya da `-backend-config` ile kullanıcı kendi HCP/S3'ünü verir. README'de setup adımı.

### 3.2 Dockerfile (multi-stage)
- Stage 1: `node` → `npm run build` → dashboard `dist/`.
- Stage 2: terraform CLI + nginx; `dist/` kopyalanır; entrypoint eklenir.
- nginx conf: static serve + `/gh-oauth/ → https://github.com/` proxy (device flow self-hosted çalışsın).
- `terraform init` linux provider'ı lock'tan çeker (hash'ler destekliyor).

### 3.3 Entrypoint & girdiler
- `TF_VAR_github_org_name`, `TF_VAR_github_app_id`, `TF_VAR_github_app_installation_id`.
- PEM: `-v ./app.pem:/secrets/app.pem` → entrypoint içeriği okuyup `TF_VAR_github_app_pem_file`'a `\n`-escape eder; ya da provider'ı `pem_file = file(var.github_app_pem_path)`'a çevir.
- Dashboard runtime config: `VITE_*` build'e gömülü — entrypoint `window.__ENV__` enjekte eder.
- `docker-compose.yml` örneği + `tidyorg plan|apply` komut sarmalayıcısı.

---

## Faz 4 — Auth: GitHub App device flow

Küçük, izole değişiklik (endpoint'ler ve proxy aynı — proxy dosyaları **değişmez**).
- `deviceFlow.ts:14,70` — `SCOPE` kaldır, `/login/device/code` gövdesinden `scope` çıkar. `read:org` zaten hiç kullanılmıyordu.
- `env.ts`/`.env.example`/README — `VITE_GITHUB_CLIENT_ID` artık GitHub App client_id.
- **Token expiry OFF** (App ayarından) → `useAuth.tsx` storage değişmez (sessionStorage, non-expiring).
- Yetki kapısı: App **yalnızca config repo/org'a kurulur** → kurulum dışı kullanıcı contents/PR'da 403 alır. Post-login `listDirectory` denemesiyle temiz "yetkin yok" ekranı.
- Manual PAT fallback (`Login.tsx`) → yalnızca dev; yayında kaldır.
- App izinleri: Contents RW, Pull requests RW, Metadata R.

---

## Faz 5 — Tam yazma modu

Motor (propose/branch/commit/PR/conflict-retry, `configRepo.ts`) **sağlam**, az değişir.

### 5.1 Repo config yazma (branch protection dahil)
Repo config'leri **makine-sahipli** (yorumsuz, Karar 16) → yorum-koruyan nested editör
GEREKMEZ; `serializeRepoConfig` ile tam yeniden üretilir.
- `serializeRepoConfig` + UI'ı genişlet: `visibility`, `archived`, `has_*`, `default_branch`, `code_owners`, `files` (strict/seed/none), `workflows`, ve **`protected_branches` editörü** (nested map).
- `types/config.ts`'e eksik alanlar (`vulnerability_alerts`, `secret_scanning`, `labels`).
- Mevcut canlı config'ler yorumsuz makine formatına normalize edilmeli.

### 5.2 People / org üyelik yazma (güvenli)
- Yeni servis `proposePeopleUpdate` — `people.yml`'a **yalnızca member ekle/çıkar.**
- `org_role`/`head-of-engineering` yükseltme `privileged.yml`'da (Faz 1) — dashboard **yazamaz**, ifade **edemez**. Yükseltme yolu = elle PR + CODEOWNERS onayı.
- UI: üye yönetim sayfaları (bugün `MemberDetail.tsx` salt-okunur).

### 5.3 Doğrulama
- `verify-yaml.ts` yeni alanları + `people.yml` yazma yolunu kapsayacak şekilde genişletilir.

---

## Faz 6 — Repo bölmesi (3 repo) — engine hazır olunca

Yayından hemen önce:
- `tidyorg` (engine) → public, `v1.0.0` tag, `config.example/`, Dockerfile.
- config repo → kullanıcının kendi private repo'su (gerçek veri).
- `tidyorg-dashboard` → public SPA.
- Modül `source = "git::...//terraform/modules/repository?ref=v1.0.0"`.
- `terraform-plan.yml`/`terraform-apply.yml` config repo'ya taşınır.
- `release.yml` engine repo'da devreye alınır (tag üretimi).

---

## Faz 7 — Açık kaynak yayını

- 🔴 **Temiz/squash yeni public repo** — mevcut geçmişten değil; PII git log'da kalmaz.
- **LICENSE** ekle — öneri Apache-2.0; Ozan onaylar.
- **İngilizce kök README** (bugün yok) — ne yaptığı, quickstart (`docker run`), GitHub App kurulumu, config şeması.
- Dokümanlar: iç-tarih/kişisel olanları **sil** (OZAN_CREW_NOTES, pilot-verification, tasks-*, implementation plan, plans-and-pricing, external-review) → hem iş azalır hem PII/tidyorg hitleri gider. Kalıcı kullanıcı dokümanlarını İngilizce'ye çevir.
- Docker image GHCR'a publish (`ghcr.io/<org>/tidyorg`).

---

## Belgelenecek bilinen kısıtlar (yayın blokörü DEĞİL, açıkça yazılır)
- **Yedek yok** — kod + metadata yedeklenmiyor; HCP state + App key tek kopya.
- **Erişim kaldırma testi yapılmadı** — "kişi çıkınca erişim gidiyor" henüz varsayım.
- **Bus factor 1** — ikinci org owner önerilir.

---

## Doğrulama (uçtan uca test)

1. **Faz 1:** `privileged.yml` boşken bir kişiye `people.yml`'dan owner yapmaya çalış → yapılamamalı. `terraform plan` doğrulamaları geçmeli, canlı diff `No changes` olmalı (saf refactor).
2. **Faz 2/3:** Temiz test org'unda `docker run -v ./config -v ./state -e TF_VAR_github_org_name=<yeni> ... tidyorg plan` → HCP olmadan lokal state ile plan üretmeli. Elle repo aç → `coverage.tf` uyarısı gelmeli.
3. **Faz 4:** GitHub App kurulu olmayan kullanıcı device flow ile girsin → "yetkin yok"; kurulu → config görünür.
4. **Faz 5:** Dashboard'dan branch protection değiştir → PR → plan yorumu → merge → apply. `people.yml`'a member ekle → PR; `privileged.yml`'a yazmaya UI izin vermemeli.
5. **`npm run verify:yaml`** her yazma değişikliğinden sonra yeşil.
6. **Faz 7:** Yeni public repo'da `git log -p | grep -iE "gmail|4600282|uslanozan"` → boş dönmeli.

---

## Kritik dosyalar
- Engine: `terraform/main.tf`, `variables.tf`, `people.tf`, `repositories.tf`, `org-settings.tf`, `imports.tf`, `modules/repository/`
- Config: `config/organization.yml`, `config/people.yml`, yeni `config/privileged.yml`, `config/*.example.yml`
- Dashboard (branch `dashboard/week-1-4`): `src/services/{deviceFlow,configRepo,yaml,env,githubApi}.ts`, `src/hooks/{useAuth,useProjects,useProposal}.tsx`, `src/pages/{Login,ProjectDetail,NewProject,MemberDetail}.tsx`, `scripts/verify-yaml.ts`, `.env.example`
- Yeni: `Dockerfile`, `docker-compose.yml`, entrypoint, nginx conf, kök `README.md`, `LICENSE`
