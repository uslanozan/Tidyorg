# Ozan — Çalışma Günlüğü

Bu dosya kendi yaptıklarımı, öğrendiklerimi ve verdiğim kararları not aldığım günlük.
Resmî dokümantasyon değil — düşünce sürecinin kaydı. Hafta 4'teki sunum hazırlığında
"bu kararı neden verdik" sorusunun cevabı burada olacak.

**Konvansiyon:** En yeni kayıt en üstte. Her kayıt bir tarih başlığı altında.

---

## 2026-08-18 — Faz 6 başladı: görünürlük raporu, ve org ayarlarını açınca çıkanlar

Bugün iki iş yaptım. Biri planlıydı, diğeri planladığım işin yan ürünü olarak çıktı ve
açıkçası daha önemli.

### 1. "Kim bypass edebiliyor?" raporu — [`terraform/outputs.tf`](../../terraform/outputs.tf)

Bu, Karar E'nin (`enforce_admins` **kalıcı** `false`) borcuydu. Muafiyeti teknik olarak
kapatmamayı seçtiysek geriye tek kontrol kalıyor: **görünürlük**. Emre'nin her repoda
admin olduğu 15 Ağustos'ta ancak `.tf` dosyaları okunarak anlaşılabildi — olayın aylarca
fark edilmeme sebebi tam olarak buydu. Bir daha aynı şey olacaksa en azından
`terraform output` ile görünsün.

Rapor repo × dal kırılımında üç şey söylüyor: `enforce_admins` değeri, **tüm kurallardan
muaf olanlar**, ve push allowlist'indeki roller. Muaf listesi üç kaynağın birleşimi —
repo'nun mentörleri, `head-of-engineering` taşıyanlar, org owner'lar. Bunlar farklı
yollardan aynı sonuca varıyor (repo'da admin) ve GitHub **en yüksek** yetkiyi uyguladığı
için hepsi tek listede toplanmalı.

**Kendi raporuma güvenmemem gereken yeri de rapora yazdım.** Org kapsamlı iki liste
config'deki `people` bölümünden okunuyor ve `people` bölümünü Terraform **hâlâ
tüketmiyor**. Yani orası *beyan*, doğrulanmış gerçek değil — birisi arayüzden org owner
yapılsa rapor bunu göremez. Output'un içine `_uyari` diye bir alan koydum ve bunu açıkça
söylüyor. Sessizce eksik bir güvenlik raporu, hiç raporu olmamasından daha kötü;
`people` → `github_membership` işi bitince uyarı kalkacak.

Bugünkü çıktı: her repo, her dalda tek muaf aktör `uslanozan`. Yani Emre gerçekten temiz.

### 2. `default_repository_permission` → `None`, ve import'un ortaya döktüğü şeyler

Base permission bugüne kadar `Read`'ti: org'a eklenen herkes, hiçbir takımda olmasa bile
bütün repo'ları okuyabiliyordu. Yazma deliği yok ama izolasyon da yok. `None` yapınca
erişimin tek kaynağı takım üyeliği oluyor — en az yetki ilkesinin kendisi.

**Buradaki tuzağı yazmadan önce fark ettim, iyi ki fark etmişim.**
`github_organization_settings` tek bir alanı değil, **org'un ayar nesnesinin tamamını**
yönetiyor (~25 alan: fatura e-postası, üye izinleri, güvenlik varsayılanları...). Yani
"sadece şu alanı yönetelim" diye eklenemez. Bu yüzden doğrudan yazmak yerine sırayı
şöyle kurdum: önce `import` bloğuyla mevcut ayarları state'e al, sonra `plan` çalıştırıp
**provider varsayılanı ile gerçek arasındaki her farkı gör**, ancak ondan sonra yaz.

Plan iki şey öğretti.

**İyi haber:** korktuğum "config'de yazmadığın her alan varsayılana döner" senaryosu
gerçekleşmedi. Plan sadece iki alanı değişiklik olarak gösterdi; geri kalan ~23 alan
GitHub'dan okunup olduğu gibi kaldı (Terraform'da optional+computed alanların davranışı
bu). Yine de bunu **plan'ı görmeden** bilemezdim.

**Kötü haber — ve bloklayan şey:** `billing_email` provider şemasında **zorunlu**.
Denedim, çıkarınca `validate` patlıyor: *"The argument billing_email is required"*.
Ama import sonrası plan onu `+` olarak gösterdi — yani Terraform mevcut değeri **boş**
okudu, muhtemelen App token'ı bu alanı okuyamıyor. Yazma yetkisi ise büyük ihtimalle var.
Sonuç: buraya tahmini bir değer yazıp apply edersem **organizasyonun fatura e-postası
sessizce değişir**. Tahmin edilecek alan değil, arayüzden okunacak. Bloğu yorumda
bıraktım ve sebebini dosyanın içine yazdım.

**Asıl bulgu ise import'un yan ürünü.** Plan çıktısı org'un o güne kadar hiç bakmadığımız
güvenlik duruşunu döktü:

```
dependabot_alerts_enabled_for_new_repositories               = false
dependabot_security_updates_enabled_for_new_repositories     = false
dependency_graph_enabled_for_new_repositories                = false
secret_scanning_enabled_for_new_repositories                 = false
secret_scanning_push_protection_enabled_for_new_repositories = false
advanced_security_enabled_for_new_repositories               = false
```

**Org düzeyinde hiçbir güvenlik varsayılanı açık değil.** Yani config'den açtığımız her
yeni repo sıfır güvenlik özelliğiyle doğuyor. Faz 6'nın zaten planlı olan
`vulnerability_alerts` maddesi bunu repo bazında çözüyor ama asıl doğru yer burası —
org varsayılanı olarak açılırsa gelecekte açılacak repolar da kapsanır.

Bir de bu vardı:

```
members_can_create_public_repositories = true
members_can_create_repositories        = true
```

**Herhangi bir org üyesi public repo açabiliyor.** Bunu `default_repository_permission`
kapatmıyor — farklı eksen: biri *mevcut* repolara erişim, diğeri *yeni* repo yaratma.
Kod sızıntısı için en kısa yol da bu. Ayrı bir karar olarak Faz 6'ya yazdım; kapatılırsa
repo açma tamamen config'e iner, ki zaten dogfooding iddiamız o.

### 3. `billing_email` — offboarding'de kaçırdığımız şey

Değeri arayüzden okumaya gidince çıktı: **org'un fatura e-postası Emre'deymiş.** Erişim
yetkilerini 15 Ağustos'ta aldık, ama fatura bildirimleri üç gün daha ona gitti. Ozan
adresi kendine aldı, ben de Terraform'a bağladım.

Bu, offboarding kontrol listemizin eksik olduğunu gösteriyor. "Erişimi kes" dediğimizde
takım üyeliklerini ve rolleri düşünüyoruz; **hesabın bağlı olduğu kanalları** değil.
Fatura e-postası bunlardan sadece biri.

Bir de şu var: provider bu alanı **okuyamıyor** (import'ta boş geldi). Yani Terraform
onun drift'ini de göremez — arayüzden değiştirilirse plan sessiz kalır ve bir sonraki
apply bizim yazdığımızı geri yazar. `org-settings.tf`'teki o satır bir *kayıt* değil,
**tek doğruluk kaynağı**. Bunu dosyanın içine yazdım, yoksa birisi arayüzden değiştirip
"Terraform nasılsa görür" diye düşünebilir.

### 4. Apply patladı — üçüncü 403

```
Error: PATCH https://api.github.com/orgs/your-org:
       403 Resource not accessible by integration
```

App'te `Repository → Administration: write` **vardı**. Ama org ayarları için gereken izin
o değilmiş — GitHub ikisini ayrı tutuyor:

| Manifest anahtarı | Neyi açar |
| :--- | :--- |
| `administration` | Repo ayarları, branch protection, takım erişimi |
| `organization_administration` | **Org ayarları**, base permission, üye izinleri |

**Bu üçüncü sefer.** Önce `Issues` (label senkronizasyonu), sonra `Workflows`
(`.github/workflows/` yazma), şimdi `organization_administration`. Üçünde de aynı şeyi
yaptım: geniş görünen bir izni yeterli sandım. Örüntü artık net — **GitHub izinleri
sandığımdan hep daha dar tanımlıyor**, ve bunu ancak apply patlayınca öğreniyorum.

Bir sonraki sefere kural: yeni bir kaynak türüne ilk kez dokunurken izin tablosuna
*önden* bakacağım. Manifest'e ve kurulum README'sine ekledim, README'ye de "bu ikisi
aynı izin değil" uyarısı koydum çünkü isimler birbirine fazla benziyor.

**İyi haber:** `import` adımı başarılı oldu, kaynak state'te. Yani izin verilince ikinci
apply yalnızca `~ update in-place` yapacak — baştan başlamıyoruz.

Ozan izni verdi, ikinci apply geçti. `plan` artık temiz:
*"No changes. Your infrastructure matches the configuration."*
Base permission canlıda **`none`**.

### 5. `none`'ın ilk faturası — Medine iki repo'yu kaybetti

Apply'dan sonra "kim ne kaybetti" diye baktım, iyi ki bakmışım. `medine2906` yalnızca
`Tidyorg`'ın `developers` listesinde; `pilot-intern-api` ve
`pilot-intern-web`'e erişimi **org varsayılanından** geliyordu. `read` → `none` olunca
gitti.

Bu tam olarak istediğimiz davranış — "erişimin tek kaynağı takım üyeliği olsun" demiştik,
oldu. Ama **soyut bir ilkenin somut bedeli** ilk kez görünür oldu ve bu bedel bir insana
düştü. Dashboard org'daki repo'ları kullanıcının kendi kimliğiyle listelediği için
(ACCESS-MODEL Karar 15) Medine'nin ekranından iki repo kaybolacak. Test ederken
"dashboard bozuldu" sanabilir — bozulmadı, doğru çalışıyor.

**Öğrendiğim şey:** base permission'ı daraltmak sessiz bir işlem değil, bir **erişim
kaldırma** işlemi. Kimin neyi kaybettiğini apply'dan *önce* çıkarmalıydım, sonra değil.
Bir dahaki sefere: org kapsamlı bir varsayılanı daraltmadan önce "bu varsayılana kim
bağımlı?" sorusunun cevabı elimde olmalı. Bugün şansımız yaver gitti — kaybeden kişi
ekipten biri ve durumu bir mesajla çözülüyor. Stajyer kalabalık bir org'da bu, sebebi
bulunması saatler süren bir "neden göremiyorum" turu olurdu.

Ozan'a söyledim; Medine'ye haber gidecek ve iki repo'nun `developers` listesine eklenip
eklenmeyeceğine karar verilecek.

### 6. Test repo'su — ve public/private tuzağı

`none`'ın gerçekten çalıştığını görmek için sıfırdan bir repo açtık: `pilot-access-test`,
kimseye yetki verilmemiş halde (yalnızca mentör ben).

Config'i yazarken az kalsın testi geçersiz kılıyordum. `defaults.visibility` = `public`
ve **public repo'yu internetteki herkes görür** — Emre ile Medine repo'yu görseydi bu
base permission'dan değil public olmasından gelirdi. Yani test hiçbir şey kanıtlamazdı.
`visibility: private` yazdım.

Ama private olunca free plan'de branch protection çalışmıyor. `protected_branches`'i
`null` ile kaldırdım — bu, `develop`'u silerken eklediğim kaldırma escape hatch'inin
**ikinci kullanımı** oldu. İki gün önce tek seferlik bir ihtiyaç sanıyordum; meğer genel
bir yetenekmiş.

Sonuç: 20 kaynak, `0 destroy`. Faz 2'yi ilk kez **sıfırdan bir repoya** uyguladık — daha
önce hep var olan repolara dağıtmıştık. Şablonların tamamı indi.

Bir de şunu fark ettim: bypass raporu bu repo için `{}` döndürdü. Doğru (korumalı dal
yok), ama raporun bir zayıflığını gösteriyor — **"korumalı dal yok" ile "endişelenecek
bir şey yok" aynı görünüyor.** Burada bilerek öyle; gerçek bir repoda boş harita alarm
olmalı, sessizlik değil.

**Ek (aynı gün, sonradan kapatıldı):** rapora `korumasiz_repolar` diye bir üst seviye alan
ekledim. Artık hiç korumalı dalı olmayan repo'lar ayrıca listeleniyor ve neden alarm
olduklarını söylüyor. Nüansı da yazdım: free plan'de private repo'da branch protection
zaten çalışmıyor, yani bu **beklenen** olabilir — ama *beklenen olması görünmez olmasını
gerektirmiyor*. Public bir repo o listeye düşerse gerçek bir açıktır.

Bu, raporu yazarken kaçırdığım bir şeydi ve ancak dördüncü repo eklenince ortaya çıktı.
Üç repoyla test ederken hepsinin korumalı dalı vardı; boş durum hiç oluşmamıştı. **Bir
raporun kör noktası, test verisinin kör noktasıdır.**

### 7. Repo güvenlik ayarları — ve kendi evimizin kapısı açıkmış

Faz 6'nın kalan büyük parçalarından biri. Modüle iki ayar ekledim:

- **`vulnerability_alerts`** — Dependabot zafiyet uyarıları. Her planda, her görünürlükte
  çalışır, varsayılanı `true`.
- **`secret_scanning`** — secret scanning + **push protection**. Asıl değerli olan
  ikincisi: sızdırılmış anahtar repo'ya **girmeden** push reddediliyor, sonradan
  uyarılmıyor.

Secret scanning yalnızca public repo'da ücretsiz; private repo GHAS (Enterprise) istiyor
ve API `422` dönüyor. Bu yüzden modüldeki koşula `visibility == "public"` de koydum —
config'de `true` yazan bir private repo apply'ı patlatmasın diye. Sessiz atlama normalde
kötü bir kalıp; burada kabul edilebilir olmasının sebebi kararın **config'e değil plana**
bağlı olması. Kullanıcı yanlış bir şey yazmıyor, GitHub o repo türünde özelliği vermiyor.
`pilot-access-test` sessizce atlandı, apply ilk denemede geçti.

**Plan'ın gösterdiği şey canımı sıktı:** `vulnerability_alerts` bu repo'da **`false`**'muş.
Yani **kontrol düzleminin kendisi** aylardır Dependabot zafiyet uyarısı almıyormuş. İki
pilot repoda açıktı. Fark nereden geliyor? Bu repo Terraform'dan **önce elle** açılmıştı;
pilotlar modülden doğdu.

Bu, projenin tezinin en somut kanıtı oldu: **elle kurulan hiçbir şey denetlenmiyor.**
Güvenlik politikası yazdık, dört doküman ürettik, branch protection'ı canlı test ettik —
ve kendi repo'muzda temel bir ayar kapalıydı. Kimse fark etmedi çünkü bakılacak bir yer
yoktu. Config'e alındığı an `plan` bunu bir satırda söyledi.

Org düzeyinde de beş varsayılanı açtım — ama şunu ayırt etmek önemli: **org ayarları
yalnızca YENİ repo'ları kapsıyor, mevcutları değil.** İkisi farklı zaman dilimini
koruyor, biri diğerinin yerine geçmiyor. Bunu hem koda hem `security-policy.md`'ye yazdım
çünkü "org'da açtık, tamamdır" demek kolay ve yanlış.

`security-policy.md`'nin "⛔ Bunlara güvenmeyin" bölümünden dört madde çıktı. O bölümü
silmek yerine altına "5.1 Bu bölümden çıkanlar" diye tarihsel bir kayıt bıraktım —
bir güvenlik dokümanında "ne zaman neye güvenilemezdi" bilgisi, "şu an ne var" kadar
değerli.

### 8. Repo açma kısıtı — ve GitHub'ın diyemediği şey

Ozan `members_can_create_public_repositories = false` istedi, "sadece mentörler veya
head of engineer repo açabilsin" diye. Yaptım ama istenen şeyi tam veremedim ve bunu
söylemek zorundaydım: **GitHub org düzeyinde "sadece mentörler" diyemiyor.** Repo açma
yetkisi ikili — ya tüm üyeler, ya yalnızca org owner'lar. Takım bazlı ara kademe yok.

Bugün fark yok: tek mentör Ozan ve zaten org owner. Ama owner olmayan bir mentör gelirse
repo açamayacak. Bunu bir kayıp olarak değil, modelin doğal sonucu olarak kabul ediyorum:
**repolar config'den doğmalı, insan elinden değil.** Elle repo açmak zaten kaçak yoldu;
kapatmak modeli bozmuyor, tersine zorluyor.

Üçünü birden `false` yaptım (`repositories`, `public`, `private`) — master anahtar tek
başına yeterdi ama alt anahtarları da açıkça yazmak, ileride biri master'ı açtığında
alt seviyede ne olacağını belirsiz bırakmıyor.

**Bir şeyi doğrulamamıştım:** bu ayarın GitHub App'i etkilemediğini *varsayıyordum* — App
org üyesi değil, kurulu bir entegrasyon. Ama test etmemiştim, ve yanılsam config'den repo
yaratma tamamen bozulurdu. Ozan "doğrulayalım" dedi, haklıydı.

### 10. App testi — varsayım tuttu

Kısıt yürürlükteyken geçici bir repo config'i ekleyip apply ettim:

```
module.repositories["tmp-app-create-test"].github_repository.this:
  Creation complete after 11s [id=tmp-app-create-test]
Apply complete! Resources: 11 added, 0 changed, 0 destroyed.
```

**App kısıtlanmıyor.** Ayar org **üyelerini** hedefliyor; App kendi izinleriyle çalışan
kurulu bir entegrasyon. Yani kısıtın aldığı şekil tam olarak istediğimiz: **insan elle
repo açamıyor, config açabiliyor.**

Bu testi yapmasaydık bunu ancak haftalar sonra, gerçek bir repo açarken öğrenecektik — ve
o an "neden çalışmıyor" diye Terraform'da arayacaktık, org ayarında değil.

### 11. Testin yan ürünü: kullandığım alan deprecated'mış

Apply çıktısını `grep`'lerken uyarıyı gördüm:

> `vulnerability_alerts` — *"Use the `github_repository_vulnerability_alerts` resource
> instead. This field will be removed in a future version."*

Yani **bugün eklediğim alan zaten ölmüş.** Ayrı kaynağa taşıdım; `4 to add, 0 to change`,
yani geçiş mevcut ayarı bozmadı, sadece sahipliği taşıdı.

**Asıl rahatsız edici kısım şu:** bu uyarı ilk apply'da da vardı, ben görmedim. Deprecation
uyarıları `Apply complete!` satırının hemen üstünde, uzun çıktının içinde duruyor. Bugün
ancak `grep` attığım için fark ettim — normal akışta gözden kaçardı ve provider güncellemesi
geldiğinde apply patlardı.

Kendime kural: apply çıktısını sadece "başarılı mı" diye okumak yetmiyor, **`Warning`
satırlarına ayrıca bakmak** gerekiyor. CI'daki plan yorumuna bunu ekleyebiliriz —
uyarı sayısını da raporlasın, tıpkı drift sayısını raporladığı gibi.

### 12. Kendi elimizle yönetim dışı nesne ürettik

Test repo'sunu temizlerken şunu fark ettim: **atılabilir repo açmak pahalı.** Modüldeki
`prevent_destroy` yüzünden Terraform repo'yu silemiyor. Yaptığım:

1. `terraform state rm 'module.repositories["tmp-app-create-test"]'`
2. Config dosyasını sil

Ama repo GitHub'da duruyor — ve artık **yönetim dışı**. Üstelik iki takım da (`-mentors`,
`-devs`) orada kaldı; repo silinince takımlar silinmiyor.

Yani sabah "org'a yönetim dışı bir repo girerse kimse fark etmez" diye not yazdım,
öğleden sonra kendi elimle üç tane ürettim. Ozan elle silecek, ama bu tesadüf değil —
**test etmeyi pahalı yapan her şey, testin yapılmamasına yol açar.**

ROADMAP'e bir öneri yazdım: config'e `ephemeral: true` alanı: öyle işaretlenen repo'da
`prevent_destroy` uygulanmasın, config'den satır silinince Terraform temizlesin. Bedeli
var — `lifecycle` dinamik olamadığı için (Faz 2'de öğrendik) iki ayrı kaynak gerekir.
Değer mi, konuşulacak.

### 14. `people` Terraform'a bağlandı — Faz 6 kapandı

Faz 6'nın kalan tek büyük işi. `config/organization.yml` → `people` bölümü aylardır
duruyordu ama **hiçbir şey onu okumuyordu**; gerçek üyelik `org-membership.tf` içinde
kişi başına elle yazılıydı. Yani config'in "veri katmanı YAML'da" iddiası bu bölümde
yalandı.

**Beklediğimden risksiz geçti — çünkü `moved` bloklarını doğru kullandık.**

```
Plan: 0 to add, 0 to change, 0 to destroy.
```

Kaynaklar yeniden adlandırılmadı, **adresleri** değişti: `github_membership.emre` →
`github_membership.people["paitblack"]`. `moved` olmasaydı Terraform bunu "eskiyi yok et,
yenisini yarat" diye okurdu — üyelikler bir an için düşerdi. Tek bir API çağrısı bile
yapılmadı; saf state taşıması.

**Doğrulamayı hardcode etmedim.** `roles:` bloğunda zaten `scope: organization |
repository` var. "Hangi rol `people`'a yazılabilir" sorusunun cevabı orada duruyordu;
ikinci kez yazmak iki kaynağın zamanla ayrışması demekti. Kural şimdi config'den
türetiliyor — yarın yeni bir org kapsamlı rol eklenirse doğrulama kendiliğinden bilecek.

**İki hata yolunu da test ettim, ve ikincisi beni yakaladı.**

1. `paitblack`'e `roles: [developer]` yazdım → plan durdu, hangi kişi hangi rol
   söylendi. ✅
2. `medine2906`'dan `org_role`'ü sildim → **yanlış hata geldi.** Kaynak
   `each.value.org_role` satırında çöküyor, benim açıklayıcı precondition'ım hiç
   çalışmıyordu. Kullanıcının gördüğü şey şuydu:

   > `This object does not have an attribute named "org_role".`

   Terraform'un kendi hatası teknik olarak doğru ama işe yaramaz — hangi kişi, neden
   zorunlu, ne yazılmalı, hiçbiri yok. `try(each.value.org_role, "member")` ile ifadeyi
   değerlenebilir hale getirdim; artık plan precondition'a ulaşıyor.

   **Buradaki `try` varsayılan üretmek için değil, hata sırasını düzeltmek için.** O
   "member" değeri asla uygulanmaz çünkü precondition planı zaten durduruyor. Bunu koda
   yorum olarak yazdım, yoksa biri "gereksiz try" deyip siler ve hata mesajı sessizce
   kötüleşir.

   Ders: **bir doğrulamanın ateşlendiğini görmeden yazıldı sayılmaz.** Ateşlenmeyen kural,
   olmayan kuraldan daha kötü — çünkü var sanıyorsun.

**Bypass raporundaki `_uyari` kalkmadı, daraldı.** Baştan planım onu tamamen kaldırmaktı
("Faz 6 bitince bu uyarı kalkacak" diye yazmıştım). Ama kaldırmak yanlış olurdu:
`uslanozan` break-glass gereği hâlâ yönetim dışında, yani onun org rolü **hâlâ beyan** ve
arayüzden değiştirilirse plan sessiz kalıyor. Uyarı artık bunu ismen söylüyor:

> "Şu org owner'ın rolü Terraform tarafından ZORLANMIYOR: uslanozan. ... Diğer herkes
> zorlanıyor."

Kendi verdiğim sözü tutmak için gerçek bir boşluğu gizlemek olurdu. Uyarı metnini
daraltmak, silmekten dürüst.

**Kazanç offboarding'de görünüyor.** 15 Ağustos'ta Emre'yi indirmek iki ayrı `.tf`
dosyası düzenlemeyi gerektirdi — takım üyeliği ve org rolü. İkisinden birini atlamak
yetkiyi sessizce bırakıyordu; nitekim ilk denememde tam olarak bu oldu. Artık tek satır
YAML.

`org-membership.tf` ve `team-memberships.tf` silindi. Ama içlerindeki tarihsel gerekçeleri
(Emre olayının neden iki katmanlı olduğu) `people.tf` içine taşıdım — kod silinir, sebebi
silinmemeli.

### 15. `people.yml` ayrıldı, üç doğrulama eklendi — ve bir tuzağı soru sayesinde bulduk

Ozan bir şey sordu: *"yeni kişi eklerken sadece organization.yml'ı mı değiştiriyoruz?"*
Cevabı ararken **`people`'a yazmanın zorunlu olmadığını** fark ettim. Birini yalnızca repo
dosyasına yazarsan modül takım üyeliği üretiyor, GitHub da onu otomatik org'a davet
ediyor — kişi org'a giriyor ama merkezi listede **hiç görünmüyor**.

Bugün kapattığımız boşluğun küçük hâli. Fail-fast ile kapattım: repo dosyalarında geçen
herkes `people.yml`'da da tanımlı olmalı, yoksa plan durur. Otomatik üyelik üretmek de
mümkündü ama offboarding'i felakete çevirirdi — kişiyi çıkarmak için adının geçtiği HER
repo dosyasını bulmak gerekirdi ve gözden kaçan tek kayıt onu organizasyonda bırakırdı.
Yani Emre vakasının aynısı, sadece daha dağınık.

**İkinci tuzak, yine bir soru sayesinde çıktı.** Ozan `org_role` sadece `admin` ve `member`
mi diye sordu. Evet — ama **GitHub arayüzü bu rolü "Owner" diye gösteriyor, API `admin`
istiyor.** Yani `org_role: owner` yazmak son derece doğal bir hata ve doğrulama olmadan
**plan'ı geçip apply'da patlardı** — hata en pahalı yerde, değişiklik canlıya uygulanırken.
Buna da bir precondition ekledim.

İkisi de "bir şey yapalım" diye değil, **soru sorulduğu için** ortaya çıktı. Kodun kendisi
bunu söylemiyordu.

### `people.yml` ayrımı

`people` bölümünü `organization.yml`'dan çıkarıp kendi dosyasına aldım. Gerekçe basit:
`organization.yml` **rollerin ne anlama geldiğini** tanımlıyor (nadiren değişir, yüksek
risk); kişi listesi ise sık değişiyor ve ileride dashboard yazacak. Bir stajyer eklemek
için yetki tanımlarının bulunduğu dosyayı açmak zorunda kalmak yanlıştı.

### Yetki yükseltme tartışması — ve fikir değiştirdiğim yer

Ozan iyi bir soru sordu: dashboard `people.yml`'a yazacaksa, yetkili biri oradan kendini
org owner yapamaz mı?

Yapabilir. Bu gerçek bir problem ve adı var — Terraform'u çalıştıran kimlik çok yetkili,
config'i kontrol eden dolaylı olarak onu kontrol ediyor. Terraform Cloud'un Sentinel/OPA
politikaları, Kubernetes'in `escalate`/`bind` fiilleri hep bunun için var.

**Önce HCP workspace değişkeni önerdim, sonra kendi önerimi geri aldım.** Sebep: allowlist
git'in dışına çıkarsa organizasyon hakkındaki en kritik gerçek — kim owner olabilir —
PR'da hiç görünmez. Bu, `billing_email`'de bugün yaşadığımız görünmez-drift probleminin
aynısı; bilerek üretmenin anlamı yok. Üstelik **Faz 8 aynı korumayı git içinde veriyor**:
motor mentörün yazamadığı repoya taşınınca precondition zaten dokunulmaz oluyor. Yani HCP
değişkeni aslında Faz 8'i yapmamanın yaması.

Ozan da CODEOWNERS ile korumayı önerdi. Orada bir kısıt var: **CODEOWNERS dosyanın bir
bölümünü koruyamaz, yalnızca yolunu.** `org_role`'ü korumak istiyorsan dosyayı bölmek
zorundasın; bölmezsen tüm `people.yml`'ı korursun ve her stajyer eklemek org yönetici
onayına takılır. Sık işlemi nadir işlemin hızına düşürmek.

Sonunda **ertelendi** — bugün koruyacağı kimse yok, çünkü kontrol düzlemi reposunun
`mentors` listesinde tek kişi var. Üç seçenek de gerekçeleriyle TODO'ya yazıldı.

**Ve tartışmanın asıl kazancı bu oldu:** bugünkü gerçek sınır kurduğumuz hiçbir kilit
değil, **`Tidyorg.yml`'ın `mentors` listesinin tek kişilik olması.**
`mentor` org geneli bir rol değil — başka repoda mentör olmak burada hiçbir yetki
vermiyor. O listeye ikinci bir isim eklemek, projedeki tüm yetki kontrollerinin kapsamını
sessizce genişletir. Ve bu hiçbir yerde yazmıyordu. Artık config dosyasının başında
büyük harflerle yazıyor.

### Yol bazlı CODEOWNERS — açık bir TODO kapandı

`/terraform/` ve `/.github/workflows/` yolları `platform-admins` takımına bağlandı
(ACCESS-MODEL Karar 13). İkincisini ben ekledim: apply'ı çalıştıran iş akışlarına
yazabilen biri, Terraform'un yetkisini **dolaylı olarak** ele geçirir — kodu değiştirmeye
gerek yok, workflow'u değiştirmek yeter.

Karar E gereği bu kural repo admin'ine karşı zorlanamıyor, bilgilendirici kalıyor. Ama
developer'a karşı gerçek bir engel ve Faz 8'de kilide dönüşüyor.

Bir de bunu yaparken üretilen CODEOWNERS'ın başlığındaki `# Kaynak: config/organization.yml`
satırının **yanlış** olduğunu gördüm — dosya repo config'inden üretiliyor. Küçük ama
dosyayı okuyan birini yanlış yere gönderiyordu.

### 13. Uyarıları CI'ya taşıdım — "yeşil" yeterli bir sinyal değilmiş

Sabahki deprecation olayının asıl dersi teknik değil, **sinyal tasarımıyla** ilgiliydi:
uyarı oradaydı, ben bakmadım. Bir daha bakmayacağımı varsayıp sistemi değiştirdim.

İki yere ekledim:

**`terraform-plan.yml`** — PR yorumuna uyarı bölümü. Zaten `driftCount` diye bir sayaç
vardı (kozmetik drift gürültüsünü sayıya indiriyor); aynı kalıbı uyarılara uyguladım.
Aynı uyarı her kaynak örneği için tekrar ettiğinden başlığa göre tekilleştirip kaç kez
geçtiğini yazıyorum.

**`terraform-apply.yml`** — burada yorum yazacak bir PR yok (main'e push'ta çalışıyor),
uyarılar yalnızca Actions log'unda kalıyordu. `::warning::` annotation'ı + step summary
ekledim. Annotation run sayfasının en üstünde çıkıyor, yani log açmaya gerek kalmıyor.
`if: always()` koydum — apply *başarısız* olduğunda uyarılar daha da değerli.

**Yazarken iki şey öğrendim:**

1. **`grep -P` kullanamadım.** Terraform uyarı satırları `│` ile başlıyor, bu çok baytlı
   bir karakter ve PCRE modu bazı locale'lerde *"supports only unibyte and UTF-8 locales"*
   diye reddediyor — yerelde tam olarak bu hatayı aldım. Runner'da çalışıp yerelde
   çalışmayan (ya da tersi) bir şey yazmak istemedim, `awk`'a geçtim. Locale'den bağımsız.

2. **Asıl sorun sandığımdan büyükmüş.** Uyarıları ayrı çıkarmanın ikinci bir sebebi var:
   yorumda `MAX_LOG = 55000` kısaltması var ve **uyarılar çıktının sonunda duruyor.**
   Yani uzun bir planda uyarılar yorumdan tamamen düşüyordu. Sadece "gözden kaçıyor"
   değil, bazı durumlarda **hiç görünmüyormuş**.

Dört senaryoyu fixture ile test ettim: temiz plan, uyarılı plan, destroy + uyarı,
apply çıktısı hiç yok. Test ederken üretilen çıktı bugünün özeti gibiydi:

```
### 📊 Plan Summary
✅ **No changes.** Infrastructure matches the configuration.
### ⚠️ 3 uyarı — 2 farklı
```

"Hiçbir şey değişmiyor" ve "üç uyarı var" aynı anda doğru olabiliyor. Sabah tam olarak
bunu kaçırdım.

### 9. Bugünün en büyük sorusu: geçmişi kim koruyacak?

Org varsayılanlarını açarken fark ettiğim şey, aslında bugünün en önemli bulgusu:
bu ayarlar `*_for_new_repositories`. **Yalnızca geleceği koruyorlar.**

Ve aynı gün `vulnerability_alerts`'in bu repo'da kapalı olduğunu gördük — elle açılmış
tek repo, ve tam da denetlenmeyen tek repo oydu. İkisi aynı madalyonun yüzleri.

Genel hâli daha rahatsız edici: org'a **dışarıdan gelen** bir repo (transfer, eski proje,
satın alma) config'i tanımıyor. Bugün ne olur?

- Terraform onu görmez, yönetmez, raporlamaz
- Güvenlik varsayılanları uygulanmaz (onlar yalnızca yeni repo'lara)
- Bypass raporunda çıkmaz (rapor config'ten üretiliyor)
- **Ve kimse fark etmez, çünkü bakılacak bir yer yok**

Yani org'a sessizce bir repo girip hiçbir kontrolün kapsamına girmeden durabilir. Bu,
projenin çözdüğünü iddia ettiği problemin ta kendisi — sadece bir seviye yukarıda.

Ozan iki yaklaşım attı: repo gelmeden config çıkaran bir script, ya da otomatik algılayan
bir şey. Şimdilik konuşmadık, ROADMAP'e tartışma notu olarak yazdım. Ama not alırken üç
şeyin karıştırılmaması gerektiğini fark ettim:

- **Keşif** — repo'nun bugünkü ayarları ne?
- **Uzlaştırma** — bunların hangisini kabul edip hangisini ezeceğiz?
- **Kapsama** — yönetim dışı bir repo'yu kim, ne sıklıkta fark edecek?

Script yaklaşımı ilk ikisini, otomatik algılama üçüncüsünü çözüyor. **Biri diğerinin
yerine geçmiyor**; muhtemelen ikisi de gerekiyor.

Bir de şunu yazdım çünkü kendimi tekrar ederken buldum: keşif kısmı için sıfırdan araç
yazmak gerekmeyebilir — **`import` bloğu bu işin yarısını zaten yapıyor.** Bugün org
ayarlarında tam olarak bunu kullandık ve dört bulgu çıkardı. Aynı teknik repo başına
uygulanabilir.

Ve kapsama kısmı için verdiğim cevap, `enforce_admins` için verdiğimizin aynısı:
**kapatamıyorsan en azından gör.** Bu projede aynı felsefeye üçüncü kez varıyoruz —
sanırım bu artık bir tesadüf değil, projenin omurgası.

**Günün dersi:** `import` bloğunu buraya bir "state'e alma" mekaniği olarak kullandım ama
asıl işi **keşif** oldu. Terraform'a hiç bağlanmamış bir kaynağı import edip plan almak,
o kaynağın gerçek durumunu okumanın en ucuz yolu — hem de hiçbir şeyi değiştirmeden.
Org ayarlarına aylardır bakmamışız; bir plan çıktısı dört madde çıkardı (güvenlik
varsayılanları, public repo açma, fatura e-postası, ve eksik App izni).

---

## 2026-08-17 — Testlerin ret tarafı, `develop`'un kalkması, ve Faz 8'de fikir değiştirmem

### Force push testi — Karar E sandığımdan geniş çıktı

`enforce_admins = false`'u "PR zorunluluğu ve review kurallarından muafiyet" diye
anlıyordum. Test bunu genişletti: **force push ve dal silme de muafiyetin içindeymiş.**

Sonuç role göre net ayrıştı — `developer` hesabıyla force push **reddedildi**, `mentor`
hesabıyla **geçti**. Yani mentörün elinde sadece "onay beklemeden merge et" değil,
"tarihi yeniden yaz" yetkisi de var. Karar E'yi verirken bunu hesaba katmamıştım.
Kararı değiştirmiyorum (gerekçe aynı: mentör hızlı karar alabilmeli), ama artık
`rbac-and-permissions.md` ve `runbook.md` bu kapsamı açıkça yazıyor. Bir muafiyetin ne
kadar geniş olduğunu **kararı verirken değil, test ederken** öğrenmek iyi bir his değil.

### Drift demosu çalıştı

`pilot-intern-web` `develop` korumasında onay sayısını arayüzden 1 → 2 yaptım. `plan`
bunu gerçek bir `~ update in-place` olarak gösterdi ve — asıl önemlisi — **kozmetik drift
gürültüsünden ayırt edilebiliyordu**. `apply` geri aldı. Sunumdaki drift demosu bu olacak;
uydurma bir senaryo değil, gerçekten yapılmış bir arayüz değişikliği.

### `develop`'u sildim — ve öğrendiğim şey

`develop`'u silmek Faz 8'in içinde planlıydı. Faz 8 ertelenince bu repo için beklemenin
anlamı kalmadı: `develop` → `main` boşluğunu elle yönetmek (merge edilen config'in
canlıda olmaması) süresiz sürecekti.

Silerken şunu öğrendim: **branch protection kuralı dala değil, isim desenine bağlı.**
Yani dalı silsem bile kural durur ve `develop` bir gün yeniden açılırsa kendiliğinden
devreye girer. Config'den de kaldırmak gerekiyordu. Ama modülde bunun yolu yoktu — bir
dalı `defaults`'tan **kaldırmanın** karşılığı yazılmamıştı. `protected_branches: { develop: null }`
ile bir kaldırma escape hatch'i ekledim: `null` yazılırsa dal `for_each`'ten düşüyor.
Bu olmasaydı kural sessizce yeniden yaratılacaktı.

Bunu `runbook.md`'ye üç durumluk bir tablo olarak yazdım (arayüzden değiştirildi /
arayüzden silindi / config'den kaldırılmak isteniyor), çünkü üçünün cevabı farklı ve
ilk ikisini karıştırmak kolay.

### Faz 8'i ertelemek — Ozan haklıydı, ben değildim

Faz 8'i (repo topolojisi ayrımı) "Medine yazma moduna geçmeden bitmeli" diye Hafta 5'e
koymuştum. Ozan itiraz etti: **tek mentör benim, split'in koruduğu sınırın karşı tarafında
kimse yok.** Yani bugün yapılırsa sıfır güvenlik kazandırıp gerçek maliyet getiriyor —
her config alanı iki PR olur, ve **henüz canlı doğrulanmamış testler iki repoya bölünür.**

Haklı. Üstelik kendi argümanımı tutarsız uygulamışım: Faz 2'yi "motor ve config şeması
birlikte evriliyor, split'ten önce dondurulmalı" diye öne almıştım — aynı argüman Faz 6
için de geçerliyken onu split'in arkasına koymuşum. Faz 6 tek repoda, bugünkü test
zemininde bitirilebilir.

Faz 8 artık takvime değil **koşula** bağlı: dashboard yazma modu ayrılırken ya da demo
çıkarılırken. `release.yml`'ı da oraya bağladım — o gün motor repo zaten tag ile
sürümleniyor olacak, yani semver otomasyonu gerçek bir işe bağlanacak. Bugün açarsak üç
pilot repoda karşılığı olmayan tag'ler üretir.

---

## 2026-08-16 (akşam) — Faz 2 canlıda, ve `main`'in aylardır koptuğunu bugün öğrendim

Sabahki erişim düzeltmesinden sonra şablon dağıtımına (Faz 2) geçtim. İş bitti, 27 dosya
üç repoya indi, `ci/test` ilk kez yeşil yandı. Ama günün asıl bulgusu bu değil — aşağıda.

### Faz 2 — dört mayın

Kod yazmadan önce zemini taradım, iyi ki taramışım. Dördü de plan ortasında patlayacak
cinstendi:

1. **`templates/` klasörü HCP'ye hiç yüklenmiyormuş.** Workflow'lar `working-directory:
   terraform` ile çalışıyor ve HCP yalnızca çalışma dizinini paketliyor. Bu, `config/` ile
   yaşadığım tuzağın **birebir aynısı** — o zaman lokalde `validate` geçmiş, uzakta `plan`
   patlamıştı. `terraform/templates/` altına taşıdım, 20 doküman referansını düzelttim.
   Tarihsel kayıtlara (bu günlük, `implementation plan.md`) dokunmadım; o gün öyleydi.

2. **`ci.yml` içinde 11 tane `${{ }}` var.** `templatefile()` bunları kendi sözdizimi
   sanıp ayrıştırma hatası verirdi. `file()` kullandım — şablonlar birebir kopyalanıyor,
   değişken enjekte edilmiyor. Bedeli: workflow'a repo bazında değer geçemiyoruz. Bugün
   ihtiyaç yok, gerekirse `$${{` escape'i şart.

3. **`lifecycle` bloğu dinamik olamıyor.** `seed` modu `ignore_changes = [content]`
   gerektiriyor ama `lifecycle` değişken alamaz, `for_each` ile moda göre seçilemez. Yani
   `strict`/`seed` ayrımını tek kaynakta yapmanın yolu yok. İki ayrı kaynak yazdım ve
   sebebini kodun içine yazdım — yoksa biri "bunu birleştireyim" der.

4. **App'in `workflows` izni yokmuş.** GitHub `.github/workflows/` altına yazmayı ayrı bir
   izne bağlamış; `contents: write` yetmiyor. Label'lardaki `issues: write` 403'ünün aynısı.
   İzni verdim, `app-manifest.json`'a ve kurulum README'sine ekledim — README'deki izin
   tablosunda `Issues` bile yokmuş, o da sonradan elle eklenip yazılmamış.

**Tutarlılık kilidi eklendi:** bir dal `ci/test` istiyorsa `ci` workflow'u dağıtılmak
zorunda, yoksa modül `precondition` ile plan aşamasında hata veriyor. Test ettim,
`workflows: []` yapınca durdu ve repo + dal adını söyledi. Bugün yaşadığımız blokajın bir
daha kurulamaması için.

### `ci/test` yeşil — Hafta 2'deki bir kararın karşılığını aldım

`ci.yml`'i yazarken toplayıcı job'u, dil job'ları `skipped` dönse bile başarı sayacak
biçimde kurmuştum. Gerekçem *"yoksa tek dilli repoda check hiç raporlanmaz"*dı. Bu repoda
hiçbir dil manifesti yok — dört job da atlandı, `ci/test` yine de yeşil raporladı.

O karar olmasaydı bu PR merge edilemezdi. Kendi kendine referans veren bir doğrulama oldu:
Hafta 2'de yazdığım gerekçe, Hafta 5'te tam olarak öngördüğü durumda işe yaradı.

### Asıl bulgu — `main` aylardır canlıdan kopmuş

Live test'i planlarken dalların durumuna baktım ve donakaldım:

- `main`, `develop`'ın **24 commit gerisinde**
- `main`'de `terraform/` kökünde **yalnızca `modules/`** var — `main.tf`, `repositories.tf`,
  `config/`, hiçbiri yok
- `terraform-apply.yml` yazıldığından beri **hiç çalışmamış**

Yani apply workflow'u aylardır sessizce bekliyordu ve **çalışsaydı yıkıcı olacaktı.**
`develop → main` merge'ünü, şablon işi daha `develop`'a inmeden yapsaydım apply eski kodla
koşacak ve: `emre_admin`'i yeniden yaratacak (Emre `platform-admins`'e geri dönerdi),
`github_membership` kayıtlarını ve 27 şablon dosyasını silecekti.

Doğru sırayı (`feat → develop`, sonra `develop → main`) bilerek uyguladım, apply `0 destroy`
ile geçti. Ama fark etmeseydim tek bir merge'le günlerin işini geri alacaktım.

**Bu, Karar F'nin (`develop` kaldırılsın) gerekçesine bugüne kadarki en güçlü kanıt.** İki
dallı akış, apply'ı yalnızca `main`'e bağlayınca kod ile canlının **aylarca ayrışmasına**
izin verdi ve kimse fark etmedi. `develop`'a merge edilen her şey "yapıldı" görünüyordu;
canlıda karşılığı yoktu. Rapora Bölüm 7.8 olarak yazdım.

### Kendime not

Sabah `terraform-plan.yml` için *"tamamlandı işaretlemeden önce çalıştığını görmek lazım"*
diye yazmıştım. Akşam aynı dersin daha büyüğünü aldım: **bir workflow'un var olması,
çalıştığı anlamına gelmiyor; çalışması da doğru şeyi yapacağı anlamına gelmiyor.** Faz 3'ü
"tamamlandı" işaretlemiştim — hem dosya bozuktu hem de arkasındaki dal aylardır boştu.

### Medine eklendi

`config/repositories/Tidyorg.yml` içine bir satır: `medine2906`,
`developer`. Org daveti otomatik gitti — `onboarding.md`'de anlattığımız akışın **ilk
gerçek kullanımı** oldu, kimse elle davet göndermedi. Org rolünü `org-membership.tf` ile
`member`a da sabitledim; varsayılana güvenmek ile beyan etmek aynı şey değil.

Yol üstünde kendi tutarsızlığımı da düzelttim: `paitblack`'e `roles: [developer]` yazmıştım,
sonra "`people` bölümüne repo kapsamlı rol yazılmaz" kuralını koymuştum. O satır kalsaydı
tam da dokümante ettiğim tuzağın tohumu olurdu.

---

## 2026-08-16 — Direct push yasağı "çalışmadı", meğer çalışıyormuş

15'inin gecesi başlayıp bugüne sarkan bir iş. Emre projeden ayrılmışken hazır fırsat
varken direct push yasağını test etmesini istedim. **Push geçti.**

İlk düşüncem "kural bozuk" oldu. Değilmiş. Kural doğruydu, **kuralın kime uygulandığı
görünmüyordu.**

### Neden geçti — tek hata değil, üç sebep üst üste

1. Emre `platform-admins` takımındaydı. O takım `org_admin_team`, yani
   `head-of-engineering` rolünün taşıyıcısı, ve modül ona **her repoda admin** veriyor.
   Config'de `developers: [paitblack]` yazması hiçbir şey ifade etmiyordu — GitHub yetkiyi
   toplayıp en yükseğini uyguluyor, `push` ile `admin` yan yana gelince `admin` kazanıyor.
2. `enforce_admins = false` o admin'i dokunulmaz yapıyordu. Bu ayarı ben bilerek kapalı
   bırakmıştım (mentörler push atabilsin diye) ama "mentör" derken kastettiğim ile
   pratikte kapsadığı aynı şey değilmiş.
3. Üstüne `push_allowed_roles: [mentor, head-of-engineering]` onu allowlist'e ayrıca
   yazıyordu. Yani birinci sebebi düzeltsem bile bu tek başına yeterdi.

### Kök sebep — bunu yazmam lazım

GitHub'da yetkinin **iki bağımsız düzlemi** var: org düzlemi ve repo düzlemi. Bizim config
sadece repo düzlemini modelliyordu.

`config/repositories/*.yml` repo düzlemini yönetiyor, güzel. Ama `head-of-engineering`
ataması config'de değil, elle yazılmış HCL'de (`team-memberships.tf`) duruyordu. Yani
**org düzlemindeki en güçlü rol, veri katmanında hiç görünmüyordu.** `people` bölümünde
`org_role: member` yazıyordu ama onu da kimse okumuyor.

İki kaynak, sessiz çelişki. Config'e bakıp "Emre developer" diyordum, gerçek
"Emre head-of-engineering"di.

Bu, projenin kendi iddiasının ihlaliydi: **"kim" sorusunun cevabı daima veri katmanında
olmalı.** Bir atama `.tf` içine yazıldığı anda config yalan söylemeye başlıyor.

### Yapılan

- `github_team_membership.emre_admin` kaldırıldı — `platform-admins` üyeliği bitti
- `terraform/org-membership.tf` eklendi — org rolü `member`a **beyana bağlandı**.
  Takımdan çıkarmak tek başına yetmezdi: org owner branch protection dahil her şeyi ezer.
  `downgrade_on_destroy = true` koydum, kaynak koddan kalkarsa org'dan atılmaz.
  `uslanozan` bilerek yönetim dışında — tek org owner'ı Terraform'a bağlamak lockout riski.
- Repo tarafında değişiklik gerekmedi; üç repoda da zaten `developers: [paitblack]`.
- Apply: **1 added, 0 changed, 1 destroyed.** Doğrulama planı `No changes`.

**Yan tespit:** silinen üyeliğin GitHub'daki gerçek rolü `member`'dı, kodda `maintainer`
yazıyordu. O üyelik bir ara arayüzden elle değiştirilmiş. Drift'in bir örneği daha.

### En sevdiğim kısım — ret tarafı ilk kez doğrulandı

Rapordaki Bölüm 6.3 aylardır boştu. Sebebi bendim: bu org'da hem mentörüm hem
`platform-admins` üyesiyim hem owner'ım, dolayısıyla kuralların **engelleme** tarafını
test edemiyordum. `TODO.md`'ye "ikinci bir hesap lazım" diye yazmıştım.

Emre'nin indirilmesi o hesabı yarattı. Aynı push tekrar denendi:

```
remote: error: GH006: Protected branch update failed for refs/heads/develop.
remote: - Changes must be made through a pull request.
remote: - Required status check "ci/test" is expected.
remote: - You're not authorized to push to this branch.
```

Üçüncü satır önemli: **`restrict_pushes` free plan + public repo'da fiilen zorlanıyor.**
Hafta 2'de "plan aşamasında doğrulanamıyor, apply'da patlarsa `push_allowed_roles`
boşaltılacak" diye açık madde bırakmıştım — gerek kalmadı, olumlu kapandı.

PR tarafı da beklendiği gibi: "Review required", "Merging is blocked", kullanıcı adının
yanında `Member` rozeti. Ekran görüntüleri `pilot-verification.md` Bölüm 6.3–6.4'e işlendi.

6.2 ile 6.3'ü yan yana koyunca güzel duruyor: aynı dal, aynı kural, farklı rol. Mentör
"kurallar bypass ediliyor" uyarısıyla geçiyor, developer `GH006` ile duruyor. Sunumda bunu
kullanacağım.

### Bedeli — `ci/test` blokajı görünür oldu

Aynı ekranda `ci/test · Expected — Waiting for status to be reported` satırı `Required`
etiketiyle duruyor. Bu check hiçbir repoda üretilmiyor (`templates/` hâlâ atıl), yani
**developer onay alsa bile PR'ı merge edemez.**

Bugüne kadar fark edilmemesinin sebebi yine bendim: admin bypass'ıyla geçiyordum. Normal
developer akışı ilk kez devreye girince ortaya çıktı. `TODO.md`'de bu bağımlılığı zaten
yazmışım ("`workflows` içinde `ci` yoksa `require_status_checks` da boşaltılmalı") ama
teorik bir uyarı sanıyordum. Değilmiş.

Şimdilik dokunmama kararı verdim — kalıcı çözüm Faz 2, şablon dağıtımı.

### `enforce_admins` — önerim reddedildi, doğru bulundu

`main` için `true` yapmayı önerdim. Reddedildi: mentörler ve üstü her zaman hızlı karar
alabilmeli. Kabul ediyorum, ama bunu **bilinçli taviz** olarak dokümana yazdım ki altı ay
sonra "burası neden açık" diye sorulduğunda cevabı olsun.

Uygulasaydık iki tuzak vardı, ikisini de önceden yakaladım:
1. `ci/test` karşılıksızken `enforce_admins = true` demek **herkesin** merge yolunu
   kapatmak demekti — ben dahil.
2. Modül CODEOWNERS'ı default branch'e App kimliğiyle yazıyor ve bunu bugün admin
   muafiyetiyle yapıyor. `true` olsaydı App'i `push_allowances`'a eklemek zorundaydık,
   yoksa GitOps döngüsü kendi kendini kilitlerdi.

Kararın sonucu şu: muafiyet kalıcıysa geriye tek kontrol olarak **görünürlük** kalıyor.
"Şu an kim bypass edebiliyor?" sorusunun cevabı bugün ancak `.tf` okunarak bulunuyor —
olayın fark edilmeme sebebi de tam olarak bu. Bir output olarak yazılması artık "güzel
olurdu" değil, gerekli.

### Kendime iki ders

**1. Yazdığım raporu okumamışım.** `default_repository_permission` değerini bilmiyorum
diye açık madde yazdım. Meğer cevap kendi raporumun içindeymiş —
`04-collaborators-teams.png` ekran görüntüsünde **"Base role: Read"** yazıyor. Yazma
deliği yok ama izolasyon da yok: yeni gelen bir stajyer ilk günden tüm repo'ları görür.
`None` olmalı mı, karar vermem lazım.

**2. "Tamamlandı" işaretlemeden önce çalıştığını görmek lazım.** `tasks-ozan.md`'de Faz 3'ü
tamamlandı diye işaretlemişim ama `terraform-plan.yml` **bir kez bile çalışmamış** —
91-109. satırlar `script: |` blok skalerinin dışına düşmüş, dosya YAML olarak geçersiz.
`terraform-apply.yml` temiz, sorun sadece plan'da. Bu, Bölüm 6'yı bilerek "doğrulanmadı"
bırakma disiplinimin kod tarafında uygulanmamış hâli.

### `rbac-and-permissions.md` baştan yazıldı

Rolleri konuşurken karıştığı ortaya çıktı — haklıymış. Dokümana bakınca sebebi gördüm:
hem `develop`'taki hem `docs/engineering-standards-fixes` branch'indeki sürüm hâlâ
**silinmiş dokuz takımı** (`core-engineering`, `tech-leads`, `interns-2026`,
`backend-team`…) anlatıyor ve onboarding'i `team-memberships.tf` üzerinden tarif ediyor.
Günlüğüme "rbac'ı baştan yazdım" diye not düşmüşüm ama o yazı bir yere commit edilmemiş.

Baştan yazdım, dört mermaid diyagramla: iki düzlem, etkin yetki akışı (üç muafiyet
kapısıyla birlikte), dosya haritası, stajyer senaryosu.

En faydalı bulduğum bölüm en başa koyduğum tespit: **"rol" kelimesi beş ayrı şeyi
anlatıyor.** Rol tanımı (`roles:` bloğu — bir sözlük), org rolü (owner/member), org
kapsamlı rol (head-of-engineering), repo rolü (mentor/developer), rol etiketi
(backend/frontend — bugün yok ve geri gelirse **yetki taşımamalı**). En sık karışan ikisi
birinci ile dördüncü: `roles:` bloğu "developer ne demek" der, *kimin* developer olduğunu
repo dosyaları söyler.

### Stajyer sorusu

"Yeni bir stajyeri repoya eklemek için org'a elle eklemem gerekir mi?" — Hayır.
`config/repositories/<repo>.yml` içindeki `developers:` listesine yazmak yeterli, org
daveti **otomatik** gidiyor (GitHub takıma ekleme işlemini davetle karşılıyor).

Ama kişi org üyesi **olur** — takım tabanlı erişim org üyeliği olmadan çalışmıyor. Bu
sorun değil, çünkü org üyeliği tek başına repo erişimi vermiyor… base permission `None`
olduğu sürece. Bizde `Read`. Yani stajyer bugün tüm repo'ları görebilir.

Gerçekten org'a hiç girmeden erişim istenirse tek yol *outside collaborator* — takımsız,
repo'ya doğrudan bağlı. Dış danışman için doğru araç, stajyer için değil.

### Sırada

Bugün ortaya çıkan işler, önem sırasıyla:
1. `terraform-plan.yml`'i düzelt + `TF_API_TOKEN` secret'ını doğrula — GitOps hiç
   çalışmamış, bu PR onun ilk gerçek testi olacak
2. Faz 2 — şablon dağıtımı; `ci/test` blokajını da bu çözüyor
3. Faz 6 — `people` → Terraform; `org-membership.tf` istisna dosyası o zaman kalkacak
4. Base permission kararı (`Read` → `None`?) ve bypass görünürlük raporu

---

## 2026-08-15 — Faz 0 tamamlandı, Faz 1 tamamlandı

## 2026-08-15 — Faz 0, Faz 1, Faz 3 ve Dogfooding tamamlandı

### Faz 3 — GitOps Workflows & Dogfooding (Altyapı Reposunu Yönetme)

"PR → plan → apply" GitOps döngüsünü otomatikleştirmek için iki workflow yazıldı:
1. **`.github/workflows/terraform-plan.yml`**: PR açıldığında çalışır. `terraform fmt`, `terraform validate` ve `terraform plan` çalıştırır. Plan çıktısını ayrıştırarak kaç kaynağın ekleneceğini, değiştirileceğini ve silineceğini PR yorumu olarak ekler. `destroy` sayısı 0'dan büyükse büyük bir kırmızı alarm verir.
2. **`.github/workflows/terraform-apply.yml`**: PR `main` branch'ine merge edildiğinde çalışır ve `terraform apply -auto-approve` ile canlıya yansıtır. Concurrency grubu ile paralel apply'lar engellenmiştir.

**Dogfooding (Altyapı Reposunun Kendini Yönetmesi):**
Sistemin kendini yönetmesi için `Tidyorg` reposu da config-driven yapıya dahil edildi:
1. `config/repositories/Tidyorg.yml` oluşturuldu. Default branch olarak `main` set edildi.
2. `terraform/imports.tf` dosyası oluşturuldu ve mevcut reposunun node/isim id'si üzerinden `github_repository` kaynağı modüle import edildi:
   ```hcl
   import {
     to = module.repositories["Tidyorg"].github_repository.this
     id = "Tidyorg"
   }
   ```
3. `terraform apply` çalıştırılarak reposunun branch korumaları, CODEOWNERS dosyası, label'ları ve `Tidyorg-mentors` / `-devs` takımları otomatik oluşturuldu.

---

### config/repositories/ Altında Örnek Dosya Krizi ve prevent_destroy / state rm Deneyimi

Faz 1'i yaparken taslak şemaları göstermek adına `repository.example.yml` dosyasını `config/repositories/` altına eklemiştik. Ancak `repositories.tf` içindeki `fileset()` fonksiyonu bu dizindeki her `.yml` dosyasını gerçek bir repo sandığı için, `terraform apply` sırasında `repository.example` adında bir dummy repository oluşturdu!

Bu kaza, tasarladığımız güvenlik mekanizmalarını ve sorun giderme akışlarımızı canlı olarak test etmemizi sağladı:

1. **Drift ve Yıkım Engeli (prevent_destroy):**
   Dosyayı `config/repositories/` altından `config/` dizininin bir üst seviyesine taşıdık. `terraform plan` çalıştırdığımızda, modüldeki `prevent_destroy = true` ayarından dolayı Terraform planı hata vererek durdurdu: `Error: Instance cannot be destroyed`. Bu, config'den yanlışlıkla silinen repoların yok olmasını engelleyen can kurtaran mekanizmanın çalıştığını ispatladı.
2. **Geçici Bypass ve Manuel Müdahale:**
   Dummy repoyu temizlemek için modüldeki `prevent_destroy` ayarını geçici olarak `false` yaptık.
3. **Default Branch Silme Hatası (422):**
   `apply` esnasında default branch olan `develop` silinmeye çalışıldığı için GitHub API 422 hatası verdi: `Cannot delete the default branch`.
   - **Çözüm:** Default branch'i silme kısıtını aşmak için Terraform state'inden branch kaynaklarını sildik (`terraform state rm` ile `github_branch.default[0]` ve `github_branch_default.this[0]` kaldırıldı).
   - Böylece Terraform branch silme aşamasını atlayıp doğrudan repository'nin kendisini sildi (repo silindiğinde branch'ler de otomatik yok oldu).
4. **Kurtarma Sonrası Durum:**
   `repository.example` tamamen temizlendi. Modüldeki `prevent_destroy` ayarı yeniden `true` konumuna getirilerek kilitlendi. `terraform plan` şu an temiz (`0 to add, 0 to destroy`).

---

### Faz 0 — `pilot-intern-api` modüle taşındı

`branch-protection.tf` içinde ham `github_repository` + iki `github_branch_protection`
bloğu olarak yaşayan `pilot-intern-api` reposu, `terraform state mv` ile
`module.repositories["pilot-intern-api"]` altına taşındı.

**Süreç:**
1. `config/repositories/pilot-intern-api.yml` oluşturuldu — description, language,
   mentors, developers tanımlandı.
2. `terraform plan` çalıştırıldı: **0 to destroy**, 14 to add (yeni modül kaynakları),
   1 to change. Repo silinmiyor — sadece state adresi değişecek.
3. Dört `state mv` komutu:
   - `github_repository.pilot_project` → `module.repositories["pilot-intern-api"].github_repository.this`
   - `github_branch.develop` → `module.repositories["pilot-intern-api"].github_branch.default[0]`
   - `github_branch_protection.main_protection` → `.github_branch_protection.this["main"]`
   - `github_branch_protection.develop_protection` → `.github_branch_protection.this["develop"]`
   PowerShell `[` ve `"` karakterlerini yiyor; `cmd /c` ile çözüldü.
4. `branch-protection.tf` boşaltıldı (açıklayıcı yorum bırakıldı).
5. Apply: takımlar (`pilot-intern-api-mentors`, `-devs`), üyelikler, CODEOWNERS,
   label'lar, branch protection güncellendi. **0 destroyed.**

**Ek sorun — labels 403:**
`github_issue_labels` kaynağı GitHub'ın default `bug` label'ını silerken
`403 Resource not accessible by integration` aldı. Sebep: `tidyorg-infra-bot`
App'ine `issues` izni verilmemişti. Kullanıcı GitHub App ayarlarından
`Issues: Read and write` ekledi, org installation'ı onayladı.
İkinci apply başarılı: **1 added, 2 changed, 0 destroyed.**

`app-manifest.json`'a `"issues": "write"` eklendi — ileride App yeniden
oluşturulursa referans olarak kalsın.

Artık her iki repo da aynı modülden, aynı config yapısından yönetiliyor.
Tek yönetim biçimi, sıfır çelişki.

---

### Faz 1 — Config repo başına dosyaya bölündü

`organization.yml`'daki `repositories:` bölümü kaldırıldı.
Her repo kendi dosyasına taşındı:

```
terraform/config/
├── organization.yml              # Yalnızca org ayarları: roller, defaults, people
└── repositories/
    ├── pilot-intern-web.yml
    └── pilot-intern-api.yml
```

`repositories.tf` `fileset()` ile yeniden yazıldı:
```hcl
repos = {
  for f in fileset("${path.module}/config/repositories", "*.yml") :
  trimsuffix(f, ".yml") => yamldecode(file(...))
}
```

Dosya adı = repo adı. Yeni repo eklemek için `organization.yml`'a dokunulmaz;
`config/repositories/<isim>.yml` oluşturulur.

`terraform validate` temiz. `terraform plan`: `0 to add, 2 to change, 0 to destroy`.
2 change kalıcı drift (team membership role bounce) — refactoring'le ilgisiz,
önceden de vardı. Davranış değişmedi → refactor başarılı.

**Neden önemli:** Dashboard aynı anda iki farklı reponun config dosyasını
güncellemek isterse tek dosyada conflict yaşanmazdı, artık tamamen bağımsız.
Her mentör yalnızca kendi repo'sunun dosyasına dokunur.

---

## 2026-08-15 — Emre ayrıldı, Medine geldi, GitHub App geçişi tamamlandı


### Ekip değişikliği ve görev yeniden dağılımı

**Emre projeden ayrıldı.** Emre'nin listesindeki dashboard harici işler (`tasks-ozan.md`'ye)
ve dashboard kısmı (`tasks-medine.md`'ye) taşındı. `tasks-emre.md` deprecated işaretlendi.

**Medine projeye katıldı.** 
`tasks-medine.md` sıfırdan yazıldı: Terraform'dan bağımsız, sadece `dashboard/` klasörünü kapsıyor.

Dashboard mimarisini netleştirdim: dashboard **Terraform'u doğrudan çağırmıyor**.
`terraform/config/repositories/*.yml` dosyalarını GitHub Contents API üzerinden güncelliyor,
bu bir PR açıyor, PR merge edilince GitOps workflow Terraform'u tetikliyor. Backend yok —
kullanıcı GitHub Device Flow ile kendi token'ıyla giriş yapıyor.

Ozan'ın yeni görev listesine Emre'den devralan iki faz eklendi:
- Faz 3: GitOps workflow'ları (`terraform-plan.yml`, `terraform-apply.yml`)
- Faz 4: GitHub App kurulumu + dashboard için OAuth App

### GitHub App geçişi — Faz 4 tamamlandı

Bugüne kadar Terraform, Emre'nin kişisel token'ıyla çalışıyordu. Token silindi/geçersizdi,
sistem durmuştu. Token'ı geçici olarak yenilemek yerine direkt GitHub App'e geçmeye karar verdim
— zaten roadmap'te vardı, köprü yol yapmaya gerek yok.

**`tidyorg-infra-bot` GitHub App oluşturuldu.**

| Alan | Değer |
| :--- | :--- |
| App ID | `4600282` |
| Installation ID | `153844579` |
| İzinler | Administration + Contents (write), Metadata (read), Members (write) |

Private key üretildi, indirilen `.pem` dosyası PowerShell scriptiyle tek satıra çevrildi
(RSA özel anahtarının satır sonları `\n` olarak encode edildi), HCP Terraform workspace'ine
`github_app_pem_file` değişkeni olarak girildi. Sensitive olarak işaretlendi.

**`terraform/main.tf` güncellendi:** `token = var.github_token` kaldırıldı, yerine:

```hcl
app_auth {
  id              = var.github_app_id
  installation_id = var.github_app_installation_id
  pem_file        = var.github_app_pem_file
}
```

**`terraform/variables.tf` güncellendi:** `github_token` değişkeni silindi, üç yeni değişken eklendi.

HCP Terraform'a üç Terraform category değişkeni girildi:
`github_app_id`, `github_app_installation_id`, `github_app_pem_file`.
İlk denemede `TF_VAR_` prefix'li girdim — bu prefix yalnızca "Environment variable"
kategorisinde geçerli, "terraform" kategorisinde variable adının kendisi oluyor ve
Terraform'da tanımlı olmadığı için uyarı veriyor. Prefix kaldırılınca temizlendi.

**İlk apply başarılı.** Gerçek değişiklik: `paitblack`'in `pilot-intern-web-devs`
takımındaki rolü `maintainer → member`. Bu drift muhtemelen elle yapılmış bir değişiklikten
kaynaklanıyordu — tam olarak Terraform'un var olma sebebi.

### Dokümantasyon

`integrations/github-app/README.md` yazıldı — 8 adımlı kurulum kılavuzu:
app oluşturma, private key üretme, PEM formatı dönüşümü, installation ID bulma,
HCP değişkenleri, provider konfigürasyonu, test adımları, sorun giderme.

`integrations/github-app/app-manifest.json` eklendi — gelecekte app'i yeniden
oluşturmak gerekirse referans manifest.

### Terraform login nüansı

`terraform login` iki farklı kimlik doğrulama katmanı:
1. **HCP Terraform CLI token** — `credentials.tfrc.json`'a kaydedilir, laptop başına bir kez yapılır
2. **GitHub App PEM** — HCP workspace'inde env variable, her `plan/apply`'da otomatik kullanılır

İkisi birbirine karışınca zaman harcandı. Token yapıştırma sırası da önemli:
önce `yes`, sonra token — aynı prompt'ta birini atlayınca login iptal oluyor.

### Drift uyarıları hakkında

Her `plan`'da onlarca `Drift detected (update)` satırı çıkıyor ama bunların hiçbiri
gerçek değişikliğe yol açmıyor. GitHub API bazı alanları read back ettiğinde provider'ın
gönderdiğinden farklı format dönüyor (ör: takım description boşluk normalleşmesi).
Provider bunu kayıt sayıyor ama apply sırasında fark görmeyince geçiyor. Endişe vermiyor,
ama `plan` çıktısını okurken gerçek değişiklikler arasında kaybolabiliyor — dikkatli olmak lazım.

---



### Yapılanlar

**Apply çalıştırıldı — sistem canlıya çıktı.** `pilot-intern-web` repo'su tek bir YAML
satırından doğdu. Config'de sadece açıklama, dil, mentör ve developer yazıyor; geri kalan
her şey `defaults`'tan miras alındı.

İlk apply **yarıda kaldı**: 23 kaynak oluştu, 2 label hata verdi. Panik yapmadım çünkü
Terraform oluşanları geri almıyor, state'e yazıp duruyor. Düzeltip tekrar apply demek
yetti. **Yakınsama** dedikleri şeyin canlı örneğini görmüş oldum — aynı komutu kaç kez
çalıştırırsan çalıştır sonuç aynı yere geliyor.

### Bulduğum iki hata

**1. Label çakışması (422 already_exists).** GitHub yeni repo açarken kendi varsayılan
label'larını da oluşturuyor (`good first issue`, `help wanted`, `bug`, `enhancement`...).
Tekil `github_issue_label` kaynağı her label için "oluştur" çağrısı yaptığından bu
isimlere çarptı.

Çözüm: çoğul `github_issue_labels` kaynağına geçtim. Bu kaynak repo'nun label setinin
**tamamını** yönetiyor — mevcutları güncelliyor, eksikleri ekliyor, listede olmayanları
siliyor. Yan fayda: GitHub'ın varsayılan label çöplüğü de temizleniyor. Zaten planımdaki
madde de çoğul kaynağı söylüyormuş, tekil yazmam benim hatamdı.

Geçişte `removed { lifecycle { destroy = false } }` bloğunu kullandım: ilk apply'da oluşan
11 label state'ten çıktı ama GitHub'dan silinmedi, çoğul kaynak onları devraldı. Gereksiz
bir sil-yarat turu yaşanmadı. Bu blok Terraform 1.7 ile gelmiş; eskiden `terraform state rm`
komutunu elle çalıştırmak gerekiyormuş. Artık kod içinde beyan edilebildiği için PR'da
görünüyor — GitOps akışıyla çok daha uyumlu.

**2. Kalıcı drift — push izni hiç yerleşmiyordu.** Apply başarılı olmasına rağmen her
`plan` aynı iki branch protection için "değişecek" diyordu. Detaya bakınca gördüm:
`push_allowances` listesinden `your-org/platform-admins` sürekli geri düşüyor.

Sebep: **GitHub, bir takımı push izin listesine ancak o takımın repo'ya erişimi varsa
kabul ediyor.** Erişimi yoksa isteği hata vermeden yok sayıyor. Modül `platform-admins`
takımına hiçbir repo yetkisi vermiyordu. `head-of-engineering` rolü ACCESS-MODEL'de
`scope: organization` ve tüm repo'larda admin diye tanımlıydı ama modül bunu
uygulamıyordu.

Çözüm: modüle `data "github_team"` + `github_team_repository.org_admins` ekledim.

**Bu ikincisi beni gerçekten etkiledi.** GitHub bazı istekleri sessizce yok sayıyor.
Terraform olmasaydı "push kısıtı koydum" sanıp devam edecektik ve kimse fark etmeyecekti.
Drift tespiti bunu ortaya çıkardı — beyan temelli yönetimin en somut faydası bu.
Sunumda bu örneği kullanacağım.

### Doğrulama

GitHub arayüzünden madde madde kontrol ettim, ekran görüntülerini aldım:
[pilot-verification.md](../pilot-verification.md).

Default branch `develop`, CODEOWNERS geçerli (GitHub'ın yeşil "valid" bandı), tam 13 label,
üç takım doğru rollerle, `main` 2 onay + code owner, `develop` 1 onay. İki koruma
ekranının yan yana görünmesi hoşuma gitti — aynı modülden çıkan iki farklı katılık,
tasarımın kanıtı gibi duruyor.

### Fark ettiğim bir şey

CODEOWNERS commit'i GitHub'da **`paitblack`** adına görünüyor. Yani HCP workspace'indeki
`TF_VAR_github_token` Emre'nin kişisel token'ı ve Terraform'un yaptığı her yazma işlemi
onun adına kaydediliyor. Otomasyonun yaptığı ile insanın yaptığı ayırt edilemiyor, Emre
ayrılırsa her şey durur, denetim izi yanıltıcı oluyor.

Hafta 1'de yazdığım [github-auth-strategy.md](../notes/github-auth-strategy.md) notu o
zaman teorik bir tavsiyeydi; şimdi ekran görüntüsüyle gösterilebilir bir sorun.

### Test edemediğim şey — ve nedeni

Kuralların **engellediğini** test edemedim. Sebebi kendimdim: bu repo'da hem
`pilot-intern-web-mentors` hem `platform-admins` üyesiyim, ayrıca org owner'ım. Config'de
`enforce_admins: false` olduğu için kurallar bana uygulanmıyor — ki bu bilinçli bir
tercihti, mentörler korumalı dala push atabilsin diye.

Yani benim push atabiliyor olmam kuralın çalışmadığını göstermiyor, tam tersini gösteriyor.
Engellenme davranışını doğrulamak için yalnızca `developer` rolüne sahip bir hesap gerekiyor.
Bunu ve diğer bekleyen işleri unutmamak için kök dizine [TODO.md](../../TODO.md) açtım.

Kendi kendime not: yarım kalan bir testi "doğrulandı" diye yazmamak lazım. Rapordaki
Bölüm 6'yı bilerek "henüz doğrulanmayanlar" olarak bıraktım.

### Hafta 3 — dokümantasyon

Yedi doküman yazıldı. Dördü plandaki, üçü konuştuğumuz kararlardan doğdu.

**[workflow-guide.md](../workflow-guide.md)** master doküman. Planda tek bir akış vardı,
ben **iki** akış yazdım: kod akışı (developer'ın günlük döngüsü) ve yetki akışı
(config → PR → plan → apply). İkincisi plan yazıldığında yoktu ama artık projenin asıl
iddiası o. Sunumun omurgası bu diyagram olacak.

**[config-guide.md](../config-guide.md)** planda yoktu. Dashboard yazılana kadar
arayüzün yerini tutuyor, yazıldıktan sonra da onun spec'i olacak. "Sık karşılaşılan
tuzaklar" bölümüne bugün canlı yaşadığımız iki şeyi koydum: GitHub'ın istekleri sessizce
yok sayması ve arayüzden yapılan değişikliğin geri alınması.

**[onboarding.md](../onboarding.md)** — "İlk gün" listesini baştan yazdım. Plandaki
"GitHub org davetini kabul et" maddesi artık farklı çalışıyor: kimse elle davet etmiyor,
mentör config'e ekliyor. FAQ'ya gerçekten sorulacak sekiz soru koydum.

**[code-review-guide.md](../code-review-guide.md)** — Tek bir "min 2 onay" kuralı
yazmadım, çünkü artık repo'dan repo'ya değişiyor. Yorumlara `blocker:` / `öneri:` /
`soru:` / `nit:` ön eki önerdim — hangi yorumun bloke edici olduğu belirsiz kaldığında
PR gereksiz bekliyor.

**[release-process.md](../release-process.md)** — Teorik anlatım yerine yazdığımız
`release.yml`'ı adım adım açıkladım. Bir karar verdim: ayrı `CHANGELOG.md` tutulmayacak,
GitHub Release notları tek kaynak olacak. İkisini birden tutmak er geç çelişki üretir.

**[adr/004](../adr/004-config-driven-access-management.md)** — Dört alternatifi
(doğrudan API, safe-settings, GitHub native ruleset + custom properties, Backstage/Port)
gerekçeleriyle karşılaştırdım. Sunumda "piyasada bunun yapılmışı var mı" sorusu kesin
gelecek; hazır cevap olsun. Kabul ettiğimiz tavizleri ve bu kararın hangi koşullarda
yeniden değerlendirileceğini de yazdım.

**[runbook.md](../runbook.md)** — Senaryo bazlı. Offboarding'i GitHub içi / GitHub dışı
diye ikiye ayırdım, çünkü Terraform Linear'ı yönetmiyor ve bu kapsam sınırının
unutulması ciddi bir güvenlik boşluğu olur.

### Rahatsız eden bir tespit

Dokümanları bitirince fark ettim: **Emre'nin `security-policy.md`'sine yaptığım
eleştirinin aynısı benim `onboarding.md`'mde var.** "PR şablonu otomatik dolar" yazdım
ama şu an doğru değil — `templates/` klasörünün tamamı atıl, hiçbir repo'ya ulaşmıyor.
Modül yalnızca CODEOWNERS yazıyor.

Aynı standardı kendime de uygulamam lazım. Ya dokümana "henüz aktif değil" notu
düşeceğim ya da mekanizmayı kurup iddiayı doğru hale getireceğim. İkincisini tercih
ediyorum.

**GitHub tarafında kurulmayı bekleyen altı şey var:**
1. Şablon dağıtımı (issue/PR template, CONTRIBUTING, SECURITY, `.editorconfig`)
2. Workflow dağıtımı (`ci.yml`, `release.yml`, `dependabot.yml`)
3. `people` bölümü Terraform tarafından okunmuyor — org üyeliği elle yönetiliyor
4. Repo güvenlik ayarları (`vulnerability_alerts`, secret scanning)
5. GitOps döngüsü — `terraform-plan.yml` / `terraform-apply.yml` yok, apply'ı elle
   çalıştırıyorum
6. `pilot-intern-api` hâlâ modül dışında

**Araştırdığım çözüm:** Organizasyonda `.github` adında bir repo açmak. GitHub, kendi
dosyası olmayan tüm repo'lar için oradaki CONTRIBUTING, SECURITY, ISSUE_TEMPLATE ve
PULL_REQUEST_TEMPLATE dosyalarını varsayılan olarak kullanıyor. Tek repo, tüm
organizasyon; yeni açılan her repo otomatik kapsama giriyor.

Bir kısıt var: issue ve PR template'lerinin org geneli çalışması için `.github`
repo'sunun **public** olması gerekiyor (internal yetmiyor, private hiç çalışmıyor).
Biz zaten public repo'larla çalıştığımız için sorun değil.

Workflow'lar ve `.editorconfig` bu kapsamın dışında — onlar repo başına dağıtılacak,
CODEOWNERS için kullandığım `github_repository_file` mekanizmasıyla.

### `.github` fikri reddedildi

Ozan (yani ben) bunu önerdi ama kabul edilmedi: org'daki repo'ların çoğu private olacak
ve `.github` repo'sunun public olması, içindeki CONTRIBUTING/SECURITY/template dosyalarını
internete açıyor. İstenmedi.

**Yerine:** her repo'ya ayrı ayrı yazılacak. Bedeli net — bir şablonu güncellemek 40
repo'da 40 commit. Kabul edildi.

Bu arada daha büyük bir şey fark ettik: **repo'ların çoğu private olacaksa Free plan
yetmiyor.** Private repo'da branch protection ve ruleset çalışmıyor; yani kurduğumuz
modelin koruma tarafının tamamı devre dışı kalır. Team planı artık "ileride bakarız"
değil, ön koşul. Ne zaman alınacağı belli olmadığı için plan onsuz da ilerleyecek biçimde
sıralandı.

### Yol haritası ve iş bölümü

Dört haftalık plan bitti ama hedef mimariye daha varmadık. [ROADMAP.md](../../ROADMAP.md)
yazıldı: sekiz faz, Hafta 4–7'ye bölünüp iki görev dosyasına dağıtıldı. Emre organizasyon
ve kimlik tarafında (GitOps, GitHub App, dashboard), ben repo modülü ve şablonlar
tarafında. Her hafta iki iş bağımsız ilerliyor, yalnızca hafta sonunda birleşiyor.

Hafta 4'ün ilk yarısı bugün bitti: `enforce_admins` düzeltildi, kök `outputs.tf`
dolduruldu, ben `platform-admins`'e eklendim, **9 eski takım silindi**.

Silme öncesi önemli bir tespit yaptım: `platform-admins` silinemez. Bir "etiket takımı"
değil, taşıyıcı kaynak — modül `head-of-engineering` rolünü onun üzerinden uyguluyor.
Silinseydi apply patlar, mentörlerin push izni de çökerdi. Yani "hepsini silelim"
kararının teknik bir istisnası vardı ve fark edilmeseydi bugünkü drift'in aynısını
yaşayacaktık.

### Dashboard mimarisi — beklemediğim bir sadeleşme

Emre "backend'siz yazabilir miyiz, Semaphore UI gibi bir şey kullansak" diye sordu.
Semaphore uygun değil — HCP Terraform'la aynı kategoride, çalıştırma arayüzü, yetki
paneli değil. Ama sorunun kendisi beni daha iyi bir yere götürdü.

**Dashboard'un kendi token'ı olmayacak.** Kullanıcı GitHub device flow ile giriş yapacak
(`client_secret` gerektirmiyor), işlemler onun kimliğiyle yapılacak. Sonuçları:

- Barındırılacak, güvenliği sağlanacak bir sunucu yok
- Ele geçirilecek `admin:org` token'ı yok — blast radius tartışmasının tamamı düşüyor
- Yetkilendirmeyi GitHub'ın kendisi yapıyor; dashboard'a yazacağımız yetki mantığı azalıyor
- Commit'ler bot adına değil, işi yapan kişinin adına düşüyor — `paitblack` sorununun
  tam tersi

Bir de zincirleme fayda: **plan önizlemesi için HCP API'sine bağlanmaya gerek yok.**
Faz 3'teki workflow zaten `plan` çıktısını PR'a yorum olarak yazacak; dashboard onu okuyup
gösterir. Emre'nin işi bir hayli hafifledi.

Kararlar ACCESS-MODEL'e 10–16 olarak işlendi.

---

## 2026-08-07 — Emre'nin PR'ları, erişim modeli, Hafta 2 kodu

### Yapılanlar

**Terraform çalışır hale geldi.** `terraform.exe`'yi Downloads'tan `C:\Users\uslan\bin`
altına alıp kullanıcı PATH'ine ekledim. `terraform login` ile HCP token'ı alındı,
`init` → `plan` zinciri çalışıyor. İlk `plan` **No changes** verdi; Emre'nin 10 takımı,
4 üyeliği, `pilot-intern-api` repo'su ve iki branch protection kuralı canlıda ve config
ile birebir uyumlu.

**Emre'nin iki açık PR'ını inceledim.**
- `feat/branch-protection-and-org-templates` — branch protection + CODEOWNERS,
  CONTRIBUTING, SECURITY, .editorconfig
- `docs/engineering-standards` — branching strategy, commit convention, RBAC,
  security policy

Kendi görevlerimden hiçbirini yapmamış; ikisi de tamamen kendi listesindeki işler.
Ama `branch-protection.tf` içinde `pilot-intern-api` repo'sunu ham `github_repository`
bloğuyla kendisi oluşturmuş — plana göre o repo benim modülümden doğacaktı. Repo zaten
apply edilmiş durumda, yani çakışma teorik değil.

**Düzeltmeleri iki ayrı branch'te hazırladım** (worktree ile, kendi çalışma dizinimi
bozmadan):
- `docs/engineering-standards-fixes` — `rbac-and-permissions.md` yeni erişim modeline
  göre baştan yazıldı; `security-policy.md`'ye durum tablosu eklendi (olmayan korumaları
  varmış gibi anlatıyordu); `branching-strategy.md`'de `feature/` → `feat/` ve
  kapanmamış kod bloğu düzeltildi
- `feat/branch-protection-fixes` — CONTRIBUTING prefix'i, SECURITY'deki TODO,
  `variables.tf`'in eksik son satırı

`branch-protection.tf`'deki `enforce_admins = true` ayarına **dokunmadım**, sadece not
düştüm. Güvenlik davranışını gevşetmek benim tek başıma vereceğim karar değil.

**Erişim modeli kayda geçti** — [ACCESS-MODEL.md](../../ACCESS-MODEL.md). Projenin
hedefi tek pilot repo değil, dışarıdan gelen config'i girdi alıp org'daki tüm repo ve
kişiler için yetki üreten bir motor. Aktörler: head-of-engineering (rol, kişi değil),
repo başına bir mentör, many-to-many developer'lar.

**Config şeması yazıldı** — [organization.example.yml](../../terraform/config/organization.example.yml).
Tasarım ilkesi: kurallar role bağlı, kişiye değil. Kişi değiştiğinde kural metni hiç
değişmiyor, sadece atama değişiyor.

### Hafta 2 — modül ve CI

**Repository modülü yazıldı** — [modules/repository/](../../terraform/modules/repository/).
Plandan üç sapma var, hepsi erişim modelinin sonucu:
- `team_access` yerine `mentors` + `developers` + `role_permissions`; repo başına iki
  takım üretiliyor (`<repo>-mentors` admin, `<repo>-devs` push)
- `branch_protection` tek obje değil, dal başına kural veren `protected_branches` haritası
- Repo'ya `prevent_destroy` — config'den bir satır yanlışlıkla silinirse apply duruyor

Planda olmayan ama modeli çalışır kılan bir şey ekledim: **CODEOWNERS dosyası repo içine
Terraform tarafından yazılıyor**. `require_code_owner_review`, repo'da CODEOWNERS yoksa
hiçbir şey zorlamıyor — bu dosya olmadan tasarım kâğıt üstünde kalırdı.

**Config → modül bağlantısı** — [repositories.tf](../../terraform/repositories.tf).
`yamldecode` + `for_each`. Dosyada tek bir repo adı veya kişi adı yok.

**Öğrendiğim şey:** `config/` klasörünü `terraform/config/` altına taşımak zorunda kaldım.
HCP Terraform'da CLI ile başlatılan run'larda **yalnızca çalışma dizini paketlenip
yükleniyor**; `terraform/`'un üstündeki dosya uzak tarafta yok. Lokalde `validate` geçti,
uzakta `plan` patladı. Yol artık `config_file` değişkeniyle ayarlanabiliyor.

**CI/CD şablonları yazıldı:**
- [ci.yml](../../terraform/templates/.github/workflows/ci.yml) — dört dil, her job yalnızca ilgili
  manifest varsa çalışıyor. Son job'un adı bilerek **`ci/test`**; Emre'nin branch
  protection'ı bu isimde bir check bekliyor. Dil job'ları atlansa bile çalışıp `skipped`
  sonuçlarını başarı sayıyor — yoksa tek dilli repo'da check hiç raporlanmaz ve PR
  sonsuza kadar beklerdi.
- [release.yml](../../terraform/templates/.github/workflows/release.yml) — Conventional Commits'ten
  semver türetip tag ve release üretiyor. Üçüncü parti action yerine `git` + `gh`
  kullandım; workflow repo'da write yetkisi taşıdığı için bağımlılığı minimumda tuttum.
- [dependabot.yml](../../terraform/templates/.github/dependabot.yml) — beş ekosistem, haftalık.

`fmt` temiz, `validate` geçiyor, uzaktaki `plan` **25 ekle / 0 değiştir / 0 sil** diyor.
Sıfır silme önemliydi: Emre'nin kaynaklarına dokunulmuyor. **Apply edilmedi** — 25 gerçek
kaynak oluşacağı için bu ortak karar olmalı.

### Açık kalan

- `restrict_pushes` plan aşamasında doğrulanmıyor; free plan'de apply sırasında
  patlayabilir. Patlarsa `push_allowed_roles` geçici olarak boşaltılacak.
- Pilot repo çakışması: modül `pilot-intern-web` açıyor, Emre'nin `pilot-intern-api`'si
  ayrı duruyor. Hafta 4'te tek modelde birleşmeli.
- Emre `ACCESS-MODEL.md`'yi okumadan `rbac-and-permissions.md` merge edilmemeli.

---

## 2026-08-05 — Terraform kurulumu, auth araştırması, Hafta 1 bitti

### Yapılanlar

**Terraform CLI kuruldu.** winget ile v1.15.8. Kurulumdan sonra PATH güncelleniyor ama
mevcut terminaller eski PATH'i taşıyor — VS Code'u kapatıp açmak gerekti. HashiCorp'un
VS Code eklentisini de kurdum (`hashicorp.terraform`), `terraform fmt` on save çalışıyor.

**`.gitignore` düzeltildi.** İçinde `.terraform.lock.hcl` ignore ediliyordu, bu satırı
sildim. Lock dosyası provider sürümlerini sabitliyor ve **commit edilmeli** — `npm`'in
`package-lock.json`'ı gibi. Ignore edilirse ben, Emre ve CI farklı provider sürümü indirip
farklı `plan` çıktısı alabiliyoruz.

**Issue ve PR template'leri yazıldı** — Hafta 1'in ana işi:
- [bug_report.yml](../../terraform/templates/.github/ISSUE_TEMPLATE/bug_report.yml) — 9 alan, severity dropdown, `type: bug` auto-label
- [feature_request.yml](../../terraform/templates/.github/ISSUE_TEMPLATE/feature_request.yml) — 7 alan, kabul kriterleri pre-filled, `type: feature` auto-label
- [config.yml](../../terraform/templates/.github/ISSUE_TEMPLATE/config.yml) — boş issue kapalı, 3 contact link
- [PULL_REQUEST_TEMPLATE.md](../../terraform/templates/.github/PULL_REQUEST_TEMPLATE.md) — What / Why / Type of change / Testing / Semantic commit / Release impact / Checklist

Hepsi şema doğrulamasından geçti. **Önemli:** bozuk bir issue form'unu GitHub sessizce
görmezden geliyor, hata vermiyor. O yüzden Hafta 2'de `ci.yml`'a form lint adımı eklemek
istiyorum — yoksa bozulduğunu fark etmeyiz.

**Repo organizasyona taşındı.** Org adı `your-org`. Remote'u güncelledim,
`config.yml`'daki placeholder linkleri gerçek org adresleriyle doldurdum.
