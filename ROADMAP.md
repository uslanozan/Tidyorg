# Yol Haritası — Hedef Mimariye Geçiş

> **Bu doküman güncel plandır.**
>
> Modelin gerekçeleri: [`ACCESS-MODEL.md`](ACCESS-MODEL.md) · Yetki katmanları:
> [`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md)

Son güncelleme: 2026-08-19

---

## 1. Nerede Duruyoruz

**Bitti:**

| Alan | Durum |
| :--- | :--- |
| Terraform iskeleti, HCP backend, ortak state | ✅ Canlı |
| Repository modülü (config-driven) | ✅ Canlı, uçtan uca doğrulandı |
| `pilot-intern-web`, `pilot-intern-api` | ✅ İkisi de modülden yönetiliyor |
| `tidyorg` — kendini yönetiyor | ✅ Dogfooding, `imports.tf` ile |
| Config repo başına dosyaya bölündü _(Faz 1)_ | ✅ `config/repositories/*.yml` |
| Eski 9 takım silindi, `platform-admins` kaldı | ✅ Canlı |
| GitOps döngüsü _(Faz 3)_ | ✅ Workflow'lar yazıldı ve düzeltildi |
| GitHub App `tidyorg-infra-bot` _(Faz 4)_ | ✅ Terraform artık bot kimliğiyle çalışıyor |
| Şablon ve workflow dağıtımı _(Faz 2)_ | ✅ Üç repo'ya indi; `ci/test` ilk kez yeşil _(2026-08-16)_ |
| Erişim modelinin **ret tarafı** | ✅ Canlı doğrulandı — `GH006`, "Review required" |
| 12 doküman + 1 ADR | ✅ Yazıldı |

**Çalışmıyor / eksik:**

1. ~~`people` bölümü okunmuyor~~ ✅ **2026-08-18** — `people.tf` ile config'den
   üretiliyor; istisna dosyaları kaldırıldı. Tek boşluk: `owner-a` break-glass
   gereği yönetim dışı, org rolü hâlâ beyan _(bypass raporu bunu ismen söylüyor)_
2. ~~`default_repository_permission` = `Read`~~ ✅ **2026-08-18** — `none` yapıldı;
   erişimin tek kaynağı artık takım üyeliği
3. Dashboard yok _(Faz 5)_
4. ~~Repo güvenlik ayarları yönetilmiyor~~ ✅ **2026-08-18** — `vulnerability_alerts` ve
   secret scanning + push protection config'den yönetiliyor; org geneli varsayılanlar
   da açıldı. **Kalan:** code scanning (CodeQL) hâlâ yok, ve `advanced_security`
   GHAS lisansı istediği için bilerek kapalı _(Faz 7)_
5. **Motor ile durum aynı repoda** — mentörü motordan ayıracak bir sınır yok _(Faz 8)_

> `release.yml`'ın hiçbir repo'ya dağıtılmaması bu listede **yok**, çünkü eksik değil
> bilinçli bir karar — bkz. Karar I.

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

**Karar I — Sürüm otomasyonu opt-in; tetikleyicisi Faz 8** _(2026-08-17)_.
`release.yml` yazıldı ama **bilinçli olarak hiçbir repo'da aktif değil**
(`defaults.workflows: [ci]`).

- **Pilot repolarda anlamsız** — içlerinde kod yok; açılsa her `main` push'unda boş bir
  sürüm üretirdi.
- **Motor repo'da bugün gereksiz, Faz 8'de zorunlu** — config repo motoru
  `ref = v1.0.0` ile pinleyecek, yani tag üretilmeden ayrım çalışmaz.

İhtiyacı olan repo `workflows: [ci, release]` yazarak açar. Dokümanın bugünkü durumu
dürüstçe anlattığı yer: [`docs/release-process.md`](docs/release-process.md) başındaki
uyarı kutusu.

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
- [x] owner-a `platform-admins`'e eklendi
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
    └── tidyorg.yml
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
- [x] Satır sonu normalizasyonu (`\r\n` → `\n`) — apply'ı çalıştıran makineye göre
      değişen sahte diff'ler giderildi _(2026-08-16)_
- [x] `release` workflow'unun akıbeti **karara bağlandı** _(2026-08-17)_ — opt-in kalıyor,
      Faz 8'de motor repo'da devreye alınacak. Bkz. Karar I.

> 🔴 **Bu faz bir blokajı çözdü, sadece bir iyileştirme değildi.**
> Erişim düzeltmesinden sonra normal developer akışı devreye girmiş ve `ci/test`
> hiçbir repoda üretilmediği için **onaylanmış PR bile merge edilemiyordu**.
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

### Faz 6 — Org üyeliği, güvenlik ve taban ayarları ✅ _(tamamlandı, 2026-08-18/19)_

- [x] ✅ **`people` → `github_membership`** _(2026-08-18)_ — org üyeliği artık
      config'den üretiliyor ([`people.tf`](terraform/people.tf)); `platform-admins`
      üyeliği de `people.roles`'tan doğuyor.
      `org-membership.tf` ve `team-memberships.tf` istisna dosyaları kaldırıldı.
      **`moved` blokları sayesinde geçiş `0 to add, 0 to change, 0 to destroy`** —
      saf adres taşıması, tek bir API çağrısı bile yapılmadı.
      Break-glass: `owner-a` bilerek yönetim dışı (`unmanaged_people`).
      **Doğrulama plan aşamasında zorlanıyor** ve ikisi de canlı test edildi:
      `people.roles` içine repo kapsamlı rol yazmak · `org_role` yazmayı unutmak.
      Kural hardcode değil — `roles:` bloğundaki `scope` alanından türetiliyor.
- [x] ✅ **`default_repository_permission` → `none`** _(2026-08-18)_
      Bugünkü değer `Read`'ti — yazma deliği yoktu ama izolasyon da yoktu. Artık
      erişimin tek kaynağı takım üyeliği.
      🔴 **Ama etkisi bugün TEK repo ile sınırlı:** diğer üçü `public` ve public repo'yu
      internetteki herkes okur — ayar orada hiçbir şey değiştirmiyor. Gerçek izolasyon
      repo'lar private olduğunda oluşur, o da **Faz 7'ye bağlı**. Bkz. Faz 7 notu.
- [x] ✅ **Repo güvenlik ayarları** _(2026-08-18)_ — `vulnerability_alerts` (her plan,
      her görünürlük) ve `secret_scanning` + push protection (yalnızca public; private
      GHAS ister, modül sessizce atlar).
      ⚠️ **Bulgu:** `vulnerability_alerts` **bu repo'da kapalıymış** — kontrol düzleminin
      kendisi Dependabot uyarısı almıyormuş. Sebep: bu repo Terraform'dan önce elle açıldı.
- [x] ✅ **Org geneli güvenlik varsayılanları** _(2026-08-18)_ — beşi `false` → `true`.
      `advanced_security` bilerek `false` (GHAS/Enterprise ister → Faz 7).
- [x] ✅ **Repo açma yetkisi kısıtlandı** _(2026-08-18)_ —
      `members_can_create_repositories = false`. Artık yalnızca org owner elle repo
      açabilir; normal yol config'den geçiyor.
      ⚠️ GitHub "sadece mentörler" diyemiyor — org düzeyinde yetki ikili (tüm üyeler /
      yalnızca owner'lar), takım bazlı ara kademe yok. Bugün tek owner `owner-a`
      olduğu için sonuç aynı, ama owner olmayan bir mentör repo açamaz.
      ⚠️ **Doğrulanmadı:** bu ayarın GitHub App'i etkilemediği varsayılıyor (App org
      üyesi değil). Bir sonraki repo yaratımı bunu kanıtlayacak; `403` gelirse geri alınır.
- [x] ✅ **"Kim bypass edebiliyor?" raporu** _(2026-08-18)_ — repo × dal bazında etkin
      bypass aktörlerini listeleyen Terraform output'u.
      **Karar E'nin doğrudan sonucu:** muafiyet kalıcıysa geriye tek kontrol görünürlük
      kalıyor. 2026-08-15 olayının fark edilmeme sebebi tam olarak buydu.
      ⚠️ Org kapsamlı kısmı `people`'dan okuyor; `people` zorlanana kadar *beyan*.

---

### 📌 "Geçmişi kim koruyacak?" _(2026-08-18'de açıldı · 2026-08-20'de ikiye bölündü)_

> **Durum: karara bağlandı ve yarısı yapıldı** _(2026-08-20)_.
>
> | Yarı | Ne | Durum |
> | :--- | :--- | :--- |
> | **Kapsama (yaklaşım 2)** | Yönetim dışı repo'ları görünür kılar | ✅ **Yapıldı** — [`terraform/coverage.tf`](terraform/coverage.tf) |
> | Keşif + uzlaştırma (yaklaşım 1) | Mevcut repo'dan config üretir | ⏭️ **Faz 8'i bekliyor** |
>
> Bölme gerekçesi: yaklaşım 1 `config/`'in nereye taşınacağına bağımlı, erken yapılırsa
> araç iki kez kurulur. Yaklaşım 2 hiçbir şeye bağımlı değildi ve bugünkü açığı kapattı.
>
> Devralma prosedürü, üç senaryo (dış sistemden gelen / org'dan org'a / bireysel hesaptan)
> ve iki pürüz — takımların transfer olmaması, repo oluşturma kısıtının transferi
> engelleyebilmesi — ayrıca izlenmeli.
>
> Aşağıdaki analiz **sorunun tanımı** olarak duruyor; hâlâ geçerli, çünkü kapsama kontrolü
> sorunu *görünür* kıldı, *çözmedi*.

**Sorunu doğuran bulgu.** Org geneli güvenlik varsayılanlarını açtık ama bunlar
`*_for_new_repositories` — yani **yalnızca geleceği koruyorlar**. Mevcut repo'lar
etkilenmedi; onları modüldeki repo bazlı ayarlarla ayrıca açmak gerekti. Aynı gün
`vulnerability_alerts`'in **bu repo'da kapalı** olduğu ortaya çıktı: elle açılmış tek
repo, ve tam da denetlenmeyen tek repo oydu.

**Genel hâli:** org'a **dışarıdan gelen** bir repo (transfer, satın alma, eski proje)
config'i tanımıyor. Ne olacağı bugün belirsiz:

| Soru | Bugünkü cevap |
| :--- | :--- |
| Repo org'a girdi, config'de yok. Ne olur? | **Hiçbir şey.** Terraform onu görmez, yönetmez, raporlamaz. |
| Güvenlik varsayılanları uygulanır mı? | **Hayır** — onlar yalnızca *yeni* repo'lara. |
| Bypass raporunda çıkar mı? | **Hayır** — rapor `local.repos`'tan, yani config'ten üretiliyor. |
| Fark edilir mi? | **Hayır.** Bakılacak bir yer yok. |

Yani bugün org'a sessizce bir repo girip **hiçbir kontrolün kapsamına girmeden**
durabilir. Bu, projenin çözdüğünü iddia ettiği problemin ta kendisi.

**Konuşulan iki yaklaşım** _(ikisi de tartışılmadı, sadece kaydedildi)_:

1. **Script ile config çıkarma (pull).** Repo org'a gelmeden ya da geldikten hemen
   sonra, mevcut ayarlarını okuyup `config/repositories/<ad>.yml` üreten bir araç.
   İnsan üretilen dosyayı gözden geçirir, neyi kabul edip neyi ezeceğine karar verir,
   PR açar, apply eder.
   _Not: Terraform'un `import` bloğu bu işin **yarısını zaten yapıyor** — 2026-08-18'de
   org ayarlarında tam olarak bunu kullandık ve dört bulgu çıkardı. Aynı teknik repo
   başına uygulanabilir. Yani sıfırdan araç yazmak gerekmeyebilir._

2. **Otomatik algılama (push).** Org'daki repo'ları periyodik olarak listeleyip
   config'de karşılığı olmayanları raporlayan bir kontrol. Kendiliğinden yönetmez,
   **görünür kılar** — "şu repo yönetim dışında" der.
   _Not: bu, `enforce_admins = false` için verdiğimiz cevabın aynısı — kapatamıyorsan
   en azından gör. Aynı felsefe._

**Ayrı ayrı sorular, karıştırılmamalı:**
- **Keşif** — repo'nun bugünkü ayarları ne? (import / API okuma)
- **Uzlaştırma** — bunların hangisini kabul edip hangisini ezeceğiz? (insan kararı)
- **Kapsama** — yönetim dışı repo'yu kim, ne sıklıkta fark edecek? (sürekli kontrol)

Üçü farklı işler; biri diğerini çözmüyor. 1. yaklaşım keşif + uzlaştırmayı,
2. yaklaşım kapsamayı hedefliyor — muhtemelen **ikisi de gerekiyor**.

**Faz yerleşimi hakkında ön düşünce** _(karar değil)_: bu iş `config/`'in nerede
yaşadığına bağımlı, yani **Faz 8'den sonra** yapılması daha ucuz — aksi halde araç
önce bu repoya, sonra config repo'suna yazacak şekilde iki kez kurulur. Ama
**kapsama kontrolü** (2. yaklaşım) Faz 8'i beklemek zorunda değil; bugün de yazılabilir
ve bugünkü boşluğu görünür kılar.

---

### Faz 7 — Team planı geldiğinde _(engelli)_

Bu işler GitHub Team planı olmadan **yapılamaz**, denenemez.

> 🔴 **Faz 7 "iyi olur" değil, Faz 6'nın karşılığını ödeyen faz.**
> `default_repository_permission = none` bugün üç repo'da **hiçbir şey yapmıyor**, çünkü
> onlar `public` ve public repo'yu internetteki herkes okur. Repo'lar ancak private
> olduğunda ayar anlam kazanıyor — ve private repo'da branch protection için Team planı
> gerekiyor. Yani **izolasyon ile dal koruması bugün aynı anda elde edilemiyor**; ikisini
> birleştiren tek şey bu faz.

- [ ] Private repo'larda branch protection'ın çalıştığını doğrula
- [ ] Yeni repo'ların varsayılanını `private` yap
- [ ] Mevcut repo'ları private'a çevir
- [ ] Engellenme testlerini gerçek koşullarda tekrarla
- [ ] Ruleset'e geçişi değerlendir ve ADR yaz

**Kodda ne değişecek — envanter** _(2026-08-19'da çıkarıldı)_:

| Yer | Değişiklik | Boyut |
| :--- | :--- | :--- |
| [`config/organization.yml`](terraform/config/organization.yml) → `defaults.visibility` | `public` → `private` | **1 satır** |
| [`config/repositories/pilot-access-test.yml`](terraform/config/repositories/pilot-access-test.yml) | `protected_branches: {main,develop} = null` kaldırılabilir | 3 satır _(repo zaten geçici)_ |
| [`outputs.tf`](terraform/outputs.tf) → `korumasiz_repolar` notu | "free plan'de beklenen" ifadesi güncellenir | Yorum |
| Doküman/rapor notları | "public üzerinde doğrulandı" uyarıları | Yorum |

**Motor kodu (`modules/repository/`) değişmiyor.** `visibility` zaten config'den geliyor
ve modül private'ı destekliyor — `pilot-access-test` bugün private ve modülden doğdu.

> ⚠️ **Değişmeyecek olan — ve bunun bir bedeli var: secret scanning kapanır.**
> Modüldeki koşul `visibility == "public"` ve bu **kasıtlı**: secret scanning + push
> protection yalnızca public repo'da ücretsiz, private repo'da **GitHub Advanced Security
> (Enterprise)** ister — Team planı bunu açmaz.
>
> Yani repo'ları private yapmak saf kazanç değil, bir **takas**:
>
> | | Bugün (public) | Faz 7 sonrası (private) |
> | :--- | :--- | :--- |
> | Dünyaya kapalı | ❌ | ✅ |
> | `none` izolasyonu anlamlı | ❌ | ✅ |
> | Dal koruması | ✅ | ✅ |
> | Secret scanning + push protection | ✅ | ❌ _(Enterprise ister)_ |
> | Dependabot uyarıları | ✅ | ✅ |
>
> Kaybedilen şey önemsiz değil: **push protection**, sızdırılmış anahtarın repo'ya
> girmesini engelleyen tek mekanizma. Private'a geçerken bunun yerine ne konacağı
> (pre-commit hook, CI adımı, ya da Enterprise) **ayrıca karara bağlanmalı** — sessizce
> kaybedilmemeli.

> **Bu arada:** Doğrulamalar public repo üzerinde yapıldı. Private repo'da davranış
> farklı olabilir.

---

### Faz 8 — Repo topolojisi: motor / durum ayrımı _(orta)_ 🆕

**Ne zaman — takvim değil, koşul** _(2026-08-17'de revize edildi)_.
Şu üçünden **biri** gerçekleştiğinde yapılır:

1. **Dashboard yazma moduna geçer** — config'e mühendis olmayan bir kimlik dokunmaya başlar
2. **Projenin demosu çıkarılır** — hedef mimarinin gösterilmesi gerekir
3. **İkinci bir mentör katılır** — sınırın karşı tarafında gerçekten biri olur

**Neden takvimden koşula çevrildi:** İlk plan "Hafta 5 sonu" diyordu, ama bu ROADMAP'in
nominal takviminden türetilmişti, gerçek ilerlemeden değil. Bugün tek mentör var ve
dashboard yazma moduna geçmedi — yani Faz 8'in koruduğu sınırın karşı tarafında **kimse
yok.** Olmayan bir riske karşı bugün maliyet ödemek olurdu.

Dahası: **Faz 6 da motor + config şemasının birlikte evrildiği bir iş** (`people`
tüketimi, `security` alanları, org ayarları). Faz 2 için "bölünmeden önce bitir" denmesinin
sebebi neyse, Faz 6 için de aynısı geçerli — bölünmüş halde her yeni alan iki PR olur.
Bu yüzden **sıra: Faz 6 → Faz 8.**

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
tidyorg                                tidyorg-org-config
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
- [ ] **`release` workflow'unu motor repo'da devreye al** — `workflows: [ci, release]`.
      Sürümleme burada zorunlu hale geliyor: config repo motoru `ref = v1.0.0` ile
      pinleyecek, yani tag üretilmeden ayrım çalışmaz. _(Karar I)_
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
`svc-`, `web-`, `lib-` gibi bir önek zorunluluğu **olmayacak**.

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

> **Not:** dev-1 2026-08-15'te projeden ayrıldı; onun fazları (3 ve 4) owner-a'a geçti ve
> tamamlandı. dev-2 dashboard tarafında (Faz 5).

| Hafta | owner-a 📦 | dev-2 🖥️ | Sync noktası |
| :--- | :--- | :--- | :--- |
| **4** ✅ | Faz 0 + Faz 1 + Faz 3 + Faz 4 + erişim düzeltmesi | Dashboard iskeleti, giriş akışı | — |
| **5** | **Faz 2** (şablon + workflow dağıtımı) → ardından **Faz 8** (repo ayrımı) | Faz 5a — okuma modu | Split öncesi config şeması dondurulur |
| **6** | Faz 6 (üyelik, base permission, güvenlik, bypass raporu) | Faz 5b — **yazma modu** _(Faz 8 sonrası)_ | Yazma modunu yeni topolojide birlikte test et |
| **7** | README, doküman bakımı, ADR 005, sunum yapısı | Faz 5c–5d | Uçtan uca pilot test, canlı demo |
| **8+** | Faz 9 (agent'lar), Linear/ClickUp, `labels.md` | UX parlatma | — |

🔴 **Hafta 5'in kritik sıralaması:** Faz 2 → Faz 8 → (ancak sonra) Faz 5b.
Faz 2 motor ile config şemasının birlikte evrildiği tek iştir; iki repoya bölünmüş halde
her yeni alan iki PR olur. Faz 8 ise dashboard yazmaya başlamadan bitmeli, yoksa hareket
eden hedefe göç edilir.

---

## 7. Önerilen Sıra

```
Faz 0 ✅ → Faz 1 ✅ → Faz 3 ✅ → Faz 4 ✅ → Faz 2 ✅
                                              │
                                              ├─ develop kaldırıldı ✅  (Karar F, 2026-08-17)
                                              ↓
                                       Faz 6 (üyelik + güvenlik + bypass raporu)
                                              ↓
                                       Faz 8 (repo topolojisi + release.yml)
                                              ↓
                                       Faz 5b (dashboard yazma modu)
                                              ↓
                                       Faz 9 (agent'lar)

              Faz 7 — Team planı geldiğinde, sıradan bağımsız
```

**Gerekçe:**

- **Faz 2 önce geldi** çünkü hem bir blokajı çözüyordu (`ci/test` karşılıksızdı) hem de
  config şemasını dondurdu.
- **Faz 6, Faz 8'den önce.** Faz 2 için geçerli olan gerekçenin aynısı: Faz 6 de motor ile
  config şemasının **birlikte** evrildiği bir iş (`people` tüketimi, `security` alanları,
  org ayarları). Repolar bölündükten sonra her yeni alan iki PR olur — önce motor + tag,
  sonra pin yükselt. Şemayı tek repoda oturtup sonra bölmek çok daha ucuz.
- **Faz 8 koşula bağlı**, takvime değil: dashboard yazma modu, demo, ya da ikinci mentör.
  Ayrıntı ve gerekçe Faz 8 bölümünde.
- **Faz 9 en son**, çünkü Karar H'nin gerektirdiği "insan olmayan aktör" kimlik modeli
  Faz 6'daki `people` işiyle olgunlaşıyor.
