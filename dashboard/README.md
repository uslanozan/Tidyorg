# 🖥️ tidyorg Management Dashboard

An interface where heads of engineering and mentors can manage projects, mentors,
and developers without writing YAML files.

The dashboard **has no server and no token of its own**. The user signs in with
GitHub, and every request goes out with the user's own token. GitHub handles
authorization: if a mentor tries to change someone else's repo config, a PR is
opened but cannot be merged without CODEOWNERS approval.

## What does it do?

| Screen | Purpose |
| :--- | :--- |
| **Projects** | Reads the `terraform/config/repositories/*.yml` files and lists them as cards; filters by name/language |
| **Project detail** | Mentor/developer list, branch protection (merged with org defaults), repo info |
| **Write operations** | Add/remove developers/mentors, edit repo info, create a new project — **all open a PR** |
| **Member** | Which project a person is in and in which role |
| **Pending PRs** | PRs opened from the dashboard + a summary of the `terraform plan` comment posted to the PR |

The dashboard never writes directly to `main`. Every change is written to a branch
named `dashboard/<operation>-<repo>-<timestamp>` and opened as a PR.

## Running

```bash
cd dashboard
npm install
cp .env.example .env    # fill in the values
npm run dev             # http://localhost:5173
```

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Development server |
| `npm run build` | Type checking + production build (`dist/`) |
| `npm run typecheck` | Type checking only |
| `npm run verify:yaml` | Write safety net on the real config files (see below) |

## Environment variables

| Variable | What it does |
| :--- | :--- |
| `VITE_GITHUB_CLIENT_ID` | The client_id of the tidyorg **GitHub App** (`Iv1.…`/`Iv23.…`). **Provided by owner-a.** No `client_secret` is needed or requested. |
| `VITE_CONFIG_OWNER` | The owner of the config repo (org name) |
| `VITE_CONFIG_REPO` | The name of the config repo |
| `VITE_CONFIG_BRANCH` | The target branch for PRs (default `main`) |
| `VITE_OAUTH_PROXY` | The OAuth proxy path. If left empty, `/gh-oauth` is used. |

The `client_id` is not secret; the entire security of the Device Flow rests on the
approval the user gives on GitHub + the repo the App is installed on.

**Two sources, in this order:** `window.__ENV__` (runtime — in the Docker image the
entrypoint generates `env.js` from the container's environment variables) →
`import.meta.env` (the `.env` baked into the build). Runtime always wins; locally,
`.env` is enough.

## Sign-in: GitHub App Device Flow — and a CORS note

Because a static SPA cannot store a `client_secret`, Device Flow is used: the user
is shown a code, the user approves the code on github.com, and the dashboard
receives the token. The token is kept in **`sessionStorage`** (not `localStorage`):
when the tab closes, the session ends. Token expiration is **disabled** in the App
settings (there is no refresh token flow).

**GitHub grants the authorization.** No `scope` is sent; what the user can access is
determined by the permissions of the repos the App is installed on (Contents RW,
Pull requests RW, Metadata R). If the App is not installed on the config repo for
this user, sign-in still succeeds but the dashboard shows the "This account has no
access" screen — when the first `contents` request returns 403.

The **"sign in with token"** path on the login screen is now visible only in
development builds (a PAT would bypass the App installation restriction).

⚠️ **The one snag:** the `github.com/login/device/code` and `.../oauth/access_token`
endpoints do not send CORS headers, so they cannot be called directly from the
browser. That is why the requests go through a same-origin path (`/gh-oauth/...`):

- **In development** → the proxy in `vite.config.ts`
- **On Vercel** → the `vercel.json` rewrite
- **On Netlify** → `public/_redirects`

All three are only redirects; there is no running server code, so the architecture
is still backend-less. While the OAuth App is not yet ready, a personal access token
(`repo`, `read:org`) can be used via **"Advanced: sign in with token"** on the login
screen.

## Write flow

Every change goes through the same steps:

1. The file is read in its current state (including `sha`)
2. The change is applied **only to the relevant lines**
3. A new branch is opened from `main`
4. The file is written to the branch (with `sha` — lost-update protection)
5. A PR is opened and its link is shown to the user

**Conflict:** If another change slipped in between, GitHub returns 409/422. The
dashboard re-reads the file from scratch, applies the change on top of the current
content, and retries (up to 3 attempts). The user is informed: "the file had
changed, retried."

### Why line-based editing?

Putting the config files through a `parse → dump` round trip **removes comments**.
In this repo, comments are not decoration — they carry the rationale for decisions
(e.g. the mentor list warning in `tidyorg.yml`). That is why, on update, only the
line block of the targeted key is rewritten (`src/services/yaml.ts` → `applyEdits`).

`npm run verify:yaml` verifies this on the real config files: add a developer →
no other field should change, no comment should be lost, and undoing it should
return the file to its original state. Run this command before touching the write
code.

**Known limitation:** Comments interspersed *inside* a list (e.g. a comment between
two developer lines) are lost when that list is edited. Comment blocks above the key
are preserved.

## Folder structure

```
dashboard/
├── src/
│   ├── components/   # ProjectCard, Modal, Toaster, Person, States…
│   ├── pages/        # Login, Projects, ProjectDetail, NewProject, MemberDetail, PullRequests
│   ├── services/     # githubApi, deviceFlow, configRepo, yaml, validation, terraformPlan
│   ├── hooks/        # useAuth, useProjects, useProposal, useToast, useTheme
│   ├── styles/       # tokens.css (design system) + global.css
│   └── types/        # config.ts (YAML schema), github.ts (REST responses)
├── scripts/          # verify-yaml.ts
└── public/
```

## Configuration schema — four files

| File | Ownership | Dashboard | Content |
| :--- | :--- | :--- | :--- |
| `people.yml` | machine | ✅ writes (add/remove `members`) | org membership — **carries no privilege** |
| `repositories/*.yml` | machine | ✅ writes | repo definition + access + branch protection |
| `privileged.yml` | human | ❌ **never writes** (reads, displays) | org owners + head-of-engineering |
| `organization.yml` | human | ❌ does not write | roles, defaults |

🔒 The `isHeadOfEngineering` / owner check is read from `privileged.yml`. The
dashboard has **no** button like "make owner" — privilege escalation happens only
through a manual PR + CODEOWNERS approval.

## Work that depends on owner-a

| Need | Current status |
| :--- | :--- |
| GitHub App `client_id` | Code is ready; once the `client_id` arrives, writing it to `.env` / `window.__ENV__` is enough. Token sign-in is active in dev |
| Creating the GitHub App + installing it on the config repo | owner-a (an org admin task) |
| GitOps plan comment (Phase 3) | The screen is ready; on a PR without a posted comment, "Waiting for plan…" is shown and refreshed every 30 s |
| JSON Schema (Week 6) | Manual checks exist in `src/services/validation.ts`; once the schema arrives, it is wired in there |

## Repo write mode — scope

The "Repo settings" dialog (`src/components/RepoSettingsDialog.tsx`) edits these
fields: description, language, `visibility`, `default_branch`, `archived`, `has_*`,
`vulnerability_alerts`, `secret_scanning`, `files` (mode), `workflows`,
`protected_branches` (per-branch rule / `null` / leave to default), and
`code_owners`. Mentor/developer lists are in their own flow (add/remove).

Writing is **comment-preserving**: `applyEdits` rewrites only the line block of the
changed key — including nested fields (`protected_branches`, `code_owners`).
`serializeRepoConfig` (full regeneration, without comments) is used only for **new**
files. `npm run verify:yaml` verifies this on every live config file.

**Remaining coordination:** Before Phase 5 begins, the `repositories/*.yml` +
`people.yml` field set must be frozen (so write mode does not migrate to a moving
target — plan sync #2). `organization.yml` / `privileged.yml` are human-owned; the
dashboard does not touch them.
