import type { CSSProperties } from 'react'
import type { RepoLabel } from '../types/config'

/**
 * GitHub tarzı issue etiketi: solid renkli kenar, camsı yarı-saydam iç, kontrastlı
 * yazı. Renk `--label-color` CSS değişkeninden gelir; fill/kenar/yazı tonlarını
 * global.css `color-mix` ile temaya göre türetir (açık/koyu ayrı).
 */
export function LabelChip({ label }: { label: RepoLabel }) {
  const hex = `#${(label.color || 'ededed').replace('#', '')}`
  return (
    <span
      className="label-chip"
      style={{ '--label-color': hex } as CSSProperties}
      title={label.description || undefined}
    >
      {label.name || '(adsız)'}
    </span>
  )
}
