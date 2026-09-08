import type { Language } from '../types/config'

const LABELS: Record<string, string> = {
  go: 'Go',
  python: 'Python',
  typescript: 'TypeScript',
  php: 'PHP',
}

const COLOR_VARS: Record<string, string> = {
  go: 'var(--lang-go)',
  python: 'var(--lang-python)',
  typescript: 'var(--lang-typescript)',
  php: 'var(--lang-php)',
}

export function LanguageBadge({ language }: { language: Language | string }) {
  const key = String(language).toLowerCase()
  return (
    <span className="badge">
      <span
        className="badge-dot"
        style={{ background: COLOR_VARS[key] ?? 'var(--lang-unknown)' }}
        aria-hidden="true"
      />
      {LABELS[key] ?? language}
    </span>
  )
}
