# Roadmap — Transition to the Target Architecture

> **This document is the current plan.**
>
> Rationale for the model: [`ACCESS-MODEL.md`](ACCESS-MODEL.md) · Permission layers:
> [`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md)

Last updated: 2026-08-19

---

## 1. Where We Stand

**Done:**

| Area | Status |
| :--- | :--- |
| Terraform scaffold, HCP backend, shared state | ✅ Live |
| Repository module (config-driven) | ✅ Live, validated end to end |
| `pilot-intern-web`, `pilot-intern-api` | ✅ Both managed from the module |
| `tidyorg` — self-managing | ✅ Dogfooding, via `imports.tf` |
| Config split into one file per repo _(Phase 1)_ | ✅ `config/repositories/*.yml` |
| Old 9 teams deleted, `platform-admins` kept | ✅ Live |
| GitOps loop _(Phase 3)_ | ✅ Workflows written and fixed |
| GitHub App `tidyorg-infra-bot` _(Phase 4)_ | ✅ Terraform now runs under the bot identity |
| Template and workflow distribution _(Phase 2)_ | ✅ Rolled out to three repos; `ci/test` green for the first time _(2026-08-16)_ |
| **Deny side** of the access model | ✅ Validated live — `GH006`, "Review required" |
| 12 documents + 1 ADR | ✅ Written |

**Not working / missing:**

1. ~~The `people` section is not being read~~ ✅ **2026-08-18** — generated from config
   via `people.tf`; the exception files were removed. Single gap: `owner-a` is out of
   management by break-glass requirement, org role is still declared _(the bypass report
   names it explicitly)_
2. ~~`default_repository_permission` = `Read`~~ ✅ **2026-08-18** — set to `none`;
   the sole source of access is now team membership
3. No dashboard _(Phase 5)_
4. ~~Repo security settings are not managed~~ ✅ **2026-08-18** — `vulnerability_alerts` and
   secret scanning + push protection are managed from config; org-wide defaults were
   turned on as well. **Remaining:** code scanning (CodeQL) is still absent, and
   `advanced_security` is deliberately off because it requires a GHAS license _(Phase 7)_
5. **Engine and state live in the same repo** — there is no boundary to separate the mentor from the engine _(Phase 8)_

> `release.yml` not being distributed to any repo is **not** on this list, because it is not a gap
> but a deliberate decision — see Decision I.

---

## 2. Decisions

### 2026-08-08

**Decision A — No org-wide `.github` repo will be used.** It would have had to be public;
the files inside would be exposed to the internet. Not accepted. Templates will be written
to each repo individually. **Cost:** updating one template produces N commits across N repos.

**Decision B — The dashboard is within this project's scope.** Its prerequisites: splitting
the config per repo (Phase 1 ✅) and the GitHub App (Phase 4 ✅).

**Decision C — The config will be split into one file per repo.** ✅ Done.

**Decision D — We will not wait for the Team plan.** Work that depends on the plan is collected in Phase 7.

### 2026-08-16

**Decision E — `enforce_admins` is permanently `false`.**
Setting it to `true` for `main` was discussed and rejected: mentors and above must always be
able to make fast decisions. It is a deliberate trade-off. The rationale and its three
consequences: [`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md) Section 4.

**Decision F — Control-plane repos operate trunk-based.**
`develop` buys nothing in this repo: because apply runs only from `main`, config merged into
`develop` sits in a "merged but not live" state — not a delay, but a **lie**. `develop` only
becomes meaningful when there is a separate environment behind it (sandbox org + prod org).
Today there is a single org.
The `feat → develop → main` flow in [`docs/branching-strategy.md`](docs/branching-strategy.md)
**remains valid for product repos**; control-plane repos are the exception.

**Decision G — The engine and state will be split into separate repos** _(Phase 8)_.
The chain of reasoning ties back to Decision E: because `enforce_admins = false`, there is no
mechanism within a single repo to separate the mentor from the engine — they bypass both
CODEOWNERS and branch protection. The boundary can only be a **repo boundary**.

**Decision I — Release automation is opt-in; its trigger is Phase 8** _(2026-08-17)_.
`release.yml` was written but is **deliberately not active in any repo**
(`defaults.workflows: [ci]`).

- **Meaningless in the pilot repos** — they contain no code; if enabled, every `main` push
  would produce an empty release.
- **Unnecessary in the engine repo today, mandatory in Phase 8** — the config repo will pin
  the engine with `ref = v1.0.0`, so the split does not work until a tag is produced.

A repo that needs it enables it by writing `workflows: [ci, release]`. Where the document
honestly describes today's state: the warning box at the top of
[`docs/release-process.md`](docs/release-process.md).

**Decision H — Automation identities (agents) get their own App.**
`tidyorg-infra-bot`'s permissions are Administration + Contents + Members write. Giving this
identity to a review or triage agent turns prompt injection into privilege escalation.
Agents use a separate, minimally-privileged App and **become visible in config** — today the
model recognizes only human roles.

---

## 3. Phases

Each phase can be completed independently and produces value on its own.

---

### Phase 0 — Cleanup and consistency ✅ _(completed)_

- [x] `enforce_admins` → `false`
- [x] Root `outputs.tf` filled in
- [x] owner-a added to `platform-admins`
- [x] 9 old teams deleted — verified with **No changes** after `plan`
- [x] `pilot-intern-api` moved into the module via `terraform state mv` _(2026-08-15)_
- [ ] Two pending branches: `docs/engineering-standards-fixes`, `feat/branch-protection-fixes`
      ⚠️ `docs/engineering-standards-fixes` is **partially invalid** — the
      `rbac-and-permissions.md` inside it describes the old team structure; the document was
      rewritten from scratch on 2026-08-16. Resolve the conflict before pushing.

---

### Phase 1 — Split the config structure ✅ _(completed, 2026-08-15)_

```
terraform/config/
├── organization.yml              # roles, defaults, people, org settings
└── repositories/
    ├── pilot-intern-web.yml
    ├── pilot-intern-api.yml
    └── tidyorg.yml
```

File name = repo name. `repositories.tf` is fed via `fileset()` + `yamldecode`.
Verified that the `plan` output did not change.

- [ ] **Remaining:** A path-based rule in this repo's `.github/CODEOWNERS`
      ⚠️ In light of Decision E, this rule **cannot be enforced against the mentor** — it stays
      informational; the real boundary arrives in Phase 8.

---

### Phase 2 — Template and workflow distribution ✅ _(completed, 2026-08-16)_

The `files` and `workflows` fields were added to the config; the module writes them into the repo.

```yaml
defaults:
  files:
    contributing: seed        # strict | seed | none
    security: seed
    editorconfig: seed
    issue_templates: strict
    pr_template: strict
  workflows: [ci]             # ci | release | dependabot
```

- [x] Add the `files` and `workflows` fields to the schema
- [x] Set up distribution in the module via `github_repository_file`
- [x] Apply the `strict` / `seed` distinction _(mode table: K1)_
- [x] **Consistency check:** if `ci` is not in `workflows`, then `require_status_checks`
      must also be empty — the module errors on this via a `precondition`
- [x] Verified: the PR template shows up, `ci/test` is reported
- [x] Line-ending normalization (`\r\n` → `\n`) — eliminated spurious diffs that changed
      depending on the machine running apply _(2026-08-16)_
- [x] The fate of the `release` workflow was **settled by decision** _(2026-08-17)_ — it stays
      opt-in and will be activated in the engine repo in Phase 8. See Decision I.

> 🔴 **This phase resolved a blocker; it was not merely an improvement.**
> After the access fix, the normal developer flow kicked in and, because `ci/test` was not
> produced in any repo, **even an approved PR could not be merged**.
> Closed by template distribution.

> 💡 **Keep in mind while designing Phase 8 and Decision H.** To set the schema up once and
> not break it later: (a) the `agents` field will land here in the future (see Phase 9), (b) this
> phase is the only work where the engine and config schema evolve **together** — that is why it
> is finished *before* Phase 8 (once split into two repos, every field becomes two PRs).

---

### Phase 3 — GitOps loop ✅ _(completed, 2026-08-15/16)_

- [x] `.github/workflows/terraform-plan.yml` — PR-triggered, writes the plan output as a comment
- [x] `.github/workflows/terraform-apply.yml` — `main`-merge-triggered, concurrency-protected
- [x] This repo's own branch protection is managed from config (dogfooding)
- [x] `plan.yml` YAML error fixed _(2026-08-16)_ — the file **had never run**;
      the markdown table had fallen outside the block scalar
- [x] The `TF_API_TOKEN` secret was entered

---

### Phase 4 — GitHub App ✅ _(completed, 2026-08-15)_

`tidyorg-infra-bot` was created; the Terraform provider was switched to the App identity. Commits
now land under the bot's name. Setup guide:
[`integrations/github-app/README.md`](integrations/github-app/README.md)

> **No separate App is needed for the dashboard** — per Decision 15, the dashboard will run under
> the user's own identity (Device Flow). This App is for Terraform only.
> ⚠️ **It is, however, needed for the agents** — see Decision H and Phase 9.

---

### Phase 5 — Dashboard _(large)_

**What it does:** Lets the mentor and head-of-engineering edit the config files without
writing YAML.

**Architecture — the dashboard has no token of its own** (see `ACCESS-MODEL.md`, Decision 15):

```
User
   ↓ sign in via GitHub Device Flow (no client_secret needed)
   ↓ the user's own token
Dashboard (static SPA)
   ├── Read:    config YAML files — with the user's token
   ├── Write:   Contents API → branch + PR — with the user's token
   └── Preview: read the plan comment on the PR
   ↓
GitHub  →  the GitOps workflow (Phase 3) writes the plan as a comment on the PR
   ↓
Merge  →  apply
```

**GitHub does the authorization**: if the user has no write access to the config repo, the request
is rejected. The audit trail is real — commits land under the name of the person performing the action.

**Sub-steps:**

- [ ] **5a. Read mode** — read-only interface. Produces value, carries no risk.
- [ ] **5b. Write — PR flow** ⚠️ **Depends on Phase 8** (see below)
- [ ] **5c. Plan view** — show the `plan` comment posted to the PR
- [ ] **5d. Fast path** — a PR-less flow for low-risk operations _(to be evaluated)_

**Technical notes:**
- YAML is written directly; JSON Schema is only for validation before saving _(Decision 16)_
- `config/repositories/*.yml` is machine-owned; `organization.yml` is human-owned
- When writing, the file's `sha` value must be sent; if a 409 comes back, re-read and retry
- Hosting: Vercel/Netlify

**Dependencies:** Phase 1 ✅ · Phase 3 ✅ · **Phase 8 (before 5b)**

---

### Phase 6 — Org membership, security, and baseline settings ✅ _(completed, 2026-08-18/19)_

- [x] ✅ **`people` → `github_membership`** _(2026-08-18)_ — org membership is now generated
      from config ([`people.tf`](terraform/people.tf)); `platform-admins` membership is also
      derived from `people.roles`.
      The `org-membership.tf` and `team-memberships.tf` exception files were removed.
      **Thanks to the `moved` blocks, the migration was `0 to add, 0 to change, 0 to destroy`** —
      a pure address move, not a single API call was made.
      Break-glass: `owner-a` is deliberately out of management (`unmanaged_people`).
      **Validation is enforced at plan time** and both were tested live:
      writing a repo-scoped role into `people.roles` · forgetting to write `org_role`.
      The rule is not hardcoded — it is derived from the `scope` field in the `roles:` block.
- [x] ✅ **`default_repository_permission` → `none`** _(2026-08-18)_
      The current value was `Read` — no write hole, but no isolation either. The sole source of
      access is now team membership.
      🔴 **But its effect is limited to a SINGLE repo today:** the other three are `public`, and
      the entire internet reads a public repo — the setting changes nothing there. Real isolation
      happens once the repos are private, and that is **contingent on Phase 7**. See the Phase 7 note.
- [x] ✅ **Repo security settings** _(2026-08-18)_ — `vulnerability_alerts` (every plan,
      every visibility) and `secret_scanning` + push protection (public only; private requires
      GHAS, the module silently skips it).
      ⚠️ **Finding:** `vulnerability_alerts` **turned out to be off in this repo** — the control
      plane itself was not receiving Dependabot alerts. Reason: this repo was created by hand
      before Terraform.
- [x] ✅ **Org-wide security defaults** _(2026-08-18)_ — five went `false` → `true`.
      `advanced_security` is deliberately `false` (requires GHAS/Enterprise → Phase 7).
- [x] ✅ **Repo-creation permission restricted** _(2026-08-18)_ —
      `members_can_create_repositories = false`. Now only an org owner can create a repo by hand;
      the normal path goes through config.
      ⚠️ GitHub cannot say "mentors only" — at the org level the permission is binary (all members /
      owners only), with no team-based intermediate tier. Since `owner-a` is the only owner today,
      the outcome is the same, but a mentor who is not an owner cannot create a repo.
      ⚠️ **Unverified:** it is assumed this setting does not affect the GitHub App (the App is not an
      org member). The next repo creation will prove this; if a `403` comes back, it will be reverted.
- [x] ✅ **"Who can bypass?" report** _(2026-08-18)_ — a Terraform output listing the effective
      bypass actors per repo × branch.
      **A direct consequence of Decision E:** if the exemption is permanent, the only control left
      is visibility. That is exactly why the 2026-08-15 incident went unnoticed.
      ⚠️ The org-scoped part reads from `people`; until `people` is enforced, it is a *declaration*.

---

### 📌 "Who will protect the past?" _(opened 2026-08-18 · split in two 2026-08-20)_

> **Status: settled and half done** _(2026-08-20)_.
>
> | Half | What | Status |
> | :--- | :--- | :--- |
> | **Coverage (approach 2)** | Makes unmanaged repos visible | ✅ **Done** — [`terraform/coverage.tf`](terraform/coverage.tf) |
> | Discovery + reconciliation (approach 1) | Generates config from an existing repo | ⏭️ **Waiting on Phase 8** |
>
> Rationale for the split: approach 1 depends on where `config/` will be moved; done too early, the
> tool gets built twice. Approach 2 depended on nothing and closed today's gap.
>
> The handover procedure, the three scenarios (coming from an external system / org-to-org / from an
> individual account), and two snags — teams not transferring, and the repo-creation restriction
> potentially blocking transfer — must also be tracked.
>
> The analysis below stands as the **definition of the problem**; it still holds, because the
> coverage check made the problem *visible*, not *solved*.

**The finding that gave rise to the problem.** We turned on org-wide security defaults, but these are
`*_for_new_repositories` — that is, **they only protect the future**. Existing repos were not affected;
they had to be turned on separately with the module's per-repo settings. The same day it emerged that
`vulnerability_alerts` was **off in this repo**: the single repo created by hand, and the very one that
was the only unaudited repo.

**The general form:** a repo that **comes in from outside** (transfer, acquisition, legacy project)
does not know the config. What happens is undefined today:

| Question | Today's answer |
| :--- | :--- |
| A repo entered the org, not in config. What happens? | **Nothing.** Terraform does not see it, manage it, or report it. |
| Do the security defaults apply? | **No** — those are for *new* repos only. |
| Does it show up in the bypass report? | **No** — the report is generated from `local.repos`, i.e. from config. |
| Is it noticed? | **No.** There is nowhere to look. |

So today a repo can silently enter the org and remain **outside the reach of any control**. This is
the very problem the project claims to solve.

**The two approaches discussed** _(neither was debated, just recorded)_:

1. **Extract config via a script (pull).** A tool that, before the repo joins the org or right after,
   reads its current settings and generates `config/repositories/<name>.yml`. A human reviews the
   generated file, decides what to accept and what to overwrite, opens a PR, and applies.
   _Note: Terraform's `import` block **already does half of this** — on 2026-08-18 we used exactly
   this for the org settings and it surfaced four findings. The same technique can be applied per
   repo. So writing a tool from scratch may not be necessary._

2. **Automatic detection (push).** A check that periodically lists the repos in the org and reports
   those with no counterpart in config. It does not manage them on its own, it **makes them visible** —
   it says "this repo is out of management."
   _Note: this is the same answer we gave for `enforce_admins = false` — if you cannot close it, at
   least see it. Same philosophy._

**Separate questions, not to be conflated:**
- **Discovery** — what are the repo's current settings? (import / API read)
- **Reconciliation** — which of these do we accept and which do we overwrite? (human decision)
- **Coverage** — who, and how often, will notice an unmanaged repo? (continuous check)

The three are different jobs; one does not solve another. Approach 1 targets discovery + reconciliation,
approach 2 targets coverage — **both are probably needed**.

**Preliminary thought on phase placement** _(not a decision)_: this work depends on where `config/`
lives, so it is cheaper done **after Phase 8** — otherwise the tool is built twice, once writing to
this repo and then to the config repo. But the **coverage check** (approach 2) does not have to wait
for Phase 8; it can be written today and makes today's gap visible.

---

### Phase 7 — When the Team plan arrives _(blocked)_

This work **cannot be done**, or even attempted, without the GitHub Team plan.

> 🔴 **Phase 7 is not "nice to have"; it is the phase that pays off Phase 6.**
> `default_repository_permission = none` **does nothing** in three repos today, because they are
> `public` and the entire internet reads a public repo. The setting only becomes meaningful once the
> repos are private — and a private repo requires the Team plan for branch protection. So **isolation
> and branch protection cannot be obtained at the same time today**; the only thing that combines the
> two is this phase.

- [ ] Verify that branch protection works on private repos
- [ ] Make the default for new repos `private`
- [ ] Convert existing repos to private
- [ ] Repeat the blocking tests under real conditions
- [ ] Evaluate the move to Rulesets and write an ADR

**What will change in the code — inventory** _(produced 2026-08-19)_:

| Location | Change | Size |
| :--- | :--- | :--- |
| [`config/organization.yml`](terraform/config/organization.yml) → `defaults.visibility` | `public` → `private` | **1 line** |
| [`config/repositories/pilot-access-test.yml`](terraform/config/repositories/pilot-access-test.yml) | `protected_branches: {main,develop} = null` can be removed | 3 lines _(the repo is already temporary)_ |
| [`outputs.tf`](terraform/outputs.tf) → `korumasiz_repolar` note | the "expected on the free plan" wording is updated | Comment |
| Document/report notes | the "verified on public" warnings | Comment |

**The engine code (`modules/repository/`) does not change.** `visibility` already comes from config
and the module supports private — `pilot-access-test` is private today and was born from the module.

> ⚠️ **What will not change — and it has a cost: secret scanning turns off.**
> The condition in the module is `visibility == "public"`, and this is **deliberate**: secret scanning +
> push protection are free only on a public repo; on a private repo they require **GitHub Advanced
> Security (Enterprise)** — the Team plan does not enable this.
>
> So making the repos private is not pure gain, it is a **trade-off**:
>
> | | Today (public) | After Phase 7 (private) |
> | :--- | :--- | :--- |
> | Closed to the world | ❌ | ✅ |
> | `none` isolation meaningful | ❌ | ✅ |
> | Branch protection | ✅ | ✅ |
> | Secret scanning + push protection | ✅ | ❌ _(requires Enterprise)_ |
> | Dependabot alerts | ✅ | ✅ |
>
> What is lost is not trivial: **push protection**, the only mechanism that stops a leaked key from
> entering the repo. What replaces it when moving to private (a pre-commit hook, a CI step, or Enterprise)
> **must be settled separately** — it must not be lost silently.

> **By the way:** the validations were done on a public repo. Behavior on a private repo may differ.

---

### Phase 8 — Repo topology: engine / state separation _(medium)_ 🆕

**When — not a schedule, but a condition** _(revised 2026-08-17)_.
Done when **one** of these three occurs:

1. **The dashboard moves to write mode** — a non-engineer identity begins touching the config
2. **The project's demo is prepared** — the target architecture needs to be shown
3. **A second mentor joins** — someone is actually on the other side of the boundary

**Why it was changed from a schedule to a condition:** the first plan said "end of Week 5," but that was
derived from this ROADMAP's nominal calendar, not real progress. Today there is a single mentor and the
dashboard has not moved to write mode — so there is **no one** on the other side of the boundary Phase 8
protects. It would mean paying a cost today against a risk that does not exist.

Moreover: **Phase 6 is also work where the engine + config schema evolve together** (`people` consumption,
`security` fields, org settings). Whatever the reason was for saying "finish before the split" for Phase 2,
the same applies to Phase 6 — once split, every new field becomes two PRs. That is why **the order is:
Phase 6 → Phase 8.**

**Why this repo is being split:** a single repo holds two different life cycles.

| | What | Change cadence | Correct flow |
| :--- | :--- | :--- | :--- |
| **Engine** | `modules/`, workflows, documents | Like a product: feature, bug, release | trunk + tag |
| **State** | `config/*.yml` | Operations: add an intern, change a mentor | PR → main → apply |

**Decision G's rationale in one sentence:** because `enforce_admins = false` (Decision E), there is no
mechanism within a single repo to separate the mentor from the engine — both CODEOWNERS and branch
protection are bypassed. The boundary can only be a repo boundary.

**Target:**

```
tidyorg                                tidyorg-org-config
  ENGINE                                 STATE
  modules/ · templates/ · docs/          config/organization.yml
  trunk-based + tag                      config/repositories/*.yml
  platform team writes                   thin terraform root
        │                                mentor + dashboard write
        └── ref = v1.2.0 ──────────────▶ trunk-based, PR → main → apply
```

**To do:**

- [ ] Create the new repo **from config** (dogfooding) — `tidyorg-org-config`
- [ ] Move the `terraform/config/` folder
- [ ] Write a thin root in the new repo:
      `module "repositories" { source = "git::https://github.com/...//terraform/modules/repository?ref=v1.0.0" }`
- [ ] Move `terraform-apply.yml` and `terraform-plan.yml` to the config repo
- [ ] Cut the first release tag in the engine repo (`v1.0.0`)
- [ ] **Activate the `release` workflow in the engine repo** — `workflows: [ci, release]`.
      Versioning becomes mandatory here: the config repo will pin the engine with `ref = v1.0.0`,
      so the split does not work until a tag is produced. _(Decision I)_
- [ ] Split the permissions: mentors are admin in the config repo, **no access** (or read) in the engine repo
- [x] Write the control-plane exception into `docs/branching-strategy.md` (Decision F)
      _(2026-08-17 — added as Section 8)_
- [ ] Write `ADR 005 — control-plane repo topology`

**State does not move.** The same HCP workspace continues to be used; only the repo feeding it changes.
The mechanical work is small for that reason: **half a day to a day.**

**A side matter that closes within the same work — `develop`:** per Decision F, `develop` is being removed,
but **not as separate work — during this migration**. Reason: changing branching twice is needless noise for
the team; during the migration the default branch, workflow triggers, and `branching-strategy.md` will all
be reworked anyway.

- Config repo → is born trunk-based, `develop` never exists
- Engine repo → continues trunk-based + tag; `develop` is **not added**
  _(reevaluated if a need arises to publish changes in batches — not set up preemptively)_

> ⚠️ **The accepted state until the split:** the `develop` → `main` gap is **deliberately** managed by
> hand. A config merged into `develop` is not live; apply is run manually. This is an acceptance, not
> forgetfulness.

**The cost — let's be honest:** after the split, adding a new config field becomes **two PRs**: first the
engine (so the module reads the field and a tag is cut), then the config (bump the pin, use the field).
Today it is a single PR. That is exactly why Phase 2 is done **before** the split.

**Gains:**
1. **Blast radius** — the dashboard and mentors can never write to the engine
2. **Version pin** — an engine change is tagged and lands nowhere until the pin is bumped.
   This truly provides the safety that `develop` was trying to imitate
3. **Rollback** — dropping the pin back to the old tag is enough
4. **Audit clarity** — the "who changed what" question separates per repo

---

### Phase 9 — Automation agents _(under evaluation)_ 🆕

Issue/review/security agents running against the other repos. **A third kind of artifact:** config is
declarative, the engine applies it, agents run continuously — it is not Terraform.

**Placement:**

| Agent type | Where it lives | Distribution |
| :--- | :--- | :--- |
| Event-driven _(PR opened → review)_ | In the target repo | **Phase 2's mechanism** — config decides, the module writes the workflow file |
| Cross-repo _(org-wide scan)_ | Central scheduled workflow | In this repo or a separate `tidyorg-automation` |

The schema extension becomes a continuation of Phase 2 — no new mechanism is needed:

```yaml
defaults:
  workflows: [ci]
  agents:
    review: true
    security: true
    triage: false
```

- [ ] A **separate GitHub App** for the agents — minimum permissions (PR read/write, issues write,
      contents read). The `tidyorg-infra-bot` identity is **never** given _(Decision H)_
- [ ] A "non-human actors" section in `ACCESS-MODEL.md` — bots carry roles too and are visible in
      config. Otherwise the answer to "which bot can access what?" is again found by reading `.tf`
- [ ] Selection and documentation of the agent infrastructure _(the current reference will be consulted once decided)_

---

## 4. Deferred (extra features)

Not required for the system to work:

- Linear / ClickUp integration and `docs/adr/003`
- Slack notifications
- GitHub Projects guide, `docs/labels.md`
- ADR 001 (branching) and 002 (Terraform) — the decisions are implemented, the written record is missing
- README.md, presentation prep, live demo scenario
- External consultant (`consultant`) role, time-limited access

---

## 5. Decisions Made

### K1 — Template files: mixed mode ✅
| File | Mode |
| :--- | :--- |
| `.github/CODEOWNERS` | `strict` |
| `.github/workflows/*` | `strict` |
| `.github/ISSUE_TEMPLATE/*` | `strict` |
| `.github/PULL_REQUEST_TEMPLATE.md` | `strict` |
| `.github/dependabot.yml` | `strict` |
| `CONTRIBUTING.md` | `seed` |
| `SECURITY.md` | `seed` |
| `.editorconfig` | `seed` |
| `README.md` | `seed` |

Governance files cannot be changed by hand; content files are handed over to the repo.

### K2 — Old teams: 9 deleted, `platform-admins` kept ✅

> ⚠️ **`platform-admins` cannot be deleted — it is a load-bearing resource.** The module applies the
> `head-of-engineering` role through this team: admin access to every repo
> (`github_team_repository.org_admins`) and the `head-of-engineering` entry in `push_allowed_roles`
> depend on it. If deleted, `apply` errors out and the mentors' push permission collapses too.

**Note — if needed later:** Discipline teams can be brought back as a _label_, not an _authorization_
tool. If that day comes, they must be defined **without granting** repo permissions — when a person is
given access through more than one team, GitHub applies the **highest** permission.

### K3 — ~~The dashboard is inside this repo~~ ❌ **INVALID (2026-08-16)**

> **Superseded by Decision G.** K3 kept the dashboard, the Terraform code, and the config in the same
> repo and limited the blast radius with two safeguards: (1) the dashboard does not write directly to
> `main`, it opens a PR; (2) CODEOWNERS ties the `terraform/*.tf` paths to human approval.
>
> **The second safeguard does not work.** With Decision E, `enforce_admins = false` became permanent; the
> mentor bypasses both CODEOWNERS and branch protection — seen live on 2026-08-15. Because the dashboard
> runs under the user's own identity (Decision 15), a dashboard PR opened as a mentor can also change the
> engine and merge itself.
>
> This boundary **cannot be built** in a single repo. With Phase 8 it moves to a repo boundary.

### K4 — No repo-naming standard ✅
There will be **no** required prefix like `svc-`, `web-`, `lib-`.

### K5 — `enforce_admins` is permanently `false` ✅ _(2026-08-16)_
Decision E. Rationale: mentors and above must always be able to make fast decisions.
An accepted trade-off — its three consequences in
[`docs/rbac-and-permissions.md`](docs/rbac-and-permissions.md) Section 4.

### K6 — Control-plane repos are trunk-based ✅ _(2026-08-16)_
Decision F. Product repos stay on the `feat → develop → main` flow; in control-plane repos `develop`
only produces the "merged but not applied" lie. `develop` returns only when there is a separate
environment behind it (sandbox + prod org).

### K7 — Agents use a separate identity ✅ _(2026-08-16)_
Decision H. `tidyorg-infra-bot` (Administration + Contents + Members write) cannot be given to a review
agent — it turns prompt injection into privilege escalation.

---

## 6. Distribution Across Weeks

> **Note:** dev-1 left the project on 2026-08-15; their phases (3 and 4) passed to owner-a and were
> completed. dev-2 is on the dashboard side (Phase 5).

| Week | owner-a 📦 | dev-2 🖥️ | Sync point |
| :--- | :--- | :--- | :--- |
| **4** ✅ | Phase 0 + Phase 1 + Phase 3 + Phase 4 + access fix | Dashboard scaffold, sign-in flow | — |
| **5** | **Phase 2** (template + workflow distribution) → then **Phase 8** (repo split) | Phase 5a — read mode | The config schema is frozen before the split |
| **6** | Phase 6 (membership, base permission, security, bypass report) | Phase 5b — **write mode** _(after Phase 8)_ | Test write mode together on the new topology |
| **7** | README, document maintenance, ADR 005, presentation structure | Phase 5c–5d | End-to-end pilot test, live demo |
| **8+** | Phase 9 (agents), Linear/ClickUp, `labels.md` | UX polish | — |

🔴 **Week 5's critical ordering:** Phase 2 → Phase 8 → (only then) Phase 5b.
Phase 2 is the only work where the engine and config schema evolve together; once split into two repos,
every new field becomes two PRs. Phase 8, in turn, must finish before the dashboard starts writing, or
else you migrate against a moving target.

---

## 7. Recommended Order

```
Phase 0 ✅ → Phase 1 ✅ → Phase 3 ✅ → Phase 4 ✅ → Phase 2 ✅
                                              │
                                              ├─ develop removed ✅  (Decision F, 2026-08-17)
                                              ↓
                                       Phase 6 (membership + security + bypass report)
                                              ↓
                                       Phase 8 (repo topology + release.yml)
                                              ↓
                                       Phase 5b (dashboard write mode)
                                              ↓
                                       Phase 9 (agents)

              Phase 7 — when the Team plan arrives, independent of the order
```

**Rationale:**

- **Phase 2 came first** because it both resolved a blocker (`ci/test` was unfulfilled) and froze the
  config schema.
- **Phase 6 before Phase 8.** The same rationale that holds for Phase 2: Phase 6 is also work where the
  engine and config schema evolve **together** (`people` consumption, `security` fields, org settings).
  After the repos split, every new field becomes two PRs — first engine + tag, then bump the pin. Settling
  the schema in a single repo and splitting afterward is far cheaper.
- **Phase 8 is condition-bound**, not schedule-bound: dashboard write mode, demo, or a second mentor.
  Detail and rationale in the Phase 8 section.
- **Phase 9 is last**, because the "non-human actor" identity model that Decision H requires matures with
  the `people` work in Phase 6.
