# Contributing to Tidyorg

First off, thank you for considering contributing to our project. This document outlines the engineering standards and workflows we follow.

## 1. Branching Strategy

We follow a Modified GitFlow approach. Never push directly to the `main` or `develop` branches — those branches are protected and direct pushes are rejected.

* **`feat/...`** : For new features and enhancements.
* **`fix/...`** : For bug fixes.
* **`chore/...`** : For routine tasks, dependency updates, and tooling.
* **`docs/...`** : For documentation-only changes.
* **`release/...`** : For release preparation (branches from `develop`, merges into `main`).
* **`hotfix/...`** : For urgent production issues (must branch from `main`, and must also be merged back into `develop`).

> **Note:** Control-plane repositories (those holding infrastructure config) are trunk-based and have no `develop` branch; there, branches are opened from `main` and merged back into `main`.

## 2. Commit Convention

We use Conventional Commits to automate our semantic versioning and changelog generation.

* **`feat:`** Introduces a new feature (triggers a MINOR version bump).
* **`fix:`** Patches a bug (triggers a PATCH version bump).
* **`docs:`** Documentation only changes.
* **`refactor:`** A code change that neither fixes a bug nor adds a feature.

A `!` after the type, or a `BREAKING CHANGE:` footer, triggers a MAJOR version bump.

## 3. Pull Request (PR) Process

1. Ensure your code passes all local linting and testing steps.

2. Open a PR against the `develop` branch using our standard PR template. Fill in the **"Why?"** section — the diff already shows *what* changed.

3. Wait for the `ci/test` status check to pass. It is a required check; the merge button stays locked until it is green.

4. Obtain the required approvals. The exact number depends on the target branch and is configured per repository — the PR page tells you what is still missing. Typically: `develop` needs 1 approval, `main` needs 2 approvals **plus** a code owner (mentor) review.

5. Merge with **Squash and merge** when targeting `develop`. The branch is deleted automatically.

> Pushing a new commit dismisses existing approvals (`dismiss_stale_reviews`). This is deliberate: the approved code and the merged code must be the same code.
