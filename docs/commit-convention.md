# Commit Message Standards (Conventional Commits)

As the Tidyorg engineering teams, we use the [Conventional Commits](https://www.conventionalcommits.org/) standard to keep our code history clean, to speed up code review processes, and to be able to do automated version management (Semantic Versioning).

All PRs (Pull Requests) and commit messages must conform to this standard.

---

## 1. Commit Message Format

Every commit message must structurally be in the following format:

```text
<type>(<scope>): <short-description>

[optional body]

[optional footer]
```

* **Type:** Indicates the purpose of the change (Required).
* **Scope:** Indicates where in the codebase the change has an effect (Optional but strongly recommended).
* **Description:** A short summary of the work done. It must be written in English and start with the imperative mood (e.g., "add" not "added").
* **Body & Footer:** Used to write the details of the change, why it was made, or the numbers of the Issues it closes (Optional).

---

## 2. Allowed Types

The following types are recognized by our automation tools (CI/CD) and are reflected appropriately in the release notes (Changelog).

| Type | Purpose of Use | Effect on Release Notes |
| :--- | :--- | :--- |
| `feat` | Adds a completely new feature. | New Features |
| `fix` | Fixes a bug in the codebase. | Bug Fixes |
| `chore` | Maintenance work and dependency updates that do not affect production code. | Invisible (Hidden) |
| `refactor` | A code improvement that neither fixes a bug nor adds a feature. | Invisible (Hidden) |
| `docs` | Updates to Markdown documents or in-code comments only. | Invisible (Hidden) |
| `test` | Adding missing tests or fixing existing tests. | Invisible (Hidden) |
| `ci` | Changes to CI/CD configuration files and scripts. | Invisible (Hidden) |
| `perf` | A change that improves the performance of the code. | Performance Improvements |

---

## 3. Scope Examples

The scope indicates which part of the project changed. Although it varies by project, common usages are as follows:

* `(auth)`: Authentication, JWT, login operations.
* `(payment)`: Payment infrastructure, billing.
* `(ui)`: User interface, frontend components.
* `(db)`: Database schemas, migration files.
* `(api)`: REST/GraphQL endpoints.
* `(deps)`: Dependency updates.

---

## 4. Good and Bad Commit Examples

**❌ Bad Examples (Will Be Rejected):**
> * "fixed login bug" *(No format, non-standard)*
> * "update" *(Too vague, what was updated?)*
> * "fix(ui): fixed the menu and added auth" *(Two different tasks done in a single commit)*
> * "WIP" *(Work In Progress — these kinds of commits should be squashed before opening a PR)*

**✅ Good Examples (Will Be Accepted):**
> * `feat(auth): add google oauth2 login integration`
> * `fix(payment): resolve null pointer exception in stripe webhook`
> * `chore(deps): bump react from 18.2.0 to 18.3.1`
> * `docs(readme): update installation instructions`

---

## 5. Relationship with Semantic Versioning (SemVer)

The headers in commit messages directly trigger our automatic version tagging (`vX.Y.Z`) system:

1. **PATCH (v1.0.X):** Commits of type `fix`, `perf` increase the patch version.
2. **MINOR (v1.X.0):** Commits of type `feat` increase the minor version.
3. **MAJOR (vX.0.0):** If a `!` mark is placed next to any commit type or `BREAKING CHANGE:` is written in the footer section, this indicates that backward compatibility has been broken and increases the major version.
   * Example: `feat(api)!: remove v1 endpoints`
