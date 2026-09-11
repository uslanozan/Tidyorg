<!--
  DRAFT of the open-source root README (English). Lives in docs/notes for now.
  At extraction (fresh tidyorg repo) this becomes /README.md.
  "tidyorg" is the working name. Polish before publishing.
-->

# tidyorg

**Manage your GitHub organization from config files, not the settings UI.**

tidyorg is a config-driven engine for GitHub organizations. You describe repositories,
teams, access, branch protection, and org settings in YAML; Terraform reconciles GitHub
to match. Every change is a pull request — reviewed, versioned, and reversible.

> Anything you change by hand in the GitHub UI drifts back on the next apply. The config
> is the single source of truth.

## Why

- **Auditable** — who can do what is answered by reading config, not clicking through
  settings. Every change is a commit.
- **Reproducible** — the whole org can be rebuilt from config.
- **Least privilege by construction** — access comes from team membership derived from
  config; org-owner escalation lives in a separate, review-gated file the UI cannot write.

## Architecture

```
config/*.yml            engine (Terraform)          GitHub
  what you want    ──▶   reconciles           ──▶   reality
  (PR-reviewed)          (this image)                (one-way)
```

Two optional layers on top:
- an **Issue Form** to request changes without writing YAML, and
- a **read-only dashboard** to see access across the org at a glance.

Both open pull requests against the config — they never talk to Terraform directly.

## Quick start (Docker)

You need: a GitHub organization you own, and a **GitHub App** installed on it (below).

```bash
# 1. Scaffold your config from the examples
mkdir -p config/repositories
cp examples/organization.example.yml config/organization.yml
cp examples/people.example.yml       config/people.yml
cp examples/privileged.example.yml   config/privileged.yml
cp examples/repository.example.yml   config/repositories/my-first-repo.yml
# edit these to describe your org

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
  ghcr.io/OWNER/tidyorg:latest plan

# swap `plan` for `apply` once the plan looks right
```

State is kept in `./state` on your host — no HCP / Terraform Cloud required. Point at your
own remote backend if you prefer (see below).

`docker compose` users: copy `docker-compose.yml`, fill in the three variables, then
`docker compose run --rm tidyorg plan`.

## The GitHub App

tidyorg authenticates as a GitHub App (short-lived tokens, org-owned identity — no personal
access token). Create one on your org with these permissions and install it:

| Scope | Permission |
| :--- | :--- |
| Repository → Administration | Read & write |
| Repository → Contents | Read & write |
| Repository → Issues | Read & write |
| Repository → Metadata | Read |
| Organization → Members | Read & write |
| Organization → Administration | Read & write |

Then supply `TF_VAR_github_app_id`, `TF_VAR_github_app_installation_id`, and the private key
(`-v ./app.pem:/secrets/app.pem`).

## Config schema

Four files under `config/`, split by ownership:

| File | Owns | Who writes it |
| :--- | :--- | :--- |
| `organization.yml` | roles, defaults, org settings | humans |
| `repositories/<name>.yml` | one repo: access, branch protection, files | humans / dashboard |
| `people.yml` | org membership (a list of usernames) | humans / dashboard |
| `privileged.yml` | org owners + org-scoped roles | **humans only** (review-gated) |

The split of `people.yml` / `privileged.yml` is the escalation gate: the file a dashboard
can write cannot express "make this person an org owner." That lives in `privileged.yml`,
which is protected by CODEOWNERS. See `examples/` for every field.

### A repository, minimally

```yaml
description: "Payment gateway service"
language: go            # go | python | typescript | php
mentors: [alice]        # repo admins (>=1)
developers: [bob, carol]
# everything else inherits from organization.yml defaults;
# override only what differs, e.g.:
protected_branches:
  main:
    required_reviews: 2
```

## Backend (state)

By default the container keeps state locally on the mounted `/state` volume. To use a remote
backend (S3, GCS, Terraform Cloud, …), mount your own `backend.tf` into the engine or run the
engine directly with `-backend-config`.

## Known limitations

- **No backup is built in.** Code history and issue/PR metadata are not backed up by tidyorg;
  add your own off-GitHub backup if you need one.
- **Free-plan GitHub** cannot use branch protection on private repos; tidyorg surfaces this
  but cannot work around it.
- Some org settings (e.g. billing email, PAT policy) are not readable by the API, so their
  drift is not detected — tidyorg treats the config as the source of truth for those.

## License

TODO — choose a license before publishing (Apache-2.0 recommended).

## Status

Working name; pre-1.0. The engine and read-only dashboard are functional; the dashboard's
write mode and the single combined image (engine + dashboard) are in progress.
