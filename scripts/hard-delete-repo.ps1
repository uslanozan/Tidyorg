<#
.SYNOPSIS
  BREAK-GLASS: permanently delete a managed repository. (PowerShell port of hard-delete-repo.sh)

.DESCRIPTION
  The dashboard deliberately cannot hard-delete a repo (it only archives, and the
  Terraform module carries prevent_destroy). Real deletion is a rare, irreversible
  operation, gated by two guardrails so it cannot happen by accident:

    1. Only an ORG OWNER may run it (checked against the GitHub API).
    2. Only an ALREADY-ARCHIVED repo may be deleted (archive first, via config).

  Actions, in this exact order (order matters — config leaves before state, so a
  stray apply cannot recreate the repo):
    1. Remove terraform/config/repositories/<repo>.yml and push it.
    2. terraform state rm 'module.repositories["<repo>"]'  (bypass prevent_destroy)
    3. DELETE the repository via the GitHub API.
    4. DELETE the leftover <repo>-mentors / <repo>-devs teams.

  Auth: uses YOUR OWN token via $env:GH_TOKEN (an org-owner PAT with scopes
  repo, delete_repo, admin:org). The engine's GitHub App cannot delete repos, and
  a non-owner token cannot pass the guardrails.

  Unlike the bash version this needs no curl/jq — Invoke-RestMethod + native JSON.
  Requires: git, terraform (initialised in .\terraform).

.EXAMPLE
  $env:GH_TOKEN='ghp_xxx'; $env:GITHUB_ORG='your-org'; .\scripts\hard-delete-repo.ps1 -DryRun my-repo

.EXAMPLE
  $env:GH_TOKEN='ghp_xxx'; $env:GITHUB_ORG='your-org'; .\scripts\hard-delete-repo.ps1 my-repo
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [Alias('y')][switch]$Yes,
  [Parameter(Position = 0, Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'
# GitHub requires TLS 1.2; Windows PowerShell 5.1 does not always default to it.
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Die($m) { Write-Host "X $m" -ForegroundColor Red; exit 1 }
function Step($m) { Write-Host "> $m" -ForegroundColor Cyan }
function Info($m) { Write-Host "  $m" }

# ---- deps + env -------------------------------------------------------------
foreach ($c in 'git', 'terraform') {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { Die "missing dependency: $c" }
}
if (-not $env:GH_TOKEN) { Die "GH_TOKEN is not set (org-owner PAT with repo, delete_repo, admin:org)" }

$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) { Die "not inside a git repository" }
$configFile = Join-Path $root "terraform/config/repositories/$Repo.yml"

# Resolve org: explicit env wins, else read organization.yml.
$org = $env:GITHUB_ORG
if (-not $org) {
  $orgFile = Join-Path $root "terraform/config/organization.yml"
  if (Test-Path $orgFile) {
    $m = Select-String -Path $orgFile -Pattern '^organization:\s*(.+?)\s*(#.*)?$' | Select-Object -First 1
    if ($m) { $org = $m.Matches[0].Groups[1].Value }
  }
}
if (-not $org) { Die "cannot determine org - set GITHUB_ORG" }

$api = 'https://api.github.com'
$headers = @{ Authorization = "Bearer $($env:GH_TOKEN)"; Accept = 'application/vnd.github+json' }
function GhGet($url) { Invoke-RestMethod -Uri $url -Headers $headers -Method Get }
function GhDelete($url) { Invoke-RestMethod -Uri $url -Headers $headers -Method Delete | Out-Null }

# Preflight: state must be readable now, so we never mutate then find we cannot
# run `state rm` (which would leave a dangling, prevent_destroy'd entry).
$stateList = (& terraform -chdir="$root/terraform" state list 2>$null)
if ($LASTEXITCODE -ne 0) { Die "cannot read terraform state - run 'terraform init' in ./terraform (and set backend creds for remote state)" }

# ---- guardrail 1: caller must be an org owner -------------------------------
Step "Checking caller identity..."
try { $login = (GhGet "$api/user").login } catch { Die "could not resolve token owner (bad GH_TOKEN?)" }
if (-not $login) { Die "could not resolve token owner" }

$role = $null
try { $role = (GhGet "$api/orgs/$org/memberships/$login").role } catch { }
if ($role -ne 'admin') { Die "$login is not an owner of '$org' (role: $role). Only org owners may hard-delete." }
Info "$login is an owner of $org (ok)"

# ---- guardrail 2: repo must exist and be archived ---------------------------
Step "Checking repository state..."
try { $repoJson = GhGet "$api/repos/$org/$Repo" } catch { Die "repo '$org/$Repo' not found (or no access)" }
if (-not $repoJson.archived) { Die "'$Repo' is NOT archived. Archive it first (dashboard -> Arsivle, or archived: true in config), then re-run." }
Info "$org/$Repo exists and is archived (ok)"

# Team slugs GitHub derives from the module's team names (<repo>-mentors/-devs).
$base = $Repo.ToLower()
$mentorsSlug = "$base-mentors"
$devsSlug = "$base-devs"
$stateAddr = "module.repositories[""$Repo""]"

# ---- plan -------------------------------------------------------------------
Write-Host ""
Step "Planned actions for $org/${Repo}:"
if (Test-Path $configFile) { Info "1. git rm  terraform/config/repositories/$Repo.yml  (commit + push)" }
else { Info "1. (config file already absent - skipped)" }
Info "2. terraform state rm  $stateAddr"
Info "3. DELETE repo         $org/$Repo   (irreversible)"
Info "4. DELETE teams        $mentorsSlug, $devsSlug (if present)"
Write-Host ""

if ($DryRun) { Step "-DryRun: no changes made."; exit 0 }

# ---- confirmation -----------------------------------------------------------
if (-not $Yes) {
  $reply = Read-Host "This is IRREVERSIBLE. Type the repo name to confirm"
  if ($reply -ne $Repo) { Die "confirmation did not match - aborted." }
}

# ---- 1. remove from config FIRST (so a stray apply cannot recreate it) ------
if (Test-Path $configFile) {
  Step "Removing config and pushing..."
  & git -C $root rm -q -- $configFile
  if ($LASTEXITCODE -ne 0) { Die "git rm failed" }
  & git -C $root commit -q -m "chore: hard-delete $Repo - remove from config"
  if ($LASTEXITCODE -ne 0) { Die "git commit failed" }
  & git -C $root push
  if ($LASTEXITCODE -ne 0) { Die "config commit made locally but push failed - push it before continuing, or the repo may reappear on the next apply." }
}

# ---- 2. drop from terraform state (bypasses prevent_destroy) ----------------
# `state list` prints leaf resources, not the bare module address, so match as a
# substring. The trailing "] in $stateAddr keeps "x" from matching "x-2".
$tracked = $false
foreach ($line in $stateList) { if ($line.Contains($stateAddr)) { $tracked = $true; break } }
if ($tracked) {
  Step "Removing $stateAddr from terraform state..."
  & terraform -chdir="$root/terraform" state rm $stateAddr
  if ($LASTEXITCODE -ne 0) { Die "terraform state rm failed" }
}
else { Info "state: $stateAddr not tracked - skipped" }

# ---- 3. delete the repository ------------------------------------------------
Step "Deleting repository $org/$Repo..."
GhDelete "$api/repos/$org/$Repo"
Info "repository deleted (ok)"

# ---- 4. delete leftover teams ------------------------------------------------
foreach ($slug in @($mentorsSlug, $devsSlug)) {
  $exists = $true
  try { GhGet "$api/orgs/$org/teams/$slug" | Out-Null } catch { $exists = $false }
  if ($exists) {
    Step "Deleting team $slug..."
    GhDelete "$api/orgs/$org/teams/$slug"
    Info "team $slug deleted (ok)"
  }
  else { Info "team $slug not found - skipped" }
}

Write-Host ""
Step "Done. $org/$Repo and its teams are gone; config and state no longer reference it."
