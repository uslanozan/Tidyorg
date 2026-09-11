# Güvenlik Politikaları ve Uygulamaları

Bu doküman günlük geliştirme süreçlerindeki güvenlik standartlarını belirler.

Son güncelleme: 2026-08-17

> **Bu doküman iki şeyi ayırır: bugün zorlanan kurallar ve henüz kurulmamış olanlar.**
> Önceki sürümü hedef durumu yürürlükteymiş gibi anlatıyordu (CodeQL taraması, org geneli
> push protection, "Tech Lead" onayı) — hiçbiri kurulu değildi. Bir güvenlik dokümanının
> en tehlikeli hatası budur: olmayan bir korumaya güvenilmesine yol açar. Bölüm 5 açıkça
> neyin **olmadığını** listeler.

---

## 1. Sırların Yönetimi (Secret Management) — ✅ Yürürlükte

Kod tabanına API anahtarı, şifre, token veya herhangi bir hassas veri **eklenemez.**

* **Yerel geliştirme.** Tüm sırlar `.env` dosyalarında tutulur. `.env` ve `.env.*`
  desenleri [`.gitignore`](../.gitignore) ile engellenmiştir; yalnızca `.env.example`
  gibi şablon dosyaları depoya girer. `*.pem` ve `*.key` de aynı listede.
* **CI/CD.** GitHub Actions'ta kullanılan hassas veriler **GitHub Secrets** üzerinden
  gelir. Bugün tanımlı olan: `TF_API_TOKEN` (HCP Terraform Cloud kimlik doğrulaması).
* **Terraform.** GitHub App'in private key'i ve diğer hassas değişkenler HCP Terraform'da
  **sensitive** environment variable olarak tutulur; hiçbir geliştiricinin makinesine
  inmez.

### Sır sızdıysa ne yapılır

Bir sır bir kez push edildiyse **dosyayı silmek yetmez** — git geçmişinde kalır.

1. Mentöre / head-of-engineering'e hemen haber ver.
2. **İlgili anahtarı iptal et ve yenile.** İlk ve en önemli adım budur; geçmişi
   temizlemek ikincildir.
3. Yeni anahtarı `.env` veya GitHub Secrets üzerinden dağıt.

---

## 2. Bağımlılık Güncellemeleri (Dependabot) — ✅ Yürürlükte

[`dependabot.yml`](../terraform/templates/.github/dependabot.yml) her repo'ya `strict`
modda dağıtılır — yani Terraform içeriği sahiplenir, elle değiştirilirse bir sonraki
`apply` geri alır.

* **Sıklık:** haftalık, pazartesi. Kapsanan ekosistemler: `gomod`, `npm`, `pip`,
  `composer`, `github-actions`. Manifest dosyası olmayan ekosistemi Dependabot atlar,
  yani tek dosya her repo'da çalışır.
* **Etiketleme:** açılan PR'lar `type: chore` etiketi alır, commit öneki `chore(deps)`
  (Actions için `chore(ci)`).
* **Gruplama:** paket ekosistemlerinde minor + patch tek PR'da toplanır, **major kendi
  PR'ında gelir** — build'i kırabilir, ayrı review hak eder. GitHub Actions'ta major'lar
  da rutin sayılıp tek PR'da toplanır.
* **Kim inceler:** repo'nun **mentörü** (CODEOWNERS gereği code owner odur). Bu
  dokümanın önceki sürümündeki "Tech Lead" rolü organizasyonda **yoktur** —
  `tech-leads` takımı 2026-08-16'da kaldırıldı ([`../ACCESS-MODEL.md`](../ACCESS-MODEL.md)
  Karar 12).

> Dependabot yalnızca **güncelleme** açar; zafiyet **uyarıları** ayrı bir ayardır
> (`vulnerability_alerts`). O da 2026-08-18'de Terraform'a bağlandı — bkz. Bölüm 5.

---

## 3. CI'ın Güvenlik Açısından Yaptıkları — ✅ Yürürlükte

[`ci.yml`](../terraform/templates/.github/workflows/ci.yml) her PR'da çalışır ve
`ci/test` adıyla zorunlu status check üretir. İçeriği dile göre değişir:

| Dil | Çalışanlar |
| :--- | :--- |
| Go | `golangci-lint` · `go test -race` · `go build` |
| Python | `ruff check` · `pytest` |
| TypeScript | `eslint` · `prettier --check` · `tsc --noEmit` · `npm test` |
| PHP | `phpstan` · `pint --test` · `phpunit` |

**Bunlar lint ve test araçlarıdır, güvenlik tarayıcısı değildir.** `golangci-lint` ve
`phpstan` bazı güvenlik desenlerini yakalayabilir, ama bu bir SAST kapsamı sayılmaz.

> ⚠️ **Bilinen sınır:** Dil job'ları manifest dosyası yoksa `skipped` geçer ve `ci/test`
> yine de yeşil raporlar. Bu bilinçli bir tasarım kararıdır (yoksa manifestsiz repo'da
> check hiç raporlanmaz ve PR'lar sonsuza kadar bekler), ancak sonucu şudur: **yeşil
> `ci/test`, "testler geçti" değil "tanımlı testler geçti" demektir.**

---

## 4. Kod ve Erişim Güvencesi — ✅ Yürürlükte

* **Korumalı dallar.** `main` ve `develop`'a doğrudan push yalnızca `mentor` ve
  `head-of-engineering` rollerine açıktır; developer'lar allowlist'te değildir. Force
  push ve dal silme her iki dalda da kapalıdır. Canlıda `GH006` reddiyle doğrulandı.
* **Zorunlu review.** `main` 2 onay + code owner (mentör) onayı; `develop` 1 onay. Yeni
  commit gelirse mevcut onaylar düşer (`dismiss_stale_reviews`).
* **Yetki koddan yönetilir.** Kimsenin yetkisi GitHub arayüzünden verilmez; her erişim
  değişikliği bir commit, bir PR ve bir `plan` çıktısı bırakır
  ([`adr/004`](adr/004-config-driven-access-management.md)).
* **Drift geri alınır.** Arayüzden elle değiştirilen bir güvenlik ayarı bir sonraki
  `apply` ile standarda döner.
* **`prevent_destroy`.** Config'den bir repo tanımının yanlışlıkla silinmesi repo'yu yok
  etmez; `apply` hata vererek durur.

> ⚠️ **Kalıcı muafiyet:** `enforce_admins = false` olduğu için mentör ve
> head-of-engineering yukarıdaki dal kurallarının tamamını bypass edebilir. Bilinçli bir
> tavizdir ve bu rollerde kimin bulunduğunu **teknik değil insan kaynağı** meselesi
> haline getirir. Gerekçe ve sonuçları:
> [`rbac-and-permissions.md`](rbac-and-permissions.md) Bölüm 4.

---

## 5. Henüz Kurulmamış Olanlar — ⛔ Bunlara güvenmeyin

Aşağıdakiler hedeflenen ama **bugün yürürlükte olmayan** korumalardır. Faz 6 kapsamında
planlanmıştır ([`../ROADMAP.md`](../ROADMAP.md)).

| Koruma | Durum | Not |
| :--- | :--- | :--- |
| **Code scanning (CodeQL)** | ⛔ Yok | `ci.yml` içinde CodeQL adımı bulunmuyor. Kritik/yüksek bulgunun merge'i engellemesi diye bir mekanizma **yoktur**. |
| **Süre sınırlı erişim** | ⛔ Yok | Geçici erişimler elle kaldırılmalıdır. |
| **Private repo'da dal koruması** | ⛔ Engelli | Free plan'de çalışmıyor. Repo'lar bu yüzden `public`; GitHub Team planı ön koşuldur. |
| **Private repo'da secret scanning** | ⛔ Engelli | GitHub Advanced Security (Enterprise) ister. Modül private repo'da bu ayarı **sessizce atlar** — config'de `true` yazsa bile uygulanmaz. Bugün etkilenen tek repo: `pilot-access-test`. |
| **`advanced_security`** | ⛔ Bilerek yönetilmiyor | Public repo'da örtük açık, private'ta lisans ister. İkisinde de yönetmeye çalışmak hata üretir. Team/Enterprise planına geçilirse yeniden değerlendirilir. |
| **`members_can_create_public_repositories`** | ⚠️ **Açık** | Herhangi bir org üyesi **public** repo açabiliyor. `default_repository_permission = none` bunu kapatmaz — farklı eksen. Karar bekliyor. |

### 5.1 Bu bölümden 2026-08-18'de çıkanlar

Aşağıdakiler artık **Bölüm 4'te yürürlükte** — bu tabloda tarihsel kayıt olarak duruyor:

| Koruma | Yeni durum |
| :--- | :--- |
| **`vulnerability_alerts`** | ✅ Config'den yönetiliyor (`defaults.vulnerability_alerts`), dört repoda da açık. ⚠️ Bulgu: **bu repo'da kapalıymış** — kontrol düzleminin kendisi Dependabot uyarısı almıyormuş. |
| **Secret scanning / Push protection** | ✅ Üç public repo'da açık (`defaults.secret_scanning`). Push protection asıl değerli olan: sızdırılmış anahtar repo'ya **girmeden** push reddedilir. |
| **Org geneli güvenlik varsayılanları** | ✅ Beşi de açıldı — yeni repo'lar artık Dependabot alerts + security updates + dependency graph + secret scanning ile doğuyor. Öncesinde **altısı da kapalıydı**. |
| **"Kim bypass edebiliyor?" raporu** | ✅ `terraform output branch_protection_bypass` |

---

## 6. Güvenlik Açığı Raporlama

1. Güvenlik açıkları için **herkese açık bir GitHub issue açmayın.**
2. Bulguları teknik detay ve yeniden oluşturma adımlarıyla birlikte
   `security@example.com` adresine e-posta gönderin.

Repo bazlı politika metni her repo'nun kökündeki `SECURITY.md` dosyasındadır
([`../SECURITY.md`](../SECURITY.md)). Bu dosya `seed` modda dağıtılır: ilk oluşturmada
yazılır, sonrasında repo kendi ihtiyacına göre değiştirebilir.

---

## 7. İlgili Dokümanlar

- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Yetki matrisi ve bypass analizi
- [`runbook.md`](runbook.md) — Acil erişim kesme, offboarding
- [`code-review-guide.md`](code-review-guide.md) — Review'da nelere bakılır
- [`../ROADMAP.md`](../ROADMAP.md) — Faz 6: güvenlik ayarlarının yönetime alınması
