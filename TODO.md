# TODO — Açık İşler

Bu dosya **kısa vadeli, elle yapılacak** işleri tutar: doğrulanmamış testler, bekleyen
temizlikler, tespit edilmiş tutarsızlıklar.

Faz planı ve mimari kararlar burada değil — [`ROADMAP.md`](ROADMAP.md) içindedir.
Tamamlanan işler buradan silinir; kalıcı kayıt [`docs/pilot-verification.md`](docs/pilot-verification.md)
ve [`docs/daily-logs/`](docs/daily-logs/) altındadır.

Son güncelleme: 2026-08-19

---

## 🔴 Bloklayan iş

- [ ] 🔴 **`none` ayarı bugün üç repo'da ETKİSİZ — çünkü onlar public.**
      2026-08-19'da fark edildi. `Tidyorg`, `pilot-intern-api` ve
      `pilot-intern-web` **public**; public bir repo'yu internetteki herkes okur, org
      üyeliğinden bağımsız olarak. `default_repository_permission` orada hiçbir şey
      değiştirmiyor.
      Ayar yalnızca `pilot-access-test`'te (private) gerçek etki üretiyor — izolasyon
      testinin orada yapılmış olması da bu yüzden doğruydu.
      ⚠️ Bu bir hata değil, **bekleyen bir bağımlılık**: repo'lar `public` çünkü free
      plan'de private repo'da branch protection çalışmıyor. Yani bugün **izolasyon ile dal
      koruması aynı anda elde edilemiyor**; ikisini birleştiren şey Faz 7 (Team planı).
      **Sunumda dikkat:** "erişim izolasyonu kuruldu" demek bugün yalnızca bir repo için
      doğru. Faz 6 çalışıyor ama kapsamı Faz 7'ye bağlı.
      _Önceki hâli Medine'nin iki pilot repo'yu kaybettiğini söylüyordu — yanlıştı,
      düzeltildi._

- [x] ~~🔑 **App'e `Organization → Administration: Read and write` izni ver.**~~
      ✅ **2026-08-18** — izin verildi, apply geçti, `plan` temiz
      (`No changes. Your infrastructure matches the configuration.`).
      İlk deneme `403 Resource not accessible by integration` vermişti: App'te
      `Repository → Administration: write` vardı ama org ayarları için gereken izin **o
      değil** — GitHub `administration` ile `organization_administration`'ı ayrı tutuyor.
      `Issues` ve `Workflows` 403'lerinin **üçüncüsü**.
      _Manifest ve kurulum rehberi güncellendi:
      [`app-manifest.json`](integrations/github-app/app-manifest.json) ·
      [`README.md`](integrations/github-app/README.md)_

- [ ] 💳 **Fatura e-postası offboarding'de gözden kaçmıştı** _(kapandı ama ders kayda değer)_
      Org'un "Billing email" adresi 2026-08-18'e kadar **ayrılan ekip üyesindeydi**. Erişim
      yetkileri 15 Ağustos'ta alınmıştı; fatura bildirimleri üç gün daha ona gitti.
      Arayüzden düzeltildi ve Terraform'a alındı.
      ⚠️ Provider bu alanı **okuyamıyor** (import'ta boş geldi) — yani drift'ini de göremez.
      `org-settings.tf`'teki satır bir kayıt değil, **tek doğruluk kaynağı**.
      **Yapılacak:** offboarding kontrol listesine "fatura e-postası" maddesi eklensin
      _(bkz. [`docs/runbook.md`](docs/runbook.md))_.

---

## 🟠 GIT-34 — Dışarıdan gelen repo: kapsama ve devralma _(2026-08-20'de detaylandırıldı)_

> Arka plan ve iki yaklaşımın gerekçesi: [`ROADMAP.md`](ROADMAP.md) →
> *"📌 Konuşulacak — Geçmişi kim koruyacak?"*. Burada **karar** ve **prosedür** var.

**Karar (Ozan, 2026-08-20): önce kapsama kontrolü.** İş ikiye ayrılıyor ve ikisi aynı
anda yapılmayacak:

| Yarı | Ne yapar | Ne zaman | Neden |
| :--- | :--- | :--- | :--- |
| **Kapsama (push)** | Org'daki repo'ları listeler, config'de karşılığı olmayanları raporlar | **Şimdi** | Faz 8'e bağımlı değil; bugünkü açığı görünür kılar |
| Keşif + uzlaştırma (pull) | Mevcut repo'nun ayarlarını okuyup config üretir | Faz 8'den sonra | `config/`'in nereye taşınacağına bağımlı; erken yapılırsa araç iki kez kurulur |

- [ ] 🔨 **Kapsama kontrolü yaz.** `github_repositories` data source ile org okunur,
      `local.repos` ile karşılaştırılır, config'de olmayanlar bir output + CI uyarısı
      olarak yüzeye çıkar. Bugünkü hâliyle org'a sessizce bir repo girip **hiçbir
      kontrolün kapsamına girmeden** durabilir: Terraform görmez, güvenlik varsayılanları
      (`*_for_new_repositories`) uygulanmaz, bypass raporunda çıkmaz.
      _Kanıt: `vulnerability_alerts` bu repo'da kapalıydı — elle açılmış tek repo,
      denetlenmeyen tek repo oydu._

### Devralma prosedürü — üç senaryo, ikisi farklı

**A. GitLab'dan (veya herhangi bir dış sistemden) gelen repo — brownfield DEĞİL.**
Transfer yok; yeni repo açılıp geçmiş push'lanıyor. Yani **config'den doğabilir** ve ilk
günden yönetim altındadır. Tek şart:

> ⚠️ `defaults.auto_init: true` repo'yu bir ilk commit'le yaratıyor. Mevcut geçmiş
> push'lanacaksa bu "unrelated histories" çakışması üretir. O repo'nun dosyasında
> **`auto_init: false`** olmalı.
> Sıra: config → apply → boş repo → `git push --mirror`.

**B. Başka bir GitHub org'undan transfer · C. Bireysel hesaptan org'a transfer.**
İkisi de gerçek brownfield; repo kendi ayarlarıyla geliyor ve Terraform onu tanımıyor.
Prosedür — `terraform/imports.tf` bu deseni zaten bir kez uyguluyor:

| Adım | Ne | Araç |
| :--- | :--- | :--- |
| 1. Keşif | Repo'nun bugünkü ayarları ne? | `import` bloğu + `plan` — **hiçbir şeyi değiştirmez**, yalnızca okur |
| 2. Uzlaştırma | Neyi kabul, neyi ezeceğiz? | İnsan kararı, PR'da |
| 3. Devralma | `config/repositories/<ad>.yml` yaz | plan artık gerçek farkı gösterir |
| 4. Doğrulama | Bypass raporunda ve kapsama kontrolünde çıkıyor mu? | apply sonrası |

_Aynı teknik org ayarlarında 2026-08-18'de kullanıldı ve dört bulgu çıkardı; sıfırdan
araç yazmaya gerek yok._

**İki pürüz — devralma listesine girmeli:**

- [ ] ⚠️ **Takımlar transfer olmaz, doğrudan collaborator'lar olur.** Takımlar org'a
      özeldir. Repo geldiğinde erişimi eski takımlarından değil **doğrudan
      collaborator** kayıtlarından alır. Modül `<repo>-mentors` / `<repo>-devs`'i
      yaratır ama **eski doğrudan collaborator'ları temizlemez** — Terraform onları
      görmüyor. Devralma adımına "doğrudan collaborator'ları denetle" maddesi girmeli,
      yoksa yönetim dışı bir erişim yolu sessizce hayatta kalır.
- [ ] ⚠️ **`members_can_create_repositories = false` transferi de kısıtlıyor olabilir.**
      GitHub, hedef org'da repo yaratma yetkisi ister. Öyleyse transferi bir org owner
      yapmak zorunda — bu aslında **istenen** davranış, ama transfer günü sürpriz
      olmaması için önceden doğrulanmalı. _(Doğrulanmadı; ilk gerçek transferde test
      edilecek.)_

> **Sıralama gerekçesi:** yukarıdaki dört adım, repo'nun geldiğini **bildiğin** durumda
> çalışır. Kimse haber vermezse hiçbiri devreye girmez. Kapsama kontrolü o haberi veren
> şeydir — bu yüzden önce o.

---

## 🔁 Rutin PR'lar iki onay istiyor — bypass alışkanlığa dönüşüyor _(2026-08-19)_

- [ ] **`main` → `required_reviews: 2`, ekip üç kişi.**
      Dependabot PR #19 bunu somutlaştırdı: bir action sürüm yükseltmesi **iki insan
      onayı** istiyor. Sen `platform-admins` olarak code owner onayını verebilirsin ama
      ikinci onay için Emre ya da Medine gerekiyor.
      **2026-08-19'da PR #19 bypass ile merge edildi** _(Karar E'nin verdiği yetki)_.

      ⚠️ **Asıl risk teknik değil, davranışsal.** "Rutin PR, bypass'larım" bir kez
      yapıldığında istisna; her hafta yapıldığında **varsayılan** olur. Ve bypass düğmesi
      rutin bir refleks hâline geldiğinde, gerçekten incelenmesi gereken PR'da da basılır.
      Kural o gün zaten devre dışıdır — kimse kaldırmasa bile.

      Bir de ironi var: gruplamayı **güncellemeler gecikmesin** diye yapmıştık
      (2026-08-16, 5 PR'lık spam). Onay matematiği o kazancı geri alıyor.

      **Seçenekler:**

      | Yol | Etkisi | Bedeli |
      | :--- | :--- | :--- |
      | Bu repo'da `required_reviews: 1` | Rutin PR tek onayla geçer | `main`'in koruması zayıflar |
      | `type: chore` etiketli PR'lar için ayrı kural | Hedefli | Klasik branch protection bunu **yapamaz** — ruleset gerekir (ADR konusu, bkz. "Sonraya bırakılanlar") |
      | Developer'lardan ikinci onay iste | Kural bozulmaz | Her hafta iki kişiyi meşgul eder |
      | Bugünkü hâl: bypass | Hızlı | Yukarıdaki davranışsal risk |

      **✅ KARAR (Ozan, 2026-08-20): org varsayılanı `main` → `required_reviews: 1`.**

      Tabloda ilk satır seçildi, ama **tek repo yerine org varsayılanı** olarak — çünkü
      sorun bu repo'ya özgü değil, üç kişilik bir ekibin genel hâli. Riskli repo'lar kendi
      dosyalarında sayıyı yükseltebilir; `required_reviews` repo bazında ezilebiliyor.

      **Gerekçe.** Bir kuralın en kötü hâli, düzenli olarak atlanan hâlidir: kâğıtta durur,
      fiilen yoktur, ve atlamak refleks olur. 1 onay **dört göz ilkesini koruyor**
      (yazan + onaylayan); kaybedilen üçüncü çift göz, üç kişilik ekipte faydasından pahalı.

      ⚠️ **`require_code_owner_review: true` kaldı.** Yani bu repo'da `/terraform/` ve
      `/.github/workflows/` değişiklikleri hâlâ `platform-admins` onayı istiyor — düşen
      sayı o kapıyı açmıyor. Tek onay, *doğru kişinin* onayı olmak zorunda.

      Faz 8'den sonra bu soru yeniden şekillenir: motor repo'da 2 onay mantıklı olabilir,
      config repo'da muhtemelen değil. O gün varsayılan değil, **repo bazlı** ayarlanır.

---

## ⚙️ Action sürümleri — şablonlar Dependabot'un kör noktasında _(2026-08-19)_

- [x] ✅ **Şablon workflow'ları elle güncellendi.** Dependabot PR #18'in verdiği sürümler
      `terraform/templates/.github/workflows/{ci,release}.yml` içine taşındı.
      **Neden elle:** Dependabot'un `github-actions` ekosistemi yalnızca **gerçek**
      `.github/workflows/` klasörünü tarar. `terraform/templates/` altındakiler onun için
      sıradan YAML — hiç güncellenmezler.
      ⚠️ Ve tehlikeli kısmı: bu repodaki `.github/workflows/ci.yml` **`strict` modda
      Terraform'a ait**. PR #18 onu da yükseltiyor ama kaynak şablon eski kalsaydı bir
      sonraki apply **geri alırdı**. Şablon güncellenmeden merge edilirse döngü oluşur:
      `Dependabot PR → merge → apply geri alır → Dependabot yine açar`.

- [ ] ⚠️ **`golangci/golangci-lint-action` v6 → v9 — kırıcı olabilir.**
      v7'den itibaren action, golangci-lint **v2** bekliyor ve v2 farklı bir config
      şeması kullanıyor (`.golangci.yml` formatı değişti). Bugün pilot repo'larda Go kodu
      olmadığı için job atlanıyor, yani etkisi görünmüyor — **ilk gerçek Go repo'sunda
      patlar.** O gün ya action v6'ya sabitlenmeli ya da config v2'ye taşınmalı.
      Diğer yükseltmeler (checkout, setup-*, cache, github-script) rutin.

- [x] ✅ **Dependabot PR'larında `Terraform Plan` job'ı atlanıyor.**
      GitHub, Dependabot PR'larına normal Actions secret'larını vermez (ayrı kasa), yani
      `TF_API_TOKEN` boş gelip `terraform init` patlıyordu — PR #18'de 9 saniyede kırmızı.
      Token'ı ikinci bir kasaya koymak yerine job atlandı: Dependabot bu repoda yalnızca
      action sürümlerini yükseltiyor, `terraform/` altına dokunmuyor.
      ⚠️ Bu job zorunlu status check değil, atlanması PR'ı bloklamaz.

- [x] ✅ **GIT-37 — Şablon `dependabot.yml`'dan `github-actions` ekosistemi çıkarıldı**
      _(karar: 2026-08-20, Ozan)_

      **Sorun.** Yönetilen repo'lardaki `.github/workflows/ci.yml` `strict` modda, yani
      Terraform'un. Dependabot orada bir action sürümü yükseltir, PR merge edilir, bir
      sonraki apply dosyayı geri alır, Dependabot aynı PR'ı yeniden açar. Sonsuz döngü.
      2026-08-19'da PR #18/#19 ile canlıda görüldü.

      **Neden konfigürasyonla düzeltilemiyor _(2026-08-20'de doğrulandı)_.** Dependabot'un
      `github-actions` ekosistemi yalnızca `/.github/workflows/*.yml` ve kökteki
      `action.yml` dosyasını tarıyor; `terraform/templates/.github/workflows/` yolunu
      **göremiyor**, `directory` ayarı da oraya yönlendirilemiyor
      ([dependabot-core#5970](https://github.com/dependabot/dependabot-core/issues/5970)).
      Bir repo'nun `dependabot.yml`'ı başka bir repo'ya da bakamaz. Yani "Dependabot'u
      kaynağa yönlendirelim" seçeneği **teknik olarak yok**.

      **Değerlendirilen seçenekler.**
      | Seçenek | Neden seçilmedi / seçildi |
      | :--- | :--- |
      | **Ekosistemi şablondan çıkar** | ✅ Seçildi. Döngüyü kökten kırar. |
      | Dependabot'u kaynağa yönlendir | ❌ Teknik olarak mümkün değil (yukarı). |
      | `ci.yml`'ı `seed` moda al | ❌ Yönetişim dosyası; repo'ların kendi CI'ını değiştirmesi bu projenin tezine aykırı. |
      | Döngüyü belgeleyip kabul et | ❌ Her hafta ölü PR üretir, gürültü kalıcı hale gelir. |

      **Bedeli — kabul edildi.** Yönetilen repo'ların diğer ekosistemleri (gomod, npm,
      pip, composer) korunuyor; yalnızca action sürümleri Dependabot'suz kalıyor. Şablon
      action sürümlerini artık hiçbir şey izlemiyor → alttaki maddeye bak.

- [x] ✅ **Kontrol düzlemi istisnası: bu repo `dependabot: none`** _(2026-08-20)_
      Bu repo kendi `.github/dependabot.yml`'ını **şablondan** alıyordu (`strict`,
      dogfooding). Üstteki değişiklik uygulanınca `github-actions` bloğu buradan da
      silinecekti — oysa bu repo'nun `terraform-plan.yml` / `terraform-apply.yml`
      dosyaları Terraform'un **değil**, elle yazıldılar, şablonda yoklar. Orada döngü yok
      ve Dependabot fiilen çalışıyor (PR #19 gerçekten sürüm yükseltti).
      Yani şablon değişikliği, **döngüsü olmayan tek yerdeki çalışan otomasyonu**
      kapatacaktı. `config/repositories/Tidyorg.yml` içine
      `files: { dependabot: none }` eklendi.

      ⚠️ **Apply sırası önemli.** Mod `strict` → `none` olduğunda Terraform dosya
      kaynağını yok eder, yani `.github/dependabot.yml` repo'dan **silinir**. Doğru sıra:
      (1) apply → dosya silinir, (2) elle yazılmış `dependabot.yml` commit'lenir.
      Arada Dependabot'un birkaç dakika konfigürasyonsuz kaldığı bir boşluk var; kabul.

      ⚠️ Bu, dogfooding'de bilinçli bir delik: bu repo bir dosyada artık kendi şablonunu
      tüketmiyor. Alternatifi (ikinci şablon varyantı) iki dosya arasında drift üretirdi.

- [ ] 🔁 **Şablon action sürümlerini kim izleyecek? — GIT-37'nin açık bıraktığı yer**
      Üstteki karardan sonra `terraform/templates/.github/workflows/*.yml` içindeki action
      sürümlerini **hiçbir otomasyon izlemiyor**. "Elle takip ederiz" demek, bu projenin
      tekrar tekrar yakaladığı hata kalıbının aynısı olur: kaybolan korumayı kimsenin fark
      etmemesi.
      **Önerilen çözüm (araştırıldı, ucuz):** bu repoda haftalık `schedule` ile çalışan bir
      workflow; şablonlardaki `uses:` satırlarını ayıklayıp her action'ın son sürümünü
      GitHub REST API'den sorar, eskiyen varsa issue açar.
      **Kimlik doğrulama gerekmiyor:** runner'daki hazır `GITHUB_TOKEN` yeterli
      (`gh api repos/<owner>/<action>/releases/latest`). Yeni secret, yeni App izni,
      yeni token yok. ~30 satır.

- [ ] 🔍 **Yönetilen repo'larda bekleyen ölü Dependabot PR'ı var mı?**
      `pilot-intern-api` ve `pilot-intern-web`'de, ekosistem çıkarılmadan önce açılmış
      workflow PR'ı kalmış olabilir. Varsa kapatılmalı — artık merge edilseler bile apply
      geri alır.

---

## 🔴 Örnek config'den gerçek davet gitmiş _(2026-08-19'da fark edildi)_

- [ ] **Bekleyen iki daveti iptal et** — `Dev-1` ve `dev-2`, 2026-08-15'te davet edilmiş.
      Bunlar `organization.example.yml` içindeki **takma adlar** ama aynı kullanıcı adları
      GitHub'da gerçekten var; yabancı iki kişiye private org daveti gitmiş.
      Yol: Organization → People → **Invitations** → ⋯ → Cancel invitation
- [ ] **"Failed invitations" sekmesine de bak** — `mentor-a`, `mentor-b`, `dev-3` muhtemelen
      oraya düşmüştür. Varsa temizle.
- [x] ✅ **Repo tarafındaki aynı mayın kapatıldı** — `repositories.tf` glob'una
      `.example.yml` istisnası eklendi. Öncesinde `config/repositories/` klasörüne konan
      bir örnek dosya `repository.example` adında **gerçek bir repo** açardı.
      Örnek dosya klasöre kopyalanıp `plan` ile doğrulandı: `No changes`.
      ⚠️ Ders: placeholder değerler zararsız değildir — gerçek bir isim alanında her
      placeholder **var olabilecek bir kimliktir**.

---

## 🔐 Yetki yükseltme kapısı — tasarım kararı bekliyor _(2026-08-18)_

- [ ] **`org_role: admin` yükseltmesi bugün tek satırlık bir işlem.**
      `config/people.yml` içinde bir kişinin `org_role`'ünü `member` → `admin` yapmak
      onu org owner yapar: her repoda admin, her korumalı dalda muaf, üye ekleme/çıkarma,
      org ayarları, repo silme. Ve bu satır, stajyer eklemekle **aynı onay yolundan**
      geçiyor.

      **Bugün gerçek risk yok** çünkü kontrol düzlemi reposunun `mentors` listesinde tek
      kişi var ve o zaten org owner. Risk, o listeye owner OLMAYAN ikinci bir isim
      eklendiği gün başlar.

      **Değerlendirilen üç yol:**

      | Yol | Nasıl | Neden bugün seçilmedi |
      | :--- | :--- | :--- |
      | HCP workspace değişkeni | Allowlist git'in dışında | Projenin "her şey config'de, PR'da görünür" iddiasını deler; `billing_email` ile aynı görünmez-drift sınıfı; Faz 8 aynı korumayı git içinde veriyor |
      | HCL'de `allowed_org_owners` + precondition | YAML beyanı, `.tf` yetkiyi verir; `.tf` zaten CODEOWNERS korumalı | Ertelendi — bugün koruyacağı kimse yok |
      | `people.yml` / `privileged.yml` bölmesi | Dashboard'un yazdığı dosya yetkiyi **ifade edemez** (secure by construction) | Ek makine (`merge()` + çakışma tespiti); dashboard yazma moduna geçince asıl doğru olan bu |

      ⚠️ **CODEOWNERS ile `people.yml`'ı korumak çözüm DEĞİL:** CODEOWNERS dosyanın bir
      bölümünü koruyamaz, yalnızca yolunu. Tüm dosyayı korumak her stajyer eklemeyi org
      yönetici onayına bağlar — sık işlemi nadir işlemin hızına düşürür.

      ⚠️ Bölerken `org_role: admin` **tek başına yetmez**: `roles: [head-of-engineering]`
      de bir yükseltme yoludur (her repoda admin + bypass). İkisi birlikte taşınmalı.

      **Tetikleyici:** kontrol düzlemi reposuna owner olmayan ikinci bir mentör eklenmesi,
      ya da dashboard yazma moduna geçmesi — hangisi önce olursa.

---

## 🟠 Import'un ortaya çıkardığı org bulguları _(2026-08-18)_

Bunlar `org-settings.tf` import'unun yan ürünü — daha önce hiçbir yerde görünmüyorlardı.

- [x] ~~**Org düzeyinde hiçbir güvenlik varsayılanı açık değil.**~~ ✅ **2026-08-18** —
      beşi `false` → `true` yapıldı (`dependabot_alerts`, `dependabot_security_updates`,
      `dependency_graph`, `secret_scanning`, `secret_scanning_push_protection`).
      `advanced_security` bilerek `false` kaldı: GHAS/Enterprise lisansı ister.
      ⚠️ Bunlar **yeni** repo'ları kapsar; mevcut repo'lar modüldeki ayarlarla çözüldü.

- [x] ~~**`members_can_create_public_repositories = true`**~~ ✅ **2026-08-18** — üçü de
      `false` yapıldı (`repositories`, `public`, `private`). Artık yalnızca org owner
      elle repo açabilir; normal yol config'den geçiyor.
      ⚠️ GitHub "sadece mentörler açsın" **diyemiyor** — org düzeyinde yetki ikili
      (tüm üyeler / yalnızca owner'lar), takım bazlı ara kademe yok.

- [x] 🧪 ~~**Repo açma kısıtı GitHub App'i etkiliyor mu?**~~ ✅ **DOĞRULANDI — etkilemiyor**
      _(2026-08-18)_. `members_can_create_repositories = false` yürürlükteyken geçici bir
      repo config'i eklendi ve apply çalıştırıldı:
      ```
      module.repositories["tmp-app-create-test"].github_repository.this:
        Creation complete after 11s [id=tmp-app-create-test]
      Apply complete! Resources: 11 added, 0 changed, 0 destroyed.
      ```
      **Sonuç:** ayar org **üyelerini** kısıtlıyor; GitHub App org üyesi değil, kurulu bir
      entegrasyon ve kendi izinleriyle çalışıyor. Config'den repo yaratma akışı sağlam.
      Bu, kısıtın **istenen** şekli: insan elle açamıyor, config açabiliyor.

- [ ] 🗑️ **Test artıklarını sil — elle yapılman gereken 3 nesne** _(2026-08-18)_
      `tmp-app-create-test` Terraform state'inden çıkarıldı ve config'i silindi, ama
      **GitHub'da hâlâ duruyor** (`prevent_destroy` yüzünden Terraform silemedi).
      Şu an yönetim dışı — yani tam da ROADMAP'teki "Geçmişi kim koruyacak?" notunun
      örneği, kendi elimizle üretilmiş hâli.
      Silinecekler:
      1. Repo: `https://github.com/your-org/tmp-app-create-test` → Settings → Danger Zone
      2. Takım: `tmp-app-create-test-mentors`
      3. Takım: `tmp-app-create-test-devs`
      _(Repo silinince takımlar silinmez, ayrıca kaldırılmalı.)_

- [x] ✅ ~~**Terraform uyarılarını CI'da görünür kıl**~~ _(2026-08-18)_
      `plan` yorumu artık uyarıları ayrı bir bölümde sayıp listeliyor (drift sayacının
      yanında); `apply` ise `::warning::` annotation'ı + step summary üretiyor.
      **Neden gerekti:** uyarılar plan ÖZETİNİ etkilemiyor — `vulnerability_alerts`
      deprecation uyarısı "✅ No changes" diyen bir çıktının içinde gizliydi ve ancak
      `grep` ile yakalandı. İkinci sebep: yorumdaki `MAX_LOG` kısaltması uyarıları
      (çıktının sonunda oldukları için) tamamen düşürebiliyordu.
      ⚠️ `grep -P` **kullanılmadı**: `│` çok baytlı ve PCRE modu bazı locale'lerde
      *"supports only unibyte and UTF-8 locales"* ile reddediyor — yerelde bu hata alındı.
      `awk` locale'den bağımsız. Dört senaryo fixture ile test edildi (temiz plan /
      uyarılı plan / destroy + uyarı / apply çıktısı yok).

- [ ] ⏸️ **GIT-32 — Repo silme: `prevent_destroy` ne koruyor?** _(2026-08-18'de doğdu,
      2026-08-20'de araştırıldı, **karar ertelendi**)_

      **Sorun.** Atılabilir repo açmak pahalı: `prevent_destroy` yüzünden temizlik üç
      adımlı ve elle yapılıyor, arkasında yönetim dışı nesneler kalıyor.

      **2026-08-20'de bulunan asıl mesele — koruma ters çalıştı.**
      `prevent_destroy` repo'nun silinmesini engellemedi; **yönetilerek** silinmesini
      engelledi. `tmp-app-create-test`'te sonuç şu oldu: `state rm` yapıldı, repo GitHub'da
      öksüz kaldı, iki takım arkada bırakıldı. Yani koruma, korumaya çalıştığı durumun ta
      kendisini üretti — ROADMAP'teki *"Geçmişi kim koruyacak?"* notunun kendi elimizle
      yapılmış örneği.

      **Neden "hard delete tuşu" istendiği gibi yapılamıyor _(2026-08-20'de doğrulandı)_.**
      1. `prevent_destroy` **literal olmak zorunda** — değişkenden gelemez
         (`strict`/`seed` ayrımında Faz 2'de öğrenilen kısıtın aynısı).
      2. Terraform dokümanı *"argüman konfigürasyonda kaldığı sürece"* der. Ama
         **`for_each`'li modülde** config'den bir repo satırını silmek modül **çağrısını**
         silmiyor, yalnızca bir instance'ı düşürüyor — `lifecycle` bloğu konfigürasyonda
         duruyor. Yani `for_each` altında `prevent_destroy` **mutlak**: kaçış yolu yok.
      3. İki ayrı kaynakla (`this` / `ephemeral`, `count` ile seçilen) kurulursa bayrağı
         **sonradan açmak** `this`'i yok edip `ephemeral`'i yaratmak demek. Birincisi
         `prevent_destroy` tarafından bloklanır → kilit. Bloklanmasaydı repo silinip
         yeniden yaratılırdı → çok daha kötü.
         **Sonuç: `ephemeral` ancak DOĞUM ANINDA yazılabilen bir alan olabilir, sonradan
         basılan bir tuş değil.** Artı `github_repository.this`'e 17 referansın
         `one(...)` ile sarılması.

      **Değerlendirilen iki tasarım.**
      | | Nasıl | Kazanç | Kayıp |
      | :--- | :--- | :--- | :--- |
      | **A — doğum bayrağı** | `ephemeral: true`, iki kaynak, `count` | Test repo'ları temiz silinir | Sonradan değiştirilemez; 17 referans `one()`; modül karmaşıklaşır |
      | **B — tuş yerine kapı** | `prevent_destroy` kaldırılır; plan bir repo yok ediyorsa PR'da `allow-destroy` etiketi yoksa check kırmızı | Silme *imkânsız* olmaktan çıkıp *kasıtlı ve loglanmış* olur; `state rm` refleksi biter | Sert garanti yumuşak kapıya döner; Karar E gereği repo admini zorunlu check'i atlayabilir |

      **Durum: ertelendi** _(Ozan, 2026-08-20 — "bu konuda kafam karışık, şimdilik kalsın")_.
      Seçim özünde şu: **imkânsız ama kaçamaklı** mı, **mümkün ama görünür** mü.
      `archived: true` her iki tasarımda da varsayılan yumuşak yol olarak kalıyor.
      **Araştırılacak üçüncü yol:** HCP Terraform'da zaten kullandığımız **Sentinel**
      (policy-as-code) ile destroy'u plan seviyesinde politikaya bağlamak — `prevent_destroy`'u
      HCL'den çıkarıp kararı politika motoruna taşır. Sektörde bu kalıbın adı
      **policy as code / preventive control**; bkz. `docs/plans-and-pricing.md` ve
      aşağıdaki "sektör terimleri" notu.

---

## 🔴 Tespit edilmiş tutarsızlıklar

- [x] ~~**`release.yml` hiçbir repo'ya dağıtılmıyor** — karar verildi (2026-08-17).~~
      **Karar: Faz 8 ile birlikte devreye alınacak** (`defaults.workflows: [ci, release]`).
      Gerekçe: `release.yml` Conventional Commits'ten semver türetip tag kesiyor; Faz 8'de
      motor repo zaten tag ile sürümlenecek (`ref=v1.0.0`), yani sürümleme o gün gerçek
      bir işe bağlanıyor. Bugün açılırsa üç pilot repoda karşılığı olmayan tag'ler üretir.
      ⚠️ O güne kadar [`docs/release-process.md`](docs/release-process.md) akışı
      **yürürlükte değil** — doküman durumu not ediyor.

- [x] ~~**Bu repo'nun `.github/CODEOWNERS`'ında yol bazlı kural yok.**~~ ✅ **2026-08-18**
      [`ACCESS-MODEL.md`](ACCESS-MODEL.md) Karar 13 uygulandı: `/terraform/` ve
      `/.github/workflows/` yolları `platform-admins` takımına bağlandı.
      İkincisi ayrıca önemli — apply'ı çalıştıran iş akışlarına yazabilen biri,
      Terraform'un yetkisini dolaylı olarak ele geçirir.
      ⚠️ Karar E ışığında bu kural **repo admin'ine karşı zorlanamaz** — bilgilendirici
      kalır; gerçek sınır Faz 8'de (repo ayrımı) gelir.
      `config/people.yml` bilerek kapsam dışı — gerekçe yukarıdaki yükseltme kapısı maddesi.

- [ ] **Yerelde bekleyen iki dal:** `docs/engineering-standards-fixes`,
      `feat/branch-protection-fixes`.
      ⚠️ `docs/engineering-standards-fixes` **kısmen geçersiz** — içindeki
      `rbac-and-permissions.md` artık var olmayan takım yapısını anlatıyor; doküman
      2026-08-16'da baştan yazıldı. Push etmeden önce çakışmayı çöz veya dalı sil.

---

## 🟡 Doğrulanmamış testler

Pilot doğrulamasının açık kalan maddeleri — takip:
[`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6.5.

- [x] ~~**Force push testi.**~~ ✅ **2026-08-17'de doğrulandı.** Sonuç role göre ayrıştı:
      `developer` reddedildi, `mentor` geçti. Yani `enforce_admins = false` muafiyeti
      force push ve dal silmeyi de kapsıyor — Karar E'nin sanılandan geniş bir sonucu.
      İşlendi: `pilot-verification.md` 6.5 · `rbac-and-permissions.md` Bölüm 4 ·
      `runbook.md` Bölüm 3.6.

- [x] ~~**Drift düzeltme demosu.**~~ ✅ **2026-08-17'de doğrulandı.** `pilot-intern-web`
      `develop` korumasında onay sayısı arayüzden 1 → 2 yapıldı; `plan` bunu gerçek bir
      `~ update in-place` olarak gösterdi (kozmetik drift gürültüsünden ayırt edilebilir
      biçimde), `apply` geri aldı. Sunumda kullanılacak demo bu.

- [~] **`main` akışında code owner testi — kısmen doğrulandı.**
      `developer` rolündeki hesap PR açtı ve kendi PR'ını merge edemedi. Ancak bu
      `develop` üzerinde yapıldı ve orada `require_code_owner_review: false` —
      yani **onay zorunluluğu** kanıtlandı, **code owner mekanizması** değil.
      Tam kanıt için `main`'e açılan bir PR'ın **başka bir developer tarafından
      onaylanmasına rağmen** bloklu kalması gözlenmeli; iki developer hesabı gerekiyor.
      Risk düşük: CODEOWNERS geçerliliği bağımsız doğrulandı (Bölüm 3).

---

## ⚪ Sonraya bırakılanlar

Gerekçeleri [`ACCESS-MODEL.md`](ACCESS-MODEL.md) "Future Work" bölümünde:

- `consultant` rolü ve dış danışman erişimi
- Süre sınırlı erişim (`expires_at`)
- Repo force delete akışı (şimdilik `archived: true` yeterli)
- Klasik branch protection yerine ruleset'e geçiş (ayrı bir ADR gerekir)
- Linear / Slack entegrasyonları

---

## Kapanmış maddeler — nereye gittiler

Bu dosyanın önceki sürümündeki işlerin tamamı tamamlandı. Kayıt için:

| İş | Sonuç |
| :--- | :--- |
| `terraform/templates/` atıl, hiçbir repo'ya ulaşmıyor | ✅ Faz 2, 2026-08-16 — şablonlar üç repo'ya dağıtıldı |
| `ci/test` karşılıksız, PR'lar merge edilemiyor | ✅ 2026-08-16 — check ilk kez yeşil raporladı _(pilot-verification 7.6)_ |
| `.github` org repo'su kurulsun mu | ❌ Reddedildi — public olmak zorunda _(Karar A / Karar 10)_ |
| GitOps döngüsü (`terraform-plan/apply.yml`) | ✅ Faz 3, 2026-08-15/16 |
| GitHub App'e geçiş | ✅ Faz 4, 2026-08-15 — `tidyorg-infra-bot` canlı |
| `enforce_admins` → `false` | ✅ Faz 0 — kalıcı karar _(Karar E / K5)_ |
| `pilot-intern-api`'yi modüle taşı | ✅ 2026-08-15, `terraform state mv` ile |
| Ret tarafı testleri (push kısıtı, onay engeli) | ✅ 2026-08-15 — `GH006`, "Review required" |
| Workflow dağıtımını config'den seçilebilir yap | ✅ `defaults.workflows` + modülde `precondition` |
| `prevent_destroy` testi | ✅ Doğrulandı _(pilot-verification 6.1)_ |
| `config-guide.md` · `runbook.md` · ADR-004 | ✅ Yazıldı |
