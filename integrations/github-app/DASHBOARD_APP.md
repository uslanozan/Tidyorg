# tidyorg-dashboard — GitHub App

The **second** GitHub App, used by the dashboard. It is completely separate from
the engine bot (`tidyorg-infra-bot`, see [`README.md`](README.md)) and **much narrower**.

| | **tidyorg-infra-bot** (engine) | **tidyorg-dashboard** (this one) |
| :--- | :--- | :--- |
| Used by | Terraform provider | React SPA (browser) |
| Auth | App private key (server-to-server) | User device flow (user-to-server) |
| Bound to | Bot identity | The identity of the signed-in person |
| Permissions | Admin + Members + Org admin | Contents RW + Pull requests RW + Metadata R |
| Installation | All repos | **Config repo only** |

## Why separate and why narrow (the escalation gate)

The dashboard runs in the browser and **opens PRs** against the config repo on behalf
of the signed-in person — it never writes directly to `main`, and never runs apply.
That is why the app's permissions are deliberately reduced to the minimum:

- **NO `Administration`** → the dashboard **cannot delete** a repo or change its
  settings directly. Repo deletion is done only via the break-glass terminal script
  (`scripts/hard-delete-repo.*`). If the app were given this permission, that boundary
  would collapse.
- **NO `Members` / org permissions** → the dashboard cannot change org membership or
  ownership directly; it can only open a PR against `people.yml`. `privileged.yml` (the
  owners) is under CODEOWNERS protection, so even if the dashboard opens a PR there, it
  cannot be merged without human approval.
- **Installed on the config repo only** → this is the access gate. Because the app is
  not installed on any other repo, even if an unauthorized user signs in via device flow,
  they cannot access anything outside the config repo (403). During installation, choose
  **"Only select repositories", NOT "All repositories"**, and add only the config repo.

## Setup From Scratch

Reference config: [`dashboard-app-manifest.json`](dashboard-app-manifest.json)

### 1. Create the GitHub App

```
https://github.com/organizations/<org>/settings/apps/new
```

| Field | Value |
| :--- | :--- |
| **GitHub App name** | `tidyorg-dashboard` |
| **Homepage URL** | the dashboard URL (e.g. the Vercel deployment) |
| **Callback URL** | not needed — device flow is used |
| **Webhook → Active** | ❌ Uncheck |
| **Where can this app be installed?** | Only on this account |

**Enable device flow:** In the "Identifying and authorizing users" section, check the
**"Enable Device Flow"** box. (The dashboard runs the device code flow from the browser
with the `client_id`; the manifest does not include this box, so check it manually.)

**Repository permissions:**

| Permission | Value | Reason |
| :--- | :--- | :--- |
| Contents | Read and write | Opening branches + committing config files |
| Pull requests | Read and write | Opening changes as PRs |
| Actions | Read-only | Sync badge — reading the `terraform-apply` run status (post-merge "applying / in sync / error") |
| Metadata | Read-only (automatic) | — |

> ⚠️ **DO NOT GRANT the Administration permission.** This is a deliberate security
> boundary — see above.
>
> **Actions is `read` only** — the dashboard cannot trigger/modify workflows, it only
> reads the apply run's status. The live sync badge in the header uses this. Without this
> permission, the badge silently stays "off" (the 403 is swallowed) and everything else
> keeps working.

**Organization permissions:** None.

### 2. Get the Client ID

Once the App is created, the **Client ID** appears at the top of the page (`Iv1.xxxx...`
or `Iv23xxxx...`). This value goes into the dashboard's `VITE_GITHUB_CLIENT_ID`
environment variable. Device flow **requires no private key/secret** — the client_id
can be public.

### 3. Install the App on the Config Repo

Left menu → **"Install App"** → select the org → **"Only select repositories"** →
add the **config repo** → Install.

> This step is the access gate: because the app is installed only here, a person who
> signs in to the dashboard cannot do anything in other repos.

### 4. Configure the Dashboard

`VITE_GITHUB_CLIENT_ID` = the Client ID above. The other settings (`owner`, `repo`,
`branch`) come from the dashboard config.
