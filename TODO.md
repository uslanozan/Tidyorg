# TODO — Açık İşler

Bu dosya, yapılması gereken ama şu an bir engelle bekleyen işleri tutar.
Tamamlanan işler buradan silinir; kalıcı kayıt [`docs/daily-logs/`](docs/daily-logs/)
ve [`docs/pilot-verification.md`](docs/pilot-verification.md) içindedir.

Son güncelleme: 2026-08-08

---

## 🔴 Engelli — İkinci bir GitHub hesabı gerekiyor

Pilot doğrulamasının **ret tarafı** test edilemedi. Sebep: Ozan bu repo'da hem
`pilot-intern-web-mentors` hem `platform-admins` üyesi ve org owner. Config'de
`enforce_admins: false` olduğu için kurallar ona uygulanmıyor — bu bilinçli bir
tercih (mentörler korumalı dala push atabilsin diye).

Sonuç: Ozan'ın push atabiliyor olması kuralın çalışmadığını **göstermez**. Engellenme
davranışını doğrulamak için yalnızca `developer` rolüne sahip bir hesap gerekir.

### Yapılacaklar

- [ ] Test için yetkisiz bir hesap ayarla
  - Seçenek A: Emre'nin hesabı (`paitblack`) — ancak o da org owner, aynı sorun
    yaşanabilir. Önce org rolünü `member`'a düşürmek gerekebilir.
  - Seçenek B: Test amaçlı yeni bir GitHub hesabı açıp yalnızca
    `pilot-intern-web-devs` takımına ekle. Daha temiz sonuç verir.
- [ ] **Push kısıtı testi** — `developer` rolündeki hesap `develop`'a doğrudan push
      denesin. Beklenen: **reddedilir**.
      Reddedilmezse `restrict_pushes` mevcut GitHub plan seviyesinde uygulanmıyor
      demektir; bu durumda [`ACCESS-MODEL.md`](ACCESS-MODEL.md)'e not düşülmeli.
- [ ] **Onay engeli testi** — aynı hesap PR açsın, onaysız merge etmeyi denesin.
      Beklenen: merge düğmesi engelli, "Review required".
- [ ] **Onay sonrası merge** — Ozan onaylasın, merge edilebildiği görülsün.
      Bu `develop` için "1 onay" kuralını uçtan uca doğrular.
- [ ] **Code owner testi** — aynı hesap `main`'e PR açsın. Beklenen: 2 onay **ve**
      mentör (code owner) onayı istenir.
- [ ] Sonuçları [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6'ya
      işle ve açık maddeleri kapat.

---

## 🟡 Tek başına yapılabilir — henüz yapılmadı

- [ ] **CI tetiklenme testi** — pilot repo'ya `.github/workflows/ci.yml` ekle
      ([`templates/.github/workflows/ci.yml`](templates/.github/workflows/ci.yml)
      dosyasından kopyala), PR aç.
      Doğrulanacaklar: PR template görünüyor mu, `ci/test` check'i raporlanıyor mu,
      dil job'ları `skipped` geçiyor mu.
      **Not:** Modül CODEOWNERS yazıyor ancak workflow dosyalarını dağıtmıyor.
      Bunun modüle eklenip eklenmeyeceği ayrıca kararlaştırılmalı (aşağıda).
- [ ] **Force push testi** — `develop`'a `git push --force` denensin. Admin bypass'ının
      force push'u da kapsayıp kapsamadığı bilinmiyor. Sonuç ne olursa olsun rapora
      yazılmalı.
- [ ] **Drift düzeltme testi** — GitHub arayüzünden `develop` korumasındaki onay
      sayısını değiştir, `terraform plan` ile farkı gör, `apply` ile geri al.
      Sunum için en etkili demo; 30 saniye sürer.
- [ ] **`prevent_destroy` testi** — config'deki repo bloğunu geçici olarak yoruma al,
      `plan` çalıştır, `Instance cannot be destroyed` hatasını gör, yorumu geri al.
      **Apply etme.**

---

## 🔵 Emre ile ortak karar bekleyenler

- [ ] **Pilot repo çakışması.** `pilot-intern-api`, Emre'nin
      [`terraform/branch-protection.tf`](terraform/branch-protection.tf) dosyasında ham
      `github_repository` bloğuyla oluşturulmuş durumda. Plana göre bu repo modülden
      doğacaktı. Seçenekler: bloğu silip modüle geçmek, veya `terraform state mv` ile
      kaydı modül altına taşımak. Repo boşken karar vermek daha ucuz.
- [ ] **`enforce_admins` uyumsuzluğu.** `branch-protection.tf` içinde `main` koruması
      `enforce_admins = true`. Bu ayarla mentörler `main`'e push atamaz ve
      [`ACCESS-MODEL.md`](ACCESS-MODEL.md)'deki davranış bozulur. `false` yapılıp
      mentörler `restrict_pushes` listesine eklenmeli.
- [ ] **Emre `ACCESS-MODEL.md`'yi review etsin.** `docs/rbac-and-permissions.md` eski
      takım modelini anlatıyordu; yeni modele göre yeniden yazıldı
      (`docs/engineering-standards-fixes` branch'i). Emre okumadan merge edilmemeli.
- [ ] **GitHub plan seviyesi kararı.** Free plan'de private repo'da branch protection,
      ruleset ve push kısıtları çalışmıyor. Pilot bu yüzden public açıldı. Gerçek
      kullanım için Team planı gerekiyor — kim karar verecek, ne zaman?
- [ ] **GitHub App'e geçiş.** Terraform'un yaptığı commit'ler şu an Emre'nin kişisel
      token'ı üzerinden gidiyor ve `paitblack` adına görünüyor
      (bkz. [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 5).
      Gerekçe ve öneri: [`docs/notes/github-auth-strategy.md`](docs/notes/github-auth-strategy.md).

---

## 🟣 Kod tarafında bekleyenler

- [ ] **Branch'leri push et ve PR aç** (dogfooding — kendi kuralımız):
  - `feat/repository-module` — Hafta 2'nin tamamı
  - `docs/engineering-standards-fixes` — Emre'nin doküman PR'ına düzeltmeler
  - `feat/branch-protection-fixes` — Emre'nin şablon PR'ına düzeltmeler
- [ ] **Workflow dağıtımı kararı.** Modül CODEOWNERS'ı repo'ya yazıyor. `ci.yml`,
      `release.yml` ve `dependabot.yml` de aynı şekilde dağıtılsın mı, yoksa repo
      şablonu (`template_repo`) üzerinden mi gelsin? İkisinin de artısı var:
      Terraform'la yazmak güncel tutmayı kolaylaştırır, template ise repo'nun kendi
      dosyası olmasını sağlar ve Terraform'un sürekli üzerine yazmasını engeller.
- [ ] **Linear issue'larını aç.** Hazır CSV: oturum scratchpad'inde
      `linear-issues-hafta2.csv`. Linear connector bağlanırsa doğrudan da açılabilir.

---

## ⚪ Sonraya bırakılanlar (Future Work)

Ayrıntıları [`ACCESS-MODEL.md`](ACCESS-MODEL.md) "Future Work" bölümünde:

- `consultant` rolü ve dış danışman erişimi
- Süre sınırlı erişim (`expires_at`)
- Repo force delete akışı (şimdilik `archived: true` yeterli)
- Dashboard'un teknik detayları (teknoloji, kimlik doğrulama, PR açma kimliği)
- Klasik branch protection yerine ruleset'e geçiş
- Config'in ayrı bir repo'ya taşınması (blast radius)

---

## Hafta 3 — Sıradaki

Detaylı liste [`tasks-ozan.md`](tasks-ozan.md) Hafta 3 bölümünde. Konuştuğumuz
kararlar sebebiyle plana eklenenler:

- [ ] `docs/config-guide.md` — config'i kim nasıl değiştirir (dashboard'un spec'i)
- [ ] `docs/adr/004-config-driven-access-management.md` — neden safe-settings değil
- [ ] `docs/runbook.md` — operasyonel senaryolar (repo kapatma, mentör değiştirme,
      offboarding'de Terraform'un kapsam sınırı)
