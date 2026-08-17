# Yol Haritası — Hedef Mimariye Geçiş

> **Bu doküman güncel plandır.** [`implementation plan.md`](implementation%20plan.md) projenin
> başlangıcında yazıldı ve tarihsel kayıt olarak duruyor; oradaki takım hiyerarşisi ve
> yetki matrisi artık geçerli değil.
>
> Modelin gerekçeleri: [`ACCESS-MODEL.md`](ACCESS-MODEL.md) · Yetki katmanları:
> [`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md) · Kısa vadeli engeller:
> [`TODO.md`](TODO.md)

Son güncelleme: 2026-08-17

---

## 1. Nerede Duruyoruz

**Bitti:**

| Alan | Durum |
| :--- | :--- |
| Terraform iskeleti, HCP backend, ortak state | ✅ Canlı |
| Repository modülü (config-driven) | ✅ Canlı, uçtan uca doğrulandı |
| `pilot-intern-web`, `pilot-intern-api` | ✅ İkisi de modülden yönetiliyor |
| `Tidyorg` — kendini yönetiyor | ✅ Dogfooding, `imports.tf` ile |
| Config repo başına dosyaya bölündü _(Faz 1)_ | ✅ `config/repositories/*.yml` |
| Eski 9 takım silindi, `platform-admins` kaldı | ✅ Canlı |
| GitOps döngüsü _(Faz 3)_ | ✅ Workflow'lar yazıldı ve düzeltildi |
| GitHub App `tidyorg-infra-bot` _(Faz 4)_ | ✅ Terraform artık bot kimliğiyle çalışıyor |
| Şablon ve workflow dağıtımı _(Faz 2)_ | ✅ Üç repo'ya indi; `ci/test` ilk kez yeşil _(2026-08-16)_ |
| Erişim modelinin **ret tarafı** | ✅ Canlı doğrulandı — `GH006`, "Review required" |
| 12 doküman + 1 ADR | ✅ Yazıldı |

**Çalışmıyor / eksik:**

1. `people` bölümü Terraform tarafından okunmuyor — `org-membership.tf` tek kişilik
   istisna dosyası olarak duruyor _(Faz 6)_
2. `default_repository_permission` = **`Read`**, yönetilmiyor — her org üyesi her repo'yu
   görüyor _(Faz 6)_
3. Dashboard yok _(Faz 5)_
4. Repo güvenlik ayarları yönetilmiyor — secret scanning, `vulnerability_alerts`, code
   scanning'in hiçbiri kurulu değil _(Faz 6)_
5. **Motor ile durum aynı repoda** — mentörü motordan ayıracak bir sınır yok _(Faz 8)_
6. `release.yml` yazılmış ama **hiçbir repo'ya dağıtılmıyor** — `defaults.workflows`
   değeri `[ci]`; otomatik sürümleme fiilen çalışmıyor _(bkz. [`TODO.md`](TODO.md))_

---

## 2. Kararlar

### 2026-08-08

**Karar A — Org geneli `.github` repo'su kullanılmayacak.** Public olması gerekiyordu;
içindeki dosyalar internete açılacaktı. Kabul edilmedi. Şablonlar her repo'ya ayrı ayrı
yazılacak. **Bedeli:** bir şablonu güncellemek N repo'da N commit üretir.

**Karar B — Dashboard bu projenin kapsamında.** Ön koşulları: config'in repo başına
bölünmesi (Faz 1 ✅) ve GitHub App (Faz 4 ✅).

**Karar C — Config repo başına dosyaya bölünecek.** ✅ Yapıldı.

**Karar D — Team planı beklenmeyecek.** Plana bağımlı işler Faz 7'de toplandı.

### 2026-08-16

**Karar E — `enforce_admins` kalıcı olarak `false`.**
`main` için `true` yapmak tartışıldı ve reddedildi: mentörler ve üstü her zaman hızlı
karar alabilmeli. Bilinçli bir tavizdir. Gerekçe ve üç sonucu:
[`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md) Bölüm 4.

**Karar F — Kontrol düzlemi repoları trunk-based çalışır.**
`develop` bu repoda hiçbir şey satın almıyor: apply yalnızca `main`'den çalıştığı için
`develop`'a merge edilen config "merge edildi ama canlıda yok" durumunda kalıyor — bir
gecikme değil, **yalan**. `develop` ancak arkasında ayrı bir ortam olduğunda anlam kazanır
(sandbox org + prod org). Bugün tek org var.
[`docs/branching-strategy.md`](docs/branching-strategy.md)'deki `feat → develop → main`
akışı **ürün repoları için geçerli kalır**; kontrol düzlemi repoları istisnadır.

**Karar G — Motor ve durum ayrı repolara bölünecek** _(Faz 8)_.
Gerekçe zinciri Karar E'ye bağlı: `enforce_admins = false` olduğu için mentörü tek repo
içinde motordan ayıracak bir mekanizma yok — CODEOWNERS'ı da branch protection'ı da
bypass ediyor. Sınır ancak **repo sınırı** olabilir.

**Karar H — Otomasyon kimlikleri (agent'lar) kendi App'ini alır.**
`tidyorg-infra-bot`'un izinleri Administration + Contents + Members write. Bir review
veya triage agent'ına bu kimliği vermek, prompt injection'ı yetki yükseltmeye çevirir.
Agent'lar minimum izinli ayrı App kullanır ve **config'de görünür olur** — bugün model
yalnızca insan rollerini tanıyor.

---

## 3. Fazlar

Her faz bağımsız olarak tamamlanabilir ve kendi başına değer üretir.

---

### Faz 0 — Temizlik ve tutarlılık ✅ _(tamamlandı)_

- [x] `enforce_admins` → `false`
- [x] Kök `outputs.tf` dolduruldu
- [x] Ozan `platform-admins`'e eklendi
- [x] 9 eski takım silindi — `plan` sonrası **No changes** ile doğrulandı
- [x] `pilot-intern-api` `terraform state mv` ile modüle taşındı _(2026-08-15)_
- [ ] Bekleyen iki branch: `docs/engineering-standards-fixes`, `feat/branch-protection-fixes`
      ⚠️ `docs/engineering-standards-fixes` **kısmen geçersiz** — içindeki
      `rbac-and-permissions.md` eski takım yapısını anlatıyor, doküman
      2026-08-16'da baştan yazıldı. Push etmeden önce çakışmayı çöz.

---

### Faz 1 — Config yapısını böl ✅ _(tamamlandı, 2026-08-15)_

```
terraform/config/
├── organization.yml              # roller, defaults, people, org ayarları
└── repositories/
    ├── pilot-intern-web.yml
    ├── pilot-intern-api.yml
    └── Tidyorg.yml
```

Dosya adı = repo adı. `repositories.tf` `fileset()` + `yamldecode` ile besleniyor.
`plan` çıktısının değişmediği doğrulandı.

- [ ] **Kalan:** Bu repo'nun `.github/CODEOWNERS`'ına yol bazlı kural
      ⚠️ Karar E ışığında bu kural **mentöre karşı zorlanamaz** — bilgilendirici kalır,
      gerçek sınır Faz 8'de gelir.

---

### Faz 2 — Şablon ve workflow dağıtımı ✅ _(tamamlandı, 2026-08-16)_

Config'e `files` ve `workflows` alanları eklendi; modül bunları repo'ya yazıyor.

```yaml
defaults:
  files:
    contributing: seed        # strict | seed | none
    security: seed
    editorconfig: seed
    issue_templates: strict
    pr_template: strict
  workflows: [ci]             # ci | release | dependabot
```

- [x] `files` ve `workflows` alanlarını şemaya ekle
- [x] Modülde `github_repository_file` ile dağıtımı kur
- [x] `strict` / `seed` ayrımını uygula _(mod tablosu: K1)_
- [x] **Tutarlılık doğrulaması:** `workflows` içinde `ci` yoksa `require_status_checks`
      da boş olmalı — modül bunu `precondition` ile hata veriyor
- [x] Doğrulandı: PR template görünüyor, `ci/test` raporlanıyor
      _(bkz. [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 7.6)_
- [x] Satır sonu normalizasyonu (`\r\n` → `\n`) — apply'ı çalıştıran makineye göre
      değişen sahte diff'ler giderildi _(2026-08-16)_
- [ ] **Kalan:** `release` workflow'u hiçbir repo'da aktif değil (`defaults.workflows: [ci]`).
      Dağıtılacak mı, opsiyonel mi kalacak — karar verilmedi. Bkz. [`TODO.md`](TODO.md).

> 🔴 **Bu faz bir blokajı çözdü, sadece bir iyileştirme değildi.**
> Erişim düzeltmesinden sonra normal developer akışı devreye girmiş ve `ci/test`
> hiçbir repoda üretilmediği için **onaylanmış PR bile merge edilemiyordu**
> (kanıt: [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6.4).
> Şablon dağıtımıyla kapandı.

> 💡 **Faz 8 ve Karar H'yi tasarlarken akılda tut.** Şemayı bir kez kurup sonra
> bozmamak için: (a) `agents` alanı ileride buraya gelecek (bkz. Faz 9), (b) bu faz
> motor ile config şemasının **birlikte** evrildiği tek iştir — Faz 8'den *önce*
> bitirilmesinin sebebi bu (iki repoya bölünmüş halde her alan iki PR olur).

---

### Faz 3 — GitOps döngüsü ✅ _(tamamlandı, 2026-08-15/16)_

- [x] `.github/workflows/terraform-plan.yml` — PR tetikli, plan çıktısını yorum yazıyor
- [x] `.github/workflows/terraform-apply.yml` — `main` merge tetikli, concurrency korumalı
- [x] Bu repo'nun kendi branch protection'ı config'den yönetiliyor (dogfooding)
- [x] `plan.yml` YAML hatası düzeltildi _(2026-08-16)_ — dosya **hiç çalışmamıştı**;
      markdown tablosu blok skalerinin dışına düşmüştü
- [x] `TF_API_TOKEN` secret'ı girildi

---

### Faz 4 — GitHub App ✅ _(tamamlandı, 2026-08-15)_

`tidyorg-infra-bot` oluşturuldu; Terraform provider App kimliğine geçirildi. Commit'ler
artık bot adına düşüyor. Kurulum kılavuzu:
[`integrations/github-app/README.md`](integrations/github-app/README.md)

> **Dashboard için ayrı App gerekmiyor** — Karar 15 ile dashboard kullanıcının kendi
> kimliğiyle (Device Flow) çalışacak. Bu App yalnızca Terraform içindir.
> ⚠️ **Agent'lar için ise gerekiyor** — bkz. Karar H ve Faz 9.

---

### Faz 5 — Dashboard _(büyük)_

**Ne yapar:** Mentör ve head-of-engineering'in config dosyalarını YAML yazmadan
düzenlemesini sağlar.

**Mimari — dashboard'un kendi token'ı yok** (bkz. `ACCESS-MODEL.md`, Karar 15):

```
Kullanıcı
   ↓ GitHub Device Flow ile giriş (client_secret gerekmez)
   ↓ kullanıcının kendi token'ı
Dashboard (statik SPA)
   ├── Okuma:  config YAML dosyaları — kullanıcının token'ıyla
   ├── Yazma:  Contents API → branch + PR — kullanıcının token'ıyla
   └── Önizleme: PR'daki plan yorumunu oku
   ↓
GitHub  →  GitOps workflow'u (Faz 3) plan'ı PR'a yorum olarak yazar
   ↓
Merge  →  apply
```

Yetkilendirmeyi **GitHub yapar**: kullanıcının config repo'suna yazma yetkisi yoksa istek
reddedilir. Denetim izi gerçektir — commit'ler işlemi yapan kişinin adına düşer.

**Alt adımlar:**

- [ ] **5a. Okuma modu** — salt-okunur arayüz. Değer üretir, risk taşımaz.
- [ ] **5b. Yazma — PR akışı** ⚠️ **Faz 8'e bağımlı** (aşağıya bakınız)
- [ ] **5c. Plan görünümü** — PR'a düşen `plan` yorumunu göster
- [ ] **5d. Hızlı yol** — düşük riskli işlemler için PR'sız akış _(değerlendirilecek)_

**Teknik notlar:**
- YAML doğrudan yazılır; JSON Schema yalnızca kaydetmeden önce doğrulama için _(Karar 16)_
- `config/repositories/*.yml` makine sahipli; `organization.yml` insan sahipli
- Yazarken dosyanın `sha` değeri gönderilmeli; 409 dönerse okuyup tekrar dene
- Barındırma: Vercel/Netlify

**Bağımlılıklar:** Faz 1 ✅ · Faz 3 ✅ · **Faz 8 (5b öncesi)**

---

### Faz 6 — Org üyeliği, güvenlik ve taban ayarları _(orta)_

- [ ] **`people` → `github_membership`** — org üyeliği config'den üretilsin;
      `platform-admins` üyeliği de `people.roles`'tan doğsun.
      Break-glass: `uslanozan` yönetim dışı kalır.
      ⚠️ Riskli: mevcut owner yetkilerini etkileyebilir; `plan`'ı dikkatle incele.
      Tamamlanınca `org-membership.tf` istisna dosyası kalkar.
- [ ] **`default_repository_permission` kararı ve yönetime alınması**
      Bugünkü değer **`Read`** _(kanıt: `04-collaborators-teams.png`)_. Yazma deliği yok
      ama izolasyon da yok — yeni stajyer ilk günden tüm repo'ları görüyor.
      `None` mu olmalı? Karar verilip `github_organization_settings` ile bağlanmalı.
- [ ] **Repo güvenlik ayarları** — `vulnerability_alerts`, `security_and_analysis`
- [ ] **"Kim bypass edebiliyor?" raporu** — repo × dal bazında etkin bypass aktörlerini
      listeleyen Terraform output'u.
      **Karar E'nin doğrudan sonucu:** muafiyet kalıcıysa geriye tek kontrol görünürlük
      kalıyor. 2026-08-15 olayının fark edilmeme sebebi tam olarak buydu.

---

### Faz 7 — Team planı geldiğinde _(engelli)_

Bu işler GitHub Team planı olmadan **yapılamaz**, denenemez.

- [ ] Private repo'larda branch protection'ın çalıştığını doğrula
- [ ] Yeni repo'ların varsayılanını `private` yap
- [ ] Mevcut repo'ları private'a çevir
- [ ] Engellenme testlerini gerçek koşullarda tekrarla
- [ ] Ruleset'e geçişi değerlendir ve ADR yaz

> **Bu arada:** [`docs/pilot-verification.md`](docs/pilot-verification.md)'deki
> doğrulamalar public repo üzerinde yapıldı. Private repo'da davranış farklı olabilir.

---

### Faz 8 — Repo topolojisi: motor / durum ayrımı _(orta)_ 🆕

**Ne zaman:** Faz 2 bittikten sonra, Faz 5b (dashboard yazma modu) başlamadan önce.
Yani **Hafta 5 sonu / Hafta 6 başı**. Bu pencere dar ve kaçırılmamalı.

**Neden bu repo bölünüyor:** Tek repoda iki farklı yaşam döngüsü var.

| | Ne | Değişim ritmi | Doğru akış |
| :--- | :--- | :--- | :--- |
| **Motor** | `modules/`, workflow'lar, dokümanlar | Ürün gibi: özellik, bug, sürüm | trunk + tag |
| **Durum** | `config/*.yml` | Operasyon: stajyer ekle, mentör değiştir | PR → main → apply |

**Karar G'nin gerekçesi tek cümlede:** `enforce_admins = false` (Karar E) olduğu için
mentörü tek repo içinde motordan ayıracak hiçbir mekanizma yok — CODEOWNERS da branch
protection da bypass ediliyor. Sınır ancak repo sınırı olabilir.

**Hedef:**

```
Tidyorg          tidyorg-org-config
  MOTOR                                  DURUM
  modules/ · templates/ · docs/          config/organization.yml
  trunk-based + tag                      config/repositories/*.yml
  platform ekibi yazar                   ince terraform root
        │                                mentör + dashboard yazar
        └── ref = v1.2.0 ──────────────▶ trunk-based, PR → main → apply
```

**Yapılacaklar:**

- [ ] Yeni repo'yu **config'den** aç (dogfooding) — `tidyorg-org-config`
- [ ] `terraform/config/` klasörünü taşı
- [ ] Yeni repoda ince bir root yaz:
      `module "repositories" { source = "git::https://github.com/...//terraform/modules/repository?ref=v1.0.0" }`
- [ ] `terraform-apply.yml` ve `terraform-plan.yml`'i config repo'ya taşı
- [ ] Motor repo'da ilk sürüm tag'ini kes (`v1.0.0`)
- [ ] Yetkileri ayır: mentörler config repo'da admin, motor repo'da **erişimsiz** (ya da read)
- [x] `docs/branching-strategy.md`'ye kontrol düzlemi istisnasını yaz (Karar F)
      _(2026-08-17 — Bölüm 8 olarak eklendi)_
- [ ] `ADR 005 — kontrol düzlemi repo topolojisi` yaz

**State taşınmıyor.** Aynı HCP workspace kullanılmaya devam eder, yalnızca onu besleyen
repo değişir. Mekanik iş bu yüzden küçük: **yarım ile bir gün.**

**Aynı işte kapanacak yan konu — `develop`:** Karar F gereği `develop` kaldırılıyor,
ama **ayrı bir iş olarak değil, bu göç sırasında**. Sebep: branching'i iki kez
değiştirmek ekibe gereksiz gürültü; göç sırasında default branch, workflow trigger'ları
ve `branching-strategy.md` zaten elden geçecek.

- Config repo → trunk-based doğar, `develop` hiç olmaz
- Motor repo → trunk-based + tag devam eder; `develop` **eklenmez**
  _(değişiklikleri partiler halinde yayınlama ihtiyacı doğarsa yeniden değerlendirilir —
  şimdiden kurulmaz)_

> ⚠️ **Split'e kadar kabul edilen durum:** `develop` → `main` boşluğu **bilerek** elle
> yönetiliyor. `develop`'a merge edilen bir config canlıda değildir; apply elle
> çalıştırılır. Bu bir kabul, unutkanlık değil.

**Bedeli — dürüst olalım:** split sonrası yeni bir config alanı eklemek **iki PR** olur:
önce motor (modül alanı okusun, tag çıksın), sonra config (pin yüksel, alanı kullan).
Bugün tek PR. Faz 2'nin split'ten **önce** yapılmasının sebebi tam olarak bu.

**Kazançlar:**
1. **Blast radius** — dashboard ve mentörler motora asla yazamaz
2. **Versiyon pin'i** — motor değişikliği tag'lenir, pin yükselene kadar hiçbir yere inmez.
   `develop`'un taklit etmeye çalıştığı güvenliği bu gerçekten sağlar
3. **Geri alma** — pin'i eski tag'e düşürmek yeterli
4. **Denetim netliği** — "kim neyi değiştirdi" sorusu repo bazında ayrışır

---

### Faz 9 — Otomasyon agent'ları _(değerlendiriliyor)_ 🆕

Diğer repolara karşı çalışan issue/review/güvenlik agent'ları. **Üçüncü tür artefakt:**
config bildirimsel, motor onu uygular, agent'lar sürekli çalışır — Terraform değildir.

**Yerleşim:**

| Agent tipi | Nerede yaşar | Dağıtım |
| :--- | :--- | :--- |
| Olay güdümlü _(PR açıldı → review)_ | Hedef repoda | **Faz 2'nin mekanizması** — config karar verir, modül workflow dosyasını yazar |
| Repo-üstü _(org geneli tarama)_ | Merkezi zamanlanmış workflow | Bu repoda ya da ayrı `tidyorg-automation` |

Şema genişlemesi Faz 2'nin devamı olur — yeni mekanizma gerekmiyor:

```yaml
defaults:
  workflows: [ci]
  agents:
    review: true
    security: true
    triage: false
```

- [ ] Agent'lar için **ayrı GitHub App** — minimum izin (PR read/write, issues write,
      contents read). `tidyorg-infra-bot` kimliği **asla** verilmez _(Karar H)_
- [ ] `ACCESS-MODEL.md`'ye "insan olmayan aktörler" bölümü — bot'lar da rol taşır ve
      config'de görünür. Yoksa "hangi bot neye erişebiliyor?" sorusunun cevabı yine
      `.tf` okumakta olur
- [ ] Agent altyapısı seçimi ve dokümantasyonu _(karar verilince güncel referansa bakılacak)_

---

## 4. Ertelenenler (ek özellik)

Sistemin çalışması için gerekli değil:

- Linear / ClickUp entegrasyonu ve `docs/adr/003`
- Slack bildirimleri
- GitHub Projects rehberi, `docs/labels.md`
- ADR 001 (branching) ve 002 (Terraform) — kararlar uygulanmış, yazılı kayıt eksik
- README.md, sunum hazırlığı, canlı demo senaryosu
- Dış danışman (`consultant`) rolü, süre sınırlı erişim

---

## 5. Verilen Kararlar

### K1 — Şablon dosyaları: karma mod ✅
| Dosya | Mod |
| :--- | :--- |
| `.github/CODEOWNERS` | `strict` |
| `.github/workflows/*` | `strict` |
| `.github/ISSUE_TEMPLATE/*` | `strict` |
| `.github/PULL_REQUEST_TEMPLATE.md` | `strict` |
| `.github/dependabot.yml` | `strict` |
| `CONTRIBUTING.md` | `seed` |
| `SECURITY.md` | `seed` |
| `.editorconfig` | `seed` |
| `README.md` | `seed` |

Yönetişim dosyaları elle değiştirilemez; içerik dosyaları repo'ya devredilir.

### K2 — Eski takımlar: 9'u silindi, `platform-admins` kaldı ✅

> ⚠️ **`platform-admins` silinemez — taşıyıcı bir kaynaktır.** Modül
> `head-of-engineering` rolünü bu takım üzerinden uyguluyor: her repo'ya admin erişimi
> (`github_team_repository.org_admins`) ve `push_allowed_roles` içindeki
> `head-of-engineering` karşılığı ona bağlı. Silinirse `apply` hata verir ve mentörlerin
> push izni de çöker.

**Not — ileride gerekirse:** Disiplin takımları bir _yetki_ aracı değil, bir _etiket_
olarak geri getirilebilir. O gün gelirse repo yetkisi **vermeden** tanımlanmalı — GitHub
bir kişiye birden fazla takım üzerinden erişim verildiğinde **en yüksek** yetkiyi uygular.

### K3 — ~~Dashboard bu repo'nun içinde~~ ❌ **GEÇERSİZ (2026-08-16)**

> **Yerine Karar G geçti.** K3 dashboard'u, Terraform kodunu ve config'i aynı repoda
> tutuyor ve blast radius'u iki önlemle sınırlıyordu: (1) dashboard doğrudan `main`'e
> yazmaz, PR açar; (2) CODEOWNERS `terraform/*.tf` yollarını insan onayına bağlar.
>
> **İkinci önlem çalışmıyor.** Karar E ile `enforce_admins = false` kalıcı hale geldi;
> mentör hem CODEOWNERS'ı hem branch protection'ı bypass ediyor — 2026-08-15'te canlı
> görüldü. Dashboard kullanıcının kendi kimliğiyle çalıştığı için (Karar 15) mentör
> olarak açılan bir dashboard PR'ı motoru da değiştirebilir ve kendi kendine merge
> edebilir.
>
> Tek repoda bu sınır **kurulamaz**. Faz 8 ile repo sınırına taşınıyor.

### K4 — Repo isimlendirme standardı yok ✅
`svc-`, `web-`, `lib-` gibi bir önek zorunluluğu **olmayacak**. `implementation plan.md`'deki
ilgili bölüm geçersizdir.

### K5 — `enforce_admins` kalıcı olarak `false` ✅ _(2026-08-16)_
Karar E. Gerekçe: mentörler ve üstü her zaman hızlı karar alabilmeli.
Kabul edilmiş taviz — üç sonucu
[`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md) Bölüm 4'te.

### K6 — Kontrol düzlemi repoları trunk-based ✅ _(2026-08-16)_
Karar F. Ürün repoları `feat → develop → main` akışında kalır; kontrol düzlemi
repolarında `develop` yalnızca "merge edildi ama uygulanmadı" yalanı üretir.
`develop` ancak arkasında ayrı bir ortam olduğunda (sandbox + prod org) geri gelir.

### K7 — Agent'lar ayrı kimlik kullanır ✅ _(2026-08-16)_
Karar H. `tidyorg-infra-bot` (Administration + Contents + Members write) bir review
agent'ına verilemez — prompt injection'ı yetki yükseltmeye çevirir.

---

## 6. Haftalara Dağılım

> **Not:** Emre 2026-08-15'te projeden ayrıldı; onun fazları (3 ve 4) Ozan'a geçti ve
> tamamlandı. Medine dashboard tarafında (Faz 5).

| Hafta | Ozan 📦 | Medine 🖥️ | Sync noktası |
| :--- | :--- | :--- | :--- |
| **4** ✅ | Faz 0 + Faz 1 + Faz 3 + Faz 4 + erişim düzeltmesi | Dashboard iskeleti, giriş akışı | — |
| **5** | **Faz 2** (şablon + workflow dağıtımı) → ardından **Faz 8** (repo ayrımı) | Faz 5a — okuma modu | Split öncesi config şeması dondurulur |
| **6** | Faz 6 (üyelik, base permission, güvenlik, bypass raporu) | Faz 5b — **yazma modu** _(Faz 8 sonrası)_ | Yazma modunu yeni topolojide birlikte test et |
| **7** | README, doküman bakımı, ADR 005, sunum yapısı | Faz 5c–5d | Uçtan uca pilot test, canlı demo |
| **8+** | Faz 9 (agent'lar), Linear/ClickUp, `labels.md` | UX parlatma | — |

Detaylar: [`tasks-ozan.md`](tasks-ozan.md) · [`tasks-medine.md`](tasks-medine.md) ·
[`tasks-emre.md`](tasks-emre.md) _(deprecated)_

🔴 **Hafta 5'in kritik sıralaması:** Faz 2 → Faz 8 → (ancak sonra) Faz 5b.
Faz 2 motor ile config şemasının birlikte evrildiği tek iştir; iki repoya bölünmüş halde
her yeni alan iki PR olur. Faz 8 ise dashboard yazmaya başlamadan bitmeli, yoksa hareket
eden hedefe göç edilir.

---

## 7. Önerilen Sıra

```
Faz 0 ✅  →  Faz 1 ✅  →  Faz 3 ✅  →  Faz 4 ✅
                                          ↓
                                   Faz 2 (şablon dağıtımı)
                                          ↓
                                   Faz 8 (repo topolojisi)   ← develop burada kalkar
                                          ↓
                          Faz 5a ✅→ Faz 5b (dashboard yazma)
                                          ↓
                                   Faz 6 (üyelik + güvenlik)
                                          ↓
                                   Faz 9 (agent'lar)

              Faz 7 — Team planı geldiğinde, sıradan bağımsız
```

**Gerekçe:** Faz 2 hem bir blokajı çözüyor (`ci/test`) hem de şemayı donduruyor — split
öncesi yapılması gereken tek iş. Faz 8 dashboard yazma modundan önce yapılmalı, çünkü
sonrasında hareket eden bir hedefe göç etmek gerekir. Faz 6 riskli işleri sisteme güven
oluştuktan sonra yapıyor. Faz 9 en son, çünkü Karar H'nin gerektirdiği kimlik modeli
Faz 6'daki `people` işiyle olgunlaşıyor.
