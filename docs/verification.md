# Verification Report

This page records what has actually been tested for v0.1.2 and, equally importantly,
what is not automated yet.

Last verified: 2026-09-14

## v0.1.3 release-candidate checks

The dual-registry workflow was exercised from commit `be3be2b` before tagging v0.1.3.
Run [`34791440540`](https://github.com/uslanozan/Tidyorg/actions/runs/34791440540)
authenticated to both registries and published matching `linux/amd64` and `linux/arm64`
indexes under the temporary `sha-be3be2b` tag:

| Image | Matching GHCR / Docker Hub digest |
| :--- | :--- |
| `tidyorg` | `sha256:2ca59b5cc7c38b0d537629951afefe6516cc99a2401878397da1732ad00bb625` |
| `tidyorg-dashboard` | `sha256:3348b354ee973b5d026aabbb65fe70f283a2458542e7e310d63aff60171d1c3f` |

The v0.1.3 preparation was then checked with Terraform format, initialization,
validation and test; a clean dashboard dependency install, production build and YAML
round trip; and both GHCR and Docker Hub Compose resolutions. All passed, and `npm audit`
reported zero vulnerabilities.

The checks below document the functional v0.1.2 baseline reused by this patch release.

## Automated checks

The [`CI` workflow](https://github.com/uslanozan/Tidyorg/actions/workflows/ci.yml) runs on
every pull request and push to `main`.

| Area | Check | v0.1.2 result |
| :--- | :--- | :--- |
| Terraform | `terraform fmt -check -recursive` | Pass |
| Terraform | `terraform validate` | Pass |
| Access model | `terraform test` | 1 passed, 0 failed |
| Dashboard | TypeScript check and production Vite build | Pass |
| Configuration | YAML parse/edit/serialize round trip | Pass |
| Dependencies | `npm audit` during the 2026-09-14 local verification | 0 vulnerabilities |

The access-model test asserts that:

- project mentors are collected into `tidyorg-dashboard-writers`;
- organization owners are team maintainers and ordinary mentors are members;
- the team receives `push` only on the configured control-plane repository; and
- the team receives no implicit access to managed project repositories.

The v0.1.2 CI run is available at
[`34775975683`](https://github.com/uslanozan/Tidyorg/actions/runs/34775975683).

## Live disposable-organization test

On 2026-09-13, v0.1.2 was tested against the disposable `Tidyorg-Test` organization:

1. Authenticated Terraform with a dedicated GitHub App.
2. Applied a fresh configuration and created the managed repositories.
3. Signed in to the dashboard through GitHub Device Flow.
4. Loaded organization and repository configuration in the dashboard.
5. Edited configuration and opened a pull request from the dashboard flow.
6. Merged the pull request through the protected-branch workflow.
7. Applied the resulting Terraform plan.
8. Ran a second plan and received `No changes`.
9. Confirmed that `tidyorg-dashboard-writers` had write access to the config repository,
   without `admin` or `maintain`, and no control-plane grant on project repositories.

This is real end-to-end evidence, but it is currently a manual pilot rather than a scheduled
automated test.

## Release image verification

The [`v0.1.2` release workflow](https://github.com/uslanozan/Tidyorg/actions/runs/34776008350)
published and verified both architectures:

| Image | Index digest | Platforms |
| :--- | :--- | :--- |
| `ghcr.io/uslanozan/tidyorg:0.1.2` | `sha256:1671562e85e198daac4e7e58b6b020962d960b43aeb572de637ffcfe5a2f642f` | `linux/amd64`, `linux/arm64` |
| `ghcr.io/uslanozan/tidyorg-dashboard:0.1.2` | `sha256:5bf6f12245220df7dc5973cb95d0ff579d495cbff4056f583216aec7a93e7f76` | `linux/amd64`, `linux/arm64` |

The published engine was started and reported Terraform 1.9.8 with GitHub provider 6.13.0.
The published dashboard image passed `nginx -t`.

## Current test boundary

The following are planned, not claimed as complete:

- React component and unit tests;
- mocked GitHub API tests for 403, 409, 429, and partial-failure behavior;
- automated browser tests for the dashboard's critical flows;
- a scheduled disposable-organization end-to-end test;
- broader Terraform tests for every repository, role, and validation combination; and
- automated container startup and health checks in CI.

Tidyorg is therefore presented as a verified pre-1.0 system, not as a fully tested
production control plane.

## Reproduce the local checks

```bash
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform init -backend=false -input=false
terraform -chdir=terraform validate
terraform -chdir=terraform test

cd dashboard
npm ci
npm run build
npm run verify:yaml
```
