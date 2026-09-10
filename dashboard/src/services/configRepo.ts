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
    if (project.config.viewers?.some((v) => v.toLowerCase() === key)) {
      result.push({ project: project.name, role: 'viewer' })
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

/**
 * Bir kullanıcı bu projenin config'ini YÖNETEBİLİR mi (yazma butonları ona açılır mı)?
 * Repo'nun mentörü, head-of-engineering, ya da org owner. Developer'lar ve diğerleri
 * salt-okunur görür. Bu yalnızca UI ipucudur — asıl kapı GitHub (CODEOWNERS + branch
 * protection); yetkisiz bir istek sunucuda zaten reddedilir.
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

export interface FileChange {
  /** Repo kökünden dosya yolu (hep 'update'; dosya mevcut olmalı). */
  path: string
  /** Dosyanın güncel hâlinden yeni içeriği üretir. Değişiklik yoksa aynı metni döndür. */
  build: (current: { text: string; sha: string }) => string
}

/**
 * Birden çok dosyayı TEK branch + TEK PR içinde değiştirir (atomik).
 *
 * "Org'dan tamamen çıkar" gibi işlemler için gerekli: kişi hem tüm repolardan hem
 * people.yml'dan aynı PR'da çıkarılmalı — yoksa merge sonrası ara durumda engine'in
 * "repo referansı people.yml'da yok" doğrulaması patlar (dangling).
 *
 * Not: proposeChange'deki tek-dosya çakışma-retry döngüsü burada yok; nadir bir
 * yönetici işlemi olduğu için çakışmada hata verir ve kullanıcı tekrar dener.
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
    if (content === current.text) continue // bu dosyada değişiklik yok — atla
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

/* ───────────────────────────────────────────────────────────────────────────
   ORG AYARLARI — config/organization.yml (İNSAN-SAHİPLİ, yorum dolu)
   ───────────────────────────────────────────────────────────────────────────
   Bu dosya baştan yazılamaz: her kararın gerekçesi yorumlarda. Yalnızca
   değişen YAPRAKLAR nested yolla (setYamlPath) yerinde güncellenir; tüm yorumlar
   ve dokunulmayan alanlar aynen kalır. privileged.yml (owner'lar) buraya DAHİL
   DEĞİL — o dosya dashboard'ın asla yazmadığı yükseltme kapısı olarak kalır.   */

export interface OrgConfigChange {
  /** Nokta yolu segmentleri, ör. ['defaults','visibility'] veya ['roles','mentor','scope']. */
  path: string[]
  /** Yeni yaprak değeri (skaler, flow-liste ya da labels gibi nesne dizisi). */
  value: YamlValue
}

export interface OrgUpdateArgs {
  client: GitHubClient
  /** Yalnızca gerçekten değişen yapraklar — çağıran diff'i hesaplar. */
  changes: OrgConfigChange[]
  /** "profil güncellendi" gibi tek satırlık özet. */
  summary: string
  details?: string[]
}

/** organization.yml'da bir dizi yaprağı güncelleyen PR açar (yorum-koruyan). */
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
      ['**Organizasyon ayarları** güncellendi.', '', ...details.map((d) => `- ${d}`)].join('\n') +
      PR_FOOTER,
    build: (current) => {
      if (!current) throw new Error('Dosya okunamadı')
      let text = current.text
      for (const { path, value } of changes) text = setYamlPath(text, path, value)
      return text
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

/**
 * Bir kişiyi organizasyondan TAMAMEN çıkarır: önce bulunduğu tüm repolardan (mentor
 * /developer/viewer) çıkarır, sonra people.yml üye listesinden — hepsi TEK PR'da.
 *
 * Sıra ve atomiklik önemli: people.yml'dan tek başına çıkarmak, kişi hâlâ bir repo
 * config'inde referanslıyken engine'in doğrulamasını patlatır (dangling). Tek PR
 * ile merge sonrası durum tutarlı olur.
 *
 * ⚠️ Kişi bir repo'nun TEK mentörüyse, o repo mentörsüz kalır ve engine plan'da
 * reddeder — bu durumda önce başka bir mentör atanmalı. Çağıran taraf bunu uyarır.
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

  const repoList = affected.map((p) => `\`${p.name}\``).join(', ') || '(hiçbiri)'

  return proposeMultiChange({
    client,
    slug: `remove-${key.replace(/[^a-z0-9-]/g, '') || 'member'}`,
    commitMessage: `config: ${login} organizasyondan tamamen çıkarıldı`,
    prTitle: `config: ${login} organizasyondan çıkarıldı`,
    prBody:
      [
        `\`${login}\` organizasyondan **tamamen** çıkarılıyor.`,
        '',
        `- Repo rollerinden çıkarıldı: ${repoList}`,
        '- `people.yml` üye listesinden çıkarıldı',
        '',
        '> Önce tüm repo rollerinden, sonra üyelikten çıkarılır — böylece dangling',
        '> referans oluşmaz. Merge sonrası kişi org üyesi olmaktan çıkar ve bu repolara',
        '> erişimi kalmaz.',
      ].join('\n') + PR_FOOTER,
    files,
  })
}

/** Dashboard'ın açtığı PR'lar — branch adı önekinden tanınır. */
export function isDashboardBranch(ref: string): boolean {
  return ref.startsWith('dashboard/')
}
