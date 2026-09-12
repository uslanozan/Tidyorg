# tidyorg-infra-bot — GitHub App

The bot identity used by Terraform to manage the GitHub organization.
Advantages of using an organization-owned GitHub App instead of a personal token (PAT):

- **No person dependency** — the system keeps working even if a person leaves
- **Audit log** — all operations appear under `tidyorg-infra-bot[bot]`, not mixed in with manual changes
- **Short-lived tokens** — the ~1-hour installation token is renewed automatically, so no long-lived secret is stored
- **Narrow scope** — only the permitted repo and org operations can be performed

## Current Setup

| Field | Value |
| :--- | :--- |
| **App ID** | `<YOUR_APP_ID>` |
| **Installation ID** | `<YOUR_INSTALLATION_ID>` |
| **Organization** | `your-org` |
| **Installed** | 2026-08-15 |
| **Installed by** | owner-a |

### Permissions

| Type | Permission | Level | Reason |
| :--- | :--- | :--- | :--- |
| Repository | Administration | Read and write | Branch protection, team access |
| Repository | Contents | Read and write | Writing files (CODEOWNERS, etc.) |
| Repository | Issues | Read and write | Label set management |
| Repository | Workflows | Read and write | Writing `.github/workflows/*` |
| Repository | Metadata | Read-only | Reading repo info (required) |
| Organization | Members | Read and write | Org membership management |
| Organization | Administration | Read and write | Org settings (`github_organization_settings`) |

> ⚠️ **`Administration` appears twice, and these are NOT THE SAME PERMISSION.**
> `Repository → Administration` unlocks repo settings; org settings require
> `Organization → Administration`. In the manifest, the first is the `administration`
> key and the second is the `organization_administration` key.

---

## Setup Guide From Scratch

> This section is used if the App needs to be deleted and recreated.
> Reference config: [`app-manifest.json`](app-manifest.json)

### 1. Create the GitHub App

Go to the following page (org admin permission required):

```
https://github.com/organizations/your-org/settings/apps/new
```

Fill in the form:

| Field | Value |
| :--- | :--- |
| **GitHub App name** | `tidyorg-infra-bot` |
| **Homepage URL** | `https://github.com/your-org` |
| **Webhook → Active** | ❌ Uncheck |
| **Where can this app be installed?** | Only on this account |

**Repository permissions:**

| Permission | Value | Reason |
| :--- | :--- | :--- |
| Administration | Read and write | Repo settings, branch protection, team access |
| Contents | Read and write | Writing CODEOWNERS and template files to the repo |
| Issues | Read and write | `github_issue_labels` — label set management |
| Workflows | Read and write | Writing `.github/workflows/*` files |
| Metadata | Read-only (automatic) | — |

> ⚠️ **The last two rows were added later, after hitting errors — do not skip them.**
>
> - Without **Issues**, label synchronization blows up with `403 Resource not accessible by integration`
>   (happened on 2026-08-15).
> - Without **Workflows**, writing files under `.github/workflows/` returns 403.
>   GitHub gates this path behind a separate permission; `Contents: write` **is not enough on its own.**
>   Template distribution (Phase 2) does not work without this permission.

**Organization permissions:**

| Permission | Value | Reason |
| :--- | :--- | :--- |
| Members | Read and write | `github_membership` — org membership and owner role |
| Administration | Read and write | `github_organization_settings` — base permission, member permissions, security defaults |

> ⚠️ **`Organization → Administration` was added later, after hitting an error — do not skip it.**
> The `Repository → Administration` above **does not cover this**; the two are separate permissions.
> Without it, the `PATCH /orgs/{org}` request blows up with `403 Resource not accessible by integration`
> (happened on 2026-08-18, during the `default_repository_permission` apply).
>
> 📌 **Pattern:** this is the third of the `Issues` and `Workflows` 403s. In all three the cause
> is the same: **GitHub defines a permission you assumed was broad more narrowly.** When you touch
> a new resource type for the first time, expect this 403 — because the App is set up with least
> privilege, it is normal behavior, not a bug.

Click the "Create GitHub App" button.

---

### 2. Note the App ID

On the page that opens after the App is created, at the top:

```
App ID: <YOUR_APP_ID>
```

Note this number down somewhere.

---

### 3. Generate and Download the Private Key

On the same page, scroll down → the **"Private keys"** section:

1. Click the **"Generate a private key"** button
2. A `.pem` file downloads automatically (e.g. `tidyorg-infra-bot.2026-08-15.private-key.pem`)
3. Store this file somewhere safe — **you cannot download it again**

> ⚠️ The `.pem` file is an RSA private key. Never commit it to the repo or share it.
> After entering its contents into HCP Terraform, securely delete the file or store it encrypted.

---

### 4. Convert the PEM File to HCP Format

The GitHub App's `.pem` file is a multi-line RSA private key:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA1234...
abcd...
...
-----END RSA PRIVATE KEY-----
```

HCP Terraform expects it as a **single line**; line breaks must be represented by the `\n` character.

**Convert it with PowerShell:**

```powershell
# Replace the file name with your own downloaded file
$pem = Get-Content "$env:USERPROFILE\Downloads\tidyorg-infra-bot.2026-08-15.private-key.pem" -Raw
$oneLine = $pem -replace "`r`n", "\n" -replace "`n", "\n"
$oneLine | Set-Clipboard
Write-Host "Copied! You can paste it into HCP Terraform."
```

The output should look like this:
```
-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1234...\n...\n-----END RSA PRIVATE KEY-----\n
```

---

### 5. Install the App on the Organization

On the App settings page, in the left menu, **"Install App"**:

1. Select the `your-org` organization
2. Click **"Install"**
3. Choose "All repositories" → **"Install"**

After installation, get the Installation ID:

```
https://github.com/organizations/your-org/settings/installations
```

→ `tidyorg-infra-bot` → click "Configure" → look at the URL:

```
https://github.com/settings/installations/<YOUR_INSTALLATION_ID>
                                          ^^^^^^^^^^
                                          Installation ID
```

---

### 6. Enter the Variables into HCP Terraform

```
https://app.terraform.io → tidyorg-infra org → github-management workspace → Variables
```

Use "Add variable" to add these three variables:

| Key | Category | Value | Sensitive |
| :--- | :--- | :--- | :--- |
| `github_app_id` | terraform | `<YOUR_APP_ID>` | No |
| `github_app_installation_id` | terraform | `<YOUR_INSTALLATION_ID>` | No |
| `github_app_pem_file` | terraform | *(the single line copied in step 4)* | **Yes** |

> **Important:** The Category must be "terraform" — not "environment variable".
> The key name is written **without** the `TF_VAR_` prefix.

---

### 7. Check the Terraform Code

In [`terraform/main.tf`](../../terraform/main.tf), the provider should look like this:

```hcl
provider "github" {
  owner = var.github_org_name

  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = var.github_app_pem_file
  }
}
```

In [`terraform/variables.tf`](../../terraform/variables.tf):

```hcl
variable "github_app_id" {
  type        = string
  description = "GitHub App ID (tidyorg-infra-bot)"
}

variable "github_app_installation_id" {
  type        = string
  description = "GitHub App Installation ID (org installation)"
}

variable "github_app_pem_file" {
  type        = string
  description = "GitHub App private key (PEM contents, with newlines as \\n)"
  sensitive   = true
}
```

---

### 8. Test It

```powershell
cd terraform/
terraform init
terraform plan
```

A successful output looks like this:
```
Terraform used the selected providers to generate the following execution plan.
...
No changes. Your infrastructure matches the configuration.
```

Or, if there is drift, a list of changes appears — you can run `apply` until it reads `No changes`.

---

## Troubleshooting

### "401 Unauthorized" or "Could not authenticate"

- Check the `github_app_pem_file` value in HCP: it must start with `-----BEGIN RSA PRIVATE KEY-----`
- Make sure the line breaks are written as `\n` (not `\\n` — not two backslashes, but one backslash + n)
- Verify the App is installed on the organization: https://github.com/organizations/your-org/settings/installations

### "Variable not declared" warning

If the HCP variable key has a `TF_VAR_` prefix, remove it. It must be `github_app_id`, not `TF_VAR_github_app_id`.

### Private key lost

On the GitHub App settings page, you can revoke the old key and generate a new one:
```
https://github.com/organizations/your-org/settings/apps/tidyorg-infra-bot
```
→ "Private keys" → "Generate a private key" → repeat step 4 → update it in HCP.
