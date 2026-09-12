import type { Language } from '../types/config'

// Known languages: actual logo at public/lang/<token>.svg (devicon, bundled —
// no runtime CDN dependency). Unknown language: colored monogram fallback.
const LANG_LABELS: Record<string, string> = {
  go: 'Go',
  python: 'Python',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  php: 'PHP',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  c: 'C',
  rust: 'Rust',
  ruby: 'Ruby',
  kotlin: 'Kotlin',
  swift: 'Swift',
  scala: 'Scala',
  dart: 'Dart',
  elixir: 'Elixir',
  shell: 'Shell',
  hcl: 'Terraform',
  html: 'HTML',
  css: 'CSS',
  vue: 'Vue',
  lua: 'Lua',
  r: 'R',
  perl: 'Perl',
  haskell: 'Haskell',
  clojure: 'Clojure',
  groovy: 'Groovy',
}

// Common spellings not in config tokens but possible → canonical token.
const ALIASES: Record<string, string> = {
  'c++': 'cpp',
  'c#': 'csharp',
  cs: 'csharp',
  js: 'javascript',
  ts: 'typescript',
  node: 'javascript',
  nodejs: 'javascript',
  golang: 'go',
  py: 'python',
  rb: 'ruby',
  kt: 'kotlin',
  sh: 'shell',
  bash: 'shell',
  terraform: 'hcl',
  tf: 'hcl',
  html5: 'html',
  htm: 'html',
  css3: 'css',
  vuejs: 'vue',
  perl5: 'perl',
  clj: 'clojure',
}

const UNKNOWN_COLOR = '#94A3B8'

/** Canonical language token (if known language), otherwise undefined. */
function resolve(lang: string): string | undefined {
  const lower = lang.toLowerCase()
  if (LANG_LABELS[lower]) return lower
  return ALIASES[lower]
}

/** Display name of a language token (e.g. "cpp" → "C++"). Used in dropdowns. */
export function languageLabel(lang: string): string {
  const key = resolve(lang)
  return key ? LANG_LABELS[key] : String(lang)
}

export function LanguageBadge({ language }: { language: Language | string }) {
  const raw = String(language)
  const key = resolve(raw)

  if (key) {
    return (
      <span className="badge">
        <img
          src={`/lang/${key}.svg`}
          alt=""
          aria-hidden="true"
          width={16}
          height={16}
          style={{ display: 'block', objectFit: 'contain' }}
        />
        {LANG_LABELS[key]}
      </span>
    )
  }

  // Unknown language → colored monogram (no logo).
  const mono = raw.slice(0, 2).toUpperCase() || '?'
  return (
    <span className="badge">
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 18,
          height: 18,
          padding: '0 4px',
          borderRadius: 4,
          background: UNKNOWN_COLOR,
          color: '#111827',
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {mono}
      </span>
      {raw}
    </span>
  )
}
