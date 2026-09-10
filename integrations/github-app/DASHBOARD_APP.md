# tidyorg-dashboard — GitHub App

Dashboard'ın kullandığı **ikinci** GitHub App. Engine bot'undan (`tidyorg-infra-bot`,
bkz. [`README.md`](README.md)) tamamen ayrıdır ve **çok daha dardır**.

| | **tidyorg-infra-bot** (engine) | **tidyorg-dashboard** (bu) |
| :--- | :--- | :--- |
| Kullanan | Terraform provider | React SPA (tarayıcı) |
| Auth | App private key (server-to-server) | Kullanıcı device flow (user-to-server) |
| Kime bağlı | Bot kimliği | Giriş yapan kişinin kimliği |
| İzinler | Admin + Members + Org admin | Contents RW + Pull requests RW + Metadata R |
| Kurulum | Tüm repolar | **Yalnız config repo** |

## Neden ayrı ve neden dar (yükseltme kapısı)

Dashboard tarayıcıda çalışır ve giriş yapan kişi adına config repo'ya **PR açar** — asla
doğrudan `main`'e yazmaz, asla apply çalıştırmaz. Bu yüzden app'in yetkisi kasıtlı olarak
minimuma indirilmiştir:

- **`Administration` YOK** → dashboard bir repoyu **silemez** veya ayarlarını doğrudan
  değiştiremez. Repo silme yalnızca break-glass terminal script'iyle yapılır
  (`scripts/hard-delete-repo.*`). App'e bu izin verilirse o sınır çöker.
- **`Members` / org izinleri YOK** → dashboard org üyeliğini/owner'lığı doğrudan değiştiremez;
  yalnızca `people.yml`'a PR açabilir. `privileged.yml` (owner'lar) CODEOWNERS korumasında,
  dashboard oraya PR açsa bile insan onayı olmadan merge edilemez.
- **Yalnız config repo'ya kurulur** → erişim kapısı budur. App başka repolara kurulu
  olmadığı için, yetkisiz bir kullanıcı device flow ile giriş yapsa bile config repo dışında
  hiçbir şeye erişemez (403). Kurulumda **"All repositories" DEĞİL, "Only select repositories"**
  seçilip yalnızca config repo eklenmelidir.

## Sıfırdan Kurulum

Referans config: [`dashboard-app-manifest.json`](dashboard-app-manifest.json)

### 1. GitHub App Oluştur

```
https://github.com/organizations/<org>/settings/apps/new
```

| Alan | Değer |
| :--- | :--- |
| **GitHub App name** | `tidyorg-dashboard` |
| **Homepage URL** | dashboard URL'i (örn. Vercel deployment'ı) |
| **Callback URL** | gerekmez — device flow kullanılır |
| **Webhook → Active** | ❌ İşareti kaldır |
| **Where can this app be installed?** | Only on this account |

**Device flow'u aç:** "Identifying and authorizing users" bölümünde
**"Enable Device Flow"** kutusunu işaretle. (Dashboard tarayıcıdan `client_id` ile
device code akışı çalıştırır; manifest bu kutuyu içermez, elle işaretlenir.)

**Repository permissions:**

| İzin | Değer | Neden |
| :--- | :--- | :--- |
| Contents | Read and write | Branch açmak + config dosyalarını commit'lemek |
| Pull requests | Read and write | Değişiklikleri PR olarak açmak |
| Actions | Read-only | Senkron rozeti — `terraform-apply` run durumunu okumak (merge sonrası "uygulanıyor / senkron / hata") |
| Metadata | Read-only (otomatik) | — |

> ⚠️ **Administration İZNİNİ VERME.** Bu bilinçli bir güvenlik sınırıdır — yukarıya bak.
>
> **Actions yalnızca `read`** — dashboard workflow tetikleyemez/değiştiremez, sadece apply
> run'ının durumunu okur. Header'daki canlı senkron rozeti bunu kullanır. Bu izin yoksa
> rozet sessizce "kapalı" kalır (403 yutulur), gerisi çalışmaya devam eder.

**Organization permissions:** Hiçbiri.

### 2. Client ID'yi Al

App oluşturulunca sayfanın üstünde **Client ID** görünür (`Iv1.xxxx...` veya
`Iv23xxxx...`). Bu değer dashboard'ın `VITE_GITHUB_CLIENT_ID` ortam değişkenine girer.
Device flow **private key/secret gerektirmez** — client_id herkese açık olabilir.

### 3. App'i Config Repo'ya Kur

Sol menü → **"Install App"** → org'u seç → **"Only select repositories"** →
**config repo'yu** ekle → Install.

> Bu adım erişim kapısıdır: app yalnızca burada kurulu olduğu için dashboard'a giriş yapan
> kişi başka repolarda hiçbir şey yapamaz.

### 4. Dashboard'ı Yapılandır

`VITE_GITHUB_CLIENT_ID` = yukarıdaki Client ID. Diğer ayarlar (`owner`, `repo`, `branch`)
dashboard config'inden gelir.
