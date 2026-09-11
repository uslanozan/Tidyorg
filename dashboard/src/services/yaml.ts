import yaml from 'js-yaml'
import type {
  OrgConfig,
  PeopleConfig,
  PrivilegedConfig,
  RepoConfig,
} from '../types/config'

export function parseYaml<T>(text: string): T {
  return yaml.load(text) as T
}

export const parseRepoConfig = (text: string) => parseYaml<RepoConfig>(text)
export const parseOrgConfig = (text: string) => parseYaml<OrgConfig>(text)

export function parsePeopleConfig(text: string): PeopleConfig {
  const raw = (yaml.load(text) ?? {}) as Partial<PeopleConfig>
  return { version: raw.version ?? 1, members: raw.members ?? [] }
}

export function parsePrivilegedConfig(text: string): PrivilegedConfig {
  const raw = (yaml.load(text) ?? {}) as Partial<PrivilegedConfig>
  return {
    version: raw.version ?? 1,
    org_owners: raw.org_owners ?? [],
    roles: raw.roles ?? {},
  }
}

/**
 * people.yml'ı SIFIRDAN yazar (makine-sahipli, yorumsuz — Karar 16). Yalnızca
 * `members` listesi; yetki alanı yok, olamaz.
 */
export function serializePeopleConfig(members: string[]): string {
  const lines = ['version: 1', '', 'members:']
  for (const login of members) lines.push(`  - ${renderScalar(login)}`)
  return lines.join('\n') + '\n'
}

/* ═══════════════════════════════════════════════════════════════════════════
   YERİNDE DÜZENLEME
   ═══════════════════════════════════════════════════════════════════════════

   Mevcut bir config dosyasını "parse → dump" turundan geçirmek dosyadaki
   YORUMLARI SİLER. Bu repo'da yorumlar süs değil: gerekçe taşıyorlar
   (örn. tidyorg.yml içindeki mentör listesi uyarısı).
   Bu yüzden güncellemede yalnızca ilgili anahtarın satır bloğu değiştirilir;
   dosyanın geri kalanı bayt bayt korunur.                                    */

export type YamlScalar = string | number | boolean | null
export type YamlValue =
  | YamlScalar
  | string[]
  | YamlValue[]
  | { [key: string]: YamlValue }

/** Düz skaler / string listesi mi, yoksa iç içe yapı mı? */
function isFlat(value: YamlValue): value is YamlScalar | string[] {
  if (Array.isArray(value)) return value.every((item) => typeof item === 'string')
  return value === null || typeof value !== 'object'
}

const NEEDS_QUOTES = /[:#{}[\],&*?|<>=!%@`"']|^\s|\s$|^$|^[-\d]/

function renderScalar(value: string | number | boolean | null): string {
  if (value === null) return 'null'
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
  if (isFlat(value)) {
    if (Array.isArray(value)) return renderList(key, value, flow)
    return [`${key}: ${renderScalar(value)}`]
  }
  // İç içe yapı (protected_branches, code_owners, labels…): blok olarak yaz.
  // Anahtarın kendisi ve üstündeki yorumlar yerinde kalır; yalnızca gövde yenilenir.
  const empty = Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0
  if (empty) return [`${key}: ${Array.isArray(value) ? '[]' : '{}'}`]
  return [`${key}:`, dumpBlock(value)]
}

/**
 * Verilen anahtarları dosyada günceller; anahtar yoksa dosyanın sonuna ekler.
 * Değer `undefined` ise anahtar dosyadan SİLİNİR (org varsayılanına bırakılır).
 * Yorumlar, anahtar sırası ve dokunulmayan alanlar aynen kalır.
 */
export function applyEdits(
  text: string,
  edits: Record<string, YamlValue | undefined>,
): string {
  const lines = text.split('\n')

  for (const [key, value] of Object.entries(edits)) {
    const block = findBlock(lines, key)

    if (value === undefined) {
      // Anahtarı kaldır — üstündeki yorum bloğu kişiye ait olabileceğinden dokunma;
      // yalnızca anahtarın kendi satır aralığını sil.
      if (block) lines.splice(block.start, block.end - block.start)
      continue
    }

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
   İÇ İÇE (NESTED) LEAF DÜZENLEME — insan-sahipli, yorum dolu dosyalar için
   ═══════════════════════════════════════════════════════════════════════════

   organization.yml repo config'lerinden farklı: İNSAN-SAHİPLİ ve her kararın
   gerekçesi satır-içi/blok yorumlarında. Bir üst-seviye bloğu (`defaults`,
   `roles`) komple yeniden yazmak (applyEdits'in nested yolu) bu yorumları YOK
   EDER. Bu yüzden derin bir yol (`defaults.visibility`, `roles.mentor.scope`,
   `defaults.protected_branches.main.required_reviews`) üzerindeki TEK yaprağı,
   girinti takip ederek, dosyanın geri kalanına ve TÜM yorumlara dokunmadan
   değiştiririz. Satır-içi yorumlar (`visibility: public # sebep...`) korunur —
   PR'ı bir insan inceleyeceği için anlamsal tutarlılık ona bırakılır; araç
   yalnızca hiçbir yorumu SİLMEZ.                                              */

const indentWidth = (line: string): number => line.match(/^(\s*)/)![1].length

/** Bir data satırının değer kısmındaki satır-içi yorumu (` # ...`) ayırır. */
function splitTrailingComment(rest: string): { value: string; comment: string } {
  const m = rest.match(/\s+#.*$/)
  if (!m) return { value: rest, comment: '' }
  return { value: rest.slice(0, m.index), comment: rest.slice(m.index!) }
}

/** [start, end) aralığında `indent` girintili `key:` satırını bulur. */
function findKeyLine(
  lines: string[],
  key: string,
  start: number,
  end: number,
): number {
  const re = new RegExp(`^(\\s*)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`)
  for (let i = start; i < end; i++) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (re.test(line)) return i
  }
  return -1
}

/**
 * `key:` satırının çocuk blok aralığını verir: [ilk çocuk, son anlamlı çocuk+1).
 * Sonraki anahtara ait boş satır ve yorumlar dışarıda kalır (findBlock ile aynı
 * özen — o yorumlar bir sonraki alana aittir, bu bloğa değil).
 */
function childRange(lines: string[], keyLine: number, end: number): [number, number] {
  const keyIndent = indentWidth(lines[keyLine])
  let e = keyLine + 1
  while (e < end) {
    const l = lines[e]
    if (!l.trim() || l.trim().startsWith('#') || indentWidth(l) > keyIndent) {
      e += 1
      continue
    }
    break
  }
  let last = e - 1
  while (last > keyLine && (lines[last].trim() === '' || lines[last].trim().startsWith('#'))) {
    last -= 1
  }
  return [keyLine + 1, last + 1]
}

/**
 * `path` (ör. ['defaults','visibility']) üzerindeki yaprağı `value` ile değiştirir;
 * dosyanın geri kalanı ve tüm yorumlar aynen kalır. Yol bulunamazsa metin
 * değişmeden döner. Skaler ve blok-liste (labels) değerleri desteklenir.
 */
export function setYamlPath(
  text: string,
  path: string[],
  value: YamlValue,
): string {
  const lines = text.split('\n')
  let lo = 0
  let hi = lines.length

  for (let d = 0; d < path.length; d++) {
    const key = path[d]
    const idx = findKeyLine(lines, key, lo, hi)
    if (idx === -1) return text // yol yok — sessizce dokunma

    if (d < path.length - 1) {
      ;[lo, hi] = childRange(lines, idx, hi)
      continue
    }

    // Son segment: yaprağı değiştir.
    const indent = lines[idx].match(/^(\s*)/)![1]
    const afterColon = lines[idx].slice(lines[idx].indexOf(':') + 1)
    const { comment } = splitTrailingComment(afterColon)

    // Bu anahtarın mevcut blok aralığı (varsa çocukları) sonuçta silinecek.
    const [, blockEnd] = childRange(lines, idx, hi)

    let rendered: string[]
    if (isFlat(value)) {
      if (Array.isArray(value)) {
        rendered = [`${indent}${key}: [${value.map(renderScalar).join(', ')}]${comment}`]
      } else {
        rendered = [`${indent}${key}: ${renderScalar(value)}${comment}`]
      }
    } else {
      // İç içe yapı/nesne dizisi (ör. labels): blok olarak, doğru girintiyle.
      const empty = Array.isArray(value)
        ? value.length === 0
        : Object.keys(value).length === 0
      rendered = empty
        ? [`${indent}${key}: ${Array.isArray(value) ? '[]' : '{}'}`]
        : [`${indent}${key}:`, dumpBlock(value, indent.length + 2)]
    }

    lines.splice(idx, blockEnd - idx, ...rendered)
    const result = lines.join('\n')
    return result.endsWith('\n') ? result : `${result}\n`
  }

  return text
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
  'vulnerability_alerts',
  'secret_scanning',
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
  'labels',
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

  if (config.labels?.length) lines.push('labels:', dumpBlock(config.labels))

  const extras = Object.entries(config as unknown as Record<string, unknown>).filter(
    ([key, value]) => !KNOWN_KEYS.has(key) && value !== undefined,
  )
  if (extras.length) {
    lines.push(yaml.dump(Object.fromEntries(extras), { indent: 2, noRefs: true }).trimEnd())
  }

  return lines.join('\n') + '\n'
}
