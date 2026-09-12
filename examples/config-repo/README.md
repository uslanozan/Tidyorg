# Config repo template

Scaffolding for **your own config repository** — the private repo that holds your
organization's config and drives it through pull requests. tidyorg's engine and
dashboard are separate (published images); this repo holds only your data + the CI
that applies it.

## Layout

```
your-config-repo/
├── config/                     # your org's configuration (edit these)
│   ├── organization.yml        # roles, defaults, org profile
│   ├── people.yml              # org membership (dashboard writes here)
│   ├── privileged.yml          # org owners + roles — CODEOWNERS-gated, humans only
│   └── repositories/*.yml      # one file per repo
├── .github/
│   ├── workflows/
│   │   ├── terraform-plan.yml  # PR → plan, commented on the PR
│   │   └── terraform-apply.yml # merge to main → apply
│   └── CODEOWNERS              # protects privileged.yml (the escalation gate)
└── README.md
```

## Setup

1. **Create the repo** (private) and copy this directory into it. For the `config/`
   contents, start from tidyorg's [`config.example/`](../../config.example/):
   `cp -r config.example your-config-repo/config` — then edit.

2. **Create the engine GitHub App** on your org (see tidyorg's
   `integrations/github-app/`), install it, and note the App id + installation id +
   download the private key.

3. **Set repo variables** (Settings → Secrets and variables → Actions → *Variables*):
   `TIDYORG_GITHUB_ORG`, `TIDYORG_APP_ID`, `TIDYORG_APP_INSTALLATION_ID`,
   `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE`.

4. **Set repo secrets** (same page → *Secrets*):
   `TIDYORG_APP_PEM` (the App private key), `TF_TOKEN_APP_TERRAFORM_IO` (HCP token).

5. **Point the image**: in both workflows replace `ghcr.io/OWNER/tidyorg:latest`
   with the engine image you use.

6. **Edit CODEOWNERS**: replace `@your-org/platform-admins` with your owners team.

## How it works

- Edit `config/` (by hand, or via the dashboard which opens a PR) → **plan** runs and
  comments on the PR → review → merge → **apply** reconciles GitHub to match.
- State lives in HCP (locked, shared) by default. For local state, drop the
  `TF_STATE`/`TF_CLOUD_*`/`TF_TOKEN_*` lines from the workflows — but CI local state is
  not persisted between runs, so HCP (or another remote backend) is recommended.

## Dashboard

Point the dashboard at this repo with `CONFIG_OWNER` / `CONFIG_REPO` / `CONFIG_BRANCH`.
The config lives under `config/`, which is the dashboard's default (`CONFIG_BASE=config`).
If you keep config at the repo root instead, set `CONFIG_BASE=""`.
