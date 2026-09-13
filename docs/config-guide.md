# Configuration Guide

Every repo, team, and permission in your organization is managed under two different structures:

1. **Global Settings**: `terraform/config/organization.yml` (Roles, defaults, teams)
2. **Repo Definitions**: `terraform/config/repositories/<repo-name>.yml` (Mentors, developers, project-specific settings)

This document explains how to read these files, how to change them, and how a change is
reflected in GitHub.

> **Who it's for:** mentors and head-of-engineering. Developers don't need to
> touch these files.

---

## 1. Core Principle — Code and Data Are Separate

The system consists of two layers:

| Layer | Files | Content | Who changes it | Frequency |
| :--- | :--- | :--- | :--- | :--- |
| **Code** | `terraform/modules/repository/*.tf` | "How a repo is set up, how a rule is enforced" | Platform team | Rarely |
| **Data (Global)** | `terraform/config/organization.yml` | Roles, default branch protections, general settings | Head of Engineering | Rarely |
| **Data (Repo)** | `terraform/config/repositories/*.yml` | "Which repo exists, who has which permission" | Mentor | Often |

You don't write Terraform code to add a new repo — you add a new file under `config/repositories/`.
In the future a dashboard will write these files; even then the only thing that changes will be these data files.

Schema reference and examples of all fields:
- [`organization.example.yml`](../terraform/config/organization.example.yml)
- [`repository.example.yml`](../terraform/config/repository.example.yml)
The rationale for the model: [`ACCESS-MODEL.md`](../ACCESS-MODEL.md).

---

## 2. Sections of the File

### 2.1 `roles` — The definition of a permission

```yaml
roles:
  head-of-engineering:
    scope: organization      # Applies to all repos
    repo_permission: admin

  mentor:
    scope: repository        # Only in the repo it is assigned to
    repo_permission: admin

  developer:
    scope: repository
    repo_permission: push
```

**Design principle: rules depend on the role, not the person.** What a role can do is defined
here once. When the person changes, this section is not touched — only the assignment changes.

`repo_permission` values are GitHub's roles: `pull` (read-only), `triage`,
`push` (write), `maintain`, `admin`.

With the current classic branch-protection model, GitHub exempts repository admins
because `enforce_admins` is disabled. Bypass is therefore an effective consequence
of `repo_permission: admin`, not a separate configurable role flag. The
`terraform output branch_protection_bypass` report lists the effective people for
each repository and protected branch.

The former `bypass_branch_protection` role key was removed because classic branch
protection cannot enforce it independently per role. The engine now fails fast if
that legacy key remains, rather than silently accepting a misleading policy.

> ⚠️ Changing this section affects **the entire organization.** Making the `developer` role's
> `repo_permission` value `admin` makes everyone an admin on every repo with a single line.
> Changes like this call for a second review.

### 2.2 `config_repository` — Dashboard proposal access

```yaml
config_repository: tidyorg-config
```

Set this to the repository that contains the live `config/` directory, and also
declare that repository under `config/repositories/`. Terraform creates a
`tidyorg-dashboard-writers` team containing the union of all project mentors and
grants that team `push` on this repository. This lets mentors create dashboard
branches and pull requests. It does not grant admin and therefore does not let
them bypass the protected default branch.

### 2.3 `people` — People

```yaml
people:
  owner-a:
    org_role: admin
    roles: [head-of-engineering]

  new-developer:
    org_role: member
```

The key is the person's **GitHub username** — a typo can silently grant permission to the wrong
person, so check it twice.

`org_role`: the organization-level role (`admin` or `member`).
`roles`: organization-wide role assignments (only needed for `head-of-engineering`).

> **Note:** This section is currently not consumed by Terraform. Handing organization membership
> (`github_membership`) over to Terraform was deliberately deferred because it could affect
> existing owner permissions.

### 2.4 `defaults` — Every repo's inheritance

```yaml
defaults:
  visibility: public
  has_issues: true
  default_branch: develop

  protected_branches:
    main:
      required_reviews: 2
      require_code_owner_review: true
      require_status_checks: [ci/test]
      allow_force_push: false
      push_allowed_roles: [mentor, head-of-engineering]
    develop:
      required_reviews: 1
      require_code_owner_review: false
      ...

  labels:
    - { name: "type: bug", color: "d73a4a", description: "Bug / incorrect behavior" }
    ...
```

Everything written here applies to **all repos.** If a repo wants to behave differently, it writes
only the field that differs in its own block.

The purpose of this section is this: a new repo is born with **safe defaults** even without any
security setting written. The person creating the repo does not need to know branch protection.

### 2.5 Per-Repo Configurations (`config/repositories/<repo-name>.yml`)

Each project's definition is stored in a `.yml` file created with its own name. For example, for the `payments-api` repo, the `config/repositories/payments-api.yml` file:

```yaml
description: "Payment service"
language: go
mentors: [mentor-a]
developers: [dev-1, dev-2]
```

| Field | Required | Description |
| :--- | :--- | :--- |
| `description` | ✅ | Repo description |
| `language` | ✅ | `go` · `python` · `typescript` · `php` |
| `mentors` | — | Mentors' usernames (a list; today a single element) |
| `developers` | — | Developers working on the project (many-to-many) |
| `visibility` | — | Overrides the default (`public` \| `private`) |
| `archived` | — | If `true`, the repo is frozen |
| `protected_branches` | — | Overrides branch rules (see Section 3) |
| `code_owners` | — | Path-based review routing |
| `labels` | — | Replaces the label set entirely |
| `files` | — | Distribution mode of template files (see Section 2.5) |
| `workflows` | — | Workflows to distribute: `ci` · `release`. The list **fully overrides**, no partial merge. |

> ⚠️ `dependabot` is **not** a workflow. `.github/dependabot.yml` is a template
> file and is managed under `files.dependabot`. If it is written into the `workflows` list,
> Terraform looks for a non-existent template file and `apply` errors.

### 2.5 `files` — Distribution of template files

```yaml
files:
  contributing: seed        # strict | seed | none
  security: seed
  editorconfig: seed
  pr_template: strict
  issue_templates: strict
  dependabot: strict
```

| Mode | Behavior | Suitable for |
| :--- | :--- | :--- |
| `strict` | Terraform owns the content; a manual change is reverted on the next `apply` | Governance files |
| `seed` | Written only on first creation; the repo can later change it to its own liking | Content files |
| `none` | Never written | — |

Because this map is **a flat map**, a repo writes only the key it wants to change;
the rest comes from `defaults`. Workflows are outside this table and **always behave `strict`** —
they count as governance files.

---

## 3. Default and Override Logic

A repo writes only **the field that differs**; the rest comes from `defaults`.

```yaml
# defaults (organization.yml)
defaults:
  protected_branches:
    main:
      required_reviews: 2
      require_code_owner_review: true
      dismiss_stale_reviews: true

# billing-web.yml (config/repositories/billing-web.yml)
protected_branches:
  main:
    required_reviews: 3      # Only this field differs
```

Result: for `billing-web`, the `main` branch requires **3 reviews**, but `require_code_owner_review`
and `dismiss_stale_reviews` continue to come from the default.

Merging is done per branch — overriding one branch does not delete that branch's other fields.

---

## 4. Common Operations

### Adding a new repo

Create a new file named `config/repositories/new-service.yml` and write the following into it:

```yaml
description: "Short description"
language: go
mentors: [mentor-a]
developers: [dev-1, dev-2]
```

After the file is created, branches, protections, teams, labels, and CODEOWNERS are created automatically.

### Adding a developer to a project

Add the username to the relevant repo's `developers` list. If the person is new to the organization,
also add a line to the `people` section.

### Removing a person from a project

Delete their name from the `developers` list. Terraform removes that person's team membership and
repo access ends instantly.

### When a person leaves the company

Remove them from all repos' `developers` / `mentors` lists and from the `people` section.
Because it's managed from a single point, there's no need to go repo by repo.

> ⚠️ Terraform only manages **GitHub.** Access in Linear, Slack, and other systems
> must be removed separately. Full checklist: [`runbook.md`](runbook.md).

### Changing the mentor

Update the `mentors` field. The old mentor's admin permission drops automatically and the new one's
comes in. The rule text is not touched.

### Relaxing the review rule on a repo

Into `config/repositories/rapid-prototype.yml`:

```yaml
protected_branches:
  develop:
    required_reviews: 0        # Merge allowed without review
    require_status_checks: []  # Merge without waiting for CI
```

As long as `push_allowed_roles` is not overridden, developers still cannot push directly;
contributions keep coming via PR — only the wait is removed.

### Closing a repo

```yaml
# config/repositories/legacy-api.yml
archived: true
```

**Do not delete the config file from the directory.** Deleting it tells Terraform to "destroy this repo";
the `prevent_destroy` protection kicks in and stops the `apply`:

```
Error: Instance cannot be destroyed
```

The right way is to archive: the repo is frozen, the content is preserved, no one can write.

---

## 5. How a Change Takes Effect

```
config/repositories/*.yml or organization.yml changes
        ↓
    Pull Request
        ↓
CI: terraform plan  →  the plan output is posted as a comment on the PR
        ↓
    Review + Merge
        ↓
   terraform apply  →  permissions are updated on GitHub
```

**Do not approve without reading the `plan` output.** Look especially at this line:

```
Plan: 3 to add, 1 to change, 0 to destroy.
```

If the `destroy` count is greater than 0, be sure to check what will be deleted.

### Running manually

```powershell
terraform -chdir=terraform plan     # Show the diff, change nothing
terraform -chdir=terraform apply    # Apply (asks for confirmation)
```

To verify the system is stable:

```
No changes. Your infrastructure matches the configuration.
```

Any other output shows either that someone made a manual change from the UI or that a setting did
not take hold.

---

## 6. Common Pitfalls

**A change you make from the UI is reverted.** If you change branch protection from the GitHub UI,
the next `apply` returns it to its old state. The only way to make a change permanent is the config.
This is not a bug but a safeguard that automatically corrects departures from the standard.

**GitHub silently ignores some requests.** For example, if you put a team on the `push_allowed_roles`
list but that team has no repo access, GitHub ignores the request without erroring. The symptom: the
same resource appearing as "will change" on every `plan`. In such a case, check whether the setting
actually took hold.

**`require_status_checks` and CI distribution must be set together.** If a CI workflow is not
distributed to a repo, `require_status_checks` must also be emptied; otherwise PRs wait forever for a
check that will never be reported and cannot be merged.

**Username typos are silent.** A non-existent username errors during `apply`, but granting permission
to an existing **wrong** user produces no warning at all.

**Free plan constraint.** On private repos, branch protection and push restrictions require the GitHub
Team plan. Because we currently work with public repos this constraint isn't felt; a plan upgrade will
be needed when moving to private.

---

## 7. CI/CD Automation and Identity Configuration

There are **two independent concerns** here; keep them separate:

1. **Who writes to GitHub** — always the GitHub App (`tidyorg-infra-bot`). Its private key never
   lands on a developer's machine and the installation token is renewed automatically about once an
   hour. Setup and permission list: [`../integrations/github-app/README.md`](../integrations/github-app/README.md).
2. **Where the Terraform state lives** — chosen with the `TF_STATE` variable on the engine image.

### 7.1 Choosing a state backend

| `TF_STATE` | State lives in | When to use |
| :--- | :--- | :--- |
| `local` (default) | the mounted `/state` volume | quick trials, a single operator; zero setup |
| `hcp` | HCP Terraform / Terraform Cloud | **recommended for teams and CI** — shared, locked, audited state |
| `custom` | your own backend (S3, GCS, azurerm, …) | you already run remote state elsewhere |

For a team CI pipeline **HCP is the recommended default**: concurrent runs are locked so two merges
can't corrupt state, and every run is recorded. Local state is perfect for a first look but is a
single file on one host — no locking, no sharing. See the README's *Backend (state)* section for the
exact `docker run` invocations.

### 7.2 Two identities in CI (HCP path)

When CI applies through HCP, two credentials are in play — do not confuse them:

| Identity | What it accesses | Where it lives |
| :--- | :--- | :--- |
| **`TF_TOKEN_app_terraform_io`** (HCP token) | GitHub Actions → HCP Terraform (state + runs) | GitHub Actions secret |
| **`tidyorg-infra-bot`** (GitHub App) | Terraform provider → GitHub organization | Sensitive variable in the CI/HCP environment |

The App is what mutates GitHub; the HCP token only lets CI reach the remote state. With `TF_STATE=hcp`
the engine also needs `TF_CLOUD_ORGANIZATION` and `TF_WORKSPACE`.

**Creating the HCP token:** in HCP Terraform → organization settings → **Team Tokens**, pick a team
with `Admin`/`Write` on the workspace (e.g. `owners`), **Generate a team token**, and copy it.

**Storing it in GitHub:** in the config repo → **Settings → Secrets and variables → Actions → New
repository secret**, name it `TF_TOKEN_app_terraform_io`, paste the token, and save.

> With `TF_STATE=local` there is no HCP token and none of this section applies — state is just the
> file on the mounted `/state` volume.

---

## 8. Related Documents

- [`workflow-guide.md`](workflow-guide.md) — Overview of the workflows
- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Roles and the permission matrix
- [`runbook.md`](runbook.md) — Operational scenarios
- [`../ACCESS-MODEL.md`](../ACCESS-MODEL.md) — The model's rationale and the decisions made
- [`../terraform/config/organization.example.yml`](../terraform/config/organization.example.yml) — Full schema example
- [`../terraform/config/repository.example.yml`](../terraform/config/repository.example.yml) — Repo schema example
