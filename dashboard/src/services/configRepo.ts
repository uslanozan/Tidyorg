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
   OKUMA
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
        // Tek bozuk dosya tüm listeyi düşürmesin — kart "okunamadı" olarak çıkar.
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

/** Bir kişinin hangi projede hangi rolde olduğu. */
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
  }

  return result
}

export type EffectiveRule = ProtectedBranchRule & {
  /** Repo dosyası bu dalı eziyor mu? */
  overridden: boolean
  /** `branch: null` → varsayılan koruma tamamen kaldırılmış (repositories.tf). */
  removed: boolean
}

/** Repo dosyası yalnızca farkları yazar; gösterirken org varsayılanı ile birleştirilir. */
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

/** Org kapsamlı rol/owner bilgisi privileged.yml'dan gelir (people.yml artık yetki taşımaz). */
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

/** Bir kişinin org'daki durumu — MemberDetail rozeti için. */
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
   YAZMA — her değişiklik main'e değil, PR'a gider
   ═══════════════════════════════════════════════════════════════════════ */

export interface ProposalResult {
  pullRequest: PullRequest
  branch: string
  /** Çakışma sebebiyle baştan denendiyse true — kullanıcıya bilgi verilir. */
  retried: boolean
}

interface ProposeArgs {
  client: GitHubClient
  /** Değişecek dosyanın repo kökünden yolu. */
  path: string
  /** Branch adında kullanılacak kısa ad (genelde repo adı). */
  slug: string
  action: 'update' | 'create'
  commitMessage: string
  prTitle: string
  prBody: string
  /**
   * Dosyanın güncel hâlinden yeni içeriği üretir.
   * Çakışmada yeniden okunan içerikle TEKRAR çağrılır — bu yüzden saf olmalı.
   */
  build: (current: { text: string; sha: string } | null) => string
}

const MAX_ATTEMPTS = 3

/**
 * Yazma akışı: oku → değiştir → branch aç → yaz → PR aç.
 *
 * Çakışma (kayıp güncelleme) koruması: dosya `sha`'sı ile yazılır. Araya başka
 * bir değişiklik girdiyse GitHub 409/422 döner; o zaman dosya baştan okunup
 * değişiklik güncel içeriğin üstüne uygulanır ve yeniden denenir.
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
      // Aynı adda dosya varsa "yeni proje" değildir — sessizce üzerine yazmayalım.
      try {
        await client.getFile(CONFIG_OWNER, CONFIG_REPO, path, CONFIG_BRANCH)
        throw new GitHubError(
          409,
          'conflict',
          'file exists',
          'Bu adda bir config dosyası zaten var.',
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
        continue // dosyayı baştan oku, değişikliği güncel içeriğe uygula
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
    new GitHubError(409, 'conflict', 'retry exhausted', 'Değişiklik yazılamadı, tekrar deneyin.')
  )
}

const PR_FOOTER = [
  '',
  '---',
  '',
  '> Bu PR yönetim paneli tarafından açıldı.',
  '> Merge edildiğinde Terraform çalışır ve değişiklik GitHub organizasyonuna yansır.',
].join('\n')

export interface RepoChangeArgs {
  client: GitHubClient
  project: Project
  /**
   * Dosyanın GÜNCEL hâlinden değişecek anahtarları üretir.
   * Çakışmada yeniden okunan içerikle tekrar çağrılır — böylece araya giren
   * başka bir değişiklik ezilmez, üstüne uygulanır.
   */
  edits: (config: RepoConfig) => Record<string, YamlValue | undefined>
  /** "developer eklendi" gibi tek satırlık özet — commit ve PR başlığında kullanılır. */
  summary: string
  /** PR gövdesine giren madde listesi. */
  details?: string[]
}

/** Mevcut bir repo config'ini güncelleyen PR açar. */
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
      [`**${project.name}** konfigürasyonu güncellendi.`, '', ...details.map((d) => `- ${d}`)].join(
        '\n',
      ) + PR_FOOTER,
    build: (current) => {
      if (!current) throw new Error('Dosya okunamadı')

      // Dosya baştan yazılmaz, yalnızca ilgili satırlar değişir: yorumlar korunur.
      const nextText = applyEdits(current.text, edits(parseRepoConfig(current.text)))

      const errors = validateRepoConfig(parseRepoConfig(nextText))
      if (errors.length) throw new Error(errors.join(' '))
      return nextText
    },
  })
}

/** Yeni bir repo config dosyası oluşturan PR açar. */
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
    commitMessage: `config(${name}): yeni proje`,
    prTitle: `config(${name}): yeni proje oluştur`,
    prBody:
      [
        `Yeni proje: **${name}**`,
        '',
        `- Açıklama: ${config.description}`,
        `- Dil: ${config.language}`,
        `- Mentör: ${config.mentors.join(', ')}`,
        '',
        'Merge sonrası Terraform bu repo\'yu oluşturur.',
      ].join('\n') + PR_FOOTER,
    build: () => serializeRepoConfig(config),
  })
}

/* ───────────────────────────────────────────────────────────────────────────
   ÜYELİK — config/people.yml (yalnızca `members`; yetki DEĞİL)
   ───────────────────────────────────────────────────────────────────────── */

export interface PeopleUpdateArgs {
  client: GitHubClient
  /** Org'a eklenecek login (gerçek GitHub daveti üretir). */
  add?: string
  /** `members` listesinden çıkarılacak login (org'dan atmaz, `member`a düşürür). */
  remove?: string
}

/**
 * people.yml `members` listesine ekleme/çıkarma önerir.
 *
 * 🔒 Bu servis SADECE people.yml'a dokunur. Owner'lık / head-of-engineering
 * privileged.yml'da yaşar ve dashboard oraya asla yazmaz — yetki yükseltme
 * yalnızca elle PR + CODEOWNERS onayıyla olur.
 */
export function proposePeopleUpdate({
  client,
  add,
  remove,
}: PeopleUpdateArgs): Promise<ProposalResult> {
  const target = (add ?? remove ?? '').trim()
  if (!target) return Promise.reject(new Error('Eklenecek veya çıkarılacak kişi belirtilmedi.'))
  const verb = add ? 'eklendi' : 'çıkarıldı'
  const slug = target.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'member'

  return proposeChange({
    client,
    path: PATHS.people,
    slug: `people-${slug}`,
    action: 'update',
    commitMessage: `config(people): ${target} ${verb}`,
    prTitle: `config(people): ${target} org üyeliğine ${verb}`,
    prBody:
      [
        add
          ? `\`${target}\` organizasyon üyeliğine **eklendi**. Merge sonrası GitHub daveti gönderilir.`
          : `\`${target}\` \`members\` listesinden **çıkarıldı**. Bu, kişiyi org'dan atmaz; rolü \`member\`a düşer.`,
        '',
        '> Bu değişiklik yalnızca üyeliği etkiler. Owner / head-of-engineering yetkisi',
        '> `privileged.yml` içindedir ve buradan değiştirilemez.',
      ].join('\n') + PR_FOOTER,
    build: (current) => {
      if (!current) throw new Error('people.yml okunamadı')
      const { members } = parsePeopleConfig(current.text)
      const exists = members.some((l) => sameLogin(l, target))

      if (add) {
        if (exists) throw new Error(`${target} zaten org üyesi.`)
        return serializePeopleConfig([...members, target])
      }
      if (!exists) throw new Error(`${target} zaten üye listesinde değil.`)
      return serializePeopleConfig(members.filter((l) => !sameLogin(l, target)))
    },
  })
}

/** Dashboard'ın açtığı PR'lar — branch adı önekinden tanınır. */
export function isDashboardBranch(ref: string): boolean {
  return ref.startsWith('dashboard/')
}
