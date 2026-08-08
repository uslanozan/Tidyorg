# TODO — Açık İşler

Bu dosya, yapılması gereken ama şu an bir engelle bekleyen işleri tutar.
Tamamlanan işler buradan silinir; kalıcı kayıt [`docs/daily-logs/`](docs/daily-logs/)
ve [`docs/pilot-verification.md`](docs/pilot-verification.md) içindedir.

Son güncelleme: 2026-08-08

---

## 🟡 Tek başına yapılabilir — sıradaki iş

- [ ] **CI tetiklenme testi** — pilot repo'ya `.github/workflows/ci.yml` ekle
      ([`templates/.github/workflows/ci.yml`](templates/.github/workflows/ci.yml)
      dosyasından kopyala), PR aç.
      Doğrulanacaklar: PR template görünüyor mu, `ci/test` check'i raporlanıyor mu,
      dil job'ları `skipped` geçiyor mu.
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

## 🟣 Kod tarafında bekleyenler

- [ ] **Workflow dağıtımını repo bazında konfigüre edilebilir yap.**
      Karar verildi: CI/CD her projede olmayacak, hangi workflow'ların dağıtılacağı
      config'den (ileride dashboard'dan) seçilecek.

      Önerilen şema:
      ```yaml
      defaults:
        workflows: [ci]          # taban: her repo CI alsın

      repositories:
        payments-api:
          workflows: [ci, release, dependabot]
        rapid-prototype:
          workflows: []          # hiç workflow istemiyor
      ```
      Modül tarafında `github_repository_file` ile
      `.github/workflows/<ad>.yml` ve `.github/dependabot.yml` yazılır — CODEOWNERS
      için kullanılan mekanizmanın aynısı.

      **DİKKAT — bağımlılık:** `workflows` listesinde `ci` yoksa o repo'da `ci/test`
      status check'i hiç raporlanmaz. Bu durumda `protected_branches.*.require_status_checks`
      da boşaltılmalıdır, aksi halde PR'lar sonsuza kadar bekleyen check yüzünden
      merge edilemez. İdealde modül bunu kendisi tutarlı hale getirmeli veya
      tutarsızlığı `validation` ile hata olarak vermeli.

- [ ] **`branch-protection.tf`'de `enforce_admins` → `false`.**
      Karar verildi: mentörler her yere doğrudan push atabilir. Emre'nin
      [`terraform/branch-protection.tf`](terraform/branch-protection.tf) dosyasında
      `main` koruması hâlâ `enforce_admins = true`; bu ayarla mentörler `main`'e push
      atamıyor. `false` yapılmalı ve mentörler `restrict_pushes` listesine eklenmeli.
      (Modül tarafında zaten `false` — yalnızca `pilot-intern-api`'nin elle yazılmış
      kuralı uyumsuz.)

---

## 🔵 Emre ile ortak yapılacaklar

- [ ] **`pilot-intern-api`'yi modüle taşı.**
      Ayrıntılı açıklama aşağıda, "Pilot repo çakışması nedir?" başlığında.

---

## 🔴 İkinci bir GitHub hesabı gerektiren testler — sonraya bırakıldı

Pilot doğrulamasının **ret tarafı** test edilemedi. Sebep: Ozan bu repo'da hem
`pilot-intern-web-mentors` hem `platform-admins` üyesi ve org owner. Config'de
`enforce_admins: false` olduğu için kurallar ona uygulanmıyor — bu bilinçli bir
tercih (mentörler korumalı dala push atabilsin diye).

Sonuç: Ozan'ın push atabiliyor olması kuralın çalışmadığını **göstermez**. Engellenme
davranışını doğrulamak için yalnızca `developer` rolüne sahip bir hesap gerekir.

- [ ] Test için yetkisiz bir hesap ayarla (yeni bir GitHub hesabı açıp yalnızca
      `pilot-intern-web-devs` takımına eklemek en temiz sonucu verir; Emre'nin hesabı
      org owner olduğu için aynı bypass sorununu yaşar)
- [ ] **Push kısıtı testi** — `developer` rolündeki hesap `develop`'a doğrudan push
      denesin. Beklenen: **reddedilir**.
      Reddedilmezse `restrict_pushes` free plan'de uygulanmıyor demektir;
      [`ACCESS-MODEL.md`](ACCESS-MODEL.md)'e not düşülmeli.
- [ ] **Onay engeli testi** — aynı hesap PR açsın, onaysız merge etmeyi denesin.
      Beklenen: merge düğmesi engelli, "Review required".
- [ ] **Onay sonrası merge** — Ozan onaylasın, merge edilebildiği görülsün.
- [ ] **Code owner testi** — aynı hesap `main`'e PR açsın. Beklenen: 2 onay **ve**
      mentör (code owner) onayı istenir.
- [ ] Sonuçları [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 6'ya
      işle ve açık maddeleri kapat.

---

## ✅ Verilen Kararlar

Tartışması kapanmış, ayrı bir iş gerektirmeyen konular:

- **GitHub planı:** Şimdilik **free plan + public repo** ile devam. Team planı
  şirketten ileride talep edilecek. Private repo'da branch protection, ruleset ve push
  kısıtları çalışmadığı için pilot public açıldı — bu geçici ve bilinçli.
- **`enforce_admins`:** `false`. Mentörler her dala doğrudan push atabilir.
- **Erişim modeli:** Emre [`ACCESS-MODEL.md`](ACCESS-MODEL.md)'yi review etti, modelden
  haberdar. `docs/rbac-and-permissions.md` düzeltmesi merge edilebilir.

---

## ⚪ Sonraya bırakılanlar (Future Work)

Ayrıntıları [`ACCESS-MODEL.md`](ACCESS-MODEL.md) "Future Work" bölümünde:

- `consultant` rolü ve dış danışman erişimi
- Süre sınırlı erişim (`expires_at`)
- Repo force delete akışı (şimdilik `archived: true` yeterli)
- Dashboard'un teknik detayları (teknoloji, kimlik doğrulama, PR açma kimliği)
- Klasik branch protection yerine ruleset'e geçiş
- Config'in ayrı bir repo'ya taşınması (blast radius)
- **GitHub App'e geçiş** — Terraform'un commit'leri şu an Emre'nin kişisel token'ı
  üzerinden gidiyor ve `paitblack` adına görünüyor
  (bkz. [`docs/pilot-verification.md`](docs/pilot-verification.md) Bölüm 5).
  Gerekçe: [`docs/notes/github-auth-strategy.md`](docs/notes/github-auth-strategy.md).
- **Linear entegrasyonu** — bu sistemi Linear'a bağlamak, issue'ları oradan yönetmek.
  Hafta 4 kapsamında.

---

## Ek — Pilot repo çakışması nedir?

Ortada **iki ayrı pilot repo** var:

| Repo | Kim oluşturdu | Nasıl |
| :--- | :--- | :--- |
| `pilot-intern-api` | Emre | [`terraform/branch-protection.tf`](terraform/branch-protection.tf) içinde elle yazılmış `github_repository` bloğu |
| `pilot-intern-web` | Ozan | `modules/repository` modülü, config'den üretiliyor |

Emre'nin repo'yu elle oluşturmasının sebebi zamanlamaydı: branch protection kuralını
test etmek için bir repo'ya ihtiyacı vardı, modül henüz yazılmamıştı. Plana göre pilot
repo modülden doğacaktı; beklemek yerine ham `resource` bloğu yazdı.

**Sorun ne?** İki farklı yönetim biçimi yan yana duruyor:

- `pilot-intern-api`'nin kuralları HCL'de elle yazılı — değiştirmek için kod düzenlemek
  gerekiyor, config'den yönetilmiyor
- Label'ları, takımları, CODEOWNERS'ı yok — modülün verdiği hiçbir şeye sahip değil
- Kural değişikliği iki yerde yapılmak zorunda kalıyor (örn. yukarıdaki
  `enforce_admins` maddesi yalnızca bu repo için ayrıca düzeltilmeli)

**Ne yapılacak?** `pilot-intern-api` de config'den yönetilir hale gelmeli. İki yol var:

1. **Bloğu sil, config'e ekle.** Terraform önce repo'yu siler sonra yeniden yaratır —
   repo içeriği gider. Repo boş olduğu için şu an zararsız, ileride değil.
2. **`terraform state mv`** ile state'teki kaydı modül altına taşı. Hiçbir şey silinmez,
   Terraform "aynı repo, kodda yeri değişmiş" der. Daha doğru yöntem, biraz daha dikkat
   ister.

Karar Emre ile birlikte verilmeli. Repo boşken karar vermek ucuz, içine kod girdikten
sonra değil.

---

## Hafta 3 — Sıradaki

Detaylı liste [`tasks-ozan.md`](tasks-ozan.md) Hafta 3 bölümünde. Konuştuğumuz
kararlar sebebiyle plana eklenenler:

- [ ] `docs/config-guide.md` — config'i kim nasıl değiştirir (dashboard'un spec'i)
- [ ] `docs/adr/004-config-driven-access-management.md` — neden safe-settings değil
- [ ] `docs/runbook.md` — operasyonel senaryolar (repo kapatma, mentör değiştirme,
      offboarding'de Terraform'un kapsam sınırı)
