# 🖥️ Medine — Dashboard

**Rol:** Head of engineering'lerin ve mentörlerin kullanacağı yönetim panelini geliştirir  
**Alan:** Dashboard UI/UX, GitHub Contents API (okuma & yazma), konfigürasyon yönetim ekranları  
**Terraform & altyapı tamamen kapsam dışı** — tüm işler `dashboard/` dizinini kapsar  
**Tahmini Süre:** 4–5 hafta (kademeli teslim)

> **Bağlam (2026-08-15):** Medine, Emre'nin ayrılmasının ardından projeye katıldı.
> Dashboard görevi Emre'nin planında Faz 5 olarak tanımlanmıştı.
> Terraform, GitOps, GitHub App altyapısı Ozan tarafından yürütülecek.
> Bkz. [`ROADMAP.md`](ROADMAP.md) Faz 5 ve [`ACCESS-MODEL.md`](ACCESS-MODEL.md) Karar 15.

> **Durum (2026-08-26):** Hafta 1–4 uygulandı — [`dashboard/`](dashboard/).
> Okuma modu gerçek config dosyalarıyla çalışıyor (mock'a gerek kalmadı, Ozan
> Faz 1'i bitirmişti). Yazma modu, çakışma koruması, plan önizleme ekranı ve UX
> katmanı hazır. Kurulum ve mimari notlar: [`dashboard/README.md`](dashboard/README.md).
>
> **Açık kalan üç şey — üçü de dışa bağımlı:**
> 1. OAuth App `client_id` (Ozan, Faz 4) — o gelene kadar giriş ekranındaki
>    "token ile giriş" yolu kullanılıyor, kod tarafında yapılacak iş yok.
> 2. GitOps plan yorumu (Ozan, Faz 3) — ekran hazır, yorum düşmeyen PR'da
>    "Plan bekleniyor…" gösteriyor.
> 3. Uçtan uca pilot test (Hafta 5) — Ozan ile birlikte, gerçek PR merge edilerek.
>
> **İki mimari karar bu sırada verildi, ikisi de README'de gerekçeli:**
> Device Flow uçları CORS göndermediği için istekler hosting rewrite'ı üzerinden
> geçiyor (sunucu kodu yok, mimari hâlâ backend-less); ve config dosyaları
> `parse → dump` turundan geçirilmiyor, yalnızca ilgili satır değiştiriliyor —
> aksi hâlde dosyalardaki gerekçe yorumları silinirdi.

---

## 📐 Dashboard Ne Yapar?

Head of engineering'ler ve mentörler sistemi yönetmek için şu an YAML dosyası yazmak zorunda.
Dashboard bu engeli kaldırır: arayüzden tıklayarak yeni proje açabilirler, projeye
developer/mentor ekleyip çıkarabilirler, kuralları düzenleyebilirler.

**Arka planda ne olur:** Dashboard, `terraform/config/repositories/*.yml` dosyalarını
GitHub Contents API üzerinden günceller. Bu değişiklik bir PR açar. PR merge edilince
Terraform otomatik çalışır ve GitHub'ı günceller. Dashboard Terraform'u **doğrudan** çağırmaz;
config dosyalarını düzenleyerek Terraform'u **dolaylı olarak** tetikler.

### Temel Kullanıcılar

| Kullanıcı | Ne Yapabilir? |
| :--- | :--- |
| **Head of Engineering** | Yeni repo oluştur, tüm projeleri gör, mentör ata/değiştir |
| **Mentör** | Kendi projelerine developer ekle/çıkar, repo bilgilerini düzenle |

### Mimari: Backend-less (İlk Hedef)

Dashboard'un **kendi sunucusu yok, kendi token'ı yok**. Kullanıcı GitHub Device Flow
ile giriş yapar; tüm GitHub API çağrıları kullanıcının kendi token'ıyla yapılır.
Yetkilendirmeyi GitHub yapar — bir mentör başkasının repo config'ini düzenlemeye çalışırsa
GitHub zaten reddeder (CODEOWNERS ve repo yazma yetkisi yoktur).

```
Kullanıcı
   ↓ GitHub Device Flow ile giriş (client_id yeterli, client_secret gerekmez)
   ↓ token bellekte tutulur (localStorage'a yazılmaz)
Dashboard (statik SPA — dashboard/ klasörü, Vercel/Netlify'da host edilir)
   │
   ├── Okuma:  GitHub Contents API → terraform/config/repositories/*.yml dosyaları
   │
   ├── Yazma:  1) branch aç  →  2) YAML dosyasını güncelle  →  3) PR aç
   │                                  (hepsi kullanıcının token'ıyla)
   │
   └── Önizleme: PR'a düşen Terraform plan yorumunu oku ve özetle
         ↓
   GitOps workflow (Ozan kuruyor — Faz 3):
   PR açılınca → terraform plan → sonucu PR'a yorum olarak yaz
         ↓
   Merge → terraform apply → GitHub organizasyonu güncellendi ✓
```

> **Önemli:** Dashboard asla `main`'e doğrudan yazmaz. Her değişiklik bir PR açar.
> Bu hem güvenlik katmanı hem de denetim izidir.

> **Backend ne zaman gerekir?**
> İlk etapta backend-less gitmeyi hedefliyoruz. Eğer ileride
> `client_secret` gerektiren bir OAuth akışı, server-side cache veya webhook
> işleme gerekirse küçük bir backend (örn. Vercel Serverless Functions, Node.js)
> eklenebilir. Şu an bu kapsam dışı.

---

## Hafta 1 — Proje İskeleti & Kimlik Doğrulama

### 🏗️ Proje Kurulumu

> **Framework seçimi sana bırakıldı.** React + Vite önerilir (hafif, deploy kolay),
> Next.js de olabilir.

- [x] `dashboard/` klasörü altında proje oluştur
  - [x] `create-vite` + React 19 / TypeScript. _Vite 8 yerel Node 20.17 ile
        uyumsuzdu (20.19+ istiyor); Vite 6'ya sabitlendi._
  - [x] `.gitignore` — hem `dashboard/.gitignore` hem kök `.gitignore` kapsıyor
- [x] Klasör yapısı:
  ```
  dashboard/
  ├── src/
  │   ├── components/      # Yeniden kullanılabilir UI bileşenleri
  │   ├── pages/           # Login, Projects, ProjectDetail, Members
  │   ├── services/        # GitHub API çağrıları (githubApi.ts)
  │   ├── hooks/           # useAuth, useProjects, useRepo...
  │   └── types/           # TypeScript arayüzleri
  ├── public/
  └── README.md
  ```
- [x] Tasarım sistemi kur — `src/styles/tokens.css`
  - [x] Renk paleti, tipografi değişkenleri (CSS custom properties)
  - [x] Google Fonts: Inter
  - [x] Dark mode (`prefers-color-scheme` + isteğe bağlı manuel geçiş)
  - [x] Premium görünüm: glassmorphism card'lar, gradyan zemin, micro-animasyonlar

### 🔐 GitHub Device Flow ile Giriş

> **Device Flow neden?** Statik SPA'da `client_secret` saklayamazsın.
> Device Flow yalnızca `client_id` gerektirir — güvenlidir.

- [ ] ⏸️ GitHub OAuth App oluştur (Ozan'dan `client_id` al — Faz 4)
  - Sadece `client_id` gerekir; "Enable Device Flow" işaretli olmalı
  - _Kod tarafı hazır: `client_id` gelince `.env` içine yazmak yeterli. O zamana
    kadar giriş ekranındaki "token ile giriş" (PAT) yolu kullanılıyor._
- [x] Device Flow implement et — `src/services/deviceFlow.ts`
  1. [x] `POST /login/device/code` → `device_code`, `user_code`, `verification_uri`
  2. [x] Kullanıcıya kod + onay bağlantısı gösterilir (kopyala butonuyla)
  3. [x] `interval` kadar bekleyerek poll; `slow_down` / `expired_token` /
     `access_denied` ayrı ayrı karşılanıyor
  4. [x] Token `sessionStorage`'da (`localStorage` değil)
  - ⚠️ **CORS:** github.com'un OAuth uçları tarayıcıya izin vermiyor. İstekler
    aynı-origin `/gh-oauth` yolundan geçiyor: dev'de Vite proxy'si, prod'da
    `vercel.json` / `public/_redirects` rewrite'ı. Sunucu kodu yok.
- [x] `GET /user` ile profil al → avatar + kullanıcı adı header'da
- [x] Çıkış: token silinir, giriş ekranına dönülür
- [x] Login ekranı tasarımı — marka işareti, GitHub giriş butonu, temiz layout

### 📖 Kaynaklar
- [GitHub Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents)
- [`ACCESS-MODEL.md`](ACCESS-MODEL.md) → Karar 15

---

## Hafta 2 — Okuma Modu: Konfigürasyonu Görüntüle

Bu hafta hiçbir şeyi değiştirmiyorsun — yalnızca okuyup gösteriyorsun. Risksiz başlangıç.

> **Config dosyaları:** `terraform/config/repositories/*.yml`
> Her `.yml` dosyası = bir repo konfigürasyonu.
> Ozan bu yapıyı Faz 1'de kuruyor. Henüz hazır değilse tek dosya olan
> `terraform/config/organization.yml`'den başlayabilirsin.

### 📋 Proje Listesi

- [x] GitHub Contents API ile `terraform/config/repositories/` dizinini listele
- [x] Her `.yml` dosyasını çek → `js-yaml` ile ayrıştır
  - _Bozuk tek dosya tüm listeyi düşürmüyor; o kart "okunamadı" olarak çıkıyor._
- [x] Proje kartı bileşeni:
  - [x] Repo adı + açıklama
  - [x] Programlama dili (renk kodlu badge)
  - [x] Mentör ve developer sayısı
  - [x] GitHub'da repo'ya link (detay ekranında)
  - [x] Hover: subtle ölçek animasyonu
- [x] Arama (ad + açıklama) + dil filtresi
- [x] Yüklenirken skeleton ekranı

### 🗂️ Proje Detay Ekranı

Bir projeye tıklayınca:

- [x] Tam mentör ve developer listesi (GitHub avatar + kullanıcı adı)
- [x] Branch protection kuralları — org varsayılanı ile birleştirilip gösteriliyor,
      hangi kuralın nereden geldiği rozetle ayrılıyor
  - _`protected_branches: <dal>: null` özel durumu ayrıca gösteriliyor: bu, o dalın
    varsayılan korumasının tamamen kaldırıldığı anlamına geliyor (`repositories.tf`)._
- [x] Dil, visibility, varsayılan dal, açıklama
- [x] GitHub repo'ya ve config dosyasına link

### 👤 Üye Görünümü

- [x] Bir kullanıcı adına tıklayınca: "Bu kişi hangi projelerde, hangi rolde?" özeti
      (+ `people.yml`'den org rolü)

- [ ] ✅ **Sync:** Ozan ile okuma modunu gözden geçir

---

## Hafta 3 — Yazma Modu: Konfigürasyonu Güncelle

Kullanıcılar değişiklik yapabilir — ama her değişiklik doğrudan `main`'e değil, **PR olarak** gider.

> **Yazma akışı (her değişiklik için aynı):**
> 1. Mevcut dosyayı oku → `sha` değerini kaydet (çakışma koruması için şart)
> 2. YAML'ı güncelle → validasyon yap
> 3. Yeni branch aç: `dashboard/update-<repo-adı>-<unix-timestamp>`
> 4. Güncellenen dosyayı branch'e yaz (Contents API, `sha` ile)
> 5. PR aç: başlık + açıklama otomatik doldur
> 6. Kullanıcıya PR linkini göster

### ✍️ Developer Ekle / Çıkar

- [x] Proje detay ekranında **"Developer Ekle"** butonu
  - [x] GitHub kullanıcı adı input'u
  - [x] `GET /users/{username}` ile kullanıcının GitHub'da var olduğunu doğrula
  - [x] Config YAML'ına ekle → yazma akışını başlat
- [x] Her developer yanında **"Çıkar"** butonu
  - [x] "Emin misiniz?" onay diyaloğu
  - [x] Config YAML'ından kaldır → yazma akışını başlat
- [x] PR açıldıktan sonra: "PR oluşturuldu ✓" toast + PR linki

### ✍️ Mentör Değiştir / Ekle

- [x] Proje detay ekranında mentör ekleme/çıkarma
- [x] GitHub'da varlığını doğrula
- [x] Yazma akışı
- [x] Son mentörü çıkarma engelli (repo mentörsüz kalamaz)

### ✍️ Yeni Proje (Repo) Aç

Head of engineering rolündeki kullanıcılar için:

- [x] **"Yeni Proje"** butonu — `people.yml`'deki `head-of-engineering` rolüne göre
      gösteriliyor (sayfanın kendisi de aynı kontrolü yapıyor)
- [x] Çok adımlı form (wizard):
  - [x] Adım 1: Repo adı (regex doğrulama + aynı adda proje var mı), açıklama
  - [x] Adım 2: Programlama dili seçimi
  - [x] Adım 3: İlk mentör (GitHub'da varlığı doğrulanıyor)
  - [x] Önizleme: oluşacak YAML olduğu gibi gösteriliyor
- [x] `terraform/config/repositories/<repo-adı>.yml` oluştur → PR aç

### ✍️ Repo Bilgilerini Düzenle

- [x] Açıklamayı düzenleme
- [x] Dil değişikliği
- [x] Yazma akışı (mevcut dosyayı güncelle)

### 🛡️ Çakışma (Kayıp Güncelleme) Koruması

- [x] Her yazma isteğinde dosyanın güncel `sha`'sı gönderiliyor
- [x] 409/422 dönerse: dosya yeniden okunur → değişiklik güncel içeriğin üstüne
      uygulanır → tekrar denenir (en fazla 3 tur)
- [x] Kullanıcıya "dosya değişmişti, tekrar denendi" bilgisi veriliyor

### ✅ Validasyon

- [x] Her repo'nun en az bir mentörü olmalı
- [x] Arşivlenmiş repo'ya kişi eklenemez (butonlar da kapalı)
- [x] Repo adı: küçük harf, rakam, tire
- [x] Kişi listede iki kez olamaz
- [ ] ⏸️ Ozan JSON Schema yazacak (Hafta 6) → hazır olunca `src/services/validation.ts`
      oraya bağlanacak; şimdilik elle kontroller

### 🧪 Yazma güvenlik ağı _(planda yoktu, yazarken gerekti)_

- [x] `npm run verify:yaml` — gerçek config dosyalarında ekle/çıkar turu:
      başka alan değişmiyor mu, yorum kayboluyor mu, dosya başa dönüyor mu?
  - _İlk çalıştırmada gerçek bir hata yakaladı: `files:` alanı tipte yoktu ve
    sıfırdan yazımda düşüyordu. Yorum koruması da bu yüzden satır bazlı
    düzenlemeye çevrildi — `parse → dump` turu dosyaların gerekçe yorumlarını
    siliyordu._

- [ ] ✅ **Sync:** Yazma modunu birlikte test et (gerçek PR açılıyor mu?)

---

## Hafta 4 — Plan Önizleme & UX Parlatma

### 👁️ Terraform Plan Önizleme

PR açıldıktan sonra GitOps workflow (Ozan — Faz 3) Terraform plan sonucunu otomatik olarak
PR'a yorum olarak düşürür. Dashboard bu yorumu okuyup anlaşılır biçimde gösterir.

> GitOps henüz hazır değilse bu ekranı mockla; gerisi hazır olunca bağlarsın.

- [x] "Bekleyen PR'lar" sayfası — `dashboard/` önekli branch'lerden açılan PR'lar
      ("yalnızca benimkiler" filtresiyle)
- [x] Her PR için Terraform plan yorumunu oku:
  - [x] Özet: `"2 kaynak eklenecek, 0 kaynak yok edilecek"`
  - [x] `destroy` içeren planda kırmızı uyarı
  - [x] Plan hata verdiyse ilk `Error:` satırı gösteriliyor
  - [x] Yorum gelmemişse "⏳ Plan bekleniyor…" + 30 sn'de bir otomatik yenileme
        (yalnızca bekleyen PR varken; hepsi geldiyse yenileme duruyor)
- [x] PR'ı ve plan yorumunu GitHub'da açma linkleri

### ✨ UX İyileştirmeleri

- [x] Her API çağrısı için loading state (skeleton veya spinner)
- [x] Hata yönetimi — tek `GitHubError` tipi, kullanıcıya dönük Türkçe mesaj taşıyor:
  - [x] Token süresi dolmuşsa: "Oturum sona erdi, lütfen tekrar giriş yapın"
        (+ oturum otomatik kapanıyor)
  - [x] Rate limit: kalan süre `x-ratelimit-reset` başlığından hesaplanıyor
  - [x] Network hatası: "Bağlantı hatası, internet bağlantınızı kontrol edin"
  - [x] 403: "Bu işlem için GitHub yetkiniz yok"
- [x] Boş state'ler: "Henüz proje yok", "Eşleşen proje yok", "Bekleyen PR yok",
      "Bu kişi hiçbir projede görünmüyor", "Sayfa bulunamadı"
- [x] Toast sistemi: başarı / hata / uyarı / bilgi + PR linki taşıyabiliyor
- [x] Responsive — 1280 / 1024 / tablet / mobil; geniş tablolar kendi içinde kayıyor

### 🎨 Tasarım Gözden Geçirme

- [x] Renk paleti, tipografi, boşluklar tek dosyada (`tokens.css`) — bileşenler
      ham hex/px yazmıyor
- [x] Dark mode: sistem tercihi varsayılan, manuel geçiş de var
- [x] Klavye navigasyonu ve temel erişilebilirlik (`:focus-visible` halkası,
      `aria-label`, `role="alert"`, Esc ile kapanan diyalog, `prefers-reduced-motion`)
- [x] Arayüz dili baştan sona Türkçe

- [ ] ✅ **Sync:** Uçtan uca test — Ozan ile birlikte

---

## Hafta 5 — Pilot Test & Teslim

- [ ] ⏸️ **Uçtan uca pilot test** (Ozan ile — gerçek merge gerektirir)
  - [ ] Device Flow ile gerçek giriş _(`client_id` bekliyor — Faz 4)_
  - [x] Config'den proje listesi doğru yükleniyor mu? _(gerçek dosyalarla çalışıyor)_
  - [ ] "Developer Ekle" → PR açıldı → plan yorumu düştü → merge → GitHub'da kişi eklendi
  - [ ] "Yeni Proje" → config'de yeni `.yml` → Terraform yeni repo'yu oluşturdu
- [x] **Dashboard [`README.md`](dashboard/README.md)** — kurulum, ortam değişkenleri,
      yazma akışı, CORS ve yorum koruması gerekçeleri
- [x] **[Demo senaryosu](dashboard/DEMO.md)** — "sıfırdan proje aç + developer ekle",
      süreleri ve yedek planıyla

---


## 📌 Ozan ile Koordinasyon

| Dashboard Neye İhtiyaç Duyar | Ozan Ne Zaman Sağlar |
| :--- | :--- |
| `terraform/config/repositories/*.yml` yapısı (Faz 1) | Hafta 4 — Hazır olmadan `organization.yml`'den mock et |
| GitOps: plan yorumu PR'a düşsün (Faz 3) | Hafta 4–5 — Hazır olmadan plan ekranını mockla |
| OAuth App `client_id`'si (Faz 4) | Hafta 5 — Hazır olmadan `VITE_GITHUB_CLIENT_ID` ile local test et |
| JSON Schema (validasyon) | Hafta 6 — Hazır olmadan manuel kontroller yeterli |

> **Bloke olma** — her bağımlılığın bir mock alternatifi var, yukarıda belirtildi.
