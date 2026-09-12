import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { languageLabel } from '../components/LanguageBadge'
import { Person } from '../components/Person'
import { ProjectCard } from '../components/ProjectCard'
import { EmptyState, ErrorState, SkeletonCards } from '../components/States'
import { UsernameField } from '../components/UsernameField'
import { useAuth, useClient } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import { useT } from '../i18n'
import { CONFIG_OWNER, PATHS } from '../services/env'
import { isHeadOfEngineering, isOrgOwner, proposePeopleUpdate } from '../services/configRepo'
import { parsePeopleConfig, serializePeopleConfig } from '../services/yaml'
import { LANGUAGES, type Project } from '../types/config'
import type { GitHubOrg, GitHubUser } from '../types/github'

/** Convert bare domain into a clickable URL. */
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function Projects() {
  const t = useT()
  const { projects, people, privileged, loading, error, reload } = useConfig()
  const { user } = useAuth()
  const client = useClient()
  const [orgInfo, setOrgInfo] = useState<GitHubOrg | null>(null)
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [groupBy, setGroupBy] = useState<'' | 'mentor' | 'archived'>('')
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => {
    let cancelled = false
    void client
      .request<GitHubOrg>(`/orgs/${encodeURIComponent(CONFIG_OWNER)}`)
      .then((o) => {
        if (!cancelled) setOrgInfo(o)
      })
      .catch(() => {
        /* banner stays hidden if org info cannot be fetched */
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const login = user?.login ?? ''
  const canCreate = isHeadOfEngineering(login, privileged)
  const canManageOrg = canCreate || isOrgOwner(login, privileged)

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr')
    return projects.filter((project) => {
      const matchesQuery =
        !needle ||
        project.name.toLocaleLowerCase('tr').includes(needle) ||
        (project.config.description ?? '').toLocaleLowerCase('tr').includes(needle)
      const matchesLanguage = !language || project.config.language === language
      return matchesQuery && matchesLanguage
    })
  }, [projects, query, language])

  // Grouping. Mentor: if a project has multiple mentors it appears under each.
  // Archived: split into Active / Archived (empty groups hidden).
  const grouped = useMemo<[string, Project[]][] | null>(() => {
    if (groupBy === 'mentor') {
      const map = new Map<string, Project[]>()
      for (const project of visible) {
        const mentors = project.config.mentors ?? []
        const keys = mentors.length ? mentors : ['—']
        for (const key of keys) {
          const arr = map.get(key) ?? []
          arr.push(project)
          map.set(key, arr)
        }
      }
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'tr'))
    }

    if (groupBy === 'archived') {
      const active: Project[] = []
      const archived: Project[] = []
      for (const project of visible) {
        ;(project.config.archived ? archived : active).push(project)
      }
      return (
        [
          [t('projects.active'), active],
          [t('projects.archived'), archived],
        ] as [string, Project[]][]
      ).filter(([, items]) => items.length > 0)
    }

    return null
  }, [visible, groupBy])

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      {orgInfo && (
        <div
          className="card card-pad row"
          style={{ gap: 'var(--sp-4)', alignItems: 'center' }}
        >
          <img
            src={orgInfo.avatar_url}
            alt=""
            width={52}
            height={52}
            style={{ borderRadius: 10, flexShrink: 0 }}
          />
          <div className="stack" style={{ gap: 2 }}>
            <div
              className="row"
              style={{ gap: 'var(--sp-2)', alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              <strong style={{ fontSize: 'var(--text-lg)' }}>
                {orgInfo.name ?? orgInfo.login}
              </strong>
              <a className="subtle" href={orgInfo.html_url} target="_blank" rel="noreferrer">
                @{orgInfo.login}
              </a>
            </div>
            {orgInfo.description && <span className="subtle">{orgInfo.description}</span>}
            {orgInfo.blog && (
              <a
                href={normalizeUrl(orgInfo.blog)}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 'var(--text-sm)' }}
              >
                {orgInfo.blog} ↗
              </a>
            )}
          </div>
        </div>
      )}

      <div className="row-between page-header">
        <div>
          <h1>{t('projects.title')}</h1>
          <p>
            {loading
              ? t('projects.loading')
              : t('projects.count', { n: projects.length })}
          </p>
        </div>

        <div className="row">
          {canManageOrg && (
            <button
              type="button"
              className="btn"
              onClick={() => setAddingMember(true)}
            >
              {t('projects.addMember')}
            </button>
          )}
          {canCreate && (
            <Link className="btn btn-primary" to="/projeler/yeni">
              {t('projects.newProject')}
            </Link>
          )}
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder={t('projects.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('projects.searchAria')}
        />
        <select
          className="select"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label={t('projects.filterByLanguageAria')}
        >
          <option value="">{t('projects.allLanguages')}</option>
          {LANGUAGES.map((item) => (
            <option key={item} value={item}>
              {languageLabel(item)}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as '' | 'mentor' | 'archived')}
          aria-label={t('projects.groupAria')}
        >
          <option value="">{t('projects.groupNone')}</option>
          <option value="mentor">{t('projects.groupByMentor')}</option>
          <option value="archived">{t('projects.groupByArchived')}</option>
        </select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading ? (
        <SkeletonCards />
      ) : visible.length === 0 ? (
        <EmptyState
          title={projects.length === 0 ? t('projects.emptyTitle') : t('projects.noMatchTitle')}
          description={
            projects.length === 0
              ? t('projects.emptyDescription')
              : t('projects.noMatchDescription')
          }
        />
      ) : grouped ? (
        <div className="stack" style={{ gap: 'var(--sp-6)' }}>
          {grouped.map(([key, items]) => (
            <section key={key} className="stack" style={{ gap: 'var(--sp-3)' }}>
              <div className="row" style={{ gap: 'var(--sp-2)', alignItems: 'center' }}>
                {groupBy === 'mentor' ? (
                  key === '—' ? (
                    <h2 style={{ fontSize: 'var(--text-lg)' }}>{t('projects.noMentor')}</h2>
                  ) : (
                    <Person login={key} size={26} />
                  )
                ) : (
                  <h2 style={{ fontSize: 'var(--text-lg)' }}>{key}</h2>
                )}
                <span className="subtle">({items.length})</span>
              </div>
              <div className="grid-cards">
                {items.map((project) => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid-cards">
          {visible.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}

      {addingMember && (
        <AddMemberDialog
          existing={people?.members ?? []}
          onClose={() => setAddingMember(false)}
        />
      )}
    </div>
  )
}

function AddMemberDialog({
  existing,
  onClose,
}: {
  existing: string[]
  onClose: () => void
}) {
  const t = useT()
  const client = useClient()
  const { batchMode, add: addToCart } = useCart()
  const { busy, submit } = useProposal()
  const [login, setLogin] = useState('')
  const [verified, setVerified] = useState(false)
  const [preview, setPreview] = useState<GitHubUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const target = login.trim()
    if (existing.some((l) => l.toLowerCase() === target.toLowerCase())) {
      return setError(t('projects.alreadyMember', { name: target }))
    }
    if (!verified) {
      const user = await client.userExists(target)
      if (!user) return setError(t('projects.userNotFound'))
    }
    if (batchMode) {
      addToCart({
        file: PATHS.people,
        summary: `people.yml: +${target} (org membership)`,
        detail: `\`${target}\` added to org membership`,
        transform: (text) => {
          const { members } = parsePeopleConfig(text)
          if (members.some((l) => l.toLowerCase() === target.toLowerCase())) return text
          return serializePeopleConfig([...members, target])
        },
      })
      return onClose()
    }
    const result = await submit(
      () => proposePeopleUpdate({ client, add: target }),
      t('projects.memberAddedToast', { name: target }),
    )
    if (result) onClose()
  }

  return (
    <Modal
      title={t('projects.addMemberTitle')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('projects.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void confirm()}
            disabled={busy || !login.trim()}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            {batchMode ? t('projects.addToCart') : t('projects.createPr')}
          </button>
        </>
      }
    >
      <div className="stack">
        <UsernameField
          label={t('projects.usernameLabel')}
          value={login}
          onChange={(value) => {
            setLogin(value)
            setError(null)
          }}
          onVerified={setVerified}
          onResolved={setPreview}
          hint={t('projects.addMemberHint')}
        />

        {preview && (
          <a
            className="card card-pad row"
            href={preview.html_url}
            target="_blank"
            rel="noreferrer"
            style={{ gap: 'var(--sp-3)', alignItems: 'center', textDecoration: 'none' }}
          >
            <img
              src={preview.avatar_url}
              alt=""
              width={44}
              height={44}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
            <div className="stack" style={{ gap: 2 }}>
              <strong>{preview.name ?? preview.login}</strong>
              <span className="subtle">@{preview.login} · {t('projects.openInGitHub')} ↗</span>
            </div>
          </a>
        )}

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
