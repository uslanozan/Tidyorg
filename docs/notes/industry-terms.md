# Not: Yaşadığımız Sorunların Sektördeki Adları

> **Durum:** 📚 Referans notu · İlk yazım: 2026-08-20 (Ozan'ın sorusu üzerine)
> **Neden bu not var:** Bu projede karşılaştığımız sorunların çoğu bize özgü değil;
> sektörde adları, literatürü ve bilinen çözüm kalıpları var. İsmini bilmek iki şey
> kazandırıyor: aramak mümkün hale geliyor, ve "bu sorunu ilk yaşayan biz değiliz"
> rahatlığıyla hazır çözümlere bakılabiliyor.

> ⚠️ Bu bir sözlük değil. Her başlık **bu projede gerçekten yaşanmış bir olaya**
> bağlanıyor. Genel terim listeleri internette zaten var; buradaki değer eşleştirmede.

---

## 1. Projenin kendisinin adı

**Platform Engineering** ve ürettiği şeyin adı **Internal Developer Platform (IDP)**.

Yaptığımız iş tam olarak bu: geliştiricilerin altyapıyla tek tek uğraşmasını engelleyen,
merkezi ve kendi kendine hizmet veren bir katman. Şablon + config + otomatik uygulama
üçlüsüne **"paved road"** veya **"golden path"** deniyor (terimi Spotify yaygınlaştırdı):
doğru yol, en kolay yol olacak şekilde döşenir; kimse zorlanmaz ama sapmak zahmetli olur.

`terraform/templates/` bizim paved road'umuz. `config/` self-service arayüzü.

İlgili: **Team Topologies** kitabı (platform ekibi / stream-aligned ekip ayrımı) — Faz 8'de
yapacağımız motor/durum ayrımının örgütsel karşılığı orada anlatılıyor.

---

## 2. "Org varsayılanları yalnızca geleceği koruyor"

Bulduğumuz şey: `*_for_new_repositories` ayarları mevcut repo'lara dokunmuyordu, ve
`vulnerability_alerts` bu repo'da kapalı çıktı.

**Adı: preventive control (önleyici kontrol) vs. detective control (tespit edici kontrol).**
Güvenlik literatürünün en temel ayrımlarından biri:

| Tür | Ne yapar | Bizdeki örnek |
| :--- | :--- | :--- |
| **Preventive** | Yanlış şeyin **olmasını** engeller | `members_can_create_repositories = false`, push protection |
| **Detective** | Olduktan **sonra** haber verir | Bypass raporu, drift tespiti, kapsama kontrolü |
| **Corrective** | Bulduğunu **düzeltir** | `terraform apply` (drift'i geri alır) |

Bizim hatamız, **preventive** sanılan bir ayarın aslında yalnızca **yaratılma anında**
uygulandığını fark etmemekti. Bunun ayrı bir adı var: **point-in-time enforcement vs.
continuous enforcement**. Kubernetes dünyasında aynı ayrım **admission control**
(nesne yaratılırken kontrol) ile **reconciliation / audit** (sürekli denetim) arasında.

Kural olarak akılda tutulacak: *bir ayarın adında "for new" geçiyorsa, o bir preventive
kontrol değil, sadece bir varsayılan.*

---

## 3. "Org'a giren repo hiçbir kontrolün kapsamına girmiyor" (GIT-34)

**Adı: IaC coverage (Infrastructure-as-Code kapsamı)** ve kapsam dışındaki nesnelere
**unmanaged resources** deniyor. Bulut dünyasında aynı şeyin genel adı **shadow IT** /
**shadow infrastructure**.

Kritik ayrım — bu ikisi sürekli karıştırılıyor:

| | Soru | Neye bakar |
| :--- | :--- | :--- |
| **Drift detection** | "Yönettiğim şey değişmiş mi?" | State'te olanlara |
| **Coverage detection** | "Yönetmediğim ne var?" | State'te **olmayanlara** |

Bizim bugün yaptığımız yalnızca birincisi. `terraform plan` state'te olmayan bir repo'yu
**asla** göstermez — çünkü onun için o repo yoktur. GIT-34 tam olarak ikincisini kuruyor.

Bu metriği `driftctl` adlı araç yaygınlaştırdı (Snyk 2023'te projeyi sonlandırdı, yani
aracın kendisini önermiyorum — ama **"IaC coverage"** terimi kaldı ve aranabilir).
Bulut tarafında aynı işi yapan ürün kategorisinin adı **CSPM (Cloud Security Posture
Management)**.

---

## 4. "Mevcut bir repo'yu yönetime almak" (GIT-34'ün ikinci yarısı)

**Adı: resource adoption** veya **brownfield import**. Karşıtı **greenfield** — sıfırdan,
yönetim altında doğan altyapı.

Terraform'daki karşılığı `import` bloğu (bizim `imports.tf`'te kullandığımız). Ters yöne
çalışan, var olan altyapıdan kod üreten araçlara **reverse Terraform** deniyor;
en bilineni **Terraformer**.

Prosedürün üç adımının literatürdeki adları:
- **Discovery** — envanter çıkarma
- **Reconciliation** — mevcut durum ile istenen durumu uzlaştırma
- **Adoption / onboarding** — yönetime alma

---

## 5. "Terraform dosyayı geri alıyor, Dependabot yeniden açıyor" (GIT-37)

**Adı: fighting controllers** (veya **controller conflict** / **reconciliation loop
conflict**). Kubernetes literatüründen gelen bir terim ama sorun evrensel: **tek bir
kaynağı iki farklı otomasyon sahiplenirse**, ikisi de kendi istediği duruma sürekli geri
çeker ve sistem salınıma girer.

Kubernetes bu sorunu resmî olarak çözdü: **Server-Side Apply** ve **field ownership**
(field manager) mekanizmasıyla her alanın **kimin** olduğu kayıt altına alınıyor; başka
bir aktör o alana dokunmak isterse çakışma açıkça raporlanıyor.

Bizim `strict` / `seed` / `none` mod tablomuz aslında **elle yazılmış, dosya seviyesinde
bir field ownership modeli**. Aynı problemin aynı çözümüne bağımsız ulaşmışız — sadece
alan seviyesinde değil dosya seviyesinde.

Buradan çıkan ders: **çakışmayı çözmenin yolu "kim kazanır" kuralı koymak değil,
sahipliği açıkça ilan etmek.** GIT-37'de yaptığımız da bu oldu: Dependabot'un o dosyada
sahipliği olmadığını ilan ettik.

---

## 6. "`prevent_destroy` değişkenden gelemiyor" (GIT-32)

Bu **Terraform'a özgü** ve genel adı **static (compile-time) vs. dynamic (runtime)
configuration**. `lifecycle` bloğu Terraform'un **bağımlılık grafiğini kurarken**
okunuyor — yani değişkenler henüz çözülmeden önce. Bu yüzden literal olmak zorunda.

Aynı sınıftan bir kısıt: `ignore_changes` da dinamik olamaz (bunu Faz 2'de `strict`/`seed`
ayrımında yaşadık). İkisi de aynı sebebe dayanıyor.

**Genel kalıbın adı: two-phase evaluation.** Derleyicilerden build sistemlerine kadar her
yerde görülür: bir şeyin "yapısını" belirleyen kararlar, "verisini" hesaplayan kararlardan
önce alınmak zorundadır.

---

## 7. `prevent_destroy` yerine ne konur

**Adı: policy as code.** Kuralı kaynağın içine gömmek yerine, **plan çıktısını denetleyen
ayrı bir politika motoruna** taşımak.

| Araç | Nerede |
| :--- | :--- |
| **Sentinel** | HCP Terraform'un kendi motoru — **zaten kullandığımız platformda var** |
| **OPA / Rego** | Açık kaynak, genel amaçlı |
| **Conftest** | OPA'nın CLI sarmalayıcısı, CI'da kolay |
| **Checkov, tfsec** | Hazır güvenlik kuralı setleri |

GIT-32'de tartıştığımız "silme kapısı" tam olarak bir policy-as-code işidir: *"plan bir
`github_repository` yok ediyorsa, PR'da açık onay yoksa reddet."*

---

## 8. "Admin her şeyi atlayabiliyor" (Karar E)

Kullandığımız **break-glass** terimi doğru ve sektörde aynen bu isimle geçiyor: acil
durumda normal kontrolleri atlayan, bilinçli olarak bırakılmış kaçış yolu.

Etrafındaki terimler:
- **PAM (Privileged Access Management)** — ayrıcalıklı erişimin yönetimi
- **JIT access (Just-In-Time access)** — yetkiyi kalıcı vermek yerine, gerektiğinde ve
  süreli vermek. `org_role: admin` yükseltme kapısı (GIT-36) tartışmasının olgun hali budur.
- **Separation of Duties (SoD)** — aynı kişinin hem değişikliği yapıp hem onaylayamaması.
  Faz 8'in motor/durum ayrımının güvenlik gerekçesi.
- **Four-eyes principle** — iki kişi kuralı. `required_reviews: 2` bunun uygulaması;
  üç kişilik ekipte sürtünme yaratması da bilinen bir sonucu.
- **Blast radius** — bir hatanın ya da ele geçirilen bir kimliğin ulaşabileceği alan.
  ROADMAP'te zaten bu isimle geçiyor.

---

## 9. Bu projenin tekrar eden hata kalıbı

Birkaç kez aynı şeyi yaşadık: **bir koruma sessizce kayboldu ve kimse fark etmedi.**
(`vulnerability_alerts` kapalıydı · deprecation uyarısı "No changes" çıktısında gizliydi ·
private'a geçince push protection düşecekti.)

**Adı: fail-open vs. fail-closed** (eş anlamlısı **fail-safe vs. fail-secure**).

- **Fail-open** — bir şey bozulduğunda sistem **erişime izin vererek** devam eder.
  Güvenlik açısından tehlikeli olan budur.
- **Fail-closed** — bozulduğunda **reddederek** durur. Gürültülü ama güvenli.

Bizim yaşadığımız her olay fail-open'dı. Bu yüzden `people.tf`'teki `precondition`'lar
bilinçli olarak **fail-closed**: eksik `org_role` varsayılana düşmüyor, plan'ı durduruyor.

Bir de şu var: yazılı ama zorlanmayan kurala **paper control** deniyor. `people.yml`
içindeki "yükseltme kapısı" yorumu tam da bir paper control'dü — bu yüzden
2026-08-20'de "⏸️ PLANLANIYOR, HENÜZ YOK" diye işaretlendi.

---

## 10. Bir arada: sistemin genel adı

**GitOps** — Git'i tek doğruluk kaynağı yapan operasyon modeli (kullanıyoruz).
Altında yatan daha eski ve genel fikir **desired state configuration** ve
**continuous reconciliation**: sistem "istenen durum" ile "gerçek durum" arasındaki farkı
sürekli ölçer ve kapatır. `terraform plan` bu farkın raporu, `apply` kapatma işlemi.

Manuel, tekrar eden, otomatikleştirilebilir işlere **toil** deniyor (Google SRE kitabı) —
bu projenin ortadan kaldırmaya çalıştığı şeyin adı.

---

## Nereden okunur

- Google **SRE Book** — toil, fail-open/closed, error budget _(ücretsiz, sre.google/books)_
- **Team Topologies** — platform ekibi / motor-durum ayrımının örgütsel karşılığı
- Kubernetes **Server-Side Apply** dokümanı — field ownership, fighting controllers
- **OPA / Rego** dokümanı ve HCP Terraform **Sentinel** dokümanı — policy as code
- Terraform **import** ve **moved/removed** blokları — resource adoption

---

## İlgili dokümanlar

- [`../../TODO.md`](../../TODO.md) — GIT-32, GIT-34, GIT-37 kararları ve gerekçeleri
- [`../../ROADMAP.md`](../../ROADMAP.md) — *"Geçmişi kim koruyacak?"* notu
- [`../security-policy.md`](../security-policy.md) — yürürlükteki ve olmayan kontroller
- [`../plans-and-pricing.md`](../plans-and-pricing.md) — plan kaynaklı kısıtlar
