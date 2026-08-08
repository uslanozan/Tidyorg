# Ozan — Çalışma Günlüğü

Bu dosya kendi yaptıklarımı, öğrendiklerimi ve verdiğim kararları not aldığım günlük.
Resmî dokümantasyon değil — düşünce sürecinin kaydı. Hafta 4'teki sunum hazırlığında
"bu kararı neden verdik" sorusunun cevabı burada olacak.

**Konvansiyon:** En yeni kayıt en üstte. Her kayıt bir tarih başlığı altında.

---

## 2026-08-08 — İlk apply, iki gerçek hata, pilot doğrulandı, Hafta 3 dokümanları

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
- [ci.yml](../../templates/.github/workflows/ci.yml) — dört dil, her job yalnızca ilgili
  manifest varsa çalışıyor. Son job'un adı bilerek **`ci/test`**; Emre'nin branch
  protection'ı bu isimde bir check bekliyor. Dil job'ları atlansa bile çalışıp `skipped`
  sonuçlarını başarı sayıyor — yoksa tek dilli repo'da check hiç raporlanmaz ve PR
  sonsuza kadar beklerdi.
- [release.yml](../../templates/.github/workflows/release.yml) — Conventional Commits'ten
  semver türetip tag ve release üretiyor. Üçüncü parti action yerine `git` + `gh`
  kullandım; workflow repo'da write yetkisi taşıdığı için bağımlılığı minimumda tuttum.
- [dependabot.yml](../../templates/.github/dependabot.yml) — beş ekosistem, haftalık.

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
- [bug_report.yml](../../templates/.github/ISSUE_TEMPLATE/bug_report.yml) — 9 alan, severity dropdown, `type: bug` auto-label
- [feature_request.yml](../../templates/.github/ISSUE_TEMPLATE/feature_request.yml) — 7 alan, kabul kriterleri pre-filled, `type: feature` auto-label
- [config.yml](../../templates/.github/ISSUE_TEMPLATE/config.yml) — boş issue kapalı, 3 contact link
- [PULL_REQUEST_TEMPLATE.md](../../templates/.github/PULL_REQUEST_TEMPLATE.md) — What / Why / Type of change / Testing / Semantic commit / Release impact / Checklist

Hepsi şema doğrulamasından geçti. **Önemli:** bozuk bir issue form'unu GitHub sessizce
görmezden geliyor, hata vermiyor. O yüzden Hafta 2'de `ci.yml`'a form lint adımı eklemek
istiyorum — yoksa bozulduğunu fark etmeyiz.

**Repo organizasyona taşındı.** Org adı `your-org`. Remote'u güncelledim,
`config.yml`'daki placeholder linkleri gerçek org adresleriyle doldurdum.
