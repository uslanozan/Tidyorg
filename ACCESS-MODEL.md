# Erişim Modeli — Hedef Tasarım Notları

> Bu dosya, projenin **nihai hedefini** ve yetkilendirme modelini kayıt altına alır.
> `tasks-ozan.md` / `tasks-emre.md` haftalık görevleri anlatır; bu dosya **neden**ini anlatır.
> Yeni bir ortamda çalışmaya başlayan biri (veya kod asistanı) önce bunu okumalı.

Son güncelleme: 2026-08-07

---

## 1. Nihai Hedef

Kurulan altyapı tek bir pilot repo'yu yönetmek için değil, **dışarıdan gelen bir
konfigürasyonu girdi alıp organizasyondaki tüm repo'lar ve kişiler için yetki üreten
bir motor** olmak için tasarlanıyor.

Akış hedefi:

```
UI (config export)  →  JSON/YAML config  →  PR  →  terraform plan (CI)
                                                        ↓
                                              review + merge
                                                        ↓
                                            terraform apply → GitHub
```

Kimse elle HCL yazmayacak. Yeni repo, yeni kişi, yetki değişikliği — hepsi config
dosyasındaki bir satır değişikliği olacak. Bu yüzden **modülün girdileri `map`
şeklinde, config şemasını birebir yansıtacak biçimde** tasarlanmalı.

Pilot repo(lar) bu motorun çalıştığını göstermek içindir, hedefin kendisi değildir.

---

## 2. Aktörler ve Beklenen Davranış

### Head of Engineering
- Organizasyonun sahibi konumunda.
- Repo'ları oluşturur (örn. varsayılan 8 repo).
- Mentörleri repo'lara dağıtır ve **zaman içinde bu dağılımı değiştirebilir**.
- Her şeye yetkilidir.

### Mentörler (4 kişi, her biri 2 repo — toplam 8)
- **Bir repo'da tek mentör bulunur**, o repo'da başka mentör yoktur.
- Sorumlu oldukları repo'da **tam yetkiye** (`admin`) sahiptir.
- `main` ve `develop` dahil her branch'e push atabilirler.
- Repo kurallarını değiştirebilirler — ancak **config/dashboard üzerinden**
  (bkz. Bölüm 5 — Karar 1).
- Dışarıdan danışman ekleyip ona sınırlı yetki verebilirler (örn. tüm repo'ya read-only).

> Şema notu: bugün tek mentör olsa da config şemasında `mentors` alanı **liste** olarak
> tanımlanmalıdır. Tekil alanı sonradan listeye çevirmek hem config'i hem modülü kırar;
> liste bugün sıfır maliyetlidir.

### Developer'lar
- Developer ↔ repo ilişkisi **many-to-many**'dir. Bir kişi aynı anda birden fazla
  projede yer alabilir.
- Hiçbir developer `main` veya `develop` dallarına doğrudan push atamaz.
- Katkı yalnızca feature branch + PR üzerinden yapılır.
- "Takım" burada somut bir kurum değil, **o an o repo'da çalışan developer'ların ortak
  adıdır**. Teknik karşılığı: her repo için bir GitHub takımı, adı config'den türetilir
  (örn. `payments-api-devs`). Kişi projeden ayrılınca tek üyelik silinir.

### Dış Danışmanlar
- Geçici ve dar kapsamlı erişim.
- Tipik senaryo: tüm repo'ya read-only.
- Mentör tarafından eklenir/çıkarılır.

---

## 3. GitHub Primitifleriyle Karşılığı

GitHub'da yetki **iki katmanlıdır**. Bu ayrımı bilmeden model doğru kurulamaz.

### Katman 1 — Repo seviyesi rol
Bir kişi/takımın bir repo'daki rolü tektir: `pull` · `triage` · `push` · `maintain` · `admin`

| Aktör | Rol | Terraform kaynağı |
|---|---|---|
| Head of Engineering | org owner + `admin` | `github_membership` / `github_team_repository` |
| Mentör | `admin` (kural değiştirebilmesi için — bkz. uyarı) | `github_team_repository` |
| Developer | `push` | `github_team_repository` |
| Dış danışman | `pull` | `github_repository_collaborator` |

> **Uyarı:** `maintain` rolü branch protection kurallarını **değiştiremez**; bu yetki
> yalnızca `admin`'dedir. Mentörlerin kural değiştirmesi isteniyorsa `admin` olmaları
> gerekir — bu da repo silme yetkisini beraberinde getirir.

### Katman 2 — Branch seviyesi kısıt
`github_branch_protection` içindeki `restrict_pushes` bloğu ile, bir branch pattern'ine
kimlerin push edebileceği listelenir.

**Ters mantığa dikkat:** GitHub'da "sadece şu branch'e push atabilsin" diye bir yetki
verilemez. Write yetkisi daima repo geneline verilir, sonra branch'ler *kısıtlanır*.

"Developer main'e push atamasın, mentör atabilsin" şöyle kurulur:
1. Developer'a repo seviyesinde `push` ver
2. `main` / `develop` üzerine branch protection koy
3. `restrict_pushes` izin listesine **yalnızca mentörleri** yaz
4. `enforce_admins = false` yap

### ⚠️ Mevcut koddaki uyumsuzluk
`terraform/branch-protection.tf` içinde `main` koruması `enforce_admins = true` ile
canlıya alınmış durumda. Bu ayar admin'leri de kurala tabi tutar; yani **mentörler
admin olsalar bile `main`'e push atamaz.** İstenen davranış için `false` olmalı ve
mentörler `restrict_pushes` listesine eklenmelidir.

---

## 4. Mimari Kararlar

### Kişi bazlı değil, takım bazlı yönetim
Config kişi bazlı gelebilir, ancak Terraform bunu **takıma** çevirmelidir.

Gerekçe: her kişi × repo bir Terraform kaynağıdır. 50 kişi × 40 repo = 2000 kaynak;
`plan` süresi ve state boyutu yönetilemez hale gelir. Ayrıca kişi ayrıldığında 40 ayrı
yerden silmek gerekir. Takım üzerinden gidilirse tek üyelik silinir, tüm erişim gider.

Tek kişilik istisnalar (dış danışman gibi) için `github_repository_collaborator`
kullanılır — ama istisna olarak kalmalıdır.

Bu karar, "her developer tek bir takımda olacak" kuralıyla da doğal olarak uyumludur.

### Klasik branch protection yerine Ruleset
Provider v6'da `github_repository_ruleset` ve `github_organization_ruleset` mevcut
(şema üzerinden doğrulandı; `bypass_actors` → `actor_id`, `actor_type`, `bypass_mode`).

Ruleset'lerin bu model için avantajları:
- **Katmanlanabilir.** Org seviyesinde değiştirilemez bir taban kural, repo seviyesinde
  üzerine ekleme. Klasik branch protection'da katman yoktur.
- **`bypass_actors`** ile "kural herkese geçerli, şu takım hariç" tek satırda ifade
  edilir — mentör istisnasının doğal karşılığı budur.

Pilot aşamasında klasik branch protection kullanılabilir, ancak hedef mimari ruleset
olmalıdır. Bu karar `docs/adr/` altında bir ADR ile kayda geçirilmeli.

---

## 5. Verilen Kararlar

### Karar 1 — Kod katmanı / veri katmanı ayrımı ✅
**Dashboard Terraform kodunu değiştirmez, veriyi değiştirir.** Sistem iki katmandır:

| Katman | İçerik | Kim değiştirir | Sıklık |
|---|---|---|---|
| Kod (HCL) | "Repo nasıl kurulur, kural nasıl uygulanır" tarifi | Ozan / Emre | Nadiren |
| Veri (config) | Hangi repo, kimde hangi yetki, hangi branch kimde | Mentör (dashboard) | Sık |

Mentör "min onay 3 olsun" dediğinde bir config alanı değişir; HCL'e dokunulmaz.
Dashboard'un işi: config dosyasını düzenleyip GitHub'a PR açmak. Terraform ile hiç
konuşmaz. Akış: dashboard → PR → CI `plan` → merge → `apply`.

### Karar 2 — HCP Terraform mentör arayüzü olarak KULLANILMAYACAK ✅
Gerekçeler:
- HCP bir yetki yönetim paneli değil, çalıştırma + state motorudur.
- Arayüzden değiştirilebilen tek şey workspace değişkenleridir; bunlar workspace
  geneline aittir, repo bazında ince ayar yapılamaz.
- "No-code provisioning" özelliği ücretli katman gerektirir ve mevcut yetkileri
  düzenlemeye değil yeni kaynak oluşturmaya yöneliktir.
- Mentöre HCP erişimi vermek, **tüm org'un state'ine** erişim vermek demektir; yetki
  sınırlaması yapılamaz.

**Sonuç: ayrı bir dashboard yazılacak.** İşi görece basittir — bir JSON/YAML dosyasını
düzenleyip PR açmak.

### Karar 3 — Mentör rolü: `admin` ✅
Kaçınılmaz sonucu: mentör GitHub arayüzünden branch protection'ı elle değiştirebilir ve
Terraform bunu bir sonraki `apply`'da geri alır.

Bu **bir hata değil, bir güvence olarak konumlandırılmalıdır**: standart dışına çıkan her
değişiklik otomatik olarak standarda döner; kalıcı değişiklik yalnızca config üzerinden
yapılır. Mentörlere bu davranış önceden bildirilmelidir, aksi halde "ayarım kayboldu"
şikayeti gelir.

### Karar 4 — Config dosyasının yeri: bu repo, `config/` klasörü ✅
Gerekçe: tek denetim izi, Terraform kodu ile verinin aynı PR'da görülmesi, `plan`
çıktısının doğrudan ilgili PR'a düşmesi. Ayrı repo yalnızca dashboard'u farklı bir ekip
işletirse anlamlı olur; şimdilik gereksiz karmaşıklık.

(İlgili: `tasks-emre.md` Hafta 4 — `terraform-plan.yml` / `terraform-apply.yml`)

---

### Karar 5 — Kurallar role bağlanır, kişiye değil ✅
Bu projede **her şey değişebilir kabul edilir**: kişiler gelir gider, mentörler değişir,
head of engineering bir kişi değil bir roldür.

Bu nedenle config'de yetki tanımları **rollere** yazılır (`roles` bölümü), kişiler yalnızca
o rollere atanır. Branch push izinleri de kişi listesiyle değil `push_allowed_roles` ile
ifade edilir. Kişi değiştiğinde tek bir atama değişir; kural metni hiç değişmez.

### Karar 6 — Dashboard repo da açabilecek ✅
Config'den bir repo tanımı silinmez/eklenmez sadece yetki yönetilmez; **repo yaşam döngüsü
de config'den yönetilir.** Bu nedenle repo tanımı zengindir (dil, görünürlük, açıklama,
template).

### Karar 7 — Branch kuralları repo bazında ezilebilir ✅
`defaults.protected_branches` tüm repo'lara taban kuralı verir; repo kendi bloğunda
yalnızca **farklı olan alanı** yazarak ezer. Böylece yeni repo hiçbir şey yazmadan güvenli
varsayılanlarla doğar, istisna gerektiren repo tek satırla ayrışır.

### Karar 8 — Onay kuralı projeden projeye değişir ✅
İki ayrı alan bu esnekliği sağlar:
- `required_reviews` — kaç onay gerekli
- `require_code_owner_review` — mentör onayı **zorunlu mu**, yoksa başka bir
  developer'ın onayı yeterli mi

2 kişilik bir projede mentörün darboğaz olmaması için `false` yapılabilir.

### Karar 9 — Repo silme yerine arşivleme ✅
Config'den bir repo satırı silinirse Terraform o repo'yu **gerçekten siler**. Bunun yerine
`archived: true` kullanılır; repo dondurulur, içerik korunur. Gerçekten silmek gerekirse
ileride ayrı ve bilinçli bir adım olarak yapılır.

### Karar 10 — Org geneli `.github` repo'su kullanılmayacak ✅
Community health dosyalarını (CONTRIBUTING, SECURITY, issue/PR template) org geneli
dağıtmanın en temiz yolu `.github` adında bir repo açmaktır. Ancak issue ve PR
template'lerinin çalışması için o repo'nun **public** olması gerekiyor — dosyalar
internete açılırdı. Kabul edilmedi.

**Bunun yerine:** Şablonlar her repo'ya ayrı ayrı yazılacak (`github_repository_file`).
Private repo'larda çalışır, içerik dışarı açılmaz. Bedeli: bir şablonu güncellemek N
repo'da N commit üretir.

### Karar 11 — Şablon dosyaları için iki senkronizasyon modu ✅
- **`strict`** — Terraform içeriği sahiplenir; elle yapılan değişiklik bir sonraki
  `apply`'da geri alınır. Kapsam: `CODEOWNERS`, `.github/workflows/*`, issue/PR
  template'leri, `dependabot.yml`.
- **`seed`** — Yalnızca ilk oluşturmada yazılır; repo sonradan kendine göre değiştirebilir.
  Kapsam: `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`, `README.md`.

Yönetişim dosyaları standart kalır, içerik dosyaları repo'ya devredilir.

### Karar 12 — Disiplin takımları kaldırılıyor ✅
`backend-team`, `frontend-team`, `devops-team`, `core-engineering`, `tech-leads`,
`interns-2026`, `interns-backend`, `interns-frontend`, `external-collaborators` siliniyor.
Rol tabanlı modelde karşılıkları yok; yetki repo başına üretilen takımlardan geliyor.

**`platform-admins` kalıyor** — silinemez. `head-of-engineering` rolü teknik olarak bu
takım üzerinden uygulanıyor: modüldeki `github_team_repository.org_admins` ve branch
protection'ın `push_allowed_roles` içindeki `head-of-engineering` karşılığı ona bağlı.

_İleride disiplin takımları geri istenirse **etiket** olarak eklenebilir — ancak repo
yetkisi verilmeden. GitHub bir kişiye birden fazla takım üzerinden erişim verildiğinde
en yüksek yetkiyi uygular; yetki verilirse en az yetki ilkesi sessizce delinir._

### Karar 13 — Dashboard bu repo'nun içinde yaşayacak ✅
Config, Terraform kodu ve dashboard aynı repo'da. Ayrı repo açılmayacak.

Blast radius sonucu: dashboard'un App'i bu repo'ya yazma yetkisi taşır, dolayısıyla
teorik olarak HCL'i de değiştirebilir. İki önlemle sınırlanır — dashboard doğrudan
`main`'e yazmaz (PR açar), ve `CODEOWNERS` `terraform/*.tf` yollarını insan onayına
bağlar.

### Karar 15 — Dashboard kullanıcının kendi kimliğiyle çalışacak ✅
Dashboard'un kendi token'ı **olmayacak**. Kullanıcı GitHub **device flow** ile giriş yapar
(`client_secret` gerektirmez, tarayıcıda çalışan uygulamalar için tasarlanmıştır) ve
işlemler onun token'ıyla yapılır.

**Kazandırdıkları:**
- Barındırılacak, güncellenecek, güvenliği sağlanacak bir sunucu yok
- Dashboard'un elinde `admin:org` kapsamlı bir sır yok — ele geçirilecek bir şey yok
- **Yetkilendirmeyi GitHub yapar:** kullanıcının config repo'suna yazma yetkisi yoksa
  istek reddedilir. "Mentör yalnızca kendi repo'sunu düzenler" kuralını CODEOWNERS
  merge anında zorlar.
- **Denetim izi gerçek:** commit'ler bot adına değil, işlemi yapan kişinin adına düşer

**Plan önizlemesi HCP API'siyle değil, PR yorumundan gelir.** GitOps workflow'u zaten
PR'a `plan` çıktısını yazacak; dashboard o yorumu kullanıcının token'ıyla okuyup gösterir.
Böylece dashboard'un HCP Terraform'a hiç bağlanması gerekmez.

**Kısıt:** Dashboard, kullanıcının yapamayacağı hiçbir şeyi yapamaz. Bu bir özelliktir,
ancak yükseltilmiş yetki gerektiren senaryolar (acil erişim kesme gibi) için ileride
küçük bir servis gerekebilir. Gerekirse eklenecek.

> **Not:** Semaphore UI gibi Terraform çalıştırma arayüzleri değerlendirildi ve elendi.
> Onlar HCP Terraform ile aynı kategoride — yetki yönetim paneli değil, çalıştırma
> arayüzü. Karar 2'deki gerekçelerin tamamı onlar için de geçerli, üstelik işletilecek
> bir sistem daha eklerler.

### Karar 16 — Config dosyaları sahipliğe göre ayrılır ✅
YAML programla yeniden üretildiğinde yorum satırları ve biçim kaybolur. Bu nedenle:

| Dosya | Sahibi | Kural |
| :--- | :--- | :--- |
| `config/repositories/*.yml` | **Makine** | Dashboard yazar. Yorum satırı konmaz, serbestçe yeniden üretilebilir. |
| `config/organization.yml` | **İnsan** | Roller, varsayılanlar, açıklayıcı yorumlar. Nadiren değişir; dashboard dokunmaz veya cerrahi düzenleme yapar. |

Depoda saklanan biçim her zaman **YAML**'dır. JSON Schema yalnızca doğrulama için
kullanılır — YAML ayrıştırıldığında JSON ile aynı veri modeline dönüştüğü için aynı şema
her ikisini de doğrular. Dosya formatı dönüşümü yoktur.

### Karar 14 — Repo isimlendirme standardı yok ✅
Önek zorunluluğu (`svc-`, `web-`, `lib-`) uygulanmayacak. Repo'ları head-of-engineering
veya mentörler açıyor; isim serbest.

---

## 5b. Future Work

Bilinçli olarak ertelenen, sistemin çalışması için gerekli olmayan konular:

| Konu | Not |
|---|---|
| **Dış danışman (`consultant` rolü)** | Şimdilik gerek yok. Gerekirse `pull` yetkisi verilir; öneri/geri bildirim Linear veya Slack üzerinden alınır. Şemada yorum satırı olarak hazır bekliyor. |
| **Erişim süre sınırı (`expires_at`)** | Terraform'da otomatik süre dolumu yoktur; zamanlanmış ayrı bir iş gerekir. Şimdilik elle kaldırma yeterli. |
| **GitHub App** | Kısa vadede kişisel PAT ile ilerlenecek. Kalıcı çözüm için bkz. `docs/notes/github-auth-strategy.md`. |
| **Force delete akışı** | Arşivleme yeterli; gerçek silme ileride bilinçli bir adım olarak eklenebilir. |
| **Audit / değişiklik geçmişi** | PR akışı bunu büyük ölçüde zaten sağlıyor (her değişiklik bir commit). Ek mekanizma gerekmeyebilir. |
| **Dashboard'un teknik detayları** | Teknoloji seçimi, kimlik doğrulama, PR'ı hangi kimlikle açacağı. |

---

## 6. Kısıtlar

### GitHub plan seviyesi
Free plan'de **private repo'larda branch protection ve ruleset çalışmaz.** Pilot repo
bu yüzden `visibility = "public"` olarak açıldı (`branch-protection.tf` içindeki nota
bakınız). Gerçek organizasyonda repo'ların çoğu private olacağına göre **GitHub Team
planı bu mimarinin ön koşuludur.** Sunumda açıkça belirtilmelidir.

### Config şeması = asıl sözleşme
UI ile Terraform arasındaki sözleşme config şemasıdır. Şema yanlış tasarlanırsa her iki
taraf da yeniden yazılır. Bu nedenle **modül yazılmadan önce şema taslağı çıkarılmalıdır.**

---

## 7. Mevcut Durum (2026-08-07)

Canlıda mevcut: 10 takım ve hiyerarşisi, 4 üyelik, `pilot-intern-api` repo'su,
`develop` branch'i, `main` + `develop` branch protection kuralları.

Canlıda yok: CI workflow'ları, label seti, repository modülü, dependabot, config motoru.

Bu bölüm tasarım değil anlık fotoğraftır; güncelliğini yitirebilir.
