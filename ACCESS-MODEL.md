# Access Model — Target Design Notes

> This file records the project's **ultimate goal** and its authorization model.
> The weekly task lists describe **what** will be done; this file describes the **why**.
> Anyone (or any code assistant) starting to work in a new environment should read this first.

Last updated: 2026-08-17

---

## 1. Ultimate Goal

The infrastructure being built is not designed to manage a single pilot repo, but to be
**an engine that takes an externally supplied configuration as input and produces
authorization for all repos and people in the organization**.

Target flow:

```
UI (config export)  →  JSON/YAML config  →  PR  →  terraform plan (CI)
                                                        ↓
                                              review + merge
                                                        ↓
                                            terraform apply → GitHub
```

No one will write HCL by hand. A new repo, a new person, an authorization change — all of
them become a single-line change in a config file. This is why **the module's inputs must
be designed as `map`s that mirror the config schema exactly**.

The pilot repo(s) exist to demonstrate that this engine works; they are not the goal itself.

---

## 2. Actors and Expected Behavior

### Head of Engineering
- Holds the position of organization owner.
- Creates the repos (e.g. the default 8 repos).
- Distributes mentors across repos and **can change this distribution over time**.
- Is authorized for everything.

### Mentors (target: 4 people, 2 repos each — 8 repos total)
- **A repo has a single mentor**; there is no other mentor in that repo.

> **This is a target design, not today's picture.** Right now there is a single mentor in
> production (`owner-a`) who is the mentor of all three repos. The phrase "4 people × 2
> repos" describes the number of repos per mentor; not the number of mentors in a repo. Who
> is a mentor where is read from a single place: `config/repositories/<repo>.yml` →
> `mentors`.

- Has **full authority** (`admin`) in the repo they are responsible for.
- Can push to every branch, including `main` and `develop`.
- Can change the repo rules — but **via config/dashboard** (see Section 5 — Decision 1).
- Can add an external consultant and grant them limited access (e.g. read-only across the whole repo).

> Schema note: even though there is a single mentor today, the `mentors` field in the config
> schema must be defined as a **list**. Turning a singular field into a list later breaks both
> the config and the module; the list costs nothing today.

### Developers
- The developer ↔ repo relationship is **many-to-many**. A person can be involved in more
  than one project at the same time.
- No developer can push directly to the `main` or `develop` branches.
- Contributions are made only through feature branch + PR.
- A "team" here is not a concrete entity but **the collective name for the developers
  working on that repo at that moment**. Its technical counterpart: one GitHub team per
  repo, whose name is derived from the config (e.g. `payments-api-devs`). When a person
  leaves the project, a single membership is removed.

### External Consultants
- Temporary and narrowly scoped access.
- Typical scenario: read-only across the whole repo.
- Added/removed by the mentor.

---

## 3. Mapping to GitHub Primitives

In GitHub, authorization is **two-layered**. The model cannot be set up correctly without
knowing this distinction.

### Layer 1 — Repo-level role
A person/team's role in a repo is singular: `pull` · `triage` · `push` · `maintain` · `admin`

| Actor | Role | Terraform resource |
|---|---|---|
| Head of Engineering | org owner + `admin` | `github_membership` / `github_team_repository` |
| Mentor | `admin` (so they can change rules — see warning) | `github_team_repository` |
| Developer | `push` | `github_team_repository` |
| External consultant | `pull` | `github_repository_collaborator` |

> **Warning:** the `maintain` role **cannot change** branch protection rules; that authority
> belongs only to `admin`. If mentors are meant to change rules, they must be `admin` — which
> also brings the ability to delete the repo.

### Layer 2 — Branch-level restriction
Using the `restrict_pushes` block inside `github_branch_protection`, who can push to a given
branch pattern is listed.

**Beware the inverted logic:** in GitHub you cannot grant an authority like "let them push
only to this branch." Write access is always granted repo-wide, then branches are
*restricted*.

"Developers must not push to main, but the mentor can" is set up like this:
1. Give the developer `push` at the repo level
2. Put branch protection on `main` / `develop`
3. Write **only the mentors** into the `restrict_pushes` allow list
4. Set `enforce_admins = false`

### ✅ Implemented state _(as of 2026-08-16)_
All four steps above are live. `enforce_admins` is `false` on every branch and the
`push_allowed_roles: [mentor, head-of-engineering]` allowlist is applied via
[`config/organization.yml`](terraform/config/organization.yml).

The previous version of this file noted, as an inconsistency, that the hand-written `main`
rule in `terraform/branch-protection.tf` had `enforce_admins = true`. That file is now empty:
`pilot-intern-api` was moved under `modules/repository` with `terraform state mv` on
2026-08-15, and its rules are now generated from config as well.

`enforce_admins = false` is **a permanent decision**, not a forgotten setting. Its rationale
and its three consequences: [`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md)
Section 4 (ROADMAP Decision E / K5).

---

## 4. Architectural Decisions

### Team-based, not person-based management
The config may arrive person-based, but Terraform must translate it into **teams**.

Rationale: each person × repo is one Terraform resource. 50 people × 40 repos = 2000
resources; `plan` duration and state size become unmanageable. Moreover, when a person
leaves you would have to remove them from 40 separate places. Going through teams, a single
membership is removed and all access disappears.

For single-person exceptions (such as an external consultant), `github_repository_collaborator`
is used — but it must remain an exception.

This decision also aligns naturally with the rule "every developer will be in a single team."

### Rulesets instead of classic branch protection
Provider v6 offers `github_repository_ruleset` and `github_organization_ruleset` (verified
against the schema; `bypass_actors` → `actor_id`, `actor_type`, `bypass_mode`).

Rulesets' advantages for this model:
- **Layerable.** An immutable base rule at the org level, additions on top of it at the repo
  level. Classic branch protection has no layering.
- **`bypass_actors`** expresses "the rule applies to everyone, except this team" in a single
  line — this is the natural counterpart of the mentor exception.

Classic branch protection may be used during the pilot phase, but the target architecture
must be rulesets. This decision should be recorded with an ADR under `docs/adr/`.

---

## 5. Decisions Made

### Decision 1 — Code layer / data layer separation ✅
**The dashboard does not change Terraform code, it changes data.** The system has two layers:

| Layer | Content | Who changes it | Frequency |
|---|---|---|---|
| Code (HCL) | The recipe for "how a repo is set up, how a rule is applied" | owner-a / dev-1 | Rarely |
| Data (config) | Which repo, who has which authority, which branch belongs to whom | Mentor (dashboard) | Often |

When a mentor says "let the minimum approvals be 3," a config field changes; the HCL is not
touched. The dashboard's job: edit the config file and open a PR to GitHub. It never talks to
Terraform. Flow: dashboard → PR → CI `plan` → merge → `apply`.

### Decision 2 — HCP Terraform WILL NOT be used as the mentor interface ✅
Rationale:
- HCP is not an authorization management panel, but a run + state engine.
- The only thing changeable from its interface is workspace variables; these belong to the
  whole workspace, and fine-tuning per repo is not possible.
- The "No-code provisioning" feature requires a paid tier and is aimed at creating new
  resources rather than editing existing authorizations.
- Giving a mentor HCP access means giving access to **the entire org's state**;
  authorization cannot be limited.

**Conclusion: a separate dashboard will be written.** Its job is relatively simple — edit a
JSON/YAML file and open a PR.

### Decision 3 — Mentor role: `admin` ✅
Its unavoidable consequence: a mentor can change branch protection by hand from the GitHub
interface, and Terraform reverts it on the next `apply`.

This must be **positioned not as an error, but as a safeguard**: every change that departs
from the standard automatically returns to the standard; a permanent change is made only via
config. Mentors must be told about this behavior in advance, otherwise the complaint "my
setting disappeared" will come.

### Decision 4 — Location of the config file: this repo, the `config/` folder ✅
Rationale: a single audit trail, seeing the Terraform code and the data in the same PR, the
`plan` output landing directly on the relevant PR. A separate repo only makes sense if a
different team operates the dashboard; for now it is needless complexity.

(Related: `terraform-plan.yml` / `terraform-apply.yml`)

---

### Decision 5 — Rules are bound to the role, not the person ✅
In this project **everything is assumed to be changeable**: people come and go, mentors
change, head of engineering is not a person but a role.

For this reason, authorization definitions in the config are written to **roles** (the
`roles` section), and people are merely assigned to those roles. Branch push permissions are
also expressed with `push_allowed_roles` rather than a list of people. When a person changes,
a single assignment changes; the rule text never changes.

### Decision 6 — The dashboard can also create repos ✅
Config is not just where a repo definition is removed/added and only authorization is
managed; **the repo lifecycle is also managed from config.** For this reason the repo
definition is rich (language, visibility, description, template).

### Decision 7 — Branch rules can be overridden per repo ✅
`defaults.protected_branches` gives every repo a base rule; a repo overrides it in its own
block by writing only the **field that differs**. This way a new repo is born with safe
defaults without writing anything, and a repo that needs an exception distinguishes itself
with a single line.

### Decision 8 — The approval rule varies from project to project ✅
Two separate fields provide this flexibility:
- `required_reviews` — how many approvals are required
- `require_code_owner_review` — whether mentor approval is **mandatory**, or whether another
  developer's approval is sufficient

In a 2-person project this can be set to `false` so the mentor is not a bottleneck.

### Decision 9 — Archiving instead of repo deletion ✅
If a repo line is removed from config, Terraform **actually deletes** that repo. Instead,
`archived: true` is used; the repo is frozen and the content is preserved. If it really needs
to be deleted, it is done later as a separate and deliberate step.

### Decision 10 — An org-wide `.github` repo will not be used ✅
The cleanest way to distribute community health files (CONTRIBUTING, SECURITY, issue/PR
templates) org-wide is to create a repo named `.github`. However, for issue and PR templates
to work, that repo must be **public** — the files would be exposed to the internet. This was
not accepted.

**Instead:** the templates will be written into each repo separately (`github_repository_file`).
This works in private repos and the content is not exposed. The cost: updating one template
produces N commits across N repos.

### Decision 11 — Two synchronization modes for template files ✅
- **`strict`** — Terraform owns the content; a change made by hand is reverted on the next
  `apply`. Scope: `CODEOWNERS`, `.github/workflows/*`, issue/PR templates, `dependabot.yml`.
- **`seed`** — Written only on first creation; the repo can change it to suit itself
  afterwards. Scope: `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`, `README.md`.

Governance files stay standard, content files are handed over to the repo.

### Decision 12 — Discipline teams are being removed ✅
`backend-team`, `frontend-team`, `devops-team`, `core-engineering`, `tech-leads`,
`interns-2026`, `interns-backend`, `interns-frontend`, `external-collaborators` are being
deleted. In the role-based model they have no counterpart; authorization comes from the teams
generated per repo.

**`platform-admins` stays** — it cannot be deleted. The `head-of-engineering` role is
technically applied through this team: the module's `github_team_repository.org_admins` and
the `head-of-engineering` counterpart in branch protection's `push_allowed_roles` depend on
it.

_If discipline teams are wanted back in the future, they can be added as a **label** — but
without granting repo authority. When a person is given access through more than one team,
GitHub applies the highest authority; if authority is granted, the least-privilege principle
is silently breached._

### Decision 13 — The dashboard will live inside this repo ✅
Config, Terraform code, and the dashboard in the same repo. A separate repo will not be
created.

Blast radius consequence: the dashboard's App carries write authority to this repo, so it
could theoretically also change the HCL. It is limited by two measures — the dashboard does
not write directly to `main` (it opens a PR), and `CODEOWNERS` binds the `terraform/*.tf`
paths to human approval.

### Decision 15 — The dashboard will operate with the user's own identity ✅
The dashboard **will not have** its own token. The user signs in via GitHub **device flow**
(it does not require a `client_secret` and is designed for apps that run in the browser), and
operations are performed with their token.

**What this brings:**
- No server to host, update, and keep secure
- The dashboard holds no `admin:org`-scoped secret — there is nothing to be compromised
- **GitHub does the authorization:** if the user has no write access to the config repo, the
  request is rejected. The rule "a mentor only edits their own repo" is enforced by CODEOWNERS
  at merge time.
- **The audit trail is real:** commits land in the name of the person who did the operation,
  not in the name of a bot

**The plan preview comes not from the HCP API, but from the PR comment.** The GitOps workflow
will already write the `plan` output to the PR; the dashboard reads that comment with the
user's token and displays it. This way the dashboard never needs to connect to HCP Terraform
at all.

**Constraint:** the dashboard cannot do anything the user cannot do. This is a feature, but
for scenarios that require elevated authority (such as emergency access cut-off) a small
service may be needed in the future. It will be added if needed.

> **Note:** Terraform run interfaces like Semaphore UI were evaluated and eliminated. They
> are in the same category as HCP Terraform — a run interface, not an authorization
> management panel. All of the rationale in Decision 2 applies to them too, and moreover they
> add one more system to operate.

### Decision 16 — Config files are separated by ownership ✅
When YAML is regenerated programmatically, comment lines and formatting are lost. For this
reason:

| File | Owner | Rule |
| :--- | :--- | :--- |
| `config/repositories/*.yml` | **Machine** | The dashboard writes it. No comment lines are placed; it can be freely regenerated. |
| `config/organization.yml` | **Human** | Roles, defaults, explanatory comments. Rarely changes; the dashboard does not touch it or makes surgical edits. |

The format stored in the repository is always **YAML**. JSON Schema is used only for
validation — because when YAML is parsed it converts to the same data model as JSON, the same
schema validates both. There is no file format conversion.

### Decision 14 — No repo naming standard ✅
A prefix requirement (`svc-`, `web-`, `lib-`) will not be enforced. Repos are created by the
head-of-engineering or the mentors; names are free-form.

---

## 5b. Future Work

Topics deliberately deferred, not required for the system to work:

| Topic | Note |
|---|---|
| **External consultant (`consultant` role)** | Not needed for now. If needed, `pull` access is granted; suggestions/feedback are taken via Linear or Slack. It waits ready in the schema as a comment line. |
| **Access time limit (`expires_at`)** | Terraform has no automatic expiry; a separate scheduled job is required. Manual removal is sufficient for now. |
| **GitHub App** | In the short term we will proceed with a personal PAT. |
| **Force delete flow** | Archiving is sufficient; real deletion can be added later as a deliberate step. |
| **Audit / change history** | The PR flow largely already provides this (every change is a commit). An additional mechanism may not be needed. |
| **The dashboard's technical details** | Technology choice, authentication, which identity it opens the PR with. |

---

## 6. Constraints

### GitHub plan level
On the Free plan, **branch protection and rulesets do not work in private repos.** The repos
were therefore created `public`; the `defaults.visibility` value in
[`config/organization.yml`](terraform/config/organization.yml) is `public` for this reason.
Since most repos in a real organization will be private, **the GitHub Team plan is a
precondition of this architecture.** It must be stated explicitly in the presentation.

The things to do once the plan arrives are gathered in one place: [`ROADMAP.md`](ROADMAP.md)
Phase 7.

### The config schema = the actual contract
The contract between the UI and Terraform is the config schema. If the schema is designed
wrong, both sides are rewritten. For this reason **a schema draft must be produced before the
module is written.**

---

## 7. Current State

This file describes **the design and the rationale**; the instantaneous state is not kept
here.

What is live and what remains missing is read from a single place:
[`ROADMAP.md`](ROADMAP.md) Section 1.

> _Note: the 2026-08-07 snapshot that used to be here was removed. Keeping state in two places
> was causing both of them to go stale._
