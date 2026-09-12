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
 * Writes people.yml FROM SCRATCH (machine-owned, no comments — Decision 16). Only
 * the `members` list; no permission fields exist or can exist.
 */
export function serializePeopleConfig(members: string[]): string {
  const lines = ['version: 1', '', 'members:']
  for (const login of members) lines.push(`  - ${renderScalar(login)}`)
  return lines.join('\n') + '\n'
}

/* ═══════════════════════════════════════════════════════════════════════════
   IN-PLACE EDITING
   ═══════════════════════════════════════════════════════════════════════════

   Running an existing config file through a "parse → dump" roundtrip
   DELETES COMMENTS in the file. In this repo, comments are not decorative:
   they carry rationale (e.g., mentor list warning in tidyorg.yml).
   Therefore, updates only modify the line block of the relevant key;
   the rest of the file is preserved byte-by-byte.                           */

export type YamlScalar = string | number | boolean | null
export type YamlValue =
  | YamlScalar
  | string[]
  | YamlValue[]
  | { [key: string]: YamlValue }

/** Is it a flat scalar / string list, or a nested structure? */
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

/** Line range of a top-level key: [start, end). */
function findBlock(lines: string[], key: string): { start: number; end: number } | null {
  const header = new RegExp(`^${key}\\s*:`)
  const start = lines.findIndex((line) => header.test(line))
  if (start === -1) return null

  let end = start + 1
  // Block continues until the next top-level key (unindented, non-comment line).
  while (end < lines.length && !/^[A-Za-z_"']/.test(lines[end])) end += 1

  // Exclude trailing blank lines and comments belonging to the next key.
  let last = end - 1
  while (last > start && (lines[last].trim() === '' || lines[last].trim().startsWith('#'))) {
    last -= 1
  }
  return { start, end: last + 1 }
}

/** Is the list written in flow style (`key: [a, b]`) or block style? */
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
  // Nested structure (protected_branches, code_owners, labels…): write as a block.
  // The key itself and comments above it remain in place; only the body is replaced.
  const empty = Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0
  if (empty) return [`${key}: ${Array.isArray(value) ? '[]' : '{}'}`]
  return [`${key}:`, dumpBlock(value)]
}

/**
 * Updates the given keys in the file; if key does not exist, appends to end of file.
 * If value is `undefined`, the key is DELETED from the file (deferred to org defaults).
 * Comments, key ordering, and untouched fields remain intact.
 */
export function applyEdits(
  text: string,
  edits: Record<string, YamlValue | undefined>,
): string {
  const lines = text.split('\n')

  for (const [key, value] of Object.entries(edits)) {
    const block = findBlock(lines, key)

    if (value === undefined) {
      // Remove key — do not touch the comment block above it as it may belong to the author;
      // delete only the line range of the key itself.
      if (block) lines.splice(block.start, block.end - block.start)
      continue
    }

    if (block) {
      const flow = usesFlowStyle(lines.slice(block.start, block.end))
      lines.splice(block.start, block.end - block.start, ...renderEntry(key, value, flow))
    } else {
      // New key: at the end of the file, separated by an empty line.
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
      lines.push('', ...renderEntry(key, value, Array.isArray(value)))
    }
  }

  const result = lines.join('\n')
  return result.endsWith('\n') ? result : `${result}\n`
}

/* ═══════════════════════════════════════════════════════════════════════════
   NESTED LEAF EDITING — for human-owned, comment-rich files
   ═══════════════════════════════════════════════════════════════════════════

   organization.yml is different from repo configs: it is HUMAN-OWNED and the
   rationale for every decision is in inline/block comments. Rewriting an entire
   top-level block (`defaults`, `roles`) completely (applyEdits nested path)
   WOULD DESTROY these comments. Therefore, we modify the SINGLE leaf along a
   deep path (`defaults.visibility`, `roles.mentor.scope`,
   `defaults.protected_branches.main.required_reviews`) by tracking indentation,
   without touching the rest of the file and ALL comments. Inline comments
   (`visibility: public # reason...`) are preserved — since a human will review
   the PR, semantic consistency is left to them; the tool simply DELETES NO COMMENTS. */

const indentWidth = (line: string): number => line.match(/^(\s*)/)![1].length

/** Separates the inline comment (` # ...`) from the value part of a data line. */
function splitTrailingComment(rest: string): { value: string; comment: string } {
  const m = rest.match(/\s+#.*$/)
  if (!m) return { value: rest, comment: '' }
  return { value: rest.slice(0, m.index), comment: rest.slice(m.index!) }
}

/** Finds the line with `key:` at `indent` within the [start, end) range. */
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
 * Returns child block range of a `key:` line: [first child, last meaningful child+1).
 * Trailing empty lines and comments belonging to the next key are excluded
 * (same care as findBlock — those comments belong to the next field, not this block).
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
 * Replaces the leaf at `path` (e.g. ['defaults','visibility']) with `value`;
 * the rest of the file and all comments remain intact. If path is not found,
 * returns text unmodified. Scalar and block-list (labels) values are supported.
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
    if (idx === -1) return text // path not found — silently leave untouched

    if (d < path.length - 1) {
      ;[lo, hi] = childRange(lines, idx, hi)
      continue
    }

    // Last segment: replace leaf.
    const indent = lines[idx].match(/^(\s*)/)![1]
    const afterColon = lines[idx].slice(lines[idx].indexOf(':') + 1)
    const { comment } = splitTrailingComment(afterColon)

    // Current block range for this key (including children) will be replaced.
    const [, blockEnd] = childRange(lines, idx, hi)

    let rendered: string[]
    if (isFlat(value)) {
      if (Array.isArray(value)) {
        rendered = [`${indent}${key}: [${value.map(renderScalar).join(', ')}]${comment}`]
      } else {
        rendered = [`${indent}${key}: ${renderScalar(value)}${comment}`]
      }
    } else {
      // Nested structure / object array (e.g. labels): as a block, with proper indentation.
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
   WRITING FROM SCRATCH — only for new files
   ═══════════════════════════════════════════════════════════════════════════ */

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

/** Keys we write explicitly; all other keys are passed through as-is with js-yaml. */
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
 * Generates a new repo config file. Key ordering is fixed; fields added
 * to the schema later (unrecognized here) are not dropped, but written as-is at the end.
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
