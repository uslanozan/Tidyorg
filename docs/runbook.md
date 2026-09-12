# Runbook — Operational Scenarios

This is where you look when you need to do something. Every scenario is step by step, together
with the "why" behind it.

> **Who it's for:** mentors and head-of-engineering.
> For a field reference: [`config-guide.md`](config-guide.md).

---

## 1. People Operations

### 1.1 A new person joins the organization

1. Add them to `terraform/config/organization.yml` → the `people` section:
   ```yaml
   people:
     yeni-kullanici:
       org_role: member
   ```
2. Add the username to the `developers` list of the repos they'll work on
3. Open a PR → check the `plan` output → merge → `apply`
4. Send the person the [`onboarding.md`](onboarding.md) link

The GitHub invitation is sent automatically. Access does not become active until the person accepts the invitation and enables 2FA.

### 1.2 A person joins a new project

Add them to the relevant repo's `developers` list. Nothing else is needed — they are already
registered in the `people` section.

A person can be part of more than one project at the same time (many-to-many).

### 1.3 A person leaves a project

Remove them from the relevant repo's `developers` list. Team membership is dropped and repo access
ends with the `apply`. Their access on other projects is not affected.

### 1.4 A person leaves the company (offboarding)

> ⚠️ **Terraform only manages GitHub.** The non-GitHub items in the list below must be done
> manually. This is a known scope limit of the system — see
> [`adr/004`](adr/004-config-driven-access-management.md).

**GitHub (via config):**
- [ ] Remove them from the `developers` and `mentors` lists of all repos
- [ ] Delete their entry from the `people` section
- [ ] If they were a mentor, **assign a new mentor** to the repos they were responsible for — a repo must not be left without a mentor
- [ ] Open a PR, merge it quickly, run `apply`
- [ ] Personal access tokens (PATs) and SSH keys — because they belong to the person's own account,
      they become invalid once account access is cut, but if there are tokens created on behalf of
      the organization they must be revoked

**Is there anything in the org settings tied to this person:**
- [ ] 💳 **Does `billing_email` point to this person?** If so, change it in
      [`terraform/org-settings.tf`](../terraform/org-settings.tf).
      **This was missed on 2026-08-15:** the person's permissions had all been removed, but billing
      notifications kept going to them for three more days; it was caught on 08-18 during an import.
      ⚠️ The provider **cannot read** this field — it comes back empty on import. So `plan`
      does not show its drift, and if it is changed from the UI no one notices. The line in
      `org-settings.tf` is not a record but the **single source of truth**; that is also why
      this item is mandatory on the list.
- [ ] Were they among the org owners? Has `people.yml` → `org_role` been checked
      _(people deliberately left unmanaged as break-glass are in `people.tf` →
      `unmanaged_people`; their role comes from the UI, not Terraform)_

**Non-GitHub (manual):**
- [ ] Linear access
- [ ] Slack channels
- [ ] Cloud accounts, if any (AWS, Cloudflare, etc.)
- [ ] Have the passwords of shared accounts been changed

**Handover:**
- [ ] Reassign open PRs and issues to someone else
- [ ] Have the branches they were working on been reviewed

### 1.5 Emergency access revocation

The normal flow requires a PR + review and takes minutes. In a situation that demands security
(a compromised account, a person who left suddenly) do not wait:

1. **First, from the GitHub UI,** remove the person from the organization — access is cut instantly
2. **Then** update the config and open a PR

This ordering matters. If you leave the config un-updated, the next `apply` will add the person back.

---

## 2. Repo Operations

### 2.1 Creating a new repo

Create a **new file** named `terraform/config/repositories/yeni-servis.yml`.
The file name becomes the repo name; the repo name is not written again inside it:

```yaml
description: "Short description"
language: go
mentors: [mentor-a]
developers: [dev-1, dev-2]
```

Four lines. Branches, protections, teams, labels, template files, the CI workflow, and
CODEOWNERS are all created automatically.

After `apply`, check: was the repo created, is the default branch `develop`, is CODEOWNERS
in place.

### 2.2 Closing a repo

Add to the `config/repositories/eski-servis.yml` file:

```yaml
archived: true
```

**Do not delete the file from the directory.** Deleting it tells Terraform to "destroy it." The
`prevent_destroy` protection kicks in and `apply` stops with this error:

```
Error: Instance cannot be destroyed
```

This protection is deliberate: a line accidentally deleted in the dashboard should not destroy the repo.

Archiving makes the repo read-only; the code, issues, and history are preserved.

### 2.3 Actually deleting a repo

Rarely needed. In order:

1. Confirm the repo really needs to be deleted — isn't archiving enough?
2. Temporarily remove the `lifecycle { prevent_destroy = true }` block in
   `terraform/modules/repository/main.tf`
3. Delete the `config/repositories/<repo-name>.yml` file
4. Read the `plan` output **carefully** — only the targeted repo should be deleted
5. `apply`
6. **Put the** `prevent_destroy` block **back**

If step 6 is forgotten, the protection is lifted for all repos.

### 2.4 Changing a repo's rules

Into `config/repositories/payments-api.yml`:

```yaml
protected_branches:
  main:
    required_reviews: 3
```

Write only the field that differs; the rest continues to come from `defaults`.
Merging is done per branch — overriding one branch does not delete that branch's other fields.

### 2.5 Changing the mentor

Update the `mentors` field. The old mentor's admin permission drops automatically and the new one gets it.

---

## 3. Terraform Operations

### 3.1 Verifying the system is healthy

```powershell
terraform -chdir=terraform plan
```

Expected:

```
No changes. Your infrastructure matches the configuration.
```

Any other output can mean one of two things: someone made a change manually from the UI,
or a setting was not accepted by GitHub.

Running this check once a week is a good habit.

### 3.2 Drift — a resource that says "will change" but never finishes

**Symptom:** On every `plan` the same resource appears as "will change," `apply` finishes without
issue, but the next `plan` says the same thing again.

**Cause:** GitHub appears to accept the request but **silently ignores it.**

**Known example:** You put a team on the `push_allowed_roles` list, but that team has no access
to the repo. GitHub does not error, it just doesn't apply it.

**What to do:** Check the precondition of the setting in question — does the team have repo access,
is the user an organization member, does the plan tier support this feature.

### 3.3 Apply stopped halfway

Terraform does not roll back what it created; it writes to state and stops. Fixing the error and
running `apply` again is enough — it only completes what's missing. There is no need to rebuild from scratch.

### 3.4 I see `destroy` in the `plan` output

**Stop.** Read what will be deleted. An unexpected deletion is usually one of these three:

- A line was accidentally deleted from the config
- A field's name was misspelled (Terraform treats it as "removed")
- A resource was manually deleted from GitHub and Terraform is trying to recreate it

If you're not sure, don't merge.

### 3.5 State lock

Two `apply`s cannot run at the same time. If you get a "Workspace is locked" error, someone's
operation is in progress. You can see the running run from the HCP Terraform UI.

### 3.6 Someone changed or deleted something from the UI

The mentor and head-of-engineering roles can make changes from the UI — `enforce_admins` is
permanently `false` ([Decision E](../ROADMAP.md)). So this scenario is **not an exception but an
expected situation.** The system's response to it splits into three different behaviors:

| What was done | What Terraform does | Result |
| :--- | :--- | :--- |
| **A managed field changed** _(review count 1 → 2)_ | `~ update in-place` appears in `plan` | ✅ `apply` reverts to the old value |
| **A managed resource deleted** _(a branch protection rule)_ | `Drift detected (delete)` on refresh | ✅ `apply` **recreates it** |
| **Something unmanaged deleted** _(a non-default branch)_ | Nothing — it doesn't know | ⚠️ Silently disappears |

**The third row is this system's known limit.** The module only manages the **default branch**
(`github_branch.default`, which is only created when `default_branch != "main"`). If a long-lived
non-default branch is deleted, Terraform does not bring it back. Commits are not lost on the git
side (reflog, open PRs remain) but because the branch itself is not declared, there is no
automatic repair.

> **A distinction worth knowing — the rule is not tied to the branch.**
> Branch protection applies to a **name pattern**, not to the branch itself. Even if the branch is
> deleted the rule can remain; when a branch with that name is opened again, it **kicks in on its
> own.** A rule pointing to a non-existent branch is harmless but invisible — which is why when you
> permanently remove a branch it should also be dropped from the config
> (see [`branching-strategy.md`](branching-strategy.md) Section 8.1).

**What to do:**

1. Run `terraform plan` — if the change belongs to something managed, it will show.
2. If the change **is meant to be permanent,** don't leave it in the UI; write it to the config and `apply`.
   Otherwise the next apply reverts it and you get a "my setting disappeared" complaint.
3. If the deleted thing is unmanaged (a branch, label, milestone) it must be brought back manually.

**A real case (2026-08-17):** In the `tidyorg` repo the `develop` branch
and its protection rule were deleted from the UI. The branch was not managed anyway (in this repo
the default is `main`), so Terraform didn't notice. The protection rule, however, was managed — and
had it not been dropped from the config at the same time, the next `apply` **would have silently
recreated the rule for a non-existent branch.**

---

## 4. Known Constraints

**Terraform only manages GitHub.** Linear, Slack, and other systems are out of scope.

**Changes made from the UI are not permanent — but only for managed resources.** If a managed
setting is changed or deleted, the next `apply` reverts it; **if something unmanaged is deleted,
Terraform doesn't even know about it.** Non-default branches, labels, and milestones fall into this
second group. The table of the three cases and a real example: Section 3.6.

Mentors should be told about this behavior in advance, otherwise you get a "my setting disappeared"
complaint.

**There is no time-limited access.** Temporary access must be removed manually.

**Free plan.** On private repos, branch protection and push restrictions require the GitHub Team
plan. We currently work with public repos.

**Repo security settings are not managed.** None of secret scanning, push protection,
`vulnerability_alerts`, or code scanning are set up from the config — see
[`security-policy.md`](security-policy.md) Section 5.

**The automation's identity: the `tidyorg-infra-bot` GitHub App** _(since 2026-08-15)_.
The commits Terraform makes now land under the bot's name rather than a person's; they can be told
apart from a manual change in the audit log. Setup:
[`../integrations/github-app/README.md`](../integrations/github-app/README.md).

---

## 5. Related Documents

- [`config-guide.md`](config-guide.md) — Full reference of config fields
- [`workflow-guide.md`](workflow-guide.md) — General workflow
- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Roles and the permission matrix
- [`adr/004-config-driven-access-management.md`](adr/004-config-driven-access-management.md) — Why this architecture
- [`../ACCESS-MODEL.md`](../ACCESS-MODEL.md) — The model and the decisions made
