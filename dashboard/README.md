# 🖥️ tidyorg Yönetim Paneli

Head of engineering'lerin ve mentörlerin projeleri, mentörleri ve developer'ları
YAML dosyası yazmadan yönetebildiği arayüz.

Panelin **kendi sunucusu ve kendi token'ı yoktur**. Kullanıcı GitHub ile giriş
yapar, tüm istekler kullanıcının kendi token'ıyla gider. Yetkilendirmeyi GitHub
yapar: bir mentör başkasının repo config'ini değiştirmeye kalkarsa PR açılır ama
CODEOWNERS onayı olmadan merge edilemez.

## Ne yapar?

| Ekran | İş |
| :--- | :--- |
| **Projeler** | `terraform/config/repositories/*.yml` dosyalarını okuyup kart olarak listeler; ada/dile göre filtreler |
| **Proje detayı** | Mentör/developer listesi, dal koruması (org varsayılanı ile birleşik), repo bilgileri |
| **Yazma işlemleri** | Developer/mentör ekle-çıkar, repo bilgisi düzenle, yeni proje aç — **hepsi PR açar** |
| **Üye** | Bir kişinin hangi projede hangi rolde olduğu |
| **Bekleyen PR'lar** | Panelden açılan PR'lar + PR'a düşen `terraform plan` yorumunun özeti |

Panel `main`'e asla doğrudan yazmaz. Her değişiklik `dashboard/<işlem>-<repo>-<zaman>`
adlı bir branch'e yazılır ve PR olarak açılır.

## Çalıştırma

```bash
cd dashboard
npm install
cp .env.example .env    # değerleri doldur
npm run dev             # http://localhost:5173
```

| Komut | İş |
| :--- | :--- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tip kontrolü + prod derlemesi (`dist/`) |
| `npm run typecheck` | Yalnızca tip kontrolü |
| `npm run verify:yaml` | Gerçek config dosyalarında yazma güvenlik ağı (aşağıya bak) |

## Ortam değişkenleri

| Değişken | Ne işe yarar |
| :--- | :--- |
| `VITE_GITHUB_CLIENT_ID` | tidyorg **GitHub App**'inin client_id'si (`Iv1.…`/`Iv23.…`). **owner-a sağlar.** `client_secret` gerekmez ve istenmez. |
| `VITE_CONFIG_OWNER` | Config repo'sunun sahibi (org adı) |
| `VITE_CONFIG_REPO` | Config repo'sunun adı |
| `VITE_CONFIG_BRANCH` | PR'ların hedef dalı (varsayılan `main`) |
| `VITE_OAUTH_PROXY` | OAuth proxy yolu. Boş bırakılırsa `/gh-oauth` kullanılır. |

`client_id` gizli bilgi değildir; Device Flow'un tüm güvenliği kullanıcının
GitHub'da yaptığı onaya + App'in kurulu olduğu repo'ya dayanır.

**İki kaynak, bu sırayla:** `window.__ENV__` (çalışma zamanı — Docker image'ında
entrypoint `env.js`'i konteyner ortam değişkenlerinden üretir) → `import.meta.env`
(build'e gömülü `.env`). Runtime her zaman kazanır; yerelde `.env` yeterli.

## Giriş: GitHub App Device Flow — ve CORS notu

Statik bir SPA `client_secret` saklayamayacağı için Device Flow kullanılır:
kullanıcıya bir kod gösterilir, kullanıcı kodu github.com'da onaylar, panel
token'ı alır. Token **`sessionStorage`**'da tutulur (`localStorage` değil):
sekme kapanınca oturum biter. Token'ın süresi App ayarından **kapalıdır**
(refresh token akışı yok).

**Yetkiyi GitHub verir.** `scope` gönderilmez; kullanıcının neye erişebileceğini
App'in yüklü olduğu repo'ların izinleri (Contents RW, Pull requests RW, Metadata R)
belirler. App bu kullanıcı için config repo'suna kurulu değilse giriş yine başarılı
olur ama panel "Bu hesabın erişimi yok" ekranını gösterir — ilk `contents` isteği
403 döndüğünde.

Giriş ekranındaki **"token ile giriş"** yolu artık yalnızca geliştirme
derlemesinde görünür (bir PAT, App kurulum kısıtını atlardı).

⚠️ **Tek pürüz:** `github.com/login/device/code` ve `.../oauth/access_token`
uçları CORS başlığı göndermez, yani tarayıcıdan doğrudan çağrılamaz. Bu yüzden
istekler aynı-origin bir yol (`/gh-oauth/...`) üzerinden geçer:

- **Geliştirmede** → `vite.config.ts` içindeki proxy
- **Vercel'de** → `vercel.json` rewrite
- **Netlify'da** → `public/_redirects`

Üçü de yalnızca yönlendirmedir; çalışan bir sunucu kodu yoktur, yani mimari
hâlâ backend-less. OAuth App henüz hazır değilken giriş ekranındaki
**"Gelişmiş: token ile giriş"** ile kişisel erişim token'ı (`repo`, `read:org`)
kullanılabilir.

## Yazma akışı

Her değişiklik aynı adımlardan geçer:

1. Dosya güncel hâliyle okunur (`sha` dahil)
2. Değişiklik **yalnızca ilgili satırlara** uygulanır
3. `main`'den yeni branch açılır
4. Dosya branch'e yazılır (`sha` ile — kayıp güncelleme koruması)
5. PR açılır, kullanıcıya linki gösterilir

**Çakışma:** Araya başka bir değişiklik girdiyse GitHub 409/422 döner. Panel
dosyayı baştan okur, değişikliği güncel içeriğin üstüne uygular ve tekrar dener
(en fazla 3 deneme). Kullanıcıya "dosya değişmişti, tekrar denendi" bilgisi
verilir.

### Neden satır bazlı düzenleme?

Config dosyalarını `parse → dump` turundan geçirmek **yorumları siler**. Bu
repo'da yorumlar süs değil, karar gerekçesi taşıyor (örn.
`tidyorg.yml` içindeki mentör listesi uyarısı). Bu yüzden
güncellemede yalnızca hedeflenen anahtarın satır bloğu yeniden yazılır
(`src/services/yaml.ts` → `applyEdits`).

`npm run verify:yaml` bunu gerçek config dosyalarında doğrular: developer ekle →
başka hiçbir alan değişmemeli, hiçbir yorum kaybolmamalı, geri alınca dosya başa
dönmeli. Yazma koduna dokunmadan önce bu komutu çalıştırın.

**Bilinen sınır:** Bir listenin *içine* serpiştirilmiş yorumlar (örn. iki
developer satırı arasındaki yorum) o liste düzenlenirken kaybolur. Anahtarın
üstündeki yorum blokları korunur.

## Klasör yapısı

```
dashboard/
├── src/
│   ├── components/   # ProjectCard, Modal, Toaster, Person, States…
│   ├── pages/        # Login, Projects, ProjectDetail, NewProject, MemberDetail, PullRequests
│   ├── services/     # githubApi, deviceFlow, configRepo, yaml, validation, terraformPlan
│   ├── hooks/        # useAuth, useProjects, useProposal, useToast, useTheme
│   ├── styles/       # tokens.css (tasarım sistemi) + global.css
│   └── types/        # config.ts (YAML şeması), github.ts (REST cevapları)
├── scripts/          # verify-yaml.ts
└── public/
```

## Konfigürasyon şeması — dört dosya

| Dosya | Sahiplik | Dashboard | İçerik |
| :--- | :--- | :--- | :--- |
| `people.yml` | makine | ✅ yazar (`members` ekle/çıkar) | org üyeliği — **yetki taşımaz** |
| `repositories/*.yml` | makine | ✅ yazar | repo tanımı + erişim + dal koruması |
| `privileged.yml` | insan | ❌ **asla yazmaz** (okur, gösterir) | org owner + head-of-engineering |
| `organization.yml` | insan | ❌ yazmaz | roller, defaults |

🔒 `isHeadOfEngineering` / owner kontrolü `privileged.yml`'dan okunur. Panelde
"owner yap" gibi bir buton **yoktur** — yetki yükseltme yalnızca elle PR +
CODEOWNERS onayıyla.

## owner-a'a bağlı olan işler

| İhtiyaç | Şu anki durum |
| :--- | :--- |
| GitHub App `client_id` | Kod hazır; `client_id` gelince `.env` / `window.__ENV__`'e yazmak yeterli. Dev'de token ile giriş devrede |
| GitHub App'in oluşturulması + config repo'ya kurulması | owner-a (org admin işi) |
| GitOps plan yorumu (Faz 3) | Ekran hazır; yorum düşmeyen PR'da "Plan bekleniyor…" gösterilir, 30 sn'de bir yenilenir |
| JSON Schema (Hafta 6) | `src/services/validation.ts` içinde elle kontroller var; şema gelince oraya bağlanır |

## Repo yazma modu — kapsam

"Repo ayarları" diyaloğu (`src/components/RepoSettingsDialog.tsx`) şu alanları
düzenler: açıklama, dil, `visibility`, `default_branch`, `archived`, `has_*`,
`vulnerability_alerts`, `secret_scanning`, `files` (mod), `workflows`,
`protected_branches` (dal bazında kural / `null` / varsayılana bırak) ve
`code_owners`. Mentör/developer listeleri kendi akışında (ekle/çıkar).

Yazma **yorum-koruyan**: `applyEdits` yalnızca değişen anahtarın satır bloğunu
yeniden yazar — iç içe alanlar (`protected_branches`, `code_owners`) dahil.
`serializeRepoConfig` (tam yeniden üretim, yorumsuz) yalnızca **yeni** dosyalarda
kullanılır. `npm run verify:yaml` bunu her canlı config dosyasında doğrular.

**Kalan koordinasyon:** Faz 5 başlamadan `repositories/*.yml` + `people.yml` alan
seti dondurulmalı (yazma modu hareket eden hedefe göç etmesin — plan sync #2).
`organization.yml` / `privileged.yml` insan-sahipli; panel onlara dokunmaz.
