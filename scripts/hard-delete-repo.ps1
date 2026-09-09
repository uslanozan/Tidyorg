<#
.SYNOPSIS
  BREAK-GLASS: permanently delete a managed repository. (PowerShell port of hard-delete-repo.sh)

.DESCRIPTION
  The dashboard deliberately cannot hard-delete a repo (it only archives, and the
  Terraform module carries prevent_destroy). Real deletion is a rare, irreversible
  operation, gated by two guardrails so it cannot happen by accident:

    1. Only an ORG OWNER may run it (checked against the GitHub API).
    2. Only an ALREADY-ARCHIVED repo may be deleted (archive first, via config).

  Actions, in this exact order (order matters - config leaves before state, so a
  stray apply cannot recreate the repo):
    1. Remove terraform/config/repositories/<repo>.yml and push it.
    2. terraform state rm 'module.repositories["<repo>"]'  (bypass prevent_destroy)
    3. DELETE the repository via the GitHub API.
    4. DELETE the leftover <repo>-mentors / <repo>-devs teams.

  Auth - no manual PAT needed if you use the GitHub CLI:
    * Preferred: gh CLI. Run `gh auth login` once; the script acts as YOU, so your
      org-owner status is the gate. First time also run
      `gh auth refresh -s delete_repo,admin:org` to grant the delete scopes.
    * Fallback: a PAT in $env:GH_TOKEN (scopes: repo, delete_repo, admin:org).
  The engine's GitHub App is intentionally NOT used: it cannot delete repos, and
  granting it that power would let the dashboard delete too.

  Requires: git, terraform. gh (preferred) OR $env:GH_TOKEN. No curl/jq needed.

.EXAMPLE
  gh auth login; gh auth refresh -s delete_repo,admin:org
  $env:GITHUB_ORG='your-org'; .\scripts\hard-delete-repo.ps1 -DryRun my-repo

.EXAMPLE
  $env:GITHUB_ORG='your-org'; .\scripts\hard-delete-repo.ps1 my-repo
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [Alias('y')][switch]$Yes,
  [Parameter(Position = 0, Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

function Die($m) { Write-Host "X $m" -ForegroundColor Red; exit 1 }
function Step($m) { Write-Host "> $m" -ForegroundColor Cyan }
function Info($m) { Write-Host "  $m" }

# ---- deps -------------------------------------------------------------------
foreach ($c in 'git', 'terraform') {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { Die "missing dependency: $c" }
}

# ---- auth mode: prefer gh CLI, else a PAT in $env:GH_TOKEN ------------------
$ghReady = $false
if (Get-Command gh -ErrorAction SilentlyContinue) {
  & gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ghReady = $true }
}
if ($ghReady) { $authMode = 'gh' }
elseif ($env:GH_TOKEN) { $authMode = 'token' }
else { Die "no GitHub auth - run 'gh auth login' (recommended) or set GH_TOKEN" }

$api = 'https://api.github.com'
$headers = @{ Authorization = "Bearer $($env:GH_TOKEN)"; Accept = 'application/vnd.github+json' }

# API helpers take a path (e.g. /repos/o/r) and use whichever auth mode is active.
function GhGet($path) {
  if ($authMode -eq 'gh') {
    $out = & gh api $path 2>$null
    if ($LASTEXITCODE -ne 0) { throw "gh api failed: $path" }
    return ($out | Out-String | ConvertFrom-Json)
  }
  return Invoke-RestMethod -Uri "$api$path" -Headers $headers -Method Get
}
function GhDelete($path) {
  if ($authMode -eq 'gh') {
    & gh api -X DELETE $path 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "gh api DELETE failed: $path" }
    return
  }
  Invoke-RestMethod -Uri "$api$path" -Headers $headers -Method Delete | Out-Null
}

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

# Preflight: state must be readable now, so we never mutate then find we cannot
# run `state rm` (which would leave a dangling, prevent_destroy'd entry).
$stateList = (& terraform -chdir="$root/terraform" state list 2>$null)
if ($LASTEXITCODE -ne 0) { Die "cannot read terraform state - run 'terraform init' in ./terraform (and set backend creds for remote state)" }

# Preflight: if we will push the config removal, local must not be behind origin,
# or the push is rejected mid-operation, leaving a half-done local commit.
if (Test-Path $configFile) {
  $curBranch = (& git -C $root rev-parse --abbrev-ref HEAD)
  & git -C $root fetch -q origin 2>$null
  $behind = (& git -C $root rev-list --count "HEAD..origin/$curBranch" 2>$null)
  if ($LASTEXITCODE -eq 0 -and [int]$behind -gt 0) { Die "local '$curBranch' is $behind commit(s) behind origin - run 'git pull' first, then re-run." }
}

# ---- guardrail 1: caller must be an org owner -------------------------------
Step "Checking caller identity..."
try { $login = (GhGet "/user").login } catch { Die "could not resolve your GitHub identity (is gh logged in / GH_TOKEN valid?)" }
if (-not $login) { Die "could not resolve your GitHub identity" }
$role = $null
try { $role = (GhGet "/orgs/$org/memberships/$login").role } catch { }
if ($role -ne 'admin') { Die "$login is not an owner of '$org' (role: $role). Only org owners may hard-delete." }
Info "$login is an owner of $org (ok)"

# ---- guardrail 2: repo must exist and be archived ---------------------------
Step "Checking repository state..."
try { $repoJson = GhGet "/repos/$org/$Repo" } catch { Die "repo '$org/$Repo' not found (or no access)" }
if (-not $repoJson.archived) { Die "'$Repo' is NOT archived. Archive it first (dashboard -> Arsivle, or archived: true in config), then re-run." }
Info "$org/$Repo exists and is archived (ok)"

# Team slugs GitHub derives from the module's team names (<repo>-mentors/-devs).
$base = $Repo.ToLower()
$mentorsSlug = "$base-mentors"
$devsSlug = "$base-devs"
# Real-quote form for matching against `state list` output…
$stateAddr = "module.repositories[""$Repo""]"
# …and a backslash-escaped form for passing to terraform, because PowerShell
# strips embedded double-quotes when handing an argument to a native command
# (plain quotes reach terraform as module.repositories[name] → "Index value required").
$stateAddrArg = 'module.repositories[\"' + $Repo + '\"]'

# ---- plan -------------------------------------------------------------------
Write-Host ""
Step "Planned actions for $org/${Repo}  (auth: $authMode):"
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
  & terraform -chdir="$root/terraform" state rm $stateAddrArg
  if ($LASTEXITCODE -ne 0) { Die "terraform state rm failed" }
}
else { Info "state: $stateAddr not tracked - skipped" }

# ---- 3. delete the repository ------------------------------------------------
Step "Deleting repository $org/$Repo..."
GhDelete "/repos/$org/$Repo"
Info "repository deleted (ok)"

# ---- 4. delete leftover teams ------------------------------------------------
foreach ($slug in @($mentorsSlug, $devsSlug)) {
  $exists = $true
  try { GhGet "/orgs/$org/teams/$slug" | Out-Null } catch { $exists = $false }
  if ($exists) {
    Step "Deleting team $slug..."
    GhDelete "/orgs/$org/teams/$slug"
    Info "team $slug deleted (ok)"
  }
  else { Info "team $slug not found - skipped" }
}

Write-Host ""
Step "Done. $org/$Repo and its teams are gone; config and state no longer reference it."
