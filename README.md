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
own remote backend if you prefer (see **Backend** below).

`docker compose` users: copy `docker-compose.yml`, fill in the three variables, then
`docker compose run --rm tidyorg plan`.

## GitHub Apps

tidyorg authenticates as a **GitHub App** (short-lived tokens, org-owned identity — no
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
`TF_VAR_github_org_name`, so there is a single source of truth. See `examples/` for every field.

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

By default the container keeps state locally on the mounted `/state` volume. To use a remote
backend (S3, GCS, Terraform Cloud, …), edit [`terraform/backend.tf`](terraform/backend.tf)
or run the engine with `-backend-config`.

## Known limitations

- **No backup is built in.** Code history and issue/PR metadata are not backed up by tidyorg;
  add your own off-GitHub backup if you need one.
- **Free-plan GitHub** cannot use branch protection on private repos; tidyorg surfaces this
  but cannot work around it.
- Some org settings (e.g. billing email, PAT policy) are not readable by the API, so their
  drift is not detected — tidyorg treats the config as the source of truth for those.

## License

[MIT](LICENSE).

## Status

Working name; pre-1.0. The engine, the web dashboard (full write mode via PRs), and the
single combined Docker image (engine + dashboard) are functional. A fresh-org first-apply
still needs live verification before a 1.0 tag.
