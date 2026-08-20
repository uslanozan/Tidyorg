# Dış Değerlendirme — 2026-08-20

> **Durum:** 📄 Analiz raporu · Karar değil, **girdi**
> **Kaynak:** Şirket içinden GitHub / altyapı / DevOps tarafında çalışan kıdemli bir
> mühendisin projeyi gördükten sonra verdiği geri bildirim. Ham notlar Bölüm 1'de.
> **Yazan:** Ozan (notlar) + analiz · **Tarih:** 2026-08-20
>
> **Neden bu doküman var:** Beş maddelik ham not, projenin mevcut kapsamıyla üç farklı
> ilişki kuruyor — bir kısmı **zaten çözülmüş ama kanıtlanmamış**, bir kısmı **plan
> seviyesi engele** çarpıyor, biri de **kapsamda hiç yok**. Bu ayrımı yapmadan notları
> `TODO.md`'ye madde madde kopyalamak, çözülmüş işi yeniden açmak ya da Enterprise
> gerektiren bir işi Faz 7'nin içine yanlışlıkla saklamak olurdu.

---

## 1. Ham notlar

Konuşma sırasında alınan notlar, olduğu gibi:

```
1. herkes token alamıcak org için
2. belli orgdaki belli repolara vpn ile erişilebilsin
3. team değişikliği sonrası diğer repolara erişim
4. git sistemi için B planı lazım en az 3 ay saklamalı backup
5. docker image gereksinimlerini image e çekip durması
```

---

## 2. Özet — beş madde, üç farklı sınıf

| # | Konu | Sınıf | Bugünkü durum | Engel |
| :--- | :--- | :--- | :--- | :--- |
| 1 | PAT kısıtı | 🟢 Mimari hazır | `tidyorg-infra-bot` zaten PAT'siz | Org ayarı **elle**; provider göremiyor |
| 2 | VPN / IP allow list | 🔴 Plan engeli | Yok | **Enterprise** gerekir + repo bazında **yapılamaz** |
| 3 | Takım değişimi sonrası erişim | 🟡 Model çözüyor, kanıtlanmadı | Takım bazlı + `none` | 2 bilinen kaçak yolu + public repo'lar |
| 4 | Yedek / B planı, 90 gün | 🔴 **Kapsamda hiç yok** | Yalnızca config yedekli | Yeni iş; GitHub dışı hedef şart |
| 5 | Docker image'a gömme | 🟡 Bugün gereksiz | CI canlı kurulum yapıyor | İlk gerçek kod repo'su |

**Tek cümleyle:** en değerli madde **4** (kapsamda yok), en pahalı madde **2** (bütçe
kararını değiştiriyor), en ucuz ikisi **1** ve **3** (biri doküman, biri test).

---

## 3. Madde 1 — "herkes token alamıcak org için"

### Ne diyor

Org kaynaklarına erişen kişisel access token'lar serbest olmasın. GitHub'daki karşılığı
org ayarlarındaki **personal access token policies**: (a) classic PAT'lerin org'a
erişimini tamamen kapatmak, (b) fine-grained PAT'lerin org owner **onayından** geçmesini
zorunlu kılmak.

### Bugünkü durum — bu madde büyük ölçüde kazanılmış

[`docs/notes/github-auth-strategy.md`](github-auth-strategy.md) tam olarak bu tartışmayı
yapıp classic PAT'i reddetmiş ve `tidyorg-infra-bot` App'ine geçmiş _(2026-08-15)_. Yani
**motorun** token'ı yok, App kısa ömürlü installation token alıyor. Dashboard tarafı da
aynı yönde: [`ACCESS-MODEL.md`](../../ACCESS-MODEL.md) Karar 15 gereği dashboard'un kendi
token'ı olmayacak, kullanıcının device flow token'ıyla çalışacak.

Abinin söylediği şey bunun **org geneline** yayılması: bizim dışımızdaki kişiler de PAT
üretip org'a erişmesin.

### Gerçek mesele — bu ayar config'den yönetilemeyebilir

⚠️ **Doğrulanmadı, ama beklentim şu:** provider'da PAT politikası için resource yok.
REST API'de onay *akışı* için endpoint var
(`/orgs/{org}/personal-access-token-requests` — listeleme ve onay/ret), fakat politikanın
kendisini set eden bir endpoint göremedim. Doğruysa bu ayar, `billing_email` ile **aynı
sınıfa** düşüyor:

> Arayüzden yapılan, provider'ın okuyamadığı, dolayısıyla **drift'i de görülmeyen** ayar.

Bu repo o tuzağı bir kez yaşadı — fatura e-postası ayrılan ekip üyesindeydi ve üç gün
kimse fark etmedi ([`TODO.md`](../../TODO.md), kapanmış madde). Aynı hatayı ikinci kez
yapmamanın yolu, ayarı yapıp geçmek değil, **nerede yaşadığını yazmak**.

### İkinci risk — CI'ı kırabilir

Classic PAT erişimini kapatmak bugün bir şeyi kırmıyor gibi görünüyor: `TF_API_TOKEN`
HCP'nin token'ı, GitHub PAT'i değil. Ama ileride `gh` CLI veya bir PAT kullanan bir
workflow yazılırsa o gün patlar. Kapatma kararı verilirken bu **önden** taranmalı.

### Öneri

| Adım | Nerede |
| :--- | :--- |
| Org ayarını yap: classic PAT erişimi kapalı, fine-grained PAT onaya bağlı | GitHub UI |
| Ayarın **provider tarafından görülmediğini** yaz | [`terraform/org-settings.tf`](../../terraform/org-settings.tf) yorumu |
| "Elle yönetilen org ayarları" kontrol maddesi | [`docs/runbook.md`](../runbook.md) § 1.4 — `billing_email` bloğunun yanına |
| Provider desteğini doğrula | Doğrulanırsa config'e alınır, doğrulanmazsa madde kalıcı olur |

**Sunum notu:** Bu madde aslında projenin **lehine** bir soru. "Altyapıyı neyle
yönetiyorsunuz?" sorusunun cevabı kişisel PAT olsaydı sunumda ilk açık orası olurdu;
`github-auth-strategy.md` bunu Hafta 1'de öngörüp kapatmış.

---

## 4. Madde 2 — "belli orgdaki belli repolara vpn ile erişilebilsin"

Notların **en pahalı** maddesi ve içinde iki ayrı sorun var: biri para ile çözülüyor,
diğeri çözülmüyor.

### Ne diyor

GitHub'a yalnızca kurumsal VPN'in sabit çıkış IP'sinden erişilebilsin. GitHub'daki adı
**IP allow list**.

### Birinci engel — plan. Ve bu, Faz 7'nin içinde değil

Kendi dokümanınız bunu zaten söylüyor: [`docs/plans-and-pricing.md`](../plans-and-pricing.md)
Bölüm 3 tablosunda `IP allow list` satırı **Free ❌ / Team ❌ / Enterprise ✅**.

🔴 **Bu, o dokümandaki "Enterprise bugün gerekçesiz" sonucunu değiştiren ilk somut
gerekçedir.** Bugüne kadar Enterprise'ın tek kancası private repo'da environment
protection rules'du ve o da Faz 8'e bağlı bir "olabilir"di. IP allow list ise **dışarıdan
gelen bir gereksinim** — yani isteyen biri var.

Maliyet karşılaştırması, mevcut 3 kişilik ekip için:

| Senaryo | Aylık | IP allow list |
| :--- | ---: | :---: |
| Free (bugün) | $0 | ❌ |
| Team | $12 | ❌ |
| Enterprise | $63 | ✅ |

Yani bu madde **Faz 7'ye eklenemez**; Faz 7 Team planı fazı. Ayrı bir karar.

### İkinci engel — granülarite. Bunu para çözmüyor

⚠️ **IP allow list org geneli bir kontroldür.** "Şu org'daki şu üç repo VPN arkasında,
diğerleri açık" **kurulamaz** — ayar org'un tamamına uygulanır.

Notun kelimeleri ("belli orgdaki belli repolara") tam olarak bu ayrımı zorluyor. Tek
gerçek çözüm topolojik: **hassas repo'lar ayrı bir org'a alınır** ve allow list o org'a
uygulanır.

Bu, sizin Faz 8'de verdiğiniz kararla **aynı cinsten** bir sonuç. Karar G'nin gerekçesi
şuydu: `enforce_admins = false` olduğu için mentörü tek repo içinde motordan ayıracak
mekanizma yok, *"sınır ancak repo sınırı olabilir."* Burada da aynı cümlenin bir üst
katmanı geçerli: **ağ sınırı ancak org sınırı olabilir.** ADR 005 yazılırken bu paralellik
kaydedilmeye değer.

### Üçüncü ve en sinsi kısım — kendi CI'ınızı kilitler

IP allow list açıldığında GitHub-hosted runner'ların IP'leri dinamik olduğu için
[`terraform-plan.yml`](../../.github/workflows/terraform-plan.yml) ve
[`terraform-apply.yml`](../../.github/workflows/terraform-apply.yml) org'a erişemez hale
gelir. İki çıkış yolu:

1. Org ayarındaki **"Enable IP allow list configuration for installed GitHub Apps"** —
   App'lerin kendi IP aralıklarının listeye otomatik eklenmesi. `tidyorg-infra-bot` için
   gereken bu.
2. **Self-hosted runner'ı VPN içine koymak** — ki bu doğrudan **Madde 5'e** bağlanıyor
   (deterministik runner ortamı = image).

⚠️ Bu, projenin tekrar eden hata kalıbının yeni bir örneği olmaya çok müsait: bir güvenlik
ayarı açılıyor, otomasyon sessizce kırılıyor, kimse günlerce fark etmiyor. Açılacaksa
**aynı PR'da** App bypass'ı ayarlanmalı.

### API tarafı

⚠️ **Doğrulanmadı:** IP allow list girişleri bildiğim kadarıyla **yalnızca GraphQL**
üzerinden yönetiliyor (`createIpAllowListEntry` / `updateIpAllowListEnabledSetting`),
REST'te karşılığı yok. Provider'da resource olduğunu da sanmıyorum. Doğruysa bu da
Madde 1 ile aynı sınıfa düşer: **config'den yönetilemeyen bir ada.**

### Öneri

Bugün **yapılmamalı**, ama karar kaydı açılmalı. Gerekçe: gereksinimi getiren tarafın
Enterprise bütçesini onaylayıp onaylamadığı belli değil ve org bölme kararı Faz 8'in
topolojisiyle birlikte düşünülmeli — iki ayrı org bölmesi (motor/durum ve açık/kapalı)
aynı anda tasarlanmazsa ikinci bölme birinciyi bozar.

---

## 5. Madde 3 — "team değişikliği sonrası diğer repolara erişim"

### Ne diyor

Biri takım değiştirdiğinde veya projeden çıktığında eski repo'lardaki erişimi **gerçekten**
gidiyor mu?

### Bugünkü durum — mimarisi doğru

Bu maddenin cevabı tasarımda zaten var, iki karar birlikte:

- **Takım bazlı yönetim** ([`ACCESS-MODEL.md`](../../ACCESS-MODEL.md) Bölüm 4) — kişi
  ayrılınca 40 yerden silmek gerekmiyor, tek üyelik düşüyor.
- **`default_repository_permission = none`** (Faz 6, 2026-08-18) — erişimin **tek** kaynağı
  takım üyeliği.

İkisi birlikte tam olarak sorulan şeyi sağlıyor. Dahası, `people.yml`'a geçişle offboarding
**tek satır YAML silmek** haline geldi; 2026-08-15'te aynı iş iki ayrı `.tf` dosyası
düzenlemeyi gerektiriyordu ve birini atlamak sessizce yetkiyi bırakıyordu.

### Ama üç delik var ve üçü dokümanlarda dağınık

| Delik | Nerede yazılı | Durum |
| :--- | :--- | :--- |
| **Doğrudan collaborator'lar** — Terraform onları görmüyor; takım silinse de kalırlar | [`TODO.md`](../../TODO.md) → GIT-34 | Açık madde |
| **Çoklu takım üyeliği** — GitHub **en yüksek** yetkiyi uygular, en az yetki ilkesi sessizce delinir | [`ROADMAP.md`](../../ROADMAP.md) → K2 | Uyarı olarak var |
| **Public repo'lar** — 4 repo'nun 3'ü public; orada "erişimi kaldırmak" hiçbir şey ifade etmiyor | [`TODO.md`](../../TODO.md) → bloklayan iş | Faz 7'ye bağlı |

Yani dürüst teknik cevap: *"Model bunu çözüyor, ama bugün üç repo'da **kanıtlanamaz** ve
iki bilinen kaçak yolu var."*

### Eksik olan şey bir mekanizma değil, bir test

[`docs/pilot-verification.md`](../pilot-verification.md)'de **erişim kaldırma** testi yok.
Var olan testler erişimin *verildiğini* ve *reddedildiğini* kanıtlıyor; *geri alındığını*
kanıtlayan bir kayıt yok.

Bu, bu projenin kendi kuralının uygulanmadığı bir yer. `coverage.tf` yazılırken kural şöyle
konmuştu: *"sıfır bulgu, kontrolün çalıştığının kanıtı değildir"* — ve alarm yolu bilerek
tetiklenmişti. Aynı mantık burada da geçerli: **erişimin gittiğini görmeden gittiğini
varsaymak**, `korumasiz_repolar` boş haritasıyla aynı hata.

**Önerilen test senaryosu** (kurulum kritik):

1. `pilot-access-test` — **private olan tek repo**, testin orada yapılması zorunlu. Public
   repo'da test hiçbir şey kanıtlamaz; bu tuzağa 2026-08-19'daki izolasyon testinde
   dikkat edilmişti, aynısı geçerli.
2. `paitblack` (veya `medine2906`) repo takımına eklenir → `git clone` ve API erişimi
   çalıştığı görülür.
3. Config'den çıkarılır → apply.
4. Aynı hesapla `clone` ve API çağrısı → **404 beklenir**, kanıt ekran görüntüsüyle
   `pilot-verification.md` Bölüm 9'a işlenir.
5. Aynı hesabın **diğer** repo'lardaki erişimi bozulmamış olmalı — "takım değişikliği"nin
   asıl sorduğu şey bu: bir yerden çıkmak başka yerden çıkarmıyor.

### Kapsamın dürüst sınırı

Kimsenin çözemediği kısmı önden söylemek gerekiyor: **kopyalanmış kod geri alınamaz.**
Erişim kesmek gelecekteki erişimi keser, yerel klonu değil. Bu bir eksik değil, kontrolün
tanım gereği sınırı — ama sunumda sorulursa cevabın hazır olması gerekir.

⚠️ **Doğrulanmadı:** GitHub'ın, private bir repo'ya erişimi kalkan kullanıcının o repo'daki
**fork'unu sildiğine** dair bir davranış hatırlıyorum. Doğruysa bu iyi haber ve teste bir
adım daha ekler; yanlışsa "fork kalır" diye not düşmek gerekir. Test sırasında bakılmalı.

---

## 6. Madde 4 — "git sistemi için B planı lazım, en az 3 ay saklamalı backup"

🔴 **Notların içinde projede karşılığı SIFIR olan tek madde.** Ne
[`ROADMAP.md`](../../ROADMAP.md) fazlarında, ne [`TODO.md`](../../TODO.md)'de, ne
`tasks-ozan.md`'de yedekten söz eden bir satır var. En değerli geri bildirim bu.

### Ne diyor

GitHub'ı kaybederseniz ne yapacaksınız? Senaryolar: hesap ele geçirilmesi, fatura kesilmesi
sonucu org'un askıya alınması, kazara silme, uzun süreli GitHub kesintisi, org'un
kapatılması. Ve yedekler **en az 90 gün** saklanacak.

"3 ay" ifadesi bir **uyumluluk gereksinimi** kokuyor (KVKK / ISO 27001 tarzı bir saklama
politikası). Öyleyse pazarlık konusu değil, bir alt sınır.

### Üç ayrı şey yedeklenmeli — karıştırılmamalı

| Ne | Nasıl | Durum |
| :--- | :--- | :--- |
| **Kod geçmişi** | `git clone --mirror` → tüm branch, tag, notes | ❌ Yok |
| **Metadata** — issue, PR, review yorumları, release, wiki | Git'te **yok**; API'den çekilmeli (`gh api`, `github-backup`) | ❌ Yok — ve en çok atlanan kısım |
| **Konfigürasyon** — repo ayarları, takımlar, yetkiler, org ayarları | `config/*.yml` + Terraform | ✅ **Zaten var** |

Üçüncü satır projenin en güçlü satış argümanlarından biri: org'un yapılandırması **bugün
bile** sıfırdan yeniden üretilebilir durumda. Sunumda "B planının üçte biri zaten kurulu,
üstelik istemeden değil tasarım gereği" diye söylenebilir. Eksik olan **kod** ve
**metadata**.

### Tasarımda tek kritik nokta

> **Yedek, yedeklediği sistemin içinde yaşamaz.**

`schedule`'lı bir GitHub Actions workflow'u yazıp çıktıyı artifact olarak saklamak **B planı
değildir** — GitHub çöktüğünde yedekleme mekanizması da çöker, ve artifact saklama süresi
zaten 90 günü garanti etmez (Packages/artifact kotası Team'de toplam 2 GB, bkz.
[`plans-and-pricing.md`](../plans-and-pricing.md) Bölüm 6).

Hedef GitHub dışı olmalı: S3 / Azure Blob / Backblaze, tercihen **object-lock** ile
değiştirilemez. İdeal olarak tetikleyici de dışarıdan (dış bir zamanlayıcı), ama bu ikinci
aşama olabilir — Actions'tan tetiklenip **dışarıya yazan** bir kurulum, hiç yedek
olmamasından kat kat iyidir. Mükemmeli beklemek bu maddede yanlış olur.

### İki şey daha listeye girmeli — kimse aklına getirmiyor

- 🔑 **HCP Terraform state.** Kaybedilirse config duruyor ama her repo, takım ve org ayarı
  baştan `import` edilmek zorunda. `imports.tf` bunu bir kez yaptı; ölçeği 4 repo değil de
  40 repo olduğunda bu günler süren bir iş.
- 🔑 **GitHub App private key.** Kaybedilirse motor org'a hiç konuşamaz. Bugün tek kopya
  HCP'de sensitive değişken olarak duruyor ve **oradan okunamıyor** — yani kaybı geri
  dönüşsüz. Yeni key üretmek mümkün ama o an elde çalışan bir apply yok demektir.

### Ve kendi kuralınız buraya da uygulanmalı

**Test edilmemiş yedek, yedek değildir.** 90 günlük saklama politikasının yanına
*"çeyrekte bir restore denemesi"* maddesi girmezse, ilk gerçek ihtiyaçta yedeğin bozuk
olduğu öğrenilir. Bu, `coverage.tf` ve `korumasiz_repolar` maddelerinde iki kez yakalanan
kalıbın aynısı: **var sanılan ama hiç ateşlenmemiş kontrol.**
[`docs/notes/industry-terms.md`](industry-terms.md)'deki adıyla **paper control**.

### GIT-32 ile beklenmedik bağlantı

Bu madde, ertelediğiniz **GIT-32**'yi (`prevent_destroy` ne koruyor?) de kolaylaştırıyor.
O kararın özü şuydu: *"imkânsız ama kaçamaklı"* mı, *"mümkün ama görünür"* mü. Gerçek bir
yedek varsa silme işleminin **imkânsız** olması gerekmez — geri dönüş yolu var demektir ve
B seçeneği (tuş yerine kapı) belirgin şekilde daha kolay savunulur hale gelir.

Yani 4. madde tek başına bir faz büyüklüğünde ama ödülü sadece kendisi değil: **iki açık
kararı birden rahatlatıyor.**

---

## 7. Madde 5 — "docker image gereksinimlerini image e çekip durması"

### İki okuma, aynı sonuç

- **(a)** CI'ın bağımlılıklarını her koşuda `pip install` / `npm ci` / `composer install`
  ile çekmek yerine önceden hazırlanmış bir image'a gömmek ve job'ları o image'da
  çalıştırmak (`jobs.<id>.container`).
- **(b)** Dış registry'lerden (Docker Hub vb.) canlı çekilen image'ları kendi registry'nize
  (GHCR) aynalayıp oradan kullanmak — *pull-through cache / vendoring*.

İkisinin ortak tezi: **build anında internete bağımlı olmayın.** Kazanç üç tane —
tekrar üretilebilirlik (upstream bir paket yayından çekilince CI kırılmaz), hız, ve tedarik
zinciri güvenliği (digest ile pin'lenmiş, denetlenmiş içerik).

### Bugünkü durum

[`terraform/templates/.github/workflows/ci.yml`](../../terraform/templates/.github/workflows/ci.yml)
şu anda tam tersini yapıyor: her koşuda `setup-go` / `setup-python` / `setup-node` /
`setup-php` + canlı paket kurulumu. Cache var ama cache bir garanti değil, bir
optimizasyon.

**Bugün sorun değil** çünkü pilot repo'larda kod yok. **İlk gerçek kod repo'sunda** anlam
kazanır — yani Team planı tetikleyicisiyle aynı gün
([`plans-and-pricing.md`](../plans-and-pricing.md) Bölüm 10: *"Team'e geçiş tetikleyicisi:
ilk gerçek kod repo'su"*). Bu iki iş aynı ana denk geliyor, birlikte planlanmalı.

### Madde 2 ile birleşiyor

VPN / IP allow list yoluna girilirse self-hosted runner gerekebilir. Self-hosted runner'ın
deterministik ve denetlenmiş bir ortamı olması şart — o da tam olarak bu madde. Yani 2 ve 5
bağımsız iki istek gibi görünüyor ama aynı çözümün iki yarısı olabilir.

### Üç tuzak — hepsi bu repoda önceden görülebilir

**1. 🔴 Image sürümünü kim izleyecek?**

Bu, [`TODO.md`](../../TODO.md)'deki *"Şablon action sürümlerini kim izleyecek?"*
maddesinin (GIT-37'nin açık bıraktığı yer) **ikizi**.

⚠️ **Beklentim, doğrulanmalı:** Dependabot'un `docker` ekosistemi `Dockerfile`'daki `FROM`
satırını günceller ama workflow YAML'ındaki `container: ghcr.io/...:tag` satırını **görmez**
— o `github-actions` ekosisteminin işi, ki onu GIT-37 ile şablonlardan **çıkardınız**.

Doğruysa şu olur: image yolu seçildiği anda şablonda **hiçbir otomasyonun izlemediği ikinci
bir sürüm alanı** doğar. Ve GIT-37'de doğrulanmış olan kısıt burada da geçerli — Dependabot
`terraform/templates/` yolunu hiç taramıyor.

**Bu, image kararıyla aynı PR'da çözülmeli.** Zaten yazılması planlanan haftalık sürüm
takip workflow'u (`uses:` satırlarını REST API ile karşılaştıran ~30 satır) `container:`
satırlarını da kapsayacak şekilde tasarlanırsa ek maliyet neredeyse sıfır.

**2. ⚠️ Tek image dört dili taşımaz.**

`ci.yml` çok dilli bir şablon ve `detect` job'u hangi dilin çalışacağına karar veriyor.
Go + Python + Node + PHP'yi tek image'a koymak GB'larca eder ve her repo, kullanmadığı üç
dili de indirir. Doğru kurulum: **dil başına ayrı image**, `detect` çıktısına göre seçim.
Bu, mevcut `detect` mimarisiyle uyumlu — şablonun yapısı değişmiyor, sadece job'ların
çalıştığı zemin değişiyor.

**3. 💰 Packages kotası.**

[`plans-and-pricing.md`](../plans-and-pricing.md) Bölüm 3: Packages depolaması Free'de
**500 MB**, Team'de **2 GB** — ve bu kota artifact'larla **paylaşılıyor**. Dört dilli bir
image seti bunu rahatça yer.

⚠️ **Doğrulanmadı:** public paketlerin kotadan düşmediğini biliyorum ama GHCR için bunu
teyit etmedim. Doğruysa kaçış yolu image'ı public tutmak — ama o zaman image içeriği
dışarıya açılır. Repo'ları private yapma kararı verilirken (Faz 7) image'ın public kalması
bir tutarsızlık gibi görünür; bilinçli karar olarak yazılmalı, yoksa "neden bu açık?"
sorusuna cevap kalmaz.

---

## 8. Beş maddenin ortak örüntüsü

Notlar birbirinden bağımsız gibi görünüyor ama üçü aynı şeyi soruyor:

> **"Kontrol var mı?" değil, "kontrolün çalıştığını nereden biliyorsun?"**

- Madde 1 → PAT kapalı mı, yoksa kapalı olduğunu **varsayıyor** musun? (provider görmüyorsa
  varsayım)
- Madde 3 → erişim gidiyor mu, yoksa gittiğini **varsayıyor** musun? (test yok)
- Madde 4 → yedek var mı, yoksa yedeklendiğini **varsayıyor** musun? (yedek yok)

Bu, bu projenin kendi dokümanlarında zaten üç kez yakaladığı kalıp:
`vulnerability_alerts`'in bu repoda kapalı olması, `korumasiz_repolar`'ın boş haritayla iki
farklı şey söylemesi, ve `coverage.tf`'in alarm yolunun bilerek tetiklenmesi.
[`industry-terms.md`](industry-terms.md)'de bunun adı **fail-open** / **paper control**
olarak zaten yazılı.

Yani dış gözün gördüğü şey yeni bir zayıflık değil — **projenin kendi teşhisini kendi
kapsamına uygulamadığı yerler.** Bu, geri bildirimi çürütmüyor; tam tersine, teşhisin doğru
olduğunu üçüncü bir kişinin bağımsız olarak onaylaması demek.

### Sektör terimleri — `industry-terms.md`'ye eklenmeli

| Madde | Sektördeki adı |
| :--- | :--- |
| 1 | **credential hygiene** · **secretless / workload identity** (App'in kısa ömürlü token'ı) |
| 2 | **network perimeter** · **conditional access** · **defense in depth** |
| 3 | **JML (joiner–mover–leaver)** · **access recertification / entitlement review** |
| 4 | **RTO / RPO** · **3-2-1 kuralı** · **immutable backup (WORM)** · **restore drill** |
| 5 | **hermetic / reproducible build** · **vendoring** · **pull-through cache** · **SLSA** |

Özellikle **JML** faydalı: Madde 3'ün "mover" kısmı olduğunu görmek, offboarding
(`runbook.md` § 1) ile aynı prosedürün parçası olduğunu netleştiriyor — ayrı bir iş değil,
eksik kalan üçte biri.

---

## 9. `TODO.md`'ye eklenecekler

Aşağıdaki maddeler [`TODO.md`](../../TODO.md)'nin mevcut biçimine (başlık + karar tablosu +
gerekçe + doğrulanmamış işaretleri) uygun. Takip kodları **öneri** — gerçek tracker'daki
son numaraya göre teyit edilmeli.

### 🔴 GIT-38 — Yedek / B planı yok _(Madde 4)_

- Bloklayan iş bölümüne, `none` maddesinin altına.
- Üç katman tablosu (kod / metadata / config), config'in ✅ olduğu vurgusuyla.
- **Tasarım şartı:** hedef GitHub dışı; Actions artifact'ı yedek sayılmaz.
- Listeye HCP state ve App private key de girmeli.
- 90 gün saklama + **çeyrekte bir restore denemesi** — ikincisi olmadan madde kapanmaz.
- GIT-32 ile bağlantısı not olarak: gerçek yedek, `prevent_destroy` kararını rahatlatıyor.

### 🟠 GIT-39 — IP allow list / VPN: Enterprise kararı _(Madde 2)_

- Kendi başına bir bölüm; **Faz 7'nin içine konmamalı** (Faz 7 = Team planı, bu = Enterprise).
- `plans-and-pricing.md` Bölüm 10'daki *"Enterprise bugün gerekçesiz"* satırına
  ⚠️ düzeltme notu: artık bir gerekçe var, sahibi dış talep.
- Üç alt bulgu: org geneli olduğu (repo bazında yapılamaz) · App bypass ayarı olmadan CI
  kilitlenir · GraphQL-only olabilir _(doğrulanmadı)_.
- Karar tablosu: Enterprise'a geç / hassas repo'ları ayrı org'a al / bugün yapma.

### 🟡 GIT-40 — Erişim kaldırma testi yok _(Madde 3)_

- "Doğrulanmamış testler" bölümüne, code owner testinin yanına.
- Beş adımlı senaryo; **private repo zorunluluğu** açıkça yazılmalı.
- Var olan iki delik (doğrudan collaborator → GIT-34, çoklu takım → K2) buraya link.
- ⚠️ Private fork'un silinip silinmediği _(doğrulanmadı)_ — test sırasında bakılacak.

### 🟢 GIT-41 — PAT politikası: elle yönetilen org ayarı _(Madde 1)_

- Kapanmış `billing_email` maddesinin hemen altına — **aynı sınıf**.
- `runbook.md` § 1.4'e madde; `org-settings.tf`'e yorum.
- ⚠️ Provider desteği doğrulanmadı; doğrulanırsa config'e alınır.
- Kapatma öncesi PAT kullanan workflow taraması.

### 🔵 GIT-42 — CI bağımlılıklarını image'a gömme _(Madde 5)_

- "Action sürümleri" bölümüne, sürüm takibi maddesinin yanına — **aynı kör noktayı
  büyütüyor**.
- Üç tuzak: `container:` satırını Dependabot izlemiyor _(doğrulanmadı)_ · tek image dört
  dili taşımaz · Packages kotası.
- Tetikleyici: ilk gerçek kod repo'su. Bugün yapılmıyor, çünkü pilot repo'larda kod yok.

---

## 10. `tasks-ozan.md`'ye eklenecekler

[`tasks-ozan.md`](../../tasks-ozan.md) haftalık plan dosyası; bu maddeler oraya **hafta
bazında** girmeli, `TODO.md`'deki gerekçeler tekrarlanmadan (link ile).

| Madde | Hangi haftaya | Neden oraya |
| :--- | :--- | :--- |
| **GIT-41** (PAT ayarı) | **Hafta 6** — "Güvenlik Ayarları" bölümüne, `billing_email` maddesinin yanına | Aynı sınıf iş: elle yapılan, provider'ın görmediği org ayarı. Zaten oradaki blok bu tür maddelerin yeri. |
| **GIT-40** (erişim kaldırma testi) | **Hafta 6** — "Bekleyen testler" bölümüne | Orada zaten üç test maddesi var (force push ✅, drift ✅, code owner 🔶). Bu dördüncüsü ve tek eksik yön: *geri alma*. |
| **GIT-38** (yedek) | **Hafta 7** — "Finalizasyon"a **yeni bir blok** olarak; ya da ROADMAP'te **Faz 10** | Faz büyüklüğünde bir iş; haftalık bir checkbox'a sığmaz. Hafta 7 sunum haftası ve *"bilinen kısıtlar"* maddesi var — yedek eksikliği oraya yazılmalı, çünkü sunumda sorulacak. |
| **GIT-39** (IP allow list) | **Hafta 7** — "Sunum hazırlığı" → *"Sonraki adımlar ve bilinen kısıtlar"* | Bugün yapılacak iş değil, **anlatılacak** iş. Enterprise bütçe kararı ekibin değil. |
| **GIT-42** (image) | **Hafta 8+** — "Ertelenen / Ek Özellikler" | Tetikleyicisi ilk gerçek kod repo'su; pilot repo'larda karşılığı yok. GIT-37'nin sürüm takip maddesiyle **birlikte** planlanmalı. |

### `tasks-ozan.md` başındaki durum bloğu da güncellenmeli

Dosyanın başındaki *"Durum (2026-08-19)"* özeti şu an *"Faz 6 kapandı, açık fazlar: 5, 7,
8, 9"* diyor. Dış değerlendirme sonrası bu liste eksik: **yedek** hiçbir fazın içinde
değil. Ya Faz 10 açılmalı ya da açıkça *"kapsam dışı, bilinçli"* denmeli — ikisi de
kabul edilebilir, **sessiz kalmak** kabul edilemez. Bu dosyanın kendi kaydettiği dersin
aynısı:

> *"Kendime ders: 'tamamlandı' işaretlemeden önce çalıştığını görmek lazım."*
> — `tasks-ozan.md`, Hafta 4, `terraform-plan.yml` maddesi

### Ek not — Hafta 7'nin sunum bölümü

Sunumda *"Sonraki adımlar ve bilinen kısıtlar"* maddesi zaten var. Bu rapordaki beş madde
o slaytın **doğal içeriği**: dışarıdan bakan kıdemli bir mühendisin sorduğu beş soru ve
her birine verilen cevap — ikisi çözülmüş, biri kanıtlanacak, ikisi kapsam kararı bekliyor.
Bu, "eksiklerimiz var" değil **"neyin eksik olduğunu biliyoruz"** anlatısıdır ve projenin
tezine (görünürlük > kapatılamayan riski gizlemek) birebir uyar.

---

## 11. Doğrulanmamışlar — tek listede

Bu rapordaki her çıkarım aynı güvende değil. Karar verirken önce bunlar teyit edilmeli:

| # | İddia | Neden emin değilim |
| :--- | :--- | :--- |
| 1 | Provider'da PAT politikası resource'u yok | Şema taranmadı; REST API'de politika endpoint'i göremedim ama olmadığını kanıtlamadım |
| 2 | IP allow list yalnızca GraphQL'den yönetiliyor, provider'da resource yok | Aynı — doğrulanmadı |
| 3 | Private repo erişimi kalkan kullanıcının fork'u silinir | Böyle bir davranış hatırlıyorum, teyit etmedim |
| 4 | Dependabot `docker` ekosistemi workflow'daki `container:` satırını görmez | GIT-37'de `github-actions` için doğrulanmış kısıttan çıkarım; `docker` için ayrıca doğrulanmadı |
| 5 | GHCR'de public paketler depolama kotasından düşmez | Genel kural olarak biliyorum, GHCR için teyit etmedim |
| 6 | IP allow list Enterprise-only | `plans-and-pricing.md` Bölüm 3 tablosuna dayanıyor — o tablo da bu ekibin kendi araştırması |

⚠️ 1, 2 ve 6 **kararı doğrudan etkiliyor**: 1 ve 2 doğruysa iki ayar kalıcı olarak
config'in dışında kalır ve `runbook.md`'ye girmeleri zorunlu hale gelir; 6 yanlışsa
Madde 2'nin maliyeti $63'ten $12'ye düşer ve karar tamamen değişir.

---

## İlgili dokümanlar

- [`../../TODO.md`](../../TODO.md) — GIT-38…42 maddeleri buraya girecek (Bölüm 9)
- [`../../tasks-ozan.md`](../../tasks-ozan.md) — hafta dağılımı (Bölüm 10)
- [`../../ROADMAP.md`](../../ROADMAP.md) — Faz 7 (Team), Faz 8 (topoloji), olası Faz 10 (yedek)
- [`../../ACCESS-MODEL.md`](../../ACCESS-MODEL.md) — Karar 15 (dashboard kimliği), Bölüm 4 (takım bazlı yönetim)
- [`../plans-and-pricing.md`](../plans-and-pricing.md) — Enterprise gerekçesi (Madde 2) ve Packages kotası (Madde 5)
- [`../pilot-verification.md`](../pilot-verification.md) — erişim kaldırma testi buraya işlenecek (Madde 3)
- [`../runbook.md`](../runbook.md) — § 1.4 elle yönetilen org ayarları (Madde 1)
- [`github-auth-strategy.md`](github-auth-strategy.md) — Madde 1'in zaten verilmiş cevabı
- [`industry-terms.md`](industry-terms.md) — Bölüm 8'deki terimler buraya eklenecek
