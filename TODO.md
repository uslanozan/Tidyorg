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

- [ ] **`main` akışında code owner testi.** `developer` rolündeki hesap `main`'e PR
      açsın. Beklenen: 2 onay **ve** mentör (code owner) onayı istenir.
      6.3/6.4 testleri yalnızca `develop` üzerinde yapıldı.

- [ ] **Force push testi.** `develop`'a `git push --force` denensin. Admin bypass'ının
      force push'u da kapsayıp kapsamadığı bilinmiyor. Sonuç ne olursa olsun
      `pilot-verification.md`'ye yazılmalı.

- [ ] **Drift düzeltme demosu.** GitHub arayüzünden `develop` korumasındaki onay sayısını
      değiştir, `terraform plan` ile farkı gör, `apply` ile geri al.
      Sunum için en etkili demo; 30 saniye sürer.

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
