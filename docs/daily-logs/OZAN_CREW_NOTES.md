# Ozan — Çalışma Günlüğü

Bu dosya kendi yaptıklarımı, öğrendiklerimi ve verdiğim kararları not aldığım günlük.
Resmî dokümantasyon değil — düşünce sürecinin kaydı. Hafta 4'teki sunum hazırlığında
"bu kararı neden verdik" sorusunun cevabı burada olacak.

**Konvansiyon:** En yeni kayıt en üstte. Her kayıt bir tarih başlığı altında.

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
