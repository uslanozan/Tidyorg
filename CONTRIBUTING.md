# Contributing to Tidyorg · Tidyorg'a Katkıda Bulunma

EN — First off, thank you for considering contributing to our project. This document outlines the engineering standards and workflows we follow.
TR — Öncelikle, projemize katkıda bulunmayı düşündüğünüz için teşekkür ederiz. Bu belge, izlediğimiz mühendislik standartlarını ve iş akışlarını özetlemektedir.

## 1. Branching Strategy · Dal (Branch) Stratejisi

EN — We follow a Modified GitFlow approach. Never push directly to the `main` or `develop` branches — those branches are protected and direct pushes are rejected.
TR — Modified GitFlow yaklaşımını uyguluyoruz. Asla doğrudan `main` veya `develop` dallarına kod göndermeyin — bu dallar korumalıdır ve doğrudan push reddedilir.

* **`feat/...`** : EN — For new features and enhancements. · TR — Yeni özellikler ve geliştirmeler için.
* **`fix/...`** : EN — For bug fixes. · TR — Hata düzeltmeleri için.
* **`chore/...`** : EN — For routine tasks, dependency updates, and tooling. · TR — Rutin görevler, bağımlılık güncellemeleri ve araçlar için.
* **`docs/...`** : EN — For documentation-only changes. · TR — Yalnızca dokümantasyon değişiklikleri için.
* **`release/...`** : EN — For release preparation (branches from `develop`, merges into `main`). · TR — Sürüm hazırlığı için (`develop`'tan açılır, `main`'e merge edilir).
* **`hotfix/...`** : EN — For urgent production issues (must branch from `main`, and must also be merged back into `develop`). · TR — Acil canlı ortam sorunları için (`main` dalından ayrılmalı ve `develop`'a da geri merge edilmelidir).

> EN — **Note:** Control-plane repositories (those holding infrastructure config) are trunk-based and have no `develop` branch; there, branches are opened from `main` and merged back into `main`.
> TR — **Not:** Kontrol düzlemi repoları (altyapı konfigürasyonu barındıranlar) trunk-based çalışır ve `develop` dalı yoktur; orada dallar `main`'den açılır ve `main`'e döner.

## 2. Commit Convention · Commit Standartları

EN — We use Conventional Commits to automate our semantic versioning and changelog generation.
TR — Semantik versiyonlamayı ve sürüm notu (changelog) üretimini otomatize etmek için Conventional Commits kullanıyoruz.

* **`feat:`** EN — Introduces a new feature (triggers a MINOR version bump). · TR — Yeni bir özellik ekler (MINOR versiyon artışını tetikler).
* **`fix:`** EN — Patches a bug (triggers a PATCH version bump). · TR — Bir hatayı çözer (PATCH versiyon artışını tetikler).
* **`docs:`** EN — Documentation only changes. · TR — Sadece dokümantasyon değişiklikleri.
* **`refactor:`** EN — A code change that neither fixes a bug nor adds a feature. · TR — Ne bir hata düzelten ne de bir özellik ekleyen kod değişikliği.

EN — A `!` after the type, or a `BREAKING CHANGE:` footer, triggers a MAJOR version bump.
TR — Türün ardından `!` işareti veya `BREAKING CHANGE:` altbilgisi MAJOR versiyon artışını tetikler.

## 3. Pull Request (PR) Process · Pull Request Süreci

EN — 1. Ensure your code passes all local linting and testing steps.
TR — 1. Kodunuzun tüm yerel lint ve test adımlarından geçtiğinden emin olun.

EN — 2. Open a PR against the `develop` branch using our standard PR template. Fill in the **"Why?"** section — the diff already shows *what* changed.
TR — 2. Standart PR şablonumuzu kullanarak `develop` dalına doğru bir PR açın. **"Why?"** bölümünü doldurun — *ne* değiştiğini diff zaten gösteriyor.

EN — 3. Wait for the `ci/test` status check to pass. It is a required check; the merge button stays locked until it is green.
TR — 3. `ci/test` status check'inin geçmesini bekleyin. Zorunlu bir kontroldür; yeşile dönene kadar merge düğmesi kilitli kalır.

EN — 4. Obtain the required approvals. The exact number depends on the target branch and is configured per repository — the PR page tells you what is still missing. Typically: `develop` needs 1 approval, `main` needs 2 approvals **plus** a code owner (mentor) review.
TR — 4. Gerekli onayları alın. Onay sayısı hedef dala göre değişir ve repo bazında konfigüre edilir — PR sayfası neyin eksik olduğunu gösterir. Tipik olarak: `develop` 1 onay, `main` 2 onay **ve** code owner (mentör) onayı ister.

EN — 5. Merge with **Squash and merge** when targeting `develop`. The branch is deleted automatically.
TR — 5. `develop` hedefliyorsanız **Squash and merge** ile birleştirin. Dal otomatik olarak silinir.

> EN — Pushing a new commit dismisses existing approvals (`dismiss_stale_reviews`). This is deliberate: the approved code and the merged code must be the same code.
> TR — Yeni commit atmak mevcut onayları düşürür (`dismiss_stale_reviews`). Bu bilinçlidir: onaylanan kod ile merge edilen kod aynı olmalıdır.
