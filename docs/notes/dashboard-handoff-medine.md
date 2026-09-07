# Dashboard Handoff — Medine

> **Durum:** ✅ Handoff · Ozan → Medine · 2026-09-07
> **Amaç:** Dashboard tarafını (Faz 4 auth + Faz 5 tam yazma modu) **bağımsız** yazabilmen
> için gereken iki sözleşme. Kararların *gerekçesini* bilmen gerekmiyor — bu belge sonucu,
> yani neyi hedefleyeceğini veriyor. Gerekçeyi merak edersen:
> [`open-source-release-plan-2026-09-07.md`](open-source-release-plan-2026-09-07.md) ve
> [`scope-and-architecture-2026-09-03.md`](scope-and-architecture-2026-09-03.md).
>
> Genel proje adı **tidyorg** olacak (tidyorg kalkıyor). Dashboard tarafındaki isim
> değişimini (paket adı, UI başlıkları, `tidyorg.*` localStorage anahtarları →
> `tidyorg.*`) sen yapabilirsin — sıfır bağımlılık, hemen başlanabilir.

---

## Handoff A — Config şema sözleşmesi

Config **dört** dosyaya bölündü. Dashboard'ın hangisine dokunabileceği kritik:

| Dosya | Sahiplik | Dashboard | İçerik |
| :--- | :--- | :--- | :--- |
| `people.yml` | makine | ✅ **yazar** (üye ekle/çıkar) | org üyeliği (yetki YOK) |
| `repositories/*.yml` | makine | ✅ **yazar** (tüm alanlar) | repo tanımı + erişim + dal koruması |
| `privileged.yml` | insan | ❌ **asla yazmaz** (okuyup gösterebilir) | org owner + head-of-engineering |
| `organization.yml` | insan | ❌ yazmaz | roller, defaults |

> 🔒 **En kritik kural:** Dashboard `privileged.yml`'a **yazamaz ve yazmayı önermez.**
> Yetki yükseltme (birini org owner / head-of-engineering yapmak) yalnızca elle PR +
> CODEOWNERS onayıyla olur. UI'da "owner yap" gibi bir buton **olmamalı** — okuyup kimin
> owner olduğunu göstermek serbest, değiştirmek değil.

### `people.yml` — üyelik (dashboard yazar)
```yaml
version: 1
members:
  - uslanozan
  - paitblack
  - medine2906
```
Yazma işlemi: listeye bir login ekle / çıkar. Başka alan yok. Bir kişiyi eklemek gerçek
org daveti üretir; çıkarmak org'dan atmaz, `member`a düşürür.

### `privileged.yml` — yetki (dashboard OKUR, yazmaz)
```yaml
version: 1
org_owners:
  - uslanozan
roles:
  head-of-engineering:
    - uslanozan
```
Dashboard bunu okuyup "kim owner / head-of-eng" gösterebilir. **Düzenleme UI'ı yok.**
`isHeadOfEngineering` gibi kontroller artık `people.yml` yerine **buradan** okunur
(bugün `people[login].roles` bakıyordu — o alan artık yok).

### `repositories/*.yml` — repo (dashboard tüm alanları yazar)
Dosya adı = repo adı. Yalnızca varsayılandan farklı alan yazılır; gerisi
`organization.yml` → `defaults`'tan miras. Tam alan seti:

```yaml
description: "Ödeme geçidi servisi"     # zorunlu, string
language: go                             # zorunlu: go | python | typescript | php
mentors: [mentor-a]                      # >=1, repo'da admin
developers: [dev-1, dev-2]               # repo'da push
visibility: private                      # public | private
archived: false
has_issues: true
has_projects: false
has_wiki: false
auto_init: true
default_branch: develop
protected_branches:                      # nested map — aşağıya bak
  main:
    required_reviews: 3
  develop:
    required_reviews: 0
    require_status_checks: []
code_owners:                             # yol → [login]
  "/backend/": [dev-1]
files:                                   # mantıksal ad → strict | seed | none
  contributing: seed
workflows: [ci, release, dependabot]     # liste: ci | release | dependabot
```

**`protected_branches` nested şekli** (bir dalın tam alanları — org defaults'tan):
```yaml
required_reviews: 1                       # int
require_code_owner_review: false          # bool
dismiss_stale_reviews: true               # bool
require_status_checks: [ci/test]          # liste (boş = CI beklemeden merge)
require_conversation_resolution: false    # bool
allow_force_push: false                   # bool
allow_deletions: false                    # bool
push_allowed_roles: [mentor, head-of-engineering]  # liste: rol adları
```
Bir dalı `null` yazmak (`develop:` boş) o dalın korumasını kaldırır (kaldırma kaçışı).

> **Yazma modu teknik notu — yorum-koruyan editör GEREKMEZ.** `repositories/*.yml` ve
> `people.yml` makine-sahipli (yorum taşımaz), yani `serializeRepoConfig` ile **tam yeniden
> üretilebilir**. `applyEdits`'in nested map (protected_branches, code_owners) kısıtı bu
> dosyalarda seni bağlamaz — dosyayı komple regenerate et. Yorum-koruma yalnızca insan-sahipli
> `organization.yml`/`privileged.yml` için gerekliydi, onlara da zaten yazmıyorsun.

### Faz 5 için yapılacaklar (özet)
- `serializeRepoConfig` + UI: yukarıdaki tüm repo alanları + `protected_branches` editörü.
- `types/config.ts`: eksik alanlar (`vulnerability_alerts`, `secret_scanning`, `labels`).
- Yeni servis `proposePeopleUpdate` → `people.yml` `members` listesine ekle/çıkar.
- `isHeadOfEngineering` / owner okuması `privileged.yml`'dan.
- `verify-yaml.ts`'i yeni alanlar + `people.yml` yazma yolu için genişlet.

---

## Handoff B — Auth kararları (GitHub App device flow)

Bugün OAuth App device flow var. GitHub App device flow'a geçiyoruz. Endpoint'ler ve CORS
proxy **aynı** — proxy dosyaları (`vite.config.ts`, `vercel.json`, `_redirects`) değişmez.

| # | Karar | Kod karşılığı |
| :--- | :--- | :--- |
| 1 | GitHub App device flow (OAuth App değil) | `VITE_GITHUB_CLIENT_ID` artık GitHub App client_id (`Iv23...`/`Iv1...` şekli) |
| 2 | `scope` kaldırılıyor | `deviceFlow.ts:14` `SCOPE` sil; `:70` `/login/device/code` gövdesinden `scope` çıkar. `read:org` zaten hiç kullanılmıyordu |
| 3 | Token expiry **OFF** | App ayarından kapatılıyor → `useAuth.tsx` storage **değişmez** (sessionStorage, non-expiring). Refresh token kodu YAZMANA GEREK YOK |
| 4 | App yalnızca config repo'ya kurulu | Yetkiyi GitHub yapar: kurulum dışı kullanıcı contents/PR'da 403 alır. Giriş yine başarılı olur ama boş dashboard görür |

**Ek işler:**
- Post-login yetki kontrolü: `listDirectory(config path)` dene → 403 ise temiz "yetkin yok"
  ekranı göster (sonraki 403'lere bırakma).
- Manual PAT fallback (`Login.tsx`) → yalnızca dev; **yayında kaldır** (PAT, App kurulum
  kısıtını atlar).
- `.env.example` / `README` metinlerini güncelle (`repo read:org` dilini kaldır, GitHub App'i anlat).

**Ozan'ın vereceği:** GitHub App'i Ozan oluşturur (izinler: Contents RW, Pull requests RW,
Metadata R; yalnızca config repo'ya kurulu) ve `client_id`'yi sana verir. Sen kodu client_id
gelmeden yazabilirsin; gelince `.env`'e koyup test edersiniz.

---

## Bağımlılık özeti

- **Hemen başlayabilirsin (bağımlılık yok):** isim değişimi (tidyorg → tidyorg), Docker
  runtime-config altyapısı (`VITE_*` build'e gömülü olanları `window.__ENV__`'den oku).
- **Faz 4 (auth):** Handoff B yeter (client_id'yi Ozan verecek).
- **Faz 5 (yazma modu):** Handoff A yeter — yukarıdaki şema donmuş kabul edilir.

Soru çıkarsa Ozan'a; şema bir yerde eksikse söyle, sözleşmeyi güncelleriz (Faz 5 başlamadan).
