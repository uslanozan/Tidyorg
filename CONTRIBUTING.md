# Contributing to Tidyorg · Tidyorg'a Katkıda Bulunma

EN — First off, thank you for considering contributing to our project. This document outlines the engineering standards and workflows we follow.
TR — Öncelikle, projemize katkıda bulunmayı düşündüğünüz için teşekkür ederiz. Bu belge, izlediğimiz mühendislik standartlarını ve iş akışlarını özetlemektedir.

## 1. Branching Strategy · Dal (Branch) Stratejisi

EN — We strictly follow a Modified GitFlow approach. Never push directly to the `main` or `develop` branches.
TR — Kesinlikle Modified GitFlow yaklaşımını uyguluyoruz. Asla doğrudan `main` veya `develop` dallarına kod göndermeyin.

* **`feature/...`** : EN — For new features and enhancements. · TR — Yeni özellikler ve geliştirmeler için.
* **`fix/...`** : EN — For bug fixes. · TR — Hata düzeltmeleri için.
* **`chore/...`** : EN — For routine tasks, dependency updates, and tooling. · TR — Rutin görevler, bağımlılık güncellemeleri ve araçlar için.
* **`hotfix/...`** : EN — For urgent production issues (must branch from `main`). · TR — Acil canlı ortam sorunları için (`main` dalından ayrılmalıdır).

## 2. Commit Convention · Commit Standartları

EN — We use Conventional Commits to automate our semantic versioning and changelog generation.
TR — Semantik versiyonlamayı ve sürüm notu (changelog) üretimini otomatize etmek için Conventional Commits kullanıyoruz.

* **`feat:`** EN — Introduces a new feature (triggers a MINOR version bump). · TR — Yeni bir özellik ekler (MINOR versiyon artışını tetikler).
* **`fix:`** EN — Patches a bug (triggers a PATCH version bump). · TR — Bir hatayı çözer (PATCH versiyon artışını tetikler).
* **`docs:`** EN — Documentation only changes. · TR — Sadece dokümantasyon değişiklikleri.
* **`refactor:`** EN — A code change that neither fixes a bug nor adds a feature. · TR — Ne bir hata düzelten ne de bir özellik ekleyen kod değişikliği.

## 3. Pull Request (PR) Process · Pull Request Süreci

EN — 1. Ensure your code passes all local linting and testing steps.
TR — 1. Kodunuzun tüm yerel lint ve test adımlarından geçtiğinden emin olun.

EN — 2. Open a PR against the `develop` branch using our standard PR template.
TR — 2. Standart PR şablonumuzu kullanarak `develop` dalına doğru bir PR açın.

EN — 3. Wait for GitHub Actions (CI) to complete successfully.
TR — 3. GitHub Actions (CI) süreçlerinin başarıyla tamamlanmasını bekleyin.

EN — 4. Obtain at least 1 approval from the Code Owners before merging.
TR — 4. Birleştirmeden (merge) önce Kod Sahiplerinden (Code Owners) en az 1 onay alın.