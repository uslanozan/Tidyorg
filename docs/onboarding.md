# Onboarding — New Developer Guide

Welcome. This guide covers the path from your first day to your first merged PR.
Reading it end to end takes about 15 minutes; it is normal for your first half day,
including setup, to be spent on this.

---

## 1. First Day — Checklist

### 1.1 Access

- [ ] **Accept the GitHub organization invitation.**
      The invitation email arrives automatically; nobody invites you by hand. Your mentor
      adds you to the configuration, and the system generates the invitation.
      If the invitation does not arrive, tell your mentor — most likely `apply` has not run yet.
      _This claim has actually been true since 2026-08-18: the invitation is generated from
      [`terraform/config/organization.yml`](../terraform/config/organization.yml) →
      the `people` section. Before that, memberships were written by hand._

- [ ] **Enable two-factor authentication (2FA).**
      GitHub → Settings → Password and authentication.
      It is mandatory for organization membership; an account without 2FA loses access.

- [ ] **Generate and add an SSH key.**
      ```bash
      ssh-keygen -t ed25519 -C "you@company.com"
      cat ~/.ssh/id_ed25519.pub
      ```
      Paste the output under GitHub → Settings → SSH and GPG keys → New SSH key.
      Verify:
      ```bash
      ssh -T git@github.com
      ```

- [ ] **Find out which repos you have access to.**
      At `https://github.com/orgs/<org>/teams` you will see the `<repo>-devs`
      teams you are a member of. Each team corresponds to a project.

### 1.2 Development environment

- [ ] **Clone the project**
      ```bash
      git clone git@github.com:<org>/<repo>.git
      cd <repo>
      ```

- [ ] **Do the project-specific setup.** Follow the steps in the repo's own `README.md` or
      `CONTRIBUTING.md` file (dependencies, the `.env` file,
      database, etc.).

- [ ] **Install the `.editorconfig` plugin.** It aligns your editor's indentation and line-ending
      settings with the project; it prevents unnecessary diffs caused by formatting differences.
      VS Code: `EditorConfig for VS Code`.

- [ ] **Never commit secrets.** All sensitive data is kept in `.env` files and
      blocked by `.gitignore`. Details: [`security-policy.md`](security-policy.md).

### 1.3 Required reading

| Document | Why |
| :--- | :--- |
| [`workflow-guide.md`](workflow-guide.md) | To see the big picture |
| [`branching-strategy.md`](branching-strategy.md) | Branch naming and flow |
| [`commit-convention.md`](commit-convention.md) | Commit message format |
| [`code-review-guide.md`](code-review-guide.md) | What to expect during review |

---

## 2. Your First Pull Request

Start with something small — a typo fix, a missing line of documentation. The goal is not
the size of the code but experiencing the flow end to end once.

**1. Open a branch from an up-to-date `develop`**

```bash
git checkout develop
git pull origin develop
git checkout -b docs/fix-readme-typo
```

The branch name follows the form `<category>/<short-description>`. Categories: `feat/`, `fix/`,
`chore/`, `docs/`. If an issue tracking system is used, add the ID:
`feat/LIN-123-user-auth`.

> **Don't be surprised if a repo has no `develop` branch.** In infrastructure/config repos (like `tidyorg`)
> `develop` deliberately does not exist; branches are opened from `main` and return to `main`.
> Rationale: [`branching-strategy.md`](branching-strategy.md) Section 8.

**2. Make the change and commit it**

```bash
git add .
git commit -m "docs(readme): fix installation command typo"
```

**3. Push**

```bash
git push -u origin docs/fix-readme-typo
```

**4. Open a PR**

Click the link in the terminal output or use the "Compare & pull request" button on
GitHub. The target branch must be **`develop`**.

The PR template fills in automatically. The most important field is **"Why?"** — the diff already
shows what you did; only you know why you did it.

**5. Wait for CI to finish**

A check named `ci/test` runs below. Merge is not enabled until it turns green. If it is red,
look at the logs, fix it, and push again — the PR updates automatically.

**6. Get a review**

The number of required approvals varies by repo. In some projects your mentor's approval is
mandatory, in others another developer's approval is enough. The PR page shows which one is
expected.

**7. Merge**

After approval and green CI, use **Squash and merge**. Your branch is deleted automatically.

---

## 3. Commit Message Examples

```
feat(auth): add google oauth2 login integration
fix(payment): resolve null pointer in stripe webhook
chore(deps): bump react from 18.2.0 to 18.3.1
docs(readme): update installation instructions
```

Bad examples and their rationale: [`commit-convention.md`](commit-convention.md).

Your commit message directly affects the version number: `feat` triggers a minor,
`fix` a patch, and `BREAKING CHANGE` a major increase.

---

## 4. What to Expect During Review

- **The first comment usually arrives within 1 business day.** If it is more urgent, add a label
  to the PR or message your mentor.
- **Being asked for changes is normal.** "Request changes" is not a personal criticism, but a
  sign that the process is working. Experienced developers receive the same comments.
- **Ask about a comment you don't understand.** The reviewer's intent is for the code to be
  better; asking does not slow you down, it speeds you up.
- **A small PR gets through faster.** A 200-line PR may go through the same day, while a 2000-line
  PR may wait for days.
- **New commits dismiss approvals.** `dismiss_stale_reviews` is on — you will need to request
  approval again. This is deliberate: so that the approved code and the merged code are the same.

---

## 5. Frequently Asked Questions

**"I can't access the repo / I see a 404."**
You haven't been added to that project's team yet. Tell your mentor; they add you to the
configuration, and after the PR is merged and `apply` runs, your access is enabled. It takes a
few minutes.

**"I can't push to `develop`, it's rejected."**
Expected behavior. `main` and `develop` are protected branches; nobody in the developer role
can write to them directly. Open a branch and submit via a PR.

**"My PR is waiting for `ci/test`, and it never starts."**
The repo may not have a CI workflow file. Notify your mentor — in the repo's configuration
the CI deployment and the status check requirement must be set together.

**"I can't approve my own PR."**
GitHub does not allow it. Someone else has to approve.

**"I changed a setting from the GitHub interface, and then it reverted."**
You saw it right. Repo settings are managed from code; manual changes are undone by the next
`apply`. For a permanent change, tell your mentor so it is done from the configuration.
Details: [`config-guide.md`](config-guide.md).

**"I opened a PR against the wrong branch."**
You can change the target branch with "Edit" on the PR page; you don't need to close the PR.

**"I can't merge, the button is gray."**
Check in order: is CI green, are there enough approvals, are there unresolved comments left, is
the branch up to date with `develop`. The PR page lists what is missing.

**"I accidentally committed my `.env` file."**
Notify your mentor immediately. Once a secret has been pushed, deleting the file is not enough —
it remains in history. The relevant key must be revoked and rotated.

---

## 6. Where to Get Help

1. This document and [`workflow-guide.md`](workflow-guide.md)
2. The repo's own `README.md` / `CONTRIBUTING.md` file
3. The project's mentor — you can see who it is from the `<repo>-mentors` team
4. The team channel

If the answer to your question is not in the docs, that is a gap: ask, and then open a PR to add
the answer here. This is how this guide improves.
