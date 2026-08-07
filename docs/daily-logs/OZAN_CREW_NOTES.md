# Ozan — Çalışma Günlüğü

Bu dosya kendi yaptıklarımı, öğrendiklerimi ve verdiğim kararları not aldığım günlük.
Resmî dokümantasyon değil — düşünce sürecinin kaydı. Hafta 4'teki sunum hazırlığında
"bu kararı neden verdik" sorusunun cevabı burada olacak.

**Konvansiyon:** En yeni kayıt en üstte. Her kayıt bir tarih başlığı altında.

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
