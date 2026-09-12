import { CONFIG_BRANCH, CONFIG_OWNER, CONFIG_REPO, PATHS } from './env'
import { GitHubError, type GitHubClient } from './githubApi'
import {
  applyEdits,
  parseOrgConfig,
  parsePeopleConfig,
  parsePrivilegedConfig,
  parseRepoConfig,
  serializePeopleConfig,
  serializeRepoConfig,
  setYamlPath,
  type YamlValue,
} from './yaml'
import { validateRepoConfig } from './validation'
import type {
  Membership,
  OrgConfig,
  PeopleConfig,
  PrivilegedConfig,
  Project,
  ProtectedBranchRule,
  RepoConfig,
} from '../types/config'
import type { PullRequest } from '../types/github'

/* ═══════════════════════════════════════════════════════════════════════════
   READ
   ═══════════════════════════════════════════════════════════════════════ */

export async function loadProjects(client: GitHubClient): Promise<Project[]> {
  const entries = await client.listDirectory(
    CONFIG_OWNER,
    CONFIG_REPO,
    PATHS.repositories,
    CONFIG_BRANCH,
  )

  const files = entries.filter(
    (entry) => entry.type === 'file' && /\.ya?ml$/i.test(entry.name),
  )

  const projects = await Promise.all(
    files.map(async (entry): Promise<Project> => {
      const name = entry.name.replace(/\.ya?ml$/i, '')
      try {
        const { text, sha } = await client.readTextFile(
          CONFIG_OWNER,
          CONFIG_REPO,
          entry.path,
          CONFIG_BRANCH,
        )
        return { name, path: entry.path, sha, config: parseRepoConfig(text) }
      } catch (error) {
        // Do not let a single corrupted file drop the entire list — card appears as "corrupted".
        return {
          name,
          path: entry.path,
          sha: entry.sha,
          config: { description: '', language: 'go', mentors: [] },
          parseError: error instanceof Error ? error.message : String(error),
        }
      }
    }),
  )

  return projects.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

export async function loadProject(client: GitHubClient, name: string): Promise<Project> {
  const path = `${PATHS.repositories}/${name}.yml`
  const { text, sha } = await client.readTextFile(
    CONFIG_OWNER,
    CONFIG_REPO,
    path,
    CONFIG_BRANCH,
  )
  return { name, path, sha, config: parseRepoConfig(text) }
}

export async function loadOrgConfig(client: GitHubClient): Promise<OrgConfig> {
  const { text } = await client.readTextFile(
    CONFIG_OWNER,
    CONFIG_REPO,
    PATHS.organization,
    CONFIG_BRANCH,
  )
  return parseOrgConfig(text)
}

export async function loadPeople(client: GitHubClient): Promise<PeopleConfig> {
  const { text } = await client.readTextFile(
    CONFIG_OWNER,
    CONFIG_REPO,
    PATHS.people,
    CONFIG_BRANCH,
  )
  return parsePeopleConfig(text)
}

export async function loadPrivileged(client: GitHubClient): Promise<PrivilegedConfig> {
  const { text } = await client.readTextFile(
    CONFIG_OWNER,
    CONFIG_REPO,
    PATHS.privileged,
    CONFIG_BRANCH,
  )
  return parsePrivilegedConfig(text)
}

/** Which role a person has in which project. */
export function membershipsFor(login: string, projects: Project[]): Membership[] {
  const key = login.toLowerCase()
  const result: Membership[] = []

  for (const project of projects) {
    if (project.config.mentors?.some((m) => m.toLowerCase() === key)) {
      result.push({ project: project.name, role: 'mentor' })
    }
    if (project.config.developers?.some((d) => d.toLowerCase() === key)) {
      result.push({ project: project.name, role: 'developer' })
    }
    if (project.config.viewers?.some((v) => v.toLowerCase() === key)) {
      result.push({ project: project.name, role: 'viewer' })
    }
  }

  return result
}

export type EffectiveRule = ProtectedBranchRule & {
  /** Does repo file override this branch? */
  overridden: boolean
  /** `branch: null` → default protection completely removed (repositories.tf). */
  removed: boolean
}

/** Repo file only writes diffs; merged with org defaults when displayed. */
export function effectiveBranchRules(
  project: RepoConfig,
  org: OrgConfig | null,
): Record<string, EffectiveRule> {
  const defaults = org?.defaults.protected_branches ?? {}
  const overrides = project.protected_branches ?? {}
  const branches = new Set([...Object.keys(defaults), ...Object.keys(overrides)])

  const merged: Record<string, EffectiveRule> = {}
  for (const branch of branches) {
    const override = overrides[branch]
    merged[branch] = {
      ...(defaults[branch] ?? {}),
      ...(override ?? {}),
      overridden: branch in overrides,
      removed: branch in overrides && override === null,
    }
  }
  return merged
}

const sameLogin = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Org-wide role/owner information comes from privileged.yml (people.yml no longer carries permissions). */
export function isHeadOfEngineering(
  login: string,
  privileged: PrivilegedConfig | null,
): boolean {
  if (!login) return false
  return (privileged?.roles?.['head-of-engineering'] ?? []).some((l) => sameLogin(l, login))
}

export function isOrgOwner(login: string, privileged: PrivilegedConfig | null): boolean {
  if (!login) return false
  return (privileged?.org_owners ?? []).some((l) => sameLogin(l, login))
}

/**
 * Can a user MANAGE this project's config (are edit buttons enabled for them)?
 * Repo mentor, head-of-engineering, or org owner. Developers and others see read-only.
 * This is only a UI hint — the real gate is GitHub (CODEOWNERS + branch protection);
 * an unauthorized request is rejected on the server.
 */
export function canManageProject(
  login: string,
  project: Project,
  privileged: PrivilegedConfig | null,
): boolean {
  if (!login) return false
  if (isHeadOfEngineering(login, privileged) || isOrgOwner(login, privileged)) return true
  return (project.config.mentors ?? []).some((m) => sameLogin(m, login))
}

/** User's standing in the org — for MemberDetail badge. */
export function orgStanding(
  login: string,
  people: PeopleConfig | null,
  privileged: PrivilegedConfig | null,
): { member: boolean; owner: boolean; roles: string[] } {
  const member = (people?.members ?? []).some((l) => sameLogin(l, login))
  const owner = isOrgOwner(login, privileged)
  const roles = Object.entries(privileged?.roles ?? {})
    .filter(([, logins]) => logins.some((l) => sameLogin(l, login)))
    .map(([role]) => role)
  return { member, owner, roles }
}

/* ═══════════════════════════════════════════════════════════════════════════
   WRITE — every change goes to a PR, not to main
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ProposalResult {
  pullRequest: PullRequest
  branch: string
  /** true if retried due to conflict — user is notified. */
  retried: boolean
}

interface ProposeArgs {
  client: GitHubClient
  /** Path from repo root of the file to change. */
  path: string
  /** Short name used in branch name (typically repo name). */
  slug: string
  action: 'update' | 'create'
  commitMessage: string
  prTitle: string
  prBody: string
  /**
   * Generates new content from the current state of the file.
   * Called AGAIN on conflict with re-read content — thus must be pure.
   */
  build: (current: { text: string; sha: string } | null) => string
}

const MAX_ATTEMPTS = 3

/**
 * Write flow: read → modify → create branch → write → open PR.
 *
 * Conflict (lost update) protection: file is written with its `sha`. If another
 * change intervened, GitHub returns 409/422; in that case the file is re-read,
 * changes are applied on top of current content, and retried.
 */
export async function proposeChange({
  client,
  path,
  slug,
  action,
  commitMessage,
  prTitle,
  prBody,
  build,
}: ProposeArgs): Promise<ProposalResult> {
  let lastConflict: GitHubError | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let current: { text: string; sha: string } | null = null

    if (action === 'update') {
      current = await client.readTextFile(CONFIG_OWNER, CONFIG_REPO, path, CONFIG_BRANCH)
    } else {
      // Same-named file exists: not a "new project" — don't overwrite silently.
      try {
        await client.getFile(CONFIG_OWNER, CONFIG_REPO, path, CONFIG_BRANCH)
        throw new GitHubError(
          409,
          'conflict',
          'file exists',
          'A config file with this name already exists.',
        )
      } catch (error) {
        if (!(error instanceof GitHubError) || error.kind !== 'not-found') throw error
      }
    }

    const content = build(current)
    const branch = `dashboard/${action}-${slug}-${Date.now()}`

    const baseSha = await client.getBranchSha(CONFIG_OWNER, CONFIG_REPO, CONFIG_BRANCH)
    await client.createBranch(CONFIG_OWNER, CONFIG_REPO, branch, baseSha)

    try {
      await client.putFile({
        owner: CONFIG_OWNER,
        repo: CONFIG_REPO,
        path,
        branch,
        message: commitMessage,
        content,
        sha: current?.sha,
      })
    } catch (error) {
      if (error instanceof GitHubError && error.kind === 'conflict' && attempt < MAX_ATTEMPTS) {
        lastConflict = error
        continue // re-read file, apply changes on top of updated content
      }
      throw error
    }

    const pullRequest = await client.createPullRequest({
      owner: CONFIG_OWNER,
      repo: CONFIG_REPO,
      title: prTitle,
      body: prBody,
      head: branch,
      base: CONFIG_BRANCH,
    })

    return { pullRequest, branch, retried: lastConflict !== null }
  }

  throw (
    lastConflict ??
    new GitHubError(409, 'conflict', 'retry exhausted', 'Could not write change, please try again.')
  )
}

export interface FileChange {
  /** File path from repo root (always 'update'; file must exist). */
  path: string
  /** Generates new content from current file state. Returns same text if no change. */
  build: (current: { text: string; sha: string }) => string
}

/**
 * Modifies multiple files in a SINGLE branch + SINGLE PR (atomically).
 *
 * Required for operations like "remove from org completely": user must be removed
 * from both all repos and people.yml in the same PR — otherwise during merge,
 * engine's "repo reference not in people.yml" validation fails (dangling).
 *
 * Note: the single-file conflict-retry loop in proposeChange is omitted here;
 * since this is a rare admin operation, it fails on conflict and user retries.
 */
export async function proposeMultiChange({
  client,
  slug,
  commitMessage,
  prTitle,
  prBody,
  files,
}: {
  client: GitHubClient
  slug: string
  commitMessage: string
  prTitle: string
  prBody: string
  files: FileChange[]
}): Promise<ProposalResult> {
  const branch = `dashboard/update-${slug}-${Date.now()}`
  const baseSha = await client.getBranchSha(CONFIG_OWNER, CONFIG_REPO, CONFIG_BRANCH)
  await client.createBranch(CONFIG_OWNER, CONFIG_REPO, branch, baseSha)

  for (const file of files) {
    const current = await client.readTextFile(CONFIG_OWNER, CONFIG_REPO, file.path, CONFIG_BRANCH)
    const content = file.build(current)
    if (content === current.text) continue // no change in this file — skip
    await client.putFile({
      owner: CONFIG_OWNER,
      repo: CONFIG_REPO,
      path: file.path,
      branch,
      message: commitMessage,
      content,
      sha: current.sha,
    })
  }

  const pullRequest = await client.createPullRequest({
    owner: CONFIG_OWNER,
    repo: CONFIG_REPO,
    title: prTitle,
    body: prBody,
    head: branch,
    base: CONFIG_BRANCH,
  })

  return { pullRequest, branch, retried: false }
}

const PR_FOOTER = [
  '',
  '---',
  '',
  '> This PR was opened by the management dashboard.',
  '> When merged, Terraform will run and reflect the changes to the GitHub organization.',
].join('\n')

export interface RepoChangeArgs {
  client: GitHubClient
  project: Project
  /**
   * Generates keys to modify from the CURRENT state of the file.
   * Called again on conflict with re-read content — ensuring intervening
   * changes are not overwritten, but applied on top.
   */
  edits: (config: RepoConfig) => Record<string, YamlValue | undefined>
  /** Single-line summary like "developer added" — used in commit and PR title. */
  summary: string
  /** Bulleted list for the PR body. */
  details?: string[]
}

/** Opens a PR updating an existing repo config. */
export function proposeRepoConfigUpdate({
  client,
  project,
  edits,
  summary,
  details = [],
}: RepoChangeArgs): Promise<ProposalResult> {
  return proposeChange({
    client,
    path: project.path,
    slug: project.name,
    action: 'update',
    commitMessage: `config(${project.name}): ${summary}`,
    prTitle: `config(${project.name}): ${summary}`,
    prBody:
      [`**${project.name}** configuration updated.`, '', ...details.map((d) => `- ${d}`)].join(
        '\n',
      ) + PR_FOOTER,
    build: (current) => {
      if (!current) throw new Error('Could not read file')

      // File is not rewritten from scratch, only relevant lines change: comments preserved.
      const nextText = applyEdits(current.text, edits(parseRepoConfig(current.text)))

      const errors = validateRepoConfig(parseRepoConfig(nextText))
      if (errors.length) throw new Error(errors.join(' '))
      return nextText
    },
  })
}

/* ───────────────────────────────────────────────────────────────────────────
   ORG SETTINGS — config/organization.yml (HUMAN-OWNED, full of comments)
   ───────────────────────────────────────────────────────────────────────────
   This file cannot be rewritten from scratch: rationale for each decision is in comments.
   Only changed LEAVES are updated in-place via nested path (setYamlPath); all comments
   and untouched fields remain intact. privileged.yml (owners) is NOT included here —
   that file remains an escalation gate that the dashboard never writes to.     */

export interface OrgConfigChange {
  /** Dot-path segments, e.g. ['defaults','visibility'] or ['roles','mentor','scope']. */
  path: string[]
  /** New leaf value (scalar, flow-list, or array of objects like labels). */
  value: YamlValue
}

export interface OrgUpdateArgs {
  client: GitHubClient
  /** Only leaves that actually changed — caller calculates diff. */
  changes: OrgConfigChange[]
  /** Single-line summary like "profile updated". */
  summary: string
  details?: string[]
}

/** Opens a PR updating a set of leaves in organization.yml (comment-preserving). */
export function proposeOrgConfigUpdate({
  client,
  changes,
  summary,
  details = [],
}: OrgUpdateArgs): Promise<ProposalResult> {
  return proposeChange({
    client,
    path: PATHS.organization,
    slug: 'org',
    action: 'update',
    commitMessage: `config(org): ${summary}`,
    prTitle: `config(org): ${summary}`,
    prBody:
      ['**Organization settings** updated.', '', ...details.map((d) => `- ${d}`)].join('\n') +
      PR_FOOTER,
    build: (current) => {
      if (!current) throw new Error('Could not read file')
      let text = current.text
      for (const { path, value } of changes) text = setYamlPath(text, path, value)
      return text
    },
  })
}

/** Opens a PR creating a new repo config file. */
export function proposeNewProject(
  client: GitHubClient,
  name: string,
  config: RepoConfig,
): Promise<ProposalResult> {
  const errors = validateRepoConfig(config)
  if (errors.length) return Promise.reject(new Error(errors.join(' ')))

  return proposeChange({
    client,
    path: `${PATHS.repositories}/${name}.yml`,
    slug: name,
    action: 'create',
    commitMessage: `config(${name}): new project`,
    prTitle: `config(${name}): create new project`,
    prBody:
      [
        `New project: **${name}**`,
        '',
        `- Description: ${config.description}`,
        `- Language: ${config.language}`,
        `- Mentors: ${config.mentors.join(', ')}`,
        '',
        'Terraform will create this repository after merge.',
      ].join('\n') + PR_FOOTER,
    build: () => serializeRepoConfig(config),
  })
}

/* ───────────────────────────────────────────────────────────────────────────
   MEMBERSHIP — config/people.yml (`members` only; NOT permissions)
   ───────────────────────────────────────────────────────────────────────── */

export interface PeopleUpdateArgs {
  client: GitHubClient
  /** Login to add to org (generates actual GitHub invitation). */
  add?: string
  /** Login to remove from `members` list (does not expel from org, demotes to `member`). */
  remove?: string
}

/**
 * Proposes adding/removing from people.yml `members` list.
 *
 * 🔒 This service ONLY touches people.yml. Ownership / head-of-engineering
 * lives in privileged.yml and dashboard never writes there — privilege escalation
 * happens only via manual PR + CODEOWNERS approval.
 */
export function proposePeopleUpdate({
  client,
  add,
  remove,
}: PeopleUpdateArgs): Promise<ProposalResult> {
  const target = (add ?? remove ?? '').trim()
  if (!target) return Promise.reject(new Error('No member specified to add or remove.'))
  const verb = add ? 'added' : 'removed'
  const slug = target.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'member'

  return proposeChange({
    client,
    path: PATHS.people,
    slug: `people-${slug}`,
    action: 'update',
    commitMessage: `config(people): ${target} ${verb}`,
    prTitle: `config(people): ${target} ${verb} ${add ? 'to' : 'from'} org membership`,
    prBody:
      [
        add
          ? `\`${target}\` **added** to organization membership. A GitHub invitation will be sent after merge.`
          : `\`${target}\` **removed** from \`members\` list. This does not expel the user from the org; their role demotes to \`member\`.`,
        '',
        '> This change only affects membership. Owner / head-of-engineering permissions',
        '> reside in `privileged.yml` and cannot be modified from here.',
      ].join('\n') + PR_FOOTER,
    build: (current) => {
      if (!current) throw new Error('Could not read people.yml')
      const { members } = parsePeopleConfig(current.text)
      const exists = members.some((l) => sameLogin(l, target))

      if (add) {
        if (exists) throw new Error(`${target} is already an org member.`)
        return serializePeopleConfig([...members, target])
      }
      if (!exists) throw new Error(`${target} is not in the member list.`)
      return serializePeopleConfig(members.filter((l) => !sameLogin(l, target)))
    },
  })
}

/**
 * Completely removes a user from the organization: removes from all repos
 * (mentor/developer/viewer) first, then from people.yml member list — all in a SINGLE PR.
 *
 * Order and atomicity are critical: removing from people.yml alone breaks engine
 * validation while user is still referenced in a repo config (dangling). Single PR
 * ensures state remains consistent after merge.
 *
 * ⚠️ If the user is the ONLY mentor of a repo, that repo would be left without mentors
 * and engine rejects it in plan — in that case another mentor must be assigned first.
 * Caller warns about this.
 */
export function proposeOrgRemoval({
  client,
  login,
  projects,
}: {
  client: GitHubClient
  login: string
  projects: Project[]
}): Promise<ProposalResult> {
  const key = login.toLowerCase()
  const has = (arr?: string[]) => (arr ?? []).some((l) => l.toLowerCase() === key)

  const affected = projects.filter(
    (p) => has(p.config.mentors) || has(p.config.developers) || has(p.config.viewers),
  )

  const files: FileChange[] = [
    ...affected.map(
      (project): FileChange => ({
        path: project.path,
        build: (current) => {
          const cfg = parseRepoConfig(current.text)
          const drop = (arr?: string[]) => (arr ?? []).filter((l) => l.toLowerCase() !== key)
          const edits: Record<string, YamlValue | undefined> = {}
          if (has(cfg.mentors)) edits.mentors = drop(cfg.mentors)
          if (has(cfg.developers)) edits.developers = drop(cfg.developers)
          if (has(cfg.viewers)) edits.viewers = drop(cfg.viewers)
          return applyEdits(current.text, edits)
        },
      }),
    ),
    {
      path: PATHS.people,
      build: (current) => {
        const { members } = parsePeopleConfig(current.text)
        return serializePeopleConfig(members.filter((l) => !sameLogin(l, login)))
      },
    },
  ]

  const repoList = affected.map((p) => `\`${p.name}\``).join(', ') || '(none)'

  return proposeMultiChange({
    client,
    slug: `remove-${key.replace(/[^a-z0-9-]/g, '') || 'member'}`,
    commitMessage: `config: completely removed ${login} from organization`,
    prTitle: `config: removed ${login} from organization`,
    prBody:
      [
        `\`${login}\` is being **completely** removed from the organization.`,
        '',
        `- Removed from repo roles: ${repoList}`,
        '- Removed from `people.yml` member list',
        '',
        '> Removed from all repo roles first, then from membership — preventing',
        '> dangling references. After merge, the user will no longer be an org member',
        '> and will lose access to these repositories.',
      ].join('\n') + PR_FOOTER,
    files,
  })
}

/** PRs opened by the dashboard — recognized by branch name prefix. */
export function isDashboardBranch(ref: string): boolean {
  return ref.startsWith('dashboard/')
}
