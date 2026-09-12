# ADR-004: Config-Driven Terraform for Access Management

**Status:** Accepted
**Date:** 2026-08-08
**Deciders:** owner-a, dev-1
**Related:** [`ACCESS-MODEL.md`](../../ACCESS-MODEL.md), [`config-guide.md`](../config-guide.md)

---

## Context

The organization has multiple repos and people with role-based authorization across those
repos. The target model:

- **head-of-engineering** — organization-wide admin (a role, not a person)
- **mentor** — admin in the repo they are responsible for; can change rules
- **developer** — can be involved in multiple projects (many-to-many); cannot write directly
  to protected branches

The ultimate goal is for these authorizations to be manageable by non-technical users through
a **dashboard**. An authorization change is a frequent event: a person joins a project,
leaves, a mentor changes, a new repo is created.

The question to ask: how should this management layer be built?

---

## Options Considered

### 1. An application that calls the GitHub API directly

The dashboard calls the GitHub REST API directly. "Remove the user from the team" is a single
HTTP request.

**Pros:** Instant effect, no intermediary, low learning curve.

**Cons:**
- No single source of truth — GitHub's current state becomes the only truth
- The question "who granted which authority and when" no longer has an answer
- No concept of drift; if someone changes something from the interface, it goes unnoticed
- The organization cannot be rebuilt from scratch
- Idempotency, ordering, error recovery, pagination, rate limit — all written by hand
- The dashboard must carry a token with `admin:org` scope; in an internet-facing app this is
  high risk

### 2. `github/safe-settings`

The open-source application GitHub publishes. YAML config is kept in an administration repo;
the application applies the settings to the repos in the org. Its hierarchical precedence
(repo > sub-org > org) matches our `defaults` + override design almost exactly.

**Pros:** Mature, GitHub's own project, ready to set up, solves the same problem.

**Cons:**
- **It only manages GitHub.** If other systems (Cloudflare, AWS IAM, PagerDuty) are added
  later, a second mechanism is needed
- The config speaks in GitHub's primitives (`collaborators`, `permission: admin`); our role
  abstraction (`mentor`, `developer`) cannot be expressed
- It has to be self-hosted — not a "ready product," but an application to operate

### 3. GitHub's built-in features (org ruleset + custom properties)

A metadata label is attached to repos, and rulesets at the org level target those labels.
Without writing code, "min 3 approvals on all repos with tier=critical" can be set up.

**Pros:** No code, no maintenance, fully compatible with GitHub's own model, layerable.

**Cons:**
- It only manages **rules**; repo creation, team membership, label sets are out of scope
- No role abstraction
- The audit trail depends on GitHub's audit log, not version-controlled
- Most features require the Team/Enterprise plan

### 4. Internal Developer Portal (Backstage, Port, Cortex)

Ready-made portal products; they offer self-service repo creation flows.

**Cons:**
- Backstage is not a product but a skeleton: you get your own codebase, hosting, catalog
  feeding, plugin maintenance, version upgrades. Not recommended for teams under 50
  developers — our scale is far below that
- Commercial alternatives (Port, OpsLevel) are overkill for our scale and costly
- None of them know our mentor/developer model out of the box

---

## Decision

**Terraform (`integrations/github` provider) will be used, and the configuration will be read
from a YAML file.**

The system is split into two layers:

| Layer | Content | Who changes it | Frequency |
| :--- | :--- | :--- | :--- |
| **Code (HCL)** | "How a repo is set up, how a rule is applied" | Platform team | Rarely |
| **Data (YAML)** | "Which repos exist, who has which authority" | Mentor (dashboard, later) | Often |

The dashboard **does not change** the Terraform code; it only updates the config file and
opens a PR. It can be unaware that Terraform exists.

The module **compiles** our own domain model (`mentor`, `developer`, `head-of-engineering`)
into GitHub's primitives (`admin`, `push`, team membership, branch protection).

---

## Rationale

**Single source of truth.** The entire organization can be read in a single file. The answer
to "who has access to what" is opening a file, not navigating the GitHub interface.

**Drift correction.** If someone changes a setting from the interface, the next `apply`
reverts it. The value of this feature was seen concretely in the pilot: the `platform-admins`
team's push permission **was being ignored by GitHub without error**, and it was noticed only
thanks to drift detection. In a system using the API directly, this error would have
continued to live silently.

**Audit trail.** Every authorization change leaves a commit, a PR, a `plan` output. The git
history is the answer to "who granted which authority and when."

**Role abstraction.** What a mentor can do is defined in a single place. To change the
authority, you edit one role definition, not 8 lines across 8 repos. When a person changes,
the rule text never changes. None of the ready-made tools offer this abstraction.

**Blast radius.** The dashboard does not need to carry an `admin:org` token; write access to
the config file alone is sufficient. The identity that can manage the organization sits on the
CI/HCP side, in a place closed off to the internet.

**Extensibility.** Any system that has a provider can be included in the same flow.
safe-settings and org rulesets are, by architecture, limited to GitHub.

---

## Consequences

### Positive

- The organization can be rebuilt from scratch from the configuration
- Authorization changes can be reviewed and rolled back
- Creating a new repo is a five-line config change
- Safe defaults are applied automatically; the person creating a repo does not need to know
  branch protection

### Negative / accepted trade-offs

- **Latency.** A change is not reflected instantly; a `plan` + `apply` cycle is required. A
  separate fast path should be considered for the emergency access cut-off scenario.
- **Learning burden.** The team needs to know Terraform's basic concepts (state, plan, apply,
  drift).
- **High-frequency changes are not Terraform's design goal.** Every `apply` refreshes all
  resources; as the organization grows this slows down. If the threshold is exceeded,
  membership management can be moved to a separate mechanism.
- **Single state, single fate.** A broken config in one place stops the entire `apply`.
- **A dashboard must be written.** A ready-made interface is not being bought; an application,
  however thin, will be developed.

### Re-evaluation conditions

This decision should be reviewed in the following cases:

- When the repo count exceeds ~100 (plan durations and state size)
- When the frequency of authorization changes rises to tens of times per day
- When GitHub's built-in features (custom properties + org ruleset) come to meet the entire
  need
- If the company adopts an IGA product (Okta Governance, ConductorOne, etc.) — then access
  management can be moved from Terraform to that product

---

## Notes

**This decision does not cover beyond GitHub.** Terraform only manages systems that have a
provider. Access in systems like Linear, Slack is outside this flow; in multi-system scenarios
such as offboarding, orchestration is the dashboard's responsibility. See
[`runbook.md`](../runbook.md).

**Classic branch protection is temporary.** Rules are currently written with
`github_branch_protection`. The provider has `github_repository_ruleset` and
`github_organization_ruleset`; layerable rules and `bypass_actors` support fit our model
better. The migration to rulesets should be decided with a separate ADR.
