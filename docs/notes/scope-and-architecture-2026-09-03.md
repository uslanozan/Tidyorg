# Kapsam ve Mimari Kararları — 2026-09-03

> **Durum:** 📄 Karar notu · Bir kısmı **karar**, bir kısmı **öneri**, bir kısmı **kanıt**

> **Bağlam:** Mevcut pilot kurulum (`your-org`) şirket içi gerçek bir organizasyona
> taşınacak. Bu doküman, taşımadan önce verilmesi gereken kararları ve onları destekleyen
> canlı kanıtları tek yerde toplar.
>
> **Neden bu doküman var:** Projenin kapsamı daralıyor (**yalnızca GitHub**) ve ekip değişiyor.
> Bu iki değişiklik, daha önce verilmiş bazı kararların gerekçesini geçersiz kılıyor, bazılarını
> güçlendiriyor. Hangisinin hangisi olduğunu yazmadan taşımak, pilot'un varsayımlarını
> sessizce miras almak olurdu.

---

## 0. Okuma sırası

Projeyi hiç görmediysen sırayla şunlar yeter:

| Sıra | Doküman | Ne anlatır |
| :--- | :--- | :--- |
| 1 | Bu dokümanın **Bölüm 1**'i | Proje ne yapıyor, tek sayfada |
| 2 | Bu dokümanın **Bölüm 2**'si | Sistemin nasıl çalıştığının canlı kanıtı |
| 3 | [`ACCESS-MODEL.md`](../../ACCESS-MODEL.md) | Yetki modelinin **neden**i |
| 4 | [`ROADMAP.md`](../../ROADMAP.md) Bölüm 1 | Neyin bitmiş neyin eksik olduğu |
| 5 | Bu dokümanın **Bölüm 3–7**'si | Verilecek kararlar |

Bölüm 8'de terimler sözlüğü var; tanımadığın bir kelimeye orada bak.

---

## 1. Proje ne yapıyor — tek sayfada

**Problem:** Bir GitHub organizasyonunda "kim hangi repo'da ne yapabilir" bilgisi arayüzde
dağınık durur. Kimse tek yerden göremez, değişiklikler kaydedilmez, biri ayrıldığında
erişimlerinin gittiği doğrulanamaz.

**Çözüm:** Organizasyonun tamamını **konfigürasyon dosyalarından** üretmek.

```
config/*.yml   →   Terraform   →   GitHub
 (ne istiyoruz)     (uygular)      (gerçek)
```

Bir stajyer eklemek = bir YAML satırı. Bir repo açmak = bir dosya. Yetki değiştirmek =
bir alanı düzenlemek. Hepsi PR'dan geçer, hepsi git geçmişinde kalır, hepsi geri alınabilir.

**Bugün canlıda olanlar:** repo yaşam döngüsü, takımlar, üyelikler, dal koruması, CODEOWNERS,
issue/PR şablonları, CI workflow'ları, güvenlik ayarları, org üyeliği ve rolleri.

**Kapsam kararı:** Bu proje **yalnızca GitHub'ı** yönetir. Sunucu, ağ, bulut kaynakları,
CI/CD altyapısı kapsam dışıdır.

---

## 2. Deney: akış tek yönlü — ve bunu kanıtladık

> Bu bölüm bir **kanıt kaydıdır**. 2026-09-03'te canlı organizasyonda yapıldı.
> Sunumda kullanılabilir.

### 2.1 Cevaplanan soru

Ekipte şöyle bir yanlış anlama vardı:

> *"Terraform bir kere GitHub'ı ayarlar, sonra GitHub üzerinden elle yaptığımız her şey
> config'e geri işlenir."*

**Bu yanlış.** Akış tek yönlüdür ve geri dönüşü yoktur:

```
config/*.yml  ──────────►  GitHub
                (geri dönüş YOK)
```

Terraform config'i okur, GitHub'ı ona uydurur. Config dosyalarına yazan tek şey, insanın
açtığı bir PR'dır.

### 2.2 Deneyin kurulumu

Üç repo, üç farklı doğuş şekli. Etiket (issue label) seti üzerinden karşılaştırıldı, çünkü
etiketler hem GitHub'ın hem org ayarlarının hem Terraform'un dokunduğu tek alan.

| Repo | Nasıl açıldı | Ne zaman |
| :--- | :--- | :--- |
| `conf-test` | Elle, GitHub arayüzünden | Org varsayılanı **eklenmeden önce** |
| `conf-test-2` | Elle, GitHub arayüzünden | Org varsayılanı **eklendikten sonra** |
| `pilot-intern-web` | Config'den (Terraform) | — |

Yapılan iki değişiklik:

1. `config/organization.yml` → `defaults.labels` listesine `ozan-special-label` eklendi
2. GitHub arayüzü → Org Settings → Repository defaults → Repository labels'a
   `manual-conf-test` eklendi

### 2.3 Sonuçlar

| Repo | Etiket sayısı | `ozan-special-label` <br>_(config'den)_ | `manual-conf-test` <br>_(org varsayılanından)_ |
| :--- | :---: | :---: | :---: |
| `conf-test` | 9 | ❌ | ❌ |
| `conf-test-2` | 10 | ❌ | ✅ |
| `pilot-intern-web` | 14 | ✅ | ❌ |

<!-- Ekran görüntüleri: dosyaları docs/images/label-experiment/ altına bu adlarla koyunca
     aşağıdaki satırların başındaki yorum işaretleri kaldırılabilir.
![conf-test — 9 stok etiket](../images/label-experiment/01-conf-test.png)
![conf-test-2 — 9 stok + manual-conf-test](../images/label-experiment/02-conf-test-2.png)
![pilot-intern-web — config'in 14 etiketi](../images/label-experiment/03-pilot-intern-web.png)
![Org Settings → Repository labels](../images/label-experiment/04-org-repository-labels.png)
-->

Terraform'un `plan` çıktısı, her iki yönde de aynı sonucu verdi:

```
# Etiketi eklerken
Plan: 0 to add, 4 to change, 0 to destroy.
  + label { name = "ozan-special-label" ... }

# Etiketi silerken
Plan: 0 to add, 4 to change, 0 to destroy.
  - label { name = "ozan-special-label" -> null }
```

Dördü de config'de tanımlı repo'lar. Elle açılan üç repo, plan çıktısının hiçbir yerinde
kaynak olarak geçmedi.

### 2.4 Ne kanıtlandı

**a) Üç ayrı boru var ve hiç kesişmiyorlar.**

| Kaynak | Nereden yönetilir | Kimi etkiler | Değiştirilince |
| :--- | :--- | :--- | :--- |
| GitHub'ın stok 9 etiketi | GitHub | Her yeni repo | — |
| Org "Repository labels" | **Arayüz** | Yalnızca **yeni** repo | Mevcut repo'lara **inmez** |
| `config/organization.yml` | **Terraform** | **Yönetilen** repo, her apply'da | **Tüm seti ezer** |

**b) Terraform sahiplendiği alanı yalnızca doldurmuyor — komple sahipleniyor.**
`pilot-intern-web`'de GitHub'ın stok etiketlerinden yedisi (`bug`, `duplicate`, `invalid`…)
**silinmiş**. `good first issue` ve `help wanted` isim olarak hayatta ama açıklamaları
config'in Türkçe metinleriyle **ezilmiş**. Elle açılan repo'da hâlâ İngilizce orijinalleri
duruyor.

**c) İki repo aynı etiketi almadı ama sebepleri zıt — ve bu fark önemli.**

- `conf-test` almadı çünkü **doğduğunda o varsayılan yoktu**. Ve bir daha **asla** almayacak;
  onu düzeltecek hiçbir mekanizma yok.
- `pilot-intern-web` almadı çünkü **Terraform setin tamamını sahipleniyor**. Sonra açılsaydı
  bile ilk apply silerdi.

Biri **kalıcı boşluk**, diğeri **zorlanan kural**.

### 2.5 Bunun asıl sonucu — ve neden kapsama kontrolü zorunlu

> **Yönetim dışı bir repo, bugünün ayarını kaçırmakla kalmıyor — gelecekteki her ayarı da
> kaçırıyor.** Bir kerelik eksiklik değil, kalıcı ve zamanla büyüyen bir sapma.

`conf-test` sonsuza kadar 9 etiketle kalacak. Yarın org varsayılanına beş etiket daha
eklensin, inmeyecek. Öbür gün org geneli güvenlik ayarı açılsın — onlar da yalnızca *yeni*
repo'ları kapsıyor, yine inmeyecek. Tek çıkış yolu repo'yu config'e almak.

İşte [`terraform/coverage.tf`](../../terraform/coverage.tf)'in neden bir "iyi olur" değil
**zorunluluk** olduğunun kanıtı bu. O dosya org'daki repo'ları config'le karşılaştırıp
karşılığı olmayanları isimle bağırıyor. Deney sırasında canlıda gerçek bir bulgu üretti:

```
Warning: Check block assertion failed
  4 repository/repositories exist in the organization but are NOT in
  config/repositories/: afsfs, conf-test, conf-test-2, testt.
```

### 2.6 Yan bulgu: drift gürültüsü ölçüldü

Aynı plan çıktısında **35 kaynak** `Drift detected` dedi. Gerçek değişiklik sayısı: **sıfır**.

Sebep, [`terraform-plan.yml`](../../.github/workflows/terraform-plan.yml)'de zaten yazılı:
GitHub API bazı alanları provider'ın gönderdiğinden farklı biçimde döndürüyor. Bu **kozmetik**
bir farktır, müdahale gerektirmez.

⚠️ **Bunun pratik sonucu Bölüm 5'te (drift tespiti) belirleyici.** `Drift detected` satırlarını
sayan bir kontrol, altyapı tamamen senkronken bile her gece 35 alarm üretir.

---

## 3. Verilen ve önerilen kararlar

### 3.1 Terraform kalıyor ✅ _(karar)_

Alternatif "her şeyi GitHub arayüzünden yönetelim" idi. Deney bunun neden olmayacağını
gösterdi: arayüzden yapılan iş kaydedilmiyor, geri alınamıyor, ve yönetim dışı kalan her
kaynak kalıcı olarak sapıyor.

⚠️ **Sık yapılan yanlış çıkarım:** "Biri elle repo açtı, demek Terraform'la çakışacak."
**Çakışmıyor.** Terraform state'inde olmayan bir şeye dokunmaz — ne siler, ne değiştirir.
Elle açılan repo'nun tek problemi görünmez kalmasıdır, ki `coverage.tf` tam bunun için var.

### 3.2 Dashboard Terraform'la **hiç konuşmaz** ✅ _(karar — kritik)_

Konuşma sırasında şu fikir doğdu: *"dashboard doğrudan CLI komutlarıyla Terraform'u
güncellesin."* **Bu yapılmamalı.** Sebepleri:

| # | Sebep |
| :--- | :--- |
| 1 | Tarayıcı `terraform` çalıştıramaz → bir **sunucu** gerekir, "backend yok" mimarisi biter |
| 2 | O sunucunun kendi ayrıcalıklı credential'ı olur → ele geçirilecek bir sır doğar |
| 3 | Yetkilendirme GitHub'dan **dashboard'un koduna** geçer; oradaki bir bug = yetki açığı |
| 4 | Denetim izi ölür: değişiklik kimsenin adına düşmez, commit bile üretmez |
| 5 | **git artık gerçeği anlatmaz:** dashboard state'i değiştirir, config o değişikliği içermez, bir sonraki apply geri alır. Aynı state'e iki yazar. |

**Doğru akış:**

```
Dashboard / Form  →  YAML dosyasına yazar  →  git  →  CI: terraform apply
                     (Terraform'la HİÇ konuşmaz)      (terraform'u çalıştıran TEK yer)
```

Dashboard bir **YAML editörüdür**, Terraform arayüzü değil. Bu zaten
[`ACCESS-MODEL.md`](../../ACCESS-MODEL.md) Karar 1 ve Karar 2'de yazılıydı; burada
tekrar teyit ediliyor çünkü unutulması kolay ve bedeli yüksek.

### 3.3 Yazma yolu: önce form, dashboard sonra 💡 _(öneri)_

İki katman var ve karıştırılmamalı:

| İhtiyaç | Araç | Gerekçe |
| :--- | :--- | :--- |
| **Değişiklik yapmak** | GitHub **Issue Form** → otomatik PR | Barındırma yok, kimlik doğrulama yok, native, denetlenebilir |
| **Durumu görmek** | Rapor / okuma modu | GitHub arayüzünün cevaplayamadığı sorular var |

GitHub arayüzü "kim hangi repo'da ne yapabilir" sorusunu **tek yerden** cevaplayamıyor.
Ama bu verinin tamamını Terraform zaten üretiyor
([`terraform/outputs.tf`](../../terraform/outputs.tf) → `branch_protection_bypass`,
`repository_coverage`). Sorun veriyi sadece `terraform output` çalıştıran kişinin görmesi.

**En ucuz "dashboard", dashboard değil:** apply sonrası bu çıktıları markdown'a döküp
repo'ya commit'lemek. Sıfır barındırma, sıfır kimlik doğrulama, sıfır bakım — ve rapor git
geçmişinde durduğu için **zaman içindeki değişimi** de gösteriyor.

⚠️ O rapor org'un erişim yapısını anlatır, **public repo'ya konamaz**. Kontrol düzlemi
repo'sunun private olmasının bir gerekçesi de bu.

**Yazma modunda dashboard**, config'e mühendis olmayan bir kimlik dokunmaya başladığında
haklı çıkar. İki mühendisin olduğu bir kurulumda henüz karşılığı yok.

### 3.4 Kimlik: GitHub App + Device Flow 💡 _(öneri)_

Bir arayüz yapılacaksa kimlik doğrulama şöyle olur:

**Device Flow nedir:** Statik bir web sayfası `client_secret` saklayamaz (JavaScript'in
içindeki her şey herkese açıktır). Device Flow secret gerektirmez:

```
1. Kullanıcı "GitHub ile giriş"e basar
2. Arayüz bir kod gösterir:  ABCD-1234
3. Kullanıcı github.com/login/device sayfasında kodu girer
4. GitHub "bu uygulama şu izinleri istiyor" der, kullanıcı onaylar
5. Arayüz KULLANICININ token'ını alır (oturum sekmesiyle sınırlı)
```

Güvenlik `client_secret`ten değil, **4. adımdaki kullanıcı onayından** gelir.

**"Arayüzün kendi token'ı yok" ne demek:** Alternatif tasarımda arayüze `admin:org` yetkili
bir bot token'ı verilir ve tüm işlemler onunla yapılır. O zaman yetkilendirmeyi arayüzün
kendi kodu yapar, commit'ler bot adına düşer, ve arayüz ele geçirilirse org'un tamamı gider.
Device Flow'da bunların hiçbiri yok.

**Sık sorulan iki soru:**

- *Sıradan bir developer girebilir mi?* Giriş **başarılı olur** — device flow'u tamamlayan
  herkes token alır. Onu durduran şey giriş değil, **token'ın ne yapabildiği**: yetkisi
  olmayan biri girer ve **boş bir arayüz** görür.
- *Arayüze "kim girebilir" kapısı yazalım mı?* **Hayır.** Yazarsan yetkilendirmeyi GitHub'dan
  geri almış olursun. Bakımı olmayan tek yetki sistemi, yazmadığın yetki sistemidir.

**OAuth App yerine GitHub App tercih edilmeli.** OAuth App'in `repo` scope'u kullanıcının
**her org'daki her repo'suna** erişir. GitHub App'in user-to-server token'ı ise yalnızca
App'in kurulu olduğu repo'larda ve kullanıcının zaten erişebildiği yerlerde çalışır.
Aynı deneyim, çok daha dar yüzey.

### 3.5 Üç repo topolojisi 💡 _(öneri — yeni org'da ilk gün)_

Bugün motor (Terraform modülleri), durum (config dosyaları) ve dashboard aynı repoda. Bu,
**UI kaynaklı bir değişikliğin motoru da değiştirebilmesi** anlamına geliyor.

Tek repoda bu sınır **kurulamıyor** ve bu denendi: CODEOWNERS `terraform/` yolunu koruyor ama
`enforce_admins = false` olduğu için repo admini olan bir mentör hem CODEOWNERS'ı hem dal
korumasını atlayabiliyor. Bu yüzden eski Karar 13 geçersiz ilan edilip yerine repo ayrımı
kararı geldi ([`ROADMAP.md`](../../ROADMAP.md) Karar G / Faz 8).

> ⚠️ **Üç repo ama üçü aynı sebeple ayrılmıyor — bu ayrım önemli:**
>
> | Repo | Neden ayrı | Ağırlık |
> | :--- | :--- | :--- |
> | **engine ↔ config** | UI motora yazamasın | 🔴 **Güvenlik kararı — zorunlu** |
> | **dashboard** | Farklı tech (React/Vite), farklı deploy (Vercel), farklı CI | 🟡 **Düzen/pratiklik — olmasa da güvenlik bozulmaz** |
>
> Okuma modunda dashboard zaten sadece config okuyor ve kullanıcının kendi token'ıyla PR
> açıyor; motora dokunamıyor. Yani dashboard'ı ayırmak temizlik içindir, güvenlik için değil.

**Hedef yapı:**

```
config repo (DURUM)          engine repo (MOTOR)             dashboard repo (UI)
├── config/                  ├── terraform/modules/          ├── src/  (React SPA)
│   ├── organization.yml     ├── terraform/templates/        └── config'i okur,
│   ├── people.yml           ├── config.example/  ← OSS için     kullanıcı token'ıyla
│   ├── privileged.yml       ├── docs/                            PR açar
│   └── repositories/*.yml   └── sürüm etiketi: v1.0.0
├── main.tf  ← modülü ?ref=v1.0.0 ile çağırır
└── .github/workflows/
    ├── terraform-plan.yml   (PR tetikli)
    └── terraform-apply.yml  (main merge tetikli)

Mentörler: config repo'da admin · engine repo'da erişimsiz (ya da read)
```

**Önemli:** `terraform-plan.yml` ve `terraform-apply.yml` **config repo'ya taşınır**, çünkü
apply'ı tetikleyen şey config değişikliğidir. Motor repo'nun CI'ı modülü doğrular ve sürüm
etiketi keser.

**State taşınmaz.** Aynı HCP workspace kullanılmaya devam eder, yalnızca onu besleyen repo
değişir.

**Kazançları:** UI motora asla yazamaz · motor değişikliği etiketlenir, pin yükselene kadar
hiçbir yere inmez · geri alma = pin'i eski etikete düşürmek.

**Bedeli — dürüst olalım:** Bölünmüş halde yeni bir config alanı eklemek **iki PR** olur
(önce motor + etiket, sonra pin yükselt + alanı kullan). Bugün tek PR.

**Open source ile ilişkisi:** Bu bölünme yayınlamayı kolaylaştırıyor —
**engine ve dashboard public**, **config private** (gerçek org verisi içeriyor). Bkz. Bölüm 9.

> 💡 Mevcut repoda bu bir **göç işi** (yarım–bir gün). Yeni organizasyonda **baştan iki repo
> olarak kurulursa bedava**. Bu, taşımayı ertelememek için en somut sebep.

### 3.6 Dosya bölmesi: yetki yükseltme kapısı 🔴 _(ilk gün yapılmalı)_

**Bugünkü açık:** `config/people.yml` içinde bir kişinin `org_role` alanını `member` → `admin`
yapmak onu **org owner** yapıyor: her repoda admin, her korumalı dalda muaf, üye ekleme/çıkarma,
org ayarları, repo silme. Ve bu satır **stajyer eklemekle aynı onay yolundan** geçiyor.

Zincir:

1. Mentörün config repo'suna yazma yetkisi var (arayüzün çalışması için gerekli)
2. `org_role: admin` içeren bir PR açar
3. CODEOWNERS `terraform/` yolunu koruyor ama `people.yml` **bilerek kapsam dışı** — tüm
   dosyayı korumak her stajyer eklemeyi org owner onayına bağlardı
4. `enforce_admins = false` → repo admini kendi PR'ını merge edebilir
5. apply → org owner

**Bugün gerçek risk yok** çünkü mentör listesinde tek kişi var ve o zaten org owner.
🔴 **Risk, o listeye owner olmayan ikinci bir isim eklendiği gün başlar** — yani yeni ekip
kurulduğu gün.

**Çözüm — dosya bölmesi.** ⚠️ CODEOWNERS bir dosyanın bir **bölümünü** koruyamaz, yalnızca
**yolunu**. O yüzden ayrım alan bazında değil dosya bazında olmak zorunda:

```
people.yml       → developer ekle/çıkar. Yetki İFADE EDEMEZ.  → arayüz yazar
privileged.yml   → org_role, head-of-engineering              → CODEOWNERS korur, arayüz dokunmaz
```

Buna *secure by construction* denir: arayüzün yazabildiği dosyada yükseltme **ifade
edilemiyorsa**, arayüz yükseltme yapamaz. Doğrulama koduna güvenmeye gerek kalmaz.

⚠️ **Bölerken `org_role: admin` tek yol değil.** `roles: [head-of-engineering]` de her repoda
admin + bypass veriyor. İkisi birlikte taşınmalı, yoksa arka kapı açık kalır.

### 3.7 PR katmanlaması ✅ _(karar: başlangıçta hepsi onaylı)_

Soru şuydu: her değişiklik için PR mı, bazıları direkt push mu?

Sorunun ekseni yanlış. Çünkü:

> **Kendi merge ettiğin PR, inceleme değildir.** Fazladan iki tıkla yapılan direkt push'tur.

Gerçek soru "PR mı" değil, **"kaç göz?"**. GitHub'da üç ayar var:

| Yol | Denetim izi | İnceleme | Sürtünme |
| :--- | :---: | :---: | :---: |
| `main`'e direkt push (bypass ile) | zayıf | yok | yok |
| **PR + auto-merge** (check'ler yeşilse otomatik) | **tam** | yok | **yok** |
| PR + CODEOWNERS onayı | tam | var | var |

Orta satır önemli: PR açılır, `terraform plan` yorumu düşer, check'ler geçer, otomatik merge
olur. İnsan hiçbir şey yapmaz ama git geçmişi ve denetim izi tamdır — ve dal korumasını
**bypass etmez**. Bypass'ı rutin yola çevirmek ayrı bir risktir: bir kez yapıldığında istisna,
her hafta yapıldığında varsayılan olur.

**Ve bağlantı şurada:** auto-merge'ü güvenli yapan şey **3.6'daki dosya bölmesidir**.
`people.yml` şema olarak `org_role` alanını taşıyamıyorsa, o dosyaya gelen PR'ı otomatik
merge etmek yapısal olarak güvenlidir.

**✅ Karar — sıralama:**

1. **Dosya bölmesini ilk gün yap** (auto-merge açılsın açılmasın gerekli)
2. **Her şey PR + onay ile başlasın.** Kaç PR açıldığı, ne kadar beklediği ölçülsün
3. **Sürtünme gerçekten canı yakarsa** `people.yml` gibi düşük riskli dosyalar için
   auto-merge açılsın

Gerekçe, bu projenin kendi kuralı: ihtiyaç ölçülmeden açılan kaçış yolu, kullanılmayan bir
kapıdır.

⚠️ **İki kişilik ekibin yapısal sınırı:** "ikinci göz" = diğer kişi. Biri izne çıkınca her şey
kilitlenir ve bypass alışkanlık olur. Bu bir mimari kusur değil, ekip büyüklüğünün sonucudur —
ama baştan konuşulmalı, sonradan keşfedilmemeli.

---

## 4. Yeni organizasyona geçiş — ilk gün listesi

| # | İş | Neden |
| :--- | :--- | :--- |
| 1 | 🔴 **Yeni HCP workspace, sıfır state** | Pilot'un state'i pilot org'un fotoğrafı. Yeni org'da o state'le çalışmak, ilk apply'da yeni org'u pilot'a benzetmeye çalışmak demektir |
| 2 | 🔴 **Örnek config dosyalarını temizle** | `organization.example.yml` bir kez **gerçek davet göndermişti**: içindeki takma adlar GitHub'da var olan kullanıcılara denk geldi. Placeholder değerler zararsız değildir |
| 3 | 🔴 **Dosya bölmesi** (`people.yml` / `privileged.yml`) | Bölüm 3.6 — ikinci kişi eklendiği gün açılan bir kapı |
| 4 | 🟠 **İki repo olarak kur** (motor / config) | Bölüm 3.5 — şimdi bedava, sonra göç |
| 5 | 🟠 **Kontrol düzlemi repo'su private olsun** | Hem erişim raporu hem talep formu bunu gerektiriyor |
| 6 | 🟠 **Org planını doğrula** | Team ise `visibility: private` ilk günden mümkün; pilot'un "public olmak zorundayız" ödünleri hiç doğmaz |
| 7 | 🟡 **Org adlarını ve pilot'a özgü metinleri tara** | Dokümanlar "4 repo, tek mentör, Free plan" diyor. Taranmazsa yeni proje yalan söyleyen bir README ile başlar |
| 8 | 🟡 **İlk kanıt testi: elle bir repo aç, `plan` çalıştır** | Kapsama kontrolünün yeni org'da çalıştığını ilk günden görürsün |

### Plan seçimi hakkında not

Repo'lar private olacaksa **Team planı gerekli** — Free planda private repo'da dal koruması
çalışmıyor. Ama private'a geçmenin bir bedeli var:

⚠️ **Secret scanning + push protection kapanır.** Bunlar yalnızca public repo'da ücretsiz;
private repo'da ayrı bir eklenti (committer başına aylık ücret) gerekiyor. Kaybedilen şey
**push protection**: sızdırılmış bir anahtarın repo'ya *girmesini* engelleyen tek mekanizma.
Diğer her şey sızıntıyı *sonradan* haber verir.

Yerine ne konacağı (pre-commit hook, CI adımı, ya da eklentiyi satın almak) **aynı kararda**
verilmeli. Sessizce kaybedilmemeli. Ayrıntı: [`plans-and-pricing.md`](../plans-and-pricing.md).

---

## 5. Drift tespiti: HCP üst paket mi, kendi kontrolümüz mü?

**Soru:** State ile gerçek yapının uyumunu ne kontrol edecek? HCP Terraform'un yerleşik
drift tespiti üst pakette (Plus) — almalı mıyız?

**Cevap: almaya gerek yok.**

**a) Zamanlanmış bir `terraform plan` zaten drift tespitidir.** Mekanizma hazır; eksik olan
tek şey `schedule` tetikleyicisi.

**b) "Yeni credential git'e inecek" endişesinin dayanağı yok — credential zaten orada.**

| | Bugün | Cron eklenince |
| :--- | :--- | :--- |
| GitHub Actions'ta duran sır | HCP API token'ı | Aynı |
| HCP'de duran sır | GitHub App private key | Aynı |

HCP **uzaktan çalıştırma** yapıyor: runner planı kendisi çalıştırmıyor, HCP'ye tetikliyor.
App'in private key'i HCP'den hiç çıkmıyor. Cron **sıfır yeni credential** ekliyor.

**c) Asıl iş cron değil, gürültü filtresi — ve üst paket bunu da çözmüyor.**
Bölüm 2.6'da ölçüldü: altyapı tamamen senkronken bile 35 kaynak `Drift detected` diyor.
Aynı provider, aynı gürültü — Plus paketi de aynı çıktıyı okur.

**Cron'un bakması gereken iki gerçek sinyal:**
- `check` bloklarının **Warning**'leri (kapsama ihlallerini yakalayan şey)
- `plan -json` çıktısındaki gerçek `resource_changes[].change.actions`

⚠️ `Drift detected` metnini aramak **yanlıştır** — 35'i yalan çıkar.

### Ve raporu eyleme dönüştür

Drift bulunduğunda ne yapılacağı da tasarlanmalı. Önerilen: **PR değil, issue aç.**

```
"pilot-intern-web / develop / required_reviews arayüzden 1 → 2 yapılmış.
   (a) Bir şey yapma — sonraki apply geri alacak
   (b) Kalıcı olsun istiyorsan config'de şu satırı değiştir"
```

> ⚠️ **Config'i otomatik güncelleyen bir "ters senkron" aracı yazılmamalı.** Sistemin tezini
> tersine çevirir (UI değişikliği geri alınmak yerine yeni standart olur), yorumları ve karar
> gerekçelerini siler, ve apply ile yarışıp sonsuz döngü üretir. Bu döngü bu repoda daha önce
> **birebir yaşandı** (Dependabot + yönetilen şablon dosyaları) ve çözüm mekanizmayı
> kaldırmak oldu.
>
> Gerçekliği config'e okumak **yalnızca tek seferlik devralmada** doğrudur: dışarıdan bir repo
> geldiğinde, insan eliyle, bir kez.

---

## 6. Bilinen açıklar ve karar bekleyenler

| # | Konu | Durum |
| :--- | :--- | :--- |
| 1 | 🔴 **Yedek / B planı yok** | Kod geçmişi ve metadata (issue, PR, review yorumları) **hiç yedeklenmiyor**. Config yedekli — çünkü zaten git'te. Şirkette bir yedekleme mekanizması olup olmadığı henüz doğrulanmadı |
| 2 | 🔴 **Yedeğe HCP state de girmeli** | Kaybolursa config duruyor ama her repo, takım ve org ayarı baştan `import` edilir. HCP her apply'da state versiyonu tutuyor — kazara bozulmaya karşı koruma var; açık olan senaryo HCP hesabını komple kaybetmek. ⚠️ State hassas bir artefakttır, dışarı yazılmadan önce içeriği kontrol edilmeli ve şifreli saklanmalı |
| 2b | 🟠 **GitHub App private key — bu bir yedek değil, bus factor sorunu** | GitHub App'ler birden fazla private key tutabiliyor ve App ayarlarından yenisi üretilebiliyor. Yani key kaybı **kesinti** yaratır, kalıcı kayıp değil. Gerçek risk App ayarlarına ulaşabilen kimsenin kalmaması — yani 4. maddeyle **aynı** sorun |
| 3 | 🟠 **Erişim kaldırma testi hiç yapılmadı** | "Kişi çıkınca erişimi gidiyor" bugün bir **varsayım**. Mevcut testler erişimin *verildiğini* ve *reddedildiğini* kanıtlıyor; *geri alındığını* kanıtlayan kayıt yok. Private repo'da yapılmalı |
| 4 | 🟠 **Bus factor 1** | Tek org owner var ve break-glass gereği yönetim dışı. İki kişilik ekipte ikinci kişi ondan bağımsız hiçbir şey yapamaz — ya da ikinci owner olur ve ikisi de her kuralı atlayabilir. Bilinçli seçim yapılmadı |
| 5 | 🟡 **Elle yönetilen ayarlar listesi** | Provider'ın **okuyamadığı** ayarlar var: fatura e-postası, PAT politikası, org varsayılan etiketleri, (varsa) IP allow list. Drift'leri görülmez. Runbook'ta liste tutulmalı |
| 6 | 🟡 **Yönetim dışı repo'lar** | Deney artıkları: `afsfs`, `testt`, `conf-test`, `conf-test-2`. Silinecek. Kalıcı olarak yönetilmeyecek repo çıkarsa bir **allowlist** gerekecek — ama istisna sessiz olmamalı, raporda isimle görünmeye devam etmeli |
| 7 | 🟡 **VPN / IP allow list talebi** | Dışarıdan gelen bir istek. Enterprise planı gerektiriyor **ve** org geneli bir kontrol — "şu üç repo VPN arkasında" kurulamıyor. Ayrıca açıldığı gün GitHub-hosted runner'lar org'a erişemez olur, yani CI'ı kilitler. Bugün yapılacak değil, **anlatılacak** iş |

### Fark edilen kalıp

Bu maddelerin çoğu aynı soruyu soruyor:

> **"Kontrol var mı?" değil — "kontrolün çalıştığını nereden biliyorsun?"**

Bu proje bu kalıbı kendi içinde birkaç kez yakaladı: bir güvenlik ayarının tam da denetlenmeyen
repoda kapalı olması; boş bir raporun "bakıldı, temiz" ile "hiç bakılmadı"yı aynı biçimde
söylemesi. Kapsama kontrolü yazılırken alarm yolu **bilerek tetiklenmişti**, çünkü
**sıfır bulgu, kontrolün çalıştığının kanıtı değildir.**

Aynı kural yedek maddesine de uygulanmalı: **test edilmemiş yedek, yedek değildir.**
Saklama süresinin yanına *"çeyrekte bir geri yükleme denemesi"* girmezse, ilk gerçek ihtiyaçta
yedeğin bozuk olduğu öğrenilir.

---

## 7. Doğrulanmamışlar

Bu dokümandaki her ifade aynı güvende değil. Karar verirken önce bunlar teyit edilmeli:

| # | İddia | Neden emin değiliz |
| :--- | :--- | :--- |
| 1 | HCP'nin yerleşik drift tespiti yalnızca üst pakette | Fiyatlandırma katmanları değişebiliyor; satın alma öncesi teyit edilmeli |
| 2 | Şirkette repo yedeği yok | Sözlü bilgi, doğrulanmadı. Üç ayrı soru sorulmalı: kod geçmişi mi / metadata mı / saklama + geri yükleme denemesi var mı |
| 3 | Şirket org'u Team planı alacak | Varsayım. Enterprise gerekirse VPN maddesi de masaya gelir |
| 4 | Provider PAT politikasını yönetemiyor | Şema tarandı, karşılığı görülmedi; ama kesin kanıt değil |
| 5 | `-detailed-exitcode`, yalnızca output değişen planlarda ne döndürür | Terraform sürümüne göre değişebiliyor; cron yazılırken doğrulanmalı |

**Doğrulanmış olanlar** (bu konuşmada canlı test edildi):

- ✅ Akış tek yönlü, config'e geri yazma yok — Bölüm 2
- ✅ Terraform yönetmediği kaynağa dokunmuyor — plan çıktısında sıfır değişiklik
- ✅ Kapsama kontrolü gerçek bulgu üretiyor — 4 repo isimle yakalandı
- ✅ Org varsayılan etiketleri yalnızca yeni repo'ları kapsıyor — `conf-test` vs `conf-test-2`
- ✅ Terraform etiket setini komple sahipleniyor — 7 stok etiket silindi, 2'si ezildi
- ✅ Kozmetik drift gerçek ve ölçüldü — 35 uyarı, 0 gerçek değişiklik
- ✅ Provider'da org geneli etiket kaynağı yok — şema tarandı

---

## 8. Terimler

Konuşmada geçen ve dokümanlarda karşına çıkacak terimler:

| Terim | Anlamı |
| :--- | :--- |
| **Drift** | Gerçek durumun config'den sapması. Biri arayüzden elle bir şey değiştirdiğinde oluşur |
| **State** | Terraform'un "hangi kaynağı yönetiyorum" kaydı. HCP'de tutuluyor |
| **Brownfield** | Zaten var olan, sonradan yönetim altına alınan altyapı. Karşıtı: greenfield |
| **Blast radius** | Bir hatanın veya ele geçirmenin etkileyebileceği alan |
| **Bus factor** | Kaç kişi kaybolursa proje durur. 1 = tek kişiye bağımlı |
| **Break-glass** | Acil durum erişimi. Bilerek otomasyonun dışında bırakılan yetki |
| **Fail-open / fail-closed** | Kontrol bozulunca kapı açık mı kalır, kapalı mı |
| **Paper control** | Kâğıtta var olan ama fiilen çalışmayan kontrol |
| **Secure by construction** | Yanlış durumu *tespit etmek* yerine *ifade edilemez* kılmak |
| **GitOps** | Git'in tek doğruluk kaynağı olduğu, değişikliğin PR'dan geçtiği model |
| **JML** | Joiner–Mover–Leaver: kişinin işe girişi, rol değişimi, ayrılışı |
| **Device Flow** | Sunucusu olmayan uygulamaların, secret saklamadan kimlik doğrulama yöntemi |

---

## 9. Bitirme kapsamı ve open source yayını _(2026-09-07)_

> **Karar (Ozan):** Projeyi ~1.5 hafta içinde bitirip open source yayınlamak. Aşırı
> mühendislikten kaçınmak; kapsam genişledikçe daralttmak.

### 9.1 Kapsam daraltıldı

| Parça | Durum |
| :--- | :--- |
| Config + Engine | ✅ Core — kalıyor |
| Secure dashboard | ✅ Core — **okuma modu**; yazma modu sonraki sürüme |
| 3rd party app entegrasyonları (Linear/ClickUp/Slack) | ❌ **Kapsam dışı** |
| AI / otomasyon bot'ları (Faz 9) | ❌ **Kapsam dışı** |

⚠️ **"Secure dashboard" = okuma modu.** Yazma modu (form/dashboard'dan config değiştirme)
bu sürümde **yok**, çünkü önce dosya bölmesi (Bölüm 3.6) + üç repo (Bölüm 3.5) + App device
flow gerekiyor. Yazma yolu olarak **Issue Form** yeterli — native, hızlı, güvenli.
Dosya bölmesi yapılmadan yazma modu "secure" değildir; tam tersine mentörün org owner
olabildiği delik açık kalır.

### 9.2 "Done" tanımı — 1.5 haftaya sığan

- ✅ Engine + config (zaten canlı)
- ✅ Dashboard **okuma modu** + yetki yükseltme kapısı kapalı (dosya bölmesi)
- ✅ Issue Form = yazma yolu
- ✅ Open source hijyeni (aşağıda 9.3)
- ❌ Dashboard yazma modu → sonraki sürüm
- ❌ 3rd party, AI bot → kesildi
- 📄 Yedek + erişim kaldırma testi → "bilinen kısıt" olarak yazılır, gizlenmez

🔴 **Pazarlık dışı:** dosya bölmesi (Bölüm 3.6). Atlanırsa "secure dashboard" değil,
"yükseltme deliği açık dashboard" yayınlanmış olur. ~1 günlük iş.

### 9.3 Open source yayın şartları — kontrol listesi

Public yayınlamak "zaten public'ti"den farklıdır: artık insanlar okuyup **kullanacak**.

| # | Şart | Neden bloklayıcı |
| :--- | :--- | :--- |
| 1 | 🔴 **`.example.yml` placeholder'ları temizle** | Bu dosya bir kez **gerçek davet göndermişti** (takma adlar GitHub'da var olan kullanıcılara denk geldi). Open source kullanıcısı da aynı mayına basar |
| 2 | 🔴 **Secret / kimlik taraması** | Token, App ID, HCP workspace/org adı, gerçek kullanıcı adları repoda kalmamalı. `git log` geçmişi de taranmalı — silmek yetmez, geçmişte kalır |
| 3 | 🔴 **config repo'yu public yapma** | Gerçek `people.yml` = gerçek kişiler + yetkiler. Sadece **engine + dashboard** public; config private. Engine'e `config.example/` konur |
| 4 | 🟠 **LICENSE ekle** | Lisanssız kod "açık kaynak" değildir; kimse yasal olarak kullanamaz |
| 5 | 🟠 **README** | Kök README hâlâ yok (ROADMAP "ertelenenler"). Ne yaptığı, nasıl kurulduğu, sınırları |
| 6 | 🟡 **Dokümanlar Türkçe** | [`language-convention.md`](language-convention.md) bunu bilinen açık diyor. Open source'ta İngilizce okuyucu göremez. Bloklayıcı değil ama karar Ozan'ın — en azından README İngilizce olmalı |
| 7 | 🟡 **Bilinen kısıtları yaz** | Yedek yok, erişim testi yapılmadı, bus factor 1. "Eksiğimiz var" değil "neyin eksik olduğunu biliyoruz" — projenin tezine uyar |

### 9.4 Neyin overengineering OLMADIĞI — kesme

Süreyi kısaltmak için şunları kesmek cazip ama bunlar **core**, kesilirse sistem eksik olur:

- Dosya bölmesi (9.2'de pazarlık dışı dedik)
- `coverage.tf` — Bölüm 2.5'te neden zorunlu olduğu kanıtlandı
- Bypass raporu (`outputs.tf`) — görünürlük, sistemin ana tezinin yarısı

Overengineering olan ve haklı olarak kesilen: 3rd party, AI bot, dashboard yazma modu.

---

## İlgili dokümanlar

- [`ACCESS-MODEL.md`](../../ACCESS-MODEL.md) — yetki modelinin gerekçeleri
- [`ROADMAP.md`](../../ROADMAP.md) — fazlar, kararlar, mevcut durum
- [`TODO.md`](../../TODO.md) — açık işler ve tespit edilmiş tutarsızlıklar
- [`external-review-2026-08-20.md`](external-review-2026-08-20.md) — dış değerlendirme (yedek, VPN, PAT maddeleri)
- [`github-auth-strategy.md`](github-auth-strategy.md) — Terraform → GitHub kimlik kararı
- [`../plans-and-pricing.md`](../plans-and-pricing.md) — plan seçimi ve maliyet
- [`../runbook.md`](../runbook.md) — işletme prosedürleri
- [`../onboarding.md`](../onboarding.md) — ilk gün kurulumu
