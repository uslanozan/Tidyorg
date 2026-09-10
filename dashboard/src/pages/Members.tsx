import { useMemo, useState } from 'react'
import { Person } from '../components/Person'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useT } from '../i18n'
import { useConfig } from '../hooks/useProjects'
import {
  isHeadOfEngineering,
  isOrgOwner,
  membershipsFor,
} from '../services/configRepo'

type RoleKey = 'owner' | 'head-of-engineering' | 'mentor' | 'developer' | 'viewer'

const ROLE_META: Record<RoleKey, { label: string; color: string }> = {
  owner: { label: 'Owner', color: '#dc2626' },
  'head-of-engineering': { label: 'Head of Eng', color: '#7c3aed' },
  mentor: { label: 'Mentör', color: '#d97706' },
  developer: { label: 'Developer', color: '#64748b' },
  viewer: { label: 'Viewer', color: '#0891b2' },
}

const FILTERS: { value: '' | RoleKey; label: string }[] = [
  { value: '', label: 'Tüm roller' },
  { value: 'owner', label: 'Owner' },
  { value: 'head-of-engineering', label: 'Head of Eng' },
  { value: 'mentor', label: 'Mentör' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Viewer' },
]

interface MemberRow {
  login: string
  roles: RoleKey[]
  mentorCount: number
  devCount: number
  viewerCount: number
}

export function Members() {
  const t = useT()
  const { projects, people, privileged, loading, error, reload } = useConfig()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<'' | RoleKey>('')

  const rows = useMemo<MemberRow[]>(() => {
    const members = people?.members ?? []
    return members
      .map((login) => {
        const ms = membershipsFor(login, projects)
        const mentorCount = ms.filter((m) => m.role === 'mentor').length
        const devCount = ms.filter((m) => m.role === 'developer').length
        const viewerCount = ms.filter((m) => m.role === 'viewer').length
        const roles: RoleKey[] = []
        if (isOrgOwner(login, privileged)) roles.push('owner')
        if (isHeadOfEngineering(login, privileged)) roles.push('head-of-engineering')
        if (mentorCount) roles.push('mentor')
        if (devCount) roles.push('developer')
        if (viewerCount) roles.push('viewer')
        return { login, roles, mentorCount, devCount, viewerCount }
      })
      .sort((a, b) => a.login.localeCompare(b.login, 'tr'))
  }, [people, privileged, projects])

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr')
    return rows.filter((r) => {
      const matchesQuery = !needle || r.login.toLocaleLowerCase('tr').includes(needle)
      const matchesRole = !role || r.roles.includes(role)
      return matchesQuery && matchesRole
    })
  }, [rows, query, role])

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      <div className="page-header">
        <div>
          <h1>{t('members.title')}</h1>
          <p>
            {loading
              ? t('members.loading')
              : t('members.count', { n: rows.length })}
          </p>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder={t('members.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('members.searchAria')}
        />
        <select
          className="select"
          value={role}
          onChange={(event) => setRole(event.target.value as '' | RoleKey)}
          aria-label={t('members.filterAria')}
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.value ? t(`members.role.${f.value}`) : t('members.filterAll')}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading ? (
        <div className="stack">
          {[0, 1, 2].map((i) => (
            <div className="card card-pad" key={i}>
              <Skeleton height={22} width="40%" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🧑‍🤝‍🧑"
          title={rows.length === 0 ? t('members.emptyNoneTitle') : t('members.emptyMatchTitle')}
          description={
            rows.length === 0
              ? t('members.emptyNoneDesc')
              : t('members.emptyMatchDesc')
          }
        />
      ) : (
        <div className="stack" style={{ gap: 'var(--sp-2)' }}>
          {visible.map((r) => (
            <div className="card card-pad row-between" key={r.login}>
              <Person login={r.login} size={28} />
              <div className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                {r.roles.length === 0 ? (
                  <span className="subtle">{t('members.memberOnly')}</span>
                ) : (
                  r.roles.map((rk) => (
                    <span key={rk} className="badge">
                      <span
                        className="badge-dot"
                        style={{ background: ROLE_META[rk].color }}
                        aria-hidden="true"
                      />
                      {t(`members.role.${rk}`)}
                      {rk === 'mentor' && r.mentorCount > 1 ? ` ×${r.mentorCount}` : ''}
                      {rk === 'developer' && r.devCount > 1 ? ` ×${r.devCount}` : ''}
                      {rk === 'viewer' && r.viewerCount > 1 ? ` ×${r.viewerCount}` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
