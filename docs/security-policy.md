# Security Policies and Practices

This document defines the security standards in day-to-day development processes.

Last updated: 2026-08-17

> **This document separates two things: the rules enforced today and those not yet in place.**
> The previous version described the target state as if it were in effect (CodeQL scanning, org-wide
> push protection, "Tech Lead" approval) — none of which were in place. This is the most dangerous
> mistake a security document can make: it leads people to rely on a protection that does not exist.
> Section 5 explicitly lists what is **not** in place.

---

## 1. Secret Management — ✅ In Effect

An API key, password, token, or any sensitive data **cannot be added** to the codebase.

* **Local development.** All secrets are kept in `.env` files. The `.env` and `.env.*`
  patterns are blocked by [`.gitignore`](../.gitignore); only template files like `.env.example`
  enter the repository. `*.pem` and `*.key` are also on the same list.
* **CI/CD.** Sensitive data used in GitHub Actions comes via **GitHub Secrets**.
  What is defined today: `TF_API_TOKEN` (HCP Terraform Cloud authentication).
* **Terraform.** The GitHub App's private key and other sensitive variables are kept in HCP Terraform
  as **sensitive** environment variables; they never land on any developer's machine.

### What to do if a secret leaks

Once a secret has been pushed, **deleting the file is not enough** — it remains in git history.

1. Notify the mentor / head-of-engineering immediately.
2. **Revoke and rotate the relevant key.** This is the first and most important step; cleaning up
   the history is secondary.
3. Distribute the new key via `.env` or GitHub Secrets.

---

## 2. Dependency Updates (Dependabot) — ✅ In Effect

[`dependabot.yml`](../terraform/templates/.github/dependabot.yml) is deployed to every repo in `strict`
mode — that is, Terraform owns its content, and if it is changed by hand the next
`apply` reverts it.

* **Frequency:** weekly, on Monday. Covered ecosystems: `gomod`, `npm`, `pip`,
  `composer`, `github-actions`. Dependabot skips an ecosystem that has no manifest file,
  so a single file works in every repo.
* **Labeling:** opened PRs get the `type: chore` label, with the commit prefix `chore(deps)`
  (`chore(ci)` for Actions).
* **Grouping:** for package ecosystems, minor + patch are collected into a single PR, while **majors
  come in their own PR** — they can break the build and deserve a separate review. In GitHub Actions,
  majors are also considered routine and collected into a single PR.
* **Who reviews:** the repo's **mentor** (they are the code owner per CODEOWNERS). The "Tech Lead"
  role from the previous version of this document **does not exist** in the organization —
  the `tech-leads` team was removed on 2026-08-16 ([`../ACCESS-MODEL.md`](../ACCESS-MODEL.md)
  Decision 12).

> Dependabot only opens **updates**; vulnerability **alerts** are a separate setting
> (`vulnerability_alerts`). That too was connected to Terraform on 2026-08-18 — see Section 5.

---

## 3. What CI Does from a Security Standpoint — ✅ In Effect

[`ci.yml`](../terraform/templates/.github/workflows/ci.yml) runs on every PR and produces a
mandatory status check with the name `ci/test`. Its content varies by language:

| Language | What runs |
| :--- | :--- |
| Go | `golangci-lint` · `go test -race` · `go build` |
| Python | `ruff check` · `pytest` |
| TypeScript | `eslint` · `prettier --check` · `tsc --noEmit` · `npm test` |
| PHP | `phpstan` · `pint --test` · `phpunit` |

**These are lint and test tools, not a security scanner.** `golangci-lint` and
`phpstan` can catch some security patterns, but this does not count as SAST coverage.

> ⚠️ **Known limit:** Language jobs pass as `skipped` if there is no manifest file, and `ci/test`
> still reports green. This is a deliberate design decision (otherwise the check is never reported in
> a manifest-less repo and PRs wait forever), but the consequence is this: **a green
> `ci/test` means not "the tests passed" but "the defined tests passed."**

---

## 4. Code and Access Assurance — ✅ In Effect

* **Protected branches.** Direct push to `main` and `develop` is open only to the `mentor` and
  `head-of-engineering` roles; developers are not on the allowlist. Force
  push and branch deletion are disabled on both branches. Verified in production by a `GH006`
  rejection.
* **Mandatory review.** `main` requires 2 approvals + code owner (mentor) approval; `develop` requires
  1 approval. If a new commit arrives, existing approvals are dismissed (`dismiss_stale_reviews`).
* **Access is managed from code.** No one's access is granted from the GitHub interface; every access
  change leaves a commit, a PR, and a `plan` output
  ([`adr/004`](adr/004-config-driven-access-management.md)).
* **Drift is reverted.** A security setting changed by hand from the interface returns to the
  standard with the next `apply`.
* **`prevent_destroy`.** Accidentally deleting a repo definition from the config does not destroy the
  repo; `apply` stops with an error.

> ⚠️ **Permanent exemption:** Because `enforce_admins = false`, the mentor and
> head-of-engineering can bypass all of the branch rules above. It is a deliberate concession, and it
> makes who is in these roles a **human-resources rather than a technical** matter. Rationale and
> consequences: [`rbac-and-permissions.md`](rbac-and-permissions.md) Section 4.

---

## 5. What Is Not Yet in Place — ⛔ Don't rely on these

The following are targeted but **not in effect today** protections. They are planned under Phase 6
([`../ROADMAP.md`](../ROADMAP.md)).

| Protection | Status | Note |
| :--- | :--- | :--- |
| **Code scanning (CodeQL)** | ⛔ None | There is no CodeQL step in `ci.yml`. There is **no** mechanism whereby a critical/high finding blocks the merge. |
| **Time-limited access** | ⛔ None | Temporary access must be removed by hand. |
| **Branch protection on private repos** | ⛔ Blocked | Does not work on the free plan. Repos are `public` for this reason; the GitHub Team plan is a prerequisite. |
| **Secret scanning on private repos** | ⛔ Blocked | Requires GitHub Advanced Security (Enterprise). The module **silently skips** this setting on a private repo — even if the config says `true`, it is not applied. The only repo affected today: `pilot-access-test`. |
| **`advanced_security`** | ⛔ Intentionally unmanaged | Implicitly on for public repos, requires a license for private ones. Trying to manage it in either case produces an error. It will be reconsidered if we move to the Team/Enterprise plan. |
| **`members_can_create_public_repositories`** | ⚠️ **On** | Any org member can create a **public** repo. `default_repository_permission = none` does not turn this off — a different axis. Decision pending. |

### 5.1 Items that left this section on 2026-08-18

The following are now **in effect in Section 4** — they remain in this table as a historical record:

| Protection | New status |
| :--- | :--- |
| **`vulnerability_alerts`** | ✅ Managed from config (`defaults.vulnerability_alerts`), on in all four repos. ⚠️ Finding: **it was off in this repo** — the control plane itself was not receiving Dependabot alerts. |
| **Secret scanning / Push protection** | ✅ On in three public repos (`defaults.secret_scanning`). Push protection is the truly valuable one: a leaked key is rejected on push **before** it enters the repo. |
| **Org-wide security defaults** | ✅ All five are turned on — new repos are now born with Dependabot alerts + security updates + dependency graph + secret scanning. Before, **all six were off**. |
| **"Who can bypass?" report** | ✅ `terraform output branch_protection_bypass` |

---

## 6. Vulnerability Reporting

1. **Do not open a public GitHub issue** for vulnerabilities.
2. Send findings, along with technical detail and reproduction steps, by email to
   `security@example.com`.

The per-repo policy text is in the `SECURITY.md` file at the root of each repo
([`../SECURITY.md`](../SECURITY.md)). This file is deployed in `seed` mode: it is written on the
initial creation, and afterward the repo can change it according to its own needs.

---

## 7. Related Documents

- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Permission matrix and bypass analysis
- [`runbook.md`](runbook.md) — Emergency access revocation, offboarding
- [`code-review-guide.md`](code-review-guide.md) — What to look at in a review
- [`../ROADMAP.md`](../ROADMAP.md) — Phase 6: bringing security settings under management
