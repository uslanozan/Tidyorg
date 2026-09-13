<p align="center">
  <img src="docs/images/tidyorg-mark.svg" width="84" alt="Tidyorg logo">
</p>

<h1 align="center">Tidyorg</h1>

<p align="center"><strong>Manage your GitHub organization from config files, not the settings UI.</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Terraform-%E2%89%A5%201.5-7B42BC?logo=terraform&logoColor=white" alt="Terraform >= 1.5">
  <img src="https://img.shields.io/badge/provider-integrations%2Fgithub%20~%3E%206.0-2b3137?logo=github&logoColor=white" alt="Provider: integrations/github ~> 6.0">
  <a href="https://github.com/uslanozan/Tidyorg/actions/workflows/ci.yml"><img src="https://github.com/uslanozan/Tidyorg/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

Tidyorg is a config-driven engine for GitHub organizations. You describe repositories,
teams, access, branch protection, and org settings in YAML; Terraform reconciles GitHub
to match. Every change is a pull request — reviewed, versioned, and reversible.

> Anything you change by hand in the GitHub UI drifts back on the next apply. The config
> is the single source of truth.

## Why

- **Auditable** — who can do what is answered by reading config, not clicking through
  settings. Every change is a commit.
- **Reproducible** — the whole org can be rebuilt from config.
- **Least privilege by construction** — access comes from team membership derived from
  config; org-owner escalation lives in a separate, review-gated file the dashboard cannot write.

## Architecture

```
config/*.yml            engine (Terraform)          GitHub
  what you want    ──▶   reconciles           ──▶   reality
  (PR-reviewed)          (this image)                (one-way)
```

One optional layer on top: a **web dashboard** to view access across the org and make
changes (add/remove members, edit repo access, branch protection, labels, org settings).
The dashboard never talks to Terraform directly — every change it makes is a **pull request**
against the config, so the same review gate applies. It authenticates each user via GitHub
device flow and can batch many edits into a single PR.

## Quick start (Docker)

You need: a GitHub organization you own, and a **GitHub App** installed on it (below).
The published image includes the engine and a starter config, so cloning this repository is
not required.

```bash
# 1. Pull the image and scaffold a local config directory
docker pull ghcr.io/uslanozan/tidyorg:latest
mkdir -p config state
docker run --rm \
  -v "$PWD/config:/config" \
  ghcr.io/uslanozan/tidyorg:latest scaffold

# edit config/ to describe your org (organization.yml, people.yml,
# privileged.yml, repositories/*.yml)

# 2. Drop your GitHub App private key next to the config
#    (downloaded when you created the App)
cp ~/Downloads/your-app.private-key.pem ./app.pem

# 3. Preview, then apply
docker run --rm \
  -v "$PWD/config:/config" \
  -v "$PWD/state:/state" \
  -v "$PWD/app.pem:/secrets/app.pem:ro" \
  -e TF_VAR_github_org_name=your-org \
  -e TF_VAR_github_app_id=123456 \
  -e TF_VAR_github_app_installation_id=12345678 \
  ghcr.io/uslanozan/tidyorg:latest plan

# swap `plan` for `apply` once the plan looks right
```

State is kept in `./state` on your host — no HCP / Terraform Cloud required. Point at your
own remote backend if you prefer (see **Backend** below).

`docker compose` users can download [`docker-compose.ghcr.yml`](docker-compose.ghcr.yml),
fill in its variables, then run:

```bash
docker compose -f docker-compose.ghcr.yml run --rm engine scaffold # first run only
docker compose -f docker-compose.ghcr.yml run --rm engine plan
```

The regular [`docker-compose.yml`](docker-compose.yml) remains the source-build setup for
contributors.

## GitHub Apps

Tidyorg authenticates as a **GitHub App** (short-lived tokens, org-owned identity — no
personal access token). Depending on what you run, you create up to two Apps:

**1. Engine bot** (required) — used by Terraform. Broad, because it reconciles the whole org:

| Scope | Permission |
| :--- | :--- |
| Repository → Administration | Read & write |
| Repository → Contents | Read & write |
| Repository → Issues | Read & write |
| Repository → Workflows | Read & write |
| Repository → Metadata | Read |
| Organization → Members | Read & write |
| Organization → Administration | Read & write |

Supply `TF_VAR_github_app_id`, `TF_VAR_github_app_installation_id`, and the private key
(`-v ./app.pem:/secrets/app.pem`).

**2. Dashboard app** (optional — only if you run the dashboard) — deliberately narrow. It
opens PRs on the signed-in user's behalf and nothing else, so it **cannot** delete repos or
edit `privileged.yml`:

| Scope | Permission |
| :--- | :--- |
| Repository → Contents | Read & write |
| Repository → Pull requests | Read & write |
| Repository → Actions | Read-only (live "applying/in-sync" badge) |
| Repository → Metadata | Read |

Enable "Device Flow" and install it on **only the config repo**. Give the dashboard its
`client_id` via `VITE_GITHUB_CLIENT_ID`. See [`integrations/github-app/`](integrations/github-app/)
for both manifests and step-by-step setup.

To let project mentors open dashboard PRs, set `config_repository` in
`organization.yml` to that repo's name and declare the repo under
`config/repositories/`. The engine grants the generated
`tidyorg-dashboard-writers` team `push` on the config repo; protected `main` still
requires the config repo's normal review rules.

## Config schema

Four files under `config/`, split by ownership:

| File | Owns | Who writes it |
| :--- | :--- | :--- |
| `organization.yml` | roles, defaults, org settings, profile | humans |
| `repositories/<name>.yml` | one repo: access, branch protection, labels, files | humans / dashboard |
| `people.yml` | org membership (a list of usernames) | humans / dashboard |
| `privileged.yml` | org owners + org-scoped roles | **humans only** (review-gated) |

The split of `people.yml` / `privileged.yml` is the escalation gate: the file a dashboard
can write cannot express "make this person an org owner." That lives in `privileged.yml`,
which is protected by CODEOWNERS. The org name itself is **not** in config — it comes from
`TF_VAR_github_org_name`, so there is a single source of truth. See `config.example/` for a
working set and `terraform/config/*.example.yml` for the fully-commented schema of every field.

### A repository, minimally

```yaml
description: "Payment gateway service"
language: go            # display metadata; CI auto-detects the real languages
mentors: [alice]        # repo admins (>=1)
developers: [bob, carol]
viewers: [dan]          # read-only (optional)
# everything else inherits from organization.yml defaults;
# override only what differs, e.g.:
protected_branches:
  main:
    required_reviews: 2
```

## Backend (state)

The `TF_STATE` environment variable selects where Terraform keeps its state:

| `TF_STATE` | State lives in | Extra variables |
| :--- | :--- | :--- |
| `local` (default) | the mounted `/state` volume — zero setup | — |
| `hcp` | HCP Terraform / Terraform Cloud (recommended for teams) | `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE`, `TF_TOKEN_app_terraform_io` |
| `custom` | your own backend (S3, GCS, azurerm, …) | mount your backend config at `/engine/backend.tf` |

```bash
# HCP / Terraform Cloud instead of local state:
docker run --rm \
  -v "$PWD/config:/config" \
  -v "$PWD/app.pem:/secrets/app.pem:ro" \
  -e TF_STATE=hcp \
  -e TF_CLOUD_ORGANIZATION=your-tf-org \
  -e TF_WORKSPACE=tidyorg \
  -e TF_TOKEN_app_terraform_io=... \
  -e TF_VAR_github_org_name=your-org \
  -e TF_VAR_github_app_id=123456 \
  -e TF_VAR_github_app_installation_id=12345678 \
  ghcr.io/uslanozan/tidyorg:latest plan
```

The image is built with a local backend, so switching to `hcp`/`custom` re-runs `terraform init
-reconfigure` at startup (cached providers are reused).

## Known limitations

- **No backup is built in.** Code history and issue/PR metadata are not backed up by Tidyorg;
  add your own off-GitHub backup if you need one.
- **Free-plan GitHub** cannot use branch protection on private repos; Tidyorg surfaces this
  but cannot work around it.
- Some org settings (e.g. billing email, PAT policy) are not readable by the API, so their
  drift is not detected — Tidyorg treats the config as the source of truth for those.

## Development

```bash
# Dashboard (React + Vite + TS)
cd dashboard && npm install && npm run dev

# Engine (Terraform) — providers only, no state/credentials
terraform -chdir=terraform init -backend=false && terraform -chdir=terraform validate

# Checks CI runs before merge
terraform -chdir=terraform fmt -check -recursive
cd dashboard && npm run build && npm run verify:yaml
```

Build the images locally with `docker build -t tidyorg .` (engine) and
`docker build -t tidyorg-dashboard ./dashboard`. See [`CONTRIBUTING.md`](CONTRIBUTING.md)
for conventions.

## License

[MIT](LICENSE).

## Status

Working name; pre-1.0. The engine, the web dashboard (full write mode via PRs), and their
Docker images (a Terraform engine image and a separate dashboard image) are functional. A
fresh-org first-apply still needs live verification before a 1.0 tag.
