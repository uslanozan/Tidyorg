# 🖥️ Medine — Dashboard

**Rol:** Head of engineering'lerin ve mentörlerin kullanacağı yönetim panelini geliştirir  
**Alan:** Dashboard UI/UX, GitHub Contents API (okuma & yazma), konfigürasyon yönetim ekranları  
**Terraform & altyapı tamamen kapsam dışı** — tüm işler `dashboard/` dizinini kapsar  
**Tahmini Süre:** 4–5 hafta (kademeli teslim)

> **Bağlam (2026-08-15):** Medine, Emre'nin ayrılmasının ardından projeye katıldı.
> Dashboard görevi Emre'nin planında Faz 5 olarak tanımlanmıştı.
> Terraform, GitOps, GitHub App altyapısı Ozan tarafından yürütülecek.
> Bkz. [`ROADMAP.md`](ROADMAP.md) Faz 5 ve [`ACCESS-MODEL.md`](ACCESS-MODEL.md) Karar 15.

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

- [ ] `dashboard/` klasörü altında proje oluştur
  - [ ] `npx -y create-vite@latest . -- --template react-ts` (veya tercih ettiğin)
  - [ ] `.gitignore`'a `dashboard/node_modules` eklenmeli — kök `.gitignore`'u kontrol et
- [ ] Klasör yapısı:
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
- [ ] Tasarım sistemi kur
  - [ ] Renk paleti, tipografi değişkenleri (CSS custom properties)
  - [ ] Google Fonts: Inter veya Outfit
  - [ ] Dark mode (sistem tercihine göre `prefers-color-scheme`)
  - [ ] Premium görünüm hedefi: glassmorphism card'lar, subtle gradyanlar, micro-animasyonlar

### 🔐 GitHub Device Flow ile Giriş

> **Device Flow neden?** Statik SPA'da `client_secret` saklayamazsın.
> Device Flow yalnızca `client_id` gerektirir — güvenlidir.

- [ ] GitHub OAuth App oluştur (Ozan'dan `client_id` al — Faz 4 beklenebilir, önce mock et)
  - Sadece `client_id` gerekir; "Enable Device Flow" işaretli olmalı
- [ ] Device Flow implement et:
  1. `POST https://github.com/login/device/code` → `device_code`, `user_code`, `verification_uri` al
  2. Kullanıcıya `verification_uri` ve `user_code`'u göster ("Şu sayfaya git ve bu kodu gir")
  3. `POST https://github.com/login/oauth/access_token` ile `interval` kadar bekleyerek poll et
  4. Token gelince bellekte tut (`sessionStorage` veya React state — `localStorage` değil)
- [ ] `GET /user` ile profil al → avatar + kullanıcı adını headerda göster
- [ ] Çıkış: token'ı bellekten sil, login ekranına yönlendir
- [ ] Login ekranı tasarımı — organizasyon logosu, GitHub giriş butonu, temiz layout

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

- [ ] GitHub Contents API ile `terraform/config/repositories/` dizinini listele
- [ ] Her `.yml` dosyasını çek → `js-yaml` ile ayrıştır
- [ ] Proje kartı bileşeni:
  - [ ] Repo adı + açıklama
  - [ ] Programlama dili (renk kodlu badge: Go=mavi, Python=sarı, TypeScript=cyan, PHP=mor)
  - [ ] Mentör(ler) ve developer sayısı
  - [ ] GitHub'da repo'ya link
  - [ ] Hover: karta gidince subtle ölçek animasyonu
- [ ] Arama (repo adına göre) + dil filtresi
- [ ] Yüklenirken skeleton ekranı

### 🗂️ Proje Detay Ekranı

Bir projeye tıklayınca:

- [ ] Tam mentör ve developer listesi (GitHub avatar + kullanıcı adı)
- [ ] Branch protection kuralları (config'den okunur: min onay sayısı vb.)
- [ ] Dil, visibility, açıklama
- [ ] GitHub repo'ya link

### 👤 Üye Görünümü

- [ ] Bir kullanıcı adına tıklayınca: "Bu kişi hangi projelerde, hangi rolde?" özeti

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

- [ ] Proje detay ekranında **"Developer Ekle"** butonu
  - [ ] GitHub kullanıcı adı input'u
  - [ ] `GET /users/{username}` ile kullanıcının GitHub'da var olduğunu doğrula
  - [ ] Config YAML'ına ekle → yazma akışını başlat
- [ ] Her developer yanında **"Çıkar"** butonu
  - [ ] "Emin misiniz?" onay diyaloğu
  - [ ] Config YAML'ından kaldır → yazma akışını başlat
- [ ] PR açıldıktan sonra: "PR oluşturuldu ✓ — [PR'ı görüntüle](#)" toast + link

### ✍️ Mentör Değiştir / Ekle

- [ ] Proje detay ekranında mentörü düzenleme arayüzü
- [ ] GitHub'da varlığını doğrula
- [ ] Yazma akışı

### ✍️ Yeni Proje (Repo) Aç

Head of engineering rolündeki kullanıcılar için:

- [ ] **"Yeni Proje"** butonu — role göre göster/gizle
- [ ] Çok adımlı form (wizard):
  - Adım 1: Repo adı (küçük harf, tire ile ayrılmış — frontend regex doğrulama), açıklama
  - Adım 2: Programlama dili seçimi (Go / Python / TypeScript / PHP)
  - Adım 3: İlk mentör (GitHub kullanıcı adı, varlığı doğrula)
  - Önizleme: "Şu YAML dosyası oluşturulacak" — şeffaflık önemli
- [ ] `terraform/config/repositories/<repo-adı>.yml` oluştur → PR aç

### ✍️ Repo Bilgilerini Düzenle

- [ ] Açıklamayı düzenleme
- [ ] Dil değişikliği
- [ ] Yazma akışı (mevcut dosyayı güncelle)

### 🛡️ Çakışma (Kayıp Güncelleme) Koruması

- [ ] Her yazma isteğinde dosyanın güncel `sha`'sını gönder
- [ ] API 409 dönerse: dosyayı yeniden oku → değişikliği üstüne uygula → tekrar gönder
- [ ] Kullanıcıya "Dosya başkası tarafından değiştirilmişti, tekrar denendi" mesajı

### ✅ Validasyon

- [ ] Her repo'nun en az bir mentörü olmalı
- [ ] Arşivlenmiş repo'ya developer eklenemez
- [ ] Repo adı: küçük harf, rakam, tire — başka karakter yok
- [ ] Ozan JSON Schema yazacak → hazır olunca onu kullan; öncesinde manuel kontroller

- [ ] ✅ **Sync:** Yazma modunu birlikte test et (gerçek PR açılıyor mu?)

---

## Hafta 4 — Plan Önizleme & UX Parlatma

### 👁️ Terraform Plan Önizleme

PR açıldıktan sonra GitOps workflow (Ozan — Faz 3) Terraform plan sonucunu otomatik olarak
PR'a yorum olarak düşürür. Dashboard bu yorumu okuyup anlaşılır biçimde gösterir.

> GitOps henüz hazır değilse bu ekranı mockla; gerisi hazır olunca bağlarsın.

- [ ] "Bekleyen PR'larım" sayfası — dashboard'dan açılan PR'lar
- [ ] Her PR için Terraform plan yorumunu oku:
  - Özetle: `"2 kaynak eklenecek, 1 kaldırılacak, 0 yok edilecek"`
  - `destroy` olan planlarda belirgin uyarı (kırmızı, ikon ile)
  - Plan yorumu henüz gelmemişse: "⏳ Plan bekleniyor..." + otomatik yenile (30s)
- [ ] PR'ı doğrudan buradan GitHub'da açma linki

### ✨ UX İyileştirmeleri

- [ ] Her API çağrısı için loading state (skeleton veya spinner)
- [ ] Hata yönetimi — kullanıcı dostu mesajlar:
  - Token süresi dolmuşsa: "Oturum sona erdi, lütfen tekrar giriş yapın"
  - Rate limit: "GitHub API limiti aşıldı, X dakika sonra tekrar deneyin"
  - Network hatası: "Bağlantı hatası, internet bağlantınızı kontrol edin"
- [ ] Boş state'ler: "Henüz proje yok", "Bekleyen PR yok"
- [ ] Toast / bildirim sistemi: başarı (yeşil), hata (kırmızı), uyarı (sarı)
- [ ] Responsive — 1280px, 1024px, tablet ekranlar

### 🎨 Tasarım Gözden Geçirme

- [ ] Renk paleti, tipografi, boşluklar tutarlı mı?
- [ ] Dark mode doğru çalışıyor mu? (sistem tercihi)
- [ ] Klavye navigasyonu ve temel erişilebilirlik (aria-label, focus ring)
- [ ] Arayüz dili Türkçe mi tutarlı?

- [ ] ✅ **Sync:** Uçtan uca test — Ozan ile birlikte

---

## Hafta 5 — Pilot Test & Teslim

- [ ] **Uçtan uca pilot test** (Ozan ile)
  - [ ] Device Flow ile gerçek giriş
  - [ ] Config'den proje listesi doğru yükleniyor mu?
  - [ ] "Developer Ekle" → PR açıldı → plan yorumu düştü → merge → GitHub'da kişi eklendi
  - [ ] "Yeni Proje" → config'de yeni `.yml` → Terraform yeni repo'yu oluşturdu
- [ ] **Dashboard `README.md`** — nasıl çalıştırılır, `client_id` nereden gelir
- [ ] **Demo senaryosu** — sunum için "sıfırdan proje aç + developer ekle" akışı hazırla

---


## 📌 Ozan ile Koordinasyon

| Dashboard Neye İhtiyaç Duyar | Ozan Ne Zaman Sağlar |
| :--- | :--- |
| `terraform/config/repositories/*.yml` yapısı (Faz 1) | Hafta 4 — Hazır olmadan `organization.yml`'den mock et |
| GitOps: plan yorumu PR'a düşsün (Faz 3) | Hafta 4–5 — Hazır olmadan plan ekranını mockla |
| OAuth App `client_id`'si (Faz 4) | Hafta 5 — Hazır olmadan `VITE_GITHUB_CLIENT_ID` ile local test et |
| JSON Schema (validasyon) | Hafta 6 — Hazır olmadan manuel kontroller yeterli |

> **Bloke olma** — her bağımlılığın bir mock alternatifi var, yukarıda belirtildi.
