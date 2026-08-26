import yaml from 'js-yaml'
import type { OrgConfig, PeopleConfig, RepoConfig } from '../types/config'

export function parseYaml<T>(text: string): T {
  return yaml.load(text) as T
}

export const parseRepoConfig = (text: string) => parseYaml<RepoConfig>(text)
export const parseOrgConfig = (text: string) => parseYaml<OrgConfig>(text)
export const parsePeopleConfig = (text: string) => parseYaml<PeopleConfig>(text)

/* ═══════════════════════════════════════════════════════════════════════════
   YERİNDE DÜZENLEME
   ═══════════════════════════════════════════════════════════════════════════

   Mevcut bir config dosyasını "parse → dump" turundan geçirmek dosyadaki
   YORUMLARI SİLER. Bu repo'da yorumlar süs değil: gerekçe taşıyorlar
   (örn. Tidyorg.yml içindeki mentör listesi uyarısı).
   Bu yüzden güncellemede yalnızca ilgili anahtarın satır bloğu değiştirilir;
   dosyanın geri kalanı bayt bayt korunur.                                    */

export type YamlValue = string | number | boolean | string[]

const NEEDS_QUOTES = /[:#{}[\],&*?|<>=!%@`"']|^\s|\s$|^$|^[-\d]/

function renderScalar(value: string | number | boolean): string {
  if (typeof value !== 'string') return String(value)
  return NEEDS_QUOTES.test(value)
    ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    : value
}

/** Üst düzey anahtarın satır aralığı: [başlangıç, bitiş). */
function findBlock(lines: string[], key: string): { start: number; end: number } | null {
  const header = new RegExp(`^${key}\\s*:`)
  const start = lines.findIndex((line) => header.test(line))
  if (start === -1) return null

  let end = start + 1
  // Blok, bir sonraki üst düzey anahtara (girintisiz, yorum olmayan satır) kadar sürer.
  while (end < lines.length && !/^[A-Za-z_"']/.test(lines[end])) end += 1

  // Bloğun sonundaki boş satırlar ve bir sonraki anahtara ait yorumlar dışarıda kalsın.
  let last = end - 1
  while (last > start && (lines[last].trim() === '' || lines[last].trim().startsWith('#'))) {
    last -= 1
  }
  return { start, end: last + 1 }
}

/** Liste akış stilinde mi yazılmış (`key: [a, b]`) yoksa blok stilinde mi? */
function usesFlowStyle(blockLines: string[]): boolean {
  return /:\s*\[/.test(blockLines[0])
}

function renderList(key: string, items: string[], flow: boolean): string[] {
  if (flow || items.length === 0) {
    return [`${key}: [${items.map(renderScalar).join(', ')}]`]
  }
  return [`${key}:`, ...items.map((item) => `  - ${renderScalar(item)}`)]
}

function renderEntry(key: string, value: YamlValue, flow: boolean): string[] {
  return Array.isArray(value) ? renderList(key, value, flow) : [`${key}: ${renderScalar(value)}`]
}

/**
 * Verilen anahtarları dosyada günceller; anahtar yoksa dosyanın sonuna ekler.
 * Yorumlar, anahtar sırası ve dokunulmayan alanlar aynen kalır.
 */
export function applyEdits(text: string, edits: Record<string, YamlValue>): string {
  const lines = text.split('\n')

  for (const [key, value] of Object.entries(edits)) {
    const block = findBlock(lines, key)

    if (block) {
      const flow = usesFlowStyle(lines.slice(block.start, block.end))
      lines.splice(block.start, block.end - block.start, ...renderEntry(key, value, flow))
    } else {
      // Yeni anahtar: dosyanın sonuna, boş satırla ayrılmış olarak.
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
      lines.push('', ...renderEntry(key, value, Array.isArray(value)))
    }
  }

  const result = lines.join('\n')
  return result.endsWith('\n') ? result : `${result}\n`
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIFIRDAN YAZMA — yalnızca yeni dosyalar için
   ═══════════════════════════════════════════════════════════════════════ */

const SCALAR_KEYS = [
  'visibility',
  'archived',
  'has_issues',
  'has_projects',
  'has_wiki',
  'auto_init',
  'default_branch',
] as const

/** Elle yazdığımız anahtarlar; bunların dışındakiler js-yaml ile aynen geçirilir. */
const KNOWN_KEYS = new Set<string>([
  'description',
  'language',
  'mentors',
  'developers',
  ...SCALAR_KEYS,
  'protected_branches',
  'code_owners',
  'files',
  'workflows',
])

function dumpBlock(value: unknown, indent = 2): string {
  return yaml
    .dump(value, { indent: 2, lineWidth: 100, noRefs: true })
    .trimEnd()
    .split('\n')
    .map((line) => ' '.repeat(indent) + line)
    .join('\n')
}

/**
 * Yeni bir repo config dosyası üretir. Anahtar sırası sabittir; şemaya sonradan
 * eklenen (burada tanınmayan) alanlar düşürülmez, dosyanın sonuna aynen yazılır.
 */
export function serializeRepoConfig(config: RepoConfig): string {
  const lines: string[] = []

  lines.push(`description: ${renderScalar(config.description)}`)
  lines.push(`language: ${config.language}`)
  lines.push(...renderList('mentors', config.mentors ?? [], true))

  if (config.developers) lines.push(...renderList('developers', config.developers, true))

  for (const key of SCALAR_KEYS) {
    const value = config[key]
    if (value !== undefined) lines.push(`${key}: ${renderScalar(value)}`)
  }

  for (const key of ['code_owners', 'files', 'protected_branches'] as const) {
    const value = config[key]
    if (value && Object.keys(value).length) {
      lines.push(`${key}:`, dumpBlock(value))
    }
  }

  if (config.workflows) lines.push(...renderList('workflows', config.workflows, true))

  const extras = Object.entries(config as unknown as Record<string, unknown>).filter(
    ([key, value]) => !KNOWN_KEYS.has(key) && value !== undefined,
  )
  if (extras.length) {
    lines.push(yaml.dump(Object.fromEntries(extras), { indent: 2, noRefs: true }).trimEnd())
  }

  return lines.join('\n') + '\n'
}
