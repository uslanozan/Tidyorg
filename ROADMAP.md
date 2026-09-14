# Tidyorg Roadmap

This roadmap describes the product's current direction. The original implementation plan
is preserved in [`ROADMAP-2026-08.md`](ROADMAP-2026-08.md).

Last updated: 2026-09-14

## Current state — v0.1.3

Tidyorg is a functional pre-1.0 GitHub organization governance engine:

- YAML is the source of truth for repositories, teams, access, branch protection,
  labels, managed files, workflows, membership, and organization settings.
- Terraform previews and reconciles configuration changes.
- The dashboard reads the configuration and proposes changes through pull requests; it
  does not run Terraform or write directly to `main`.
- Engine and dashboard images are published to GHCR for `linux/amd64` and `linux/arm64`.
- The complete flow has been verified on a disposable organization: initial apply,
  dashboard sign-in, config edit, pull request, merge, apply, and a final no-change plan.

See [`docs/verification.md`](docs/verification.md) for the evidence and current test boundary.

## Next priorities

### 1. Reliability and automated proof

- Add dashboard unit tests with Vitest and React Testing Library.
- Add browser-level tests for sign-in errors, YAML edits, batching, and pull-request creation.
- Automate a disposable-organization smoke test for scaffold → apply → change → reconcile.
- Add a `tidyorg doctor` preflight command for App permissions, organization access,
  backend availability, and configuration validity.

### 2. Safety and supply chain

- Classify destructive plans and require explicit opt-in for high-risk changes.
- Add configuration schema versioning and documented migrations.
- Publish SBOMs and sign release images.
- Pin third-party GitHub Actions by commit SHA and add dependency/static-security checks.
- Test the supported Terraform version range instead of only the pinned release version.

### 3. Adoption and operations

- Turn unmanaged-repository coverage into an actionable drift report.
- Generate starter YAML for existing repositories to simplify adoption.
- Surface reconciliation status and drift clearly in the dashboard.
- Continue simplifying onboarding and provide a repeatable demo environment.

## Deferred

- Private-repository policy validation that requires a paid GitHub plan.
- Automation agents and third-party project-management integrations.
- Additional repository settings that do not improve onboarding, safety, or reliability.

The near-term goal is not a wider feature set. It is stronger proof that installation is
repeatable, risky changes are visible, and the control plane behaves safely under failure.
