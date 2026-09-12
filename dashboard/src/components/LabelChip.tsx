import type { CSSProperties } from 'react'
import type { RepoLabel } from '../types/config'

/**
 * GitHub-style issue label: solid colored border, glassy semi-transparent fill, contrasting
 * text. Color comes from `--label-color` CSS variable; fill/border/text shades are
 * derived per theme via `color-mix` in global.css (separate for light/dark).
 */
export function LabelChip({ label }: { label: RepoLabel }) {
  const hex = `#${(label.color || 'ededed').replace('#', '')}`
  return (
    <span
      className="label-chip"
      style={{ '--label-color': hex } as CSSProperties}
      title={label.description || undefined}
    >
      {label.name || '(unnamed)'}
    </span>
  )
}
