# TODO — Açık İşler

Bu dosya **kısa vadeli, elle yapılacak** işleri tutar: doğrulanmamış testler, bekleyen
temizlikler, tespit edilmiş tutarsızlıklar.

Faz planı ve mimari kararlar burada değil — [`ROADMAP.md`](ROADMAP.md) içindedir.
Tamamlanan işler buradan silinir; kalıcı kayıt [`docs/pilot-verification.md`](docs/pilot-verification.md)
ve [`docs/daily-logs/`](docs/daily-logs/) altındadır.

Son güncelleme: 2026-08-18

---

## 🔴 Bloklayan iş

- [ ] 👀 **Medine `pilot-intern-api` ve `pilot-intern-web`'i artık göremiyor.**
      `default_repository_permission = none` (2026-08-18) uygulandıktan sonraki **doğrudan
      ve beklenen** sonuç: erişimin tek kaynağı artık takım üyeliği.
      `medine2906` yalnızca `Tidyorg` repo'sunun `developers`
      listesinde — diğer iki repoya `read` erişimi org varsayılanından geliyordu, o gitti.
      ⚠️ Dashboard org'daki repo'ları **kullanıcının kendi kimliğiyle** listeliyor
      (ACCESS-MODEL Karar 15) — yani Medine'nin ekranında iki repo kaybolur. Test ederken
      "dashboard bozuldu" sanılabilir; bozulmadı, doğru davranıyor.
      **Karar gerekiyor:** ya iki repo'nun `developers` listesine eklenecek, ya da
      dashboard testinde bu durum bilinerek kabul edilecek. **Medine'ye haber verilmeli.**

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

- [ ] 💡 **Öneri: config'e `ephemeral: true` alanı** _(2026-08-18'de doğdu)_
      Bugünkü test gösterdi ki **atılabilir repo açmak pahalı**: `prevent_destroy`
      yüzünden temizlik üç adımlı ve elle yapılıyor, arkasında yönetim dışı nesneler
      kalıyor. `ephemeral: true` yazan repo'da modül `prevent_destroy`'u uygulamasın —
      config'den satır silinince Terraform temizlesin.
      ⚠️ `lifecycle` bloğu dinamik olamıyor (Faz 2'de öğrenildi), yani `strict`/`seed`
      ayrımındaki gibi **iki ayrı kaynak** gerekir. Maliyeti buna değer mi, konuşulmalı.

---

## 🔴 Tespit edilmiş tutarsızlıklar

- [x] ~~**`release.yml` hiçbir repo'ya dağıtılmıyor** — karar verildi (2026-08-17).~~
      **Karar: Faz 8 ile birlikte devreye alınacak** (`defaults.workflows: [ci, release]`).
      Gerekçe: `release.yml` Conventional Commits'ten semver türetip tag kesiyor; Faz 8'de
      motor repo zaten tag ile sürümlenecek (`ref=v1.0.0`), yani sürümleme o gün gerçek
      bir işe bağlanıyor. Bugün açılırsa üç pilot repoda karşılığı olmayan tag'ler üretir.
      ⚠️ O güne kadar [`docs/release-process.md`](docs/release-process.md) akışı
      **yürürlükte değil** — doküman durumu not ediyor.

- [ ] **Bu repo'nun `.github/CODEOWNERS`'ında yol bazlı kural yok.**
      [`ACCESS-MODEL.md`](ACCESS-MODEL.md) Karar 13, dashboard'un HCL'i değiştirmesine
      karşı ikinci önlem olarak `terraform/*.tf` yollarının insan onayına bağlanmasını
      öngörüyor. Config'de `code_owners` alanı boş.
      ⚠️ Karar E ışığında bu kural **mentöre karşı zorlanamaz** — bilgilendirici kalır;
      gerçek sınır Faz 8'de (repo ayrımı) gelir.

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
