# Code Review Guide

The purpose of code review is not to catch bugs — catching bugs is a side benefit. The real
purpose is **for the code to become the team's shared property**: so that even if the person who
wrote it is gone tomorrow, someone else can understand that code.

This document addresses both sides: the PR author and the PR reviewer.

---

## 1. For the PR Author

### 1.1 Open a small PR

This is the single most important factor determining review quality. A 200-line PR gets reviewed
seriously; a 2000-line PR gets skimmed and approved.

If there is a large piece of work, break it into parts:
- Refactor first, then the feature — don't put both in the same PR
- Data layer first, then business logic, then the interface
- Separate independent fixes

### 1.2 Fill in the description

The **"Why?"** field in the PR template is the most critical one. The diff already shows what
changed; only you know why it changed. Most of the reviewer's time goes into guessing this question
— if you provide the answer, review speeds up.

A good description includes:
- Which problem it solves
- Why this approach was chosen, which alternative was ruled out
- How it was tested
- The place you specifically want the reviewer to look at

### 1.3 Review your own PR yourself first

After opening the PR, go to the "Files changed" tab and read the diff end to end. A `console.log`
left in, wrong indentation, a copy-paste leftover — these are most often caught here. Don't spend
the reviewer's time on them.

### 1.4 Don't request a review before CI is green

Reviewing a red PR is a waste of time — the reviewer's comments may become invalid after the fix.
Let `ci/test` turn green first.

### 1.5 Respond to comments

If you applied a comment, write "done" or mark it with an emoji. If you didn't apply it, write
**why** you didn't. A silently closed comment leaves the reviewer wondering "did they even see it?"

---

## 2. For the Reviewer

### 2.1 What to look at

In order of priority:

**1. Correctness.** Does the code do what it claims to do? Are the edge cases considered — empty
list, null, zero, negative number, concurrent call? What happens on error?

**2. Security.** Is user input validated? Are SQL queries parameterized?
Is there an authorization check? Is there a secret embedded in the code? Is sensitive data written
to logs?

**3. Readability.** Will someone be able to understand this code six months from now? Does the
naming say what it does? Does a complex section explain why it was written that way?

**4. Performance.** Is there a query inside a loop (N+1)? Unnecessary copying? What happens with a
large dataset? — But don't ask for premature optimization; an unmeasured performance concern is
most often noise.

**5. Tests.** Is there a test for the new behavior? Does the test actually verify the behavior,
or does it just repeat the implementation?

### 2.2 What not to look at

Formatting, indentation, quote style. These are the job of the linter and `.editorconfig`. Human
review should not be spent on work the machine can do. If you are about to write such a comment,
suggest adding a linter rule instead.

### 2.3 How to give feedback

**Comment on the code, not the person.**
❌ "Why did you do this, it makes no sense at all."
✅ "What happens here if X? I couldn't see a problem but I wasn't sure."

**State the severity.** Not every comment carries equal weight:
- `blocker:` — must not be merged without fixing
- `suggestion:` — would be better, but not required
- `question:` — I don't understand, could you explain
- `nit:` — very minor, do it if you want

This prefix clarifies what the PR owner must do for sure.

**Suggest an alternative.** Instead of saying "this is wrong", write what it should be. Best of all
is to give a code example — GitHub's "suggestion" block can be applied with one click.

**Say what's good too.** If you saw an elegant solution, say so. If review is only a channel for
criticism, people become reluctant to open PRs.

### 2.4 Approve or Request changes?

| Situation | Decision |
| :--- | :--- |
| No problems | **Approve** |
| Only `nit:` and `suggestion:` | **Approve** — leave the trust to the PR owner |
| There's something you don't understand but you're not sure it's wrong | **Comment** — ask, don't block |
| There's a correctness or security problem | **Request changes** |
| The scope has exceeded the PR's purpose | **Request changes** — ask for it to be split |

"Request changes" is not a tool to be used generously; it effectively stops the PR. For small
fixes, Approve + a comment often moves things faster.

---

## 3. Approval Rules Vary by Repo

There is no single "min 2 approvals" rule. Each repo gets its own rule from the configuration:

| Setting | Meaning |
| :--- | :--- |
| `required_reviews` | How many approvals are required |
| `require_code_owner_review` | Whether the mentor's (code owner) approval is mandatory |

Typical configuration:

- **`main`** — 2 approvals + mentor approval mandatory. Code going to production.
- **`develop`** — 1 approval, mentor approval not mandatory. Another developer is enough.

In a two-person project, making mentor approval mandatory makes it a bottleneck; that's why this
setting can be relaxed per repo. To change the rule:
[`config-guide.md`](config-guide.md).

### CODEOWNERS is not edited by hand

The `.github/CODEOWNERS` file in each repo is **generated** from the configuration. If you change
it by hand, the next `terraform apply` overwrites it. Ownership changes must be made through the
config.

---

## 4. Review Time

| Expectation | Time |
| :--- | :--- |
| First response | Within 1 business day |
| Small PR (<200 lines) | Same day |
| Urgent fix / hotfix | As soon as possible — notify via the channel |

> These times are written as a recommendation; if the team adopts a different pace in practice, the
> document should be updated.

If you are not in a position to review (leave, workload), leave a short comment on the PR. Silence
is the worst option — the PR owner can't know what they're waiting for.

---

## 5. New Commits Dismiss Approvals

The `dismiss_stale_reviews` setting is on: if a new commit arrives after a PR is approved, the
existing approvals are dismissed and a re-review is required.

This is a deliberate choice — it guarantees that the approved code and the merged code are the
same. Requesting approval again for a small fix may seem annoying, but the alternative is "code
silently added after approval."

---

## 6. Related Documents

- [`workflow-guide.md`](workflow-guide.md) — General workflow
- [`commit-convention.md`](commit-convention.md) — Commit message standard
- [`branching-strategy.md`](branching-strategy.md) — Branch strategy
- [`config-guide.md`](config-guide.md) — Changing the approval rules
- [`security-policy.md`](security-policy.md) — What to watch for from a security standpoint
