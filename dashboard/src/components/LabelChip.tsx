import type { RepoLabel } from '../types/config'

/**
 * GitHub etiket rengi (6 haneli hex, `#`'siz) üstünde okunur metin rengi seçer.
 * YIQ parlaklık eşiği: koyu zeminde beyaz, açık zeminde koyu yazı.
 */
function readableText(hex: string): string {
  const c = hex.replace('#', '')
  if (c.length !== 6) return '#1b1f24'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#1b1f24' : '#ffffff'
}

/** GitHub'daki gibi renkli pill etiketi. `description` varsa hover ipucu olur. */
export function LabelChip({ label }: { label: RepoLabel }) {
  const bg = `#${label.color.replace('#', '') || 'ededed'}`
  return (
    <span
      className="label-chip"
      style={{ background: bg, color: readableText(label.color) }}
      title={label.description || undefined}
    >
      {label.name || '(adsız)'}
    </span>
  )
}
