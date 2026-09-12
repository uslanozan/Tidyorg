# Contributing to tidyorg

Thanks for your interest! tidyorg has two parts in one repo:

| Path | What it is |
| :--- | :--- |
| `terraform/` | the engine — modules, root config, and distributed templates |
| `dashboard/` | the web UI (React + Vite + TypeScript) |
| `config.example/` | a working example config set (also the default the engine validates against) |
| `docs/` | configuration guide, access model, workflow, release process |

## Development setup

**Dashboard**

```bash
cd dashboard
npm install
npm run dev        # local dev server (Vite)
```

Runtime config comes from `dashboard/.env` (see `.env.example`) or, in the Docker
image, from environment variables injected into `env.js`.

**Engine**

```bash
cd terraform
terraform init -backend=false   # providers only, no state/credentials
terraform validate
```

The engine reads config from `config.example/` by default; point `TF_VAR_config_path`
at your own config to run against a real org (see the root `README.md`).

## Before you open a PR

Run the same checks CI runs (`.github/workflows/ci.yml`):

```bash
# engine
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate

# dashboard
cd dashboard && npm run build && npm run verify:yaml
```

`verify:yaml` is the safety net for the dashboard's config serialization — keep it green.

## Conventions

- **Branches / PRs / commits:** see [`docs/branching-strategy.md`](docs/branching-strategy.md),
  [`docs/commit-convention.md`](docs/commit-convention.md), and the PR template.
  Commits follow `<type>(scope): <subject>` (Conventional Commits).
- **Keep PRs small and focused** — one logical change per PR.
- **No secrets** in the diff or in git history (keys, tokens, credentials).
- **Security issues:** do not open a public issue — see the security policy.

## License

By contributing you agree that your contributions are licensed under the project's
[MIT License](LICENSE).
