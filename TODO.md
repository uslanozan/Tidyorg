# TODO — Açık İşler

Bu dosya **kısa vadeli, elle yapılacak** işleri tutar: doğrulanmamış testler, bekleyen
temizlikler, tespit edilmiş tutarsızlıklar.

Faz planı ve mimari kararlar burada değil — [`ROADMAP.md`](ROADMAP.md) içindedir.
Tamamlanan işler buradan silinir; kalıcı kayıt [`docs/pilot-verification.md`](docs/pilot-verification.md)
ve [`docs/daily-logs/`](docs/daily-logs/) altındadır.

Son güncelleme: 2026-08-17

---

## 🔴 Tespit edilmiş tutarsızlıklar

- [ ] **`release.yml` hiçbir repo'ya dağıtılmıyor.**
      [`docs/release-process.md`](docs/release-process.md) otomatik sürümleme akışını
      yürürlükteymiş gibi anlatıyor, ancak `organization.yml` → `defaults.workflows`
      değeri `[ci]`. Şablon
      [`terraform/templates/.github/workflows/release.yml`](terraform/templates/.github/workflows/release.yml)
      yazılmış durumda ama hiçbir repo'da çalışmıyor.
      **Karar gerekiyor:** `workflows: [ci, release]` yapılacak mı, yoksa release
      otomasyonu repo bazında opsiyonel mi kalacak? Doküman şimdilik durumu not ediyor.

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
