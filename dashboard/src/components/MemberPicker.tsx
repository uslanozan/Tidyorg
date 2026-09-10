import { useMemo, useState } from 'react'
import { useT } from '../i18n'

interface Props {
  label: string
  hint?: string
  /** Seçilebilecek tüm org üyeleri (people.yml → members). */
  all: string[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Bu listede gösterilmeyecekler (örn. diğer roldeki seçilenler). */
  exclude?: string[]
}

const avatarUrl = (login: string) => `https://github.com/${encodeURIComponent(login)}.png?size=48`

/**
 * Aranabilir org üyesi seçici — avatar + nick. 100 kişide bile rahat: yaz, süz, tıkla.
 * Seçilenler kaldırılabilir çip olarak üstte; aday listesi altta kaydırılabilir.
 */
export function MemberPicker({ label, hint, all, selected, onChange, exclude = [] }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')

  const candidates = useMemo(() => {
    const taken = new Set([...selected, ...exclude].map((l) => l.toLowerCase()))
    const needle = query.trim().toLocaleLowerCase('tr')
    return all
      .filter((l) => !taken.has(l.toLowerCase()))
      .filter((l) => !needle || l.toLocaleLowerCase('tr').includes(needle))
      .sort((a, b) => a.localeCompare(b, 'tr'))
  }, [all, selected, exclude, query])

  const add = (login: string) => onChange([...selected, login])
  const remove = (login: string) =>
    onChange(selected.filter((l) => l.toLowerCase() !== login.toLowerCase()))

  return (
    <div className="field">
      <span className="label">
        {label} {selected.length > 0 && <span className="subtle">({selected.length})</span>}
      </span>

      {selected.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {selected.map((login) => (
            <span
              key={login}
              className="row"
              style={{
                gap: 'var(--sp-1)',
                alignItems: 'center',
                padding: '2px 4px 2px 2px',
                border: '1px solid var(--border)',
                borderRadius: 999,
                background: 'var(--surface-sunken)',
              }}
            >
              <img className="avatar" src={avatarUrl(login)} alt="" width={20} height={20} />
              <span style={{ fontSize: 'var(--text-sm)' }}>{login}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label={t('ui.removeLogin', { login })}
                onClick={() => remove(login)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className="input"
        type="search"
        placeholder={t('ui.memberSearchPlaceholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t('ui.searchAria', { label })}
      />

      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {candidates.length === 0 ? (
          <p className="subtle" style={{ padding: 'var(--sp-3)', margin: 0 }}>
            {all.length === 0 ? t('ui.noOrgMembers') : t('ui.noMatchingMembers')}
          </p>
        ) : (
          candidates.slice(0, 50).map((login) => (
            <button
              key={login}
              type="button"
              onClick={() => add(login)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                width: '100%',
                padding: 'var(--sp-2) var(--sp-3)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                color: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <img className="avatar" src={avatarUrl(login)} alt="" width={24} height={24} />
              <span>{login}</span>
              <span className="subtle" style={{ marginLeft: 'auto' }}>
                {t('ui.addMember')}
              </span>
            </button>
          ))
        )}
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}
