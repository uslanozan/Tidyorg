<!--
  Keep this PR small and focused. A PR that does one thing gets reviewed in
  minutes; a PR that does five things sits for days.

  Guides: docs/code-review-guide.md · docs/commit-convention.md
-->

## What changed?

<!--
  One or two sentences. What a reviewer will see in the diff.
-->

## Why?

<!--
  The context a reviewer cannot get from the diff: the problem this solves,
  the decision you made and what you rejected. This is the field reviewers
  actually need — spend your time here, not above.
-->

## Type of change

<!--
  Tick one. It must match the type in your commit messages. The version bump
  in brackets is what this change triggers on release — see docs/release-process.md.
-->

- [ ] `feat` — new feature *(MINOR)*
- [ ] `fix` — bug fix *(PATCH)*
- [ ] `perf` — performance improvement *(PATCH)*
- [ ] `refactor` — code improvement, no behaviour change
- [ ] `docs` — documentation only
- [ ] `test` — adding or updating tests
- [ ] `chore` — maintenance, config, dependencies
- [ ] `ci` — CI/CD pipeline change
- [ ] ⚠️ `BREAKING CHANGE` — incompatible change, described under "Why?" *(MAJOR)*

## Testing / Validation

<!--
  Tick what applies and fill in the blank. "Tested locally" tells a reviewer nothing.
-->

- [ ] Automated tests added or updated — which ones?
- [ ] Verified manually — which steps?
- [ ] Existing tests pass locally
- [ ] No validation needed — why not?

**Validation notes:**

<!--
  Name the tests, the commands you ran, or the steps you walked through.
-->

## Semantic commit checklist

<!-- docs/commit-convention.md -->

- [ ] Commit messages follow `<type>(scope): <subject>`
- [ ] Subject is imperative and under ~72 characters
- [ ] No leftover `wip` or `fix typo` commits — squashed before merge

## Release impact

- [ ] No production impact
- [ ] Changes production behaviour — described under "Why?"
- [ ] Needs a migration, config change, or manual step — described above

## Checklist

- [ ] I read my own diff before requesting review
- [ ] Docs updated, or not applicable
- [ ] No secrets, tokens, or credentials in the diff

## Screenshots / Notes for the reviewer

<!--
  Both optional — delete this section if you have nothing to add.
  Screenshots: only for user-visible changes (before/after helps).
  Notes: where to start reading, a tradeoff you are unsure about,
  or follow-up work you deliberately left out of scope.
-->
