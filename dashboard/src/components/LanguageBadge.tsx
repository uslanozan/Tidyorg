import type { Language } from '../types/config'

// Renkler GitHub Linguist'ten (github/linguist) — marka renkleri, temadan bağımsız.
// mono: küçük renkli kare içinde gösterilen kısa monogram ("ikon"). Logolara
// (asset yükü) gerek kalmadan her dile ayırt edici bir işaret verir.
type LangMeta = { label: string; color: string; mono: string }

const LANG_META: Record<string, LangMeta> = {
  go: { label: 'Go', color: '#00ADD8', mono: 'Go' },
  python: { label: 'Python', color: '#3572A5', mono: 'Py' },
  typescript: { label: 'TypeScript', color: '#3178C6', mono: 'TS' },
  javascript: { label: 'JavaScript', color: '#F1E05A', mono: 'JS' },
  php: { label: 'PHP', color: '#4F5D95', mono: 'PHP' },
  java: { label: 'Java', color: '#B07219', mono: 'Jv' },
  cpp: { label: 'C++', color: '#F34B7D', mono: 'C++' },
  csharp: { label: 'C#', color: '#178600', mono: 'C#' },
  c: { label: 'C', color: '#555555', mono: 'C' },
  rust: { label: 'Rust', color: '#DEA584', mono: 'Rs' },
  ruby: { label: 'Ruby', color: '#701516', mono: 'Rb' },
  kotlin: { label: 'Kotlin', color: '#A97BFF', mono: 'Kt' },
  swift: { label: 'Swift', color: '#F05138', mono: 'Sw' },
  scala: { label: 'Scala', color: '#C22D40', mono: 'Sc' },
  dart: { label: 'Dart', color: '#00B4AB', mono: 'Dt' },
  elixir: { label: 'Elixir', color: '#6E4A7E', mono: 'Ex' },
  shell: { label: 'Shell', color: '#89E051', mono: 'Sh' },
}

// Config token'ı olmayan ama gelebilecek yaygın yazımlar.
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
}

const UNKNOWN_COLOR = '#94A3B8'

/** Arka plan rengine göre okunaklı yazı rengi (siyah/beyaz). */
function textOn(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // algılanan parlaklık (ITU-R BT.601)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111827' : '#ffffff'
}

export function LanguageBadge({ language }: { language: Language | string }) {
  const raw = String(language)
  const key = raw.toLowerCase()
  const resolved = LANG_META[key] ?? LANG_META[ALIASES[key] ?? '']
  const meta: LangMeta = resolved ?? {
    label: raw,
    color: UNKNOWN_COLOR,
    mono: raw.slice(0, 2).toUpperCase() || '?',
  }

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
          background: meta.color,
          color: textOn(meta.color),
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {meta.mono}
      </span>
      {meta.label}
    </span>
  )
}
