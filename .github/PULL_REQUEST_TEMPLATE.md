<!--
  EN — Keep this PR small and focused. A PR that does one thing gets reviewed in
       minutes; a PR that does five things sits for days.
  TR — PR'ı küçük ve tek konuya odaklı tut. Tek iş yapan bir PR dakikalar içinde
       review edilir; beş iş yapan bir PR günlerce bekler.

  Guides · Rehberler: docs/code-review-guide.md · docs/commit-convention.md
  Fill this in English or Turkish. · Bu formu İngilizce ya da Türkçe doldurabilirsin.
-->

## What changed? · Ne değişti?

<!--
  EN — One or two sentences. What a reviewer will see in the diff.
  TR — Bir iki cümle. Reviewer'ın diff'te göreceği şey.
-->

## Why? · Neden?

<!--
  EN — The context a reviewer cannot get from the diff: the problem this solves,
       the decision you made and what you rejected. This is the field reviewers
       actually need — spend your time here, not above.
  TR — Reviewer'ın diff'ten çıkaramayacağı bağlam: hangi problemi çözüyor, hangi
       kararı verdin ve neyi reddettin. Reviewer'ın gerçekten ihtiyaç duyduğu alan
       burası — vaktini yukarıya değil buraya harca.
-->

## Type of change · Değişiklik tipi

<!--
  EN — Tick one. It must match the type in your commit messages. The version bump
       in brackets is what this change triggers on release — see docs/release-process.md.
  TR — Bir tanesini işaretle ve commit mesajlarındaki tip ile aynı olsun. Parantez içindeki
       sürüm etkisi, bu değişikliğin release'te tetikleyeceği artıştır — docs/release-process.md.
-->

- [ ] `feat` — new feature · yeni özellik *(MINOR)*
- [ ] `fix` — bug fix · hata düzeltme *(PATCH)*
- [ ] `perf` — performance improvement · performans iyileştirmesi *(PATCH)*
- [ ] `refactor` — code improvement, no behaviour change · davranışı değiştirmeyen kod iyileştirmesi
- [ ] `docs` — documentation only · sadece dokümantasyon
- [ ] `test` — adding or updating tests · test ekleme/güncelleme
- [ ] `chore` — maintenance, config, dependencies · bakım, config, bağımlılık
- [ ] `ci` — CI/CD pipeline change · CI/CD değişikliği
- [ ] ⚠️ `BREAKING CHANGE` — incompatible change, described under "Why?" · kırılma değişikliği, "Neden?" altında açıkladım *(MAJOR)*

## Testing / Validation · Test / Doğrulama

<!--
  EN — Tick what applies and fill in the blank. "Tested locally" tells a reviewer nothing.
  TR — Uygun olanı işaretle ve boşluğu doldur. "Local'de denedim" hiçbir şey anlatmıyor.
-->

- [ ] Automated tests added or updated — which ones? · Otomatik test eklendi/güncellendi — hangileri?
- [ ] Verified manually — which steps? · Elle doğrulandı — hangi adımlarla?
- [ ] Existing tests pass locally · Mevcut testler local'de geçiyor
- [ ] No validation needed — why not? · Doğrulama gerekmedi — neden?

**Validation notes · Doğrulama notları:**

<!--
  EN — Name the tests, the commands you ran, or the steps you walked through.
  TR — Eklediğin testleri, çalıştırdığın komutları ya da izlediğin adımları yaz.
-->

## Semantic commit checklist · Semantic commit kontrolü

<!-- docs/commit-convention.md -->

- [ ] Commit messages follow `<type>(scope): <subject>` · Commit mesajları `<type>(scope): <subject>` formatında
- [ ] Subject is imperative and under ~72 characters · Konu satırı emir kipinde ve ~72 karakterden kısa
- [ ] No leftover `wip` or `fix typo` commits — squashed before merge · Geride `wip` / `fix typo` commit'i kalmadı — merge öncesi squash'landı

## Release impact · Prod etkisi

- [ ] No production impact · Production'a etkisi yok
- [ ] Changes production behaviour — described under "Why?" · Production davranışı değişiyor — "Neden?" altında açıkladım
- [ ] Needs a migration, config change, or manual step — described above · Migration, config değişikliği veya manuel adım gerekiyor — yukarıda açıkladım

## Checklist

- [ ] I read my own diff before requesting review · Review istemeden önce kendi diff'imi okudum
- [ ] Docs updated, or not applicable · Dokümantasyon güncellendi ya da gerekmiyor
- [ ] No secrets, tokens, or credentials in the diff · Diff'te secret, token veya kimlik bilgisi yok

## Screenshots / Notes for the reviewer · Ekran görüntüsü / Reviewer'a notlar

<!--
  EN — Both optional — delete this section if you have nothing to add.
       Screenshots: only for user-visible changes (before/after helps).
       Notes: where to start reading, a tradeoff you are unsure about,
       or follow-up work you deliberately left out of scope.
  TR — İkisi de opsiyonel; ekleyecek bir şeyin yoksa bu bölümü sil.
       Ekran görüntüsü: sadece kullanıcıya görünen değişikliklerde (öncesi/sonrası iyi olur).
       Notlar: nereden okumaya başlanmalı, emin olmadığın bir tercih,
       ya da bilinçli olarak kapsam dışı bıraktığın işler.
-->
