import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { ProjectCard } from '../components/ProjectCard'
import { EmptyState, ErrorState, SkeletonCards } from '../components/States'
import { UsernameField } from '../components/UsernameField'
import { useAuth, useClient } from '../hooks/useAuth'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import { isHeadOfEngineering, isOrgOwner, proposePeopleUpdate } from '../services/configRepo'
import { LANGUAGES } from '../types/config'

export function Projects() {
  const { projects, people, privileged, loading, error, reload } = useConfig()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [addingMember, setAddingMember] = useState(false)

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

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      <div className="row-between page-header">
        <div>
          <h1>Projeler</h1>
          <p>
            {loading
              ? 'Konfigürasyon okunuyor…'
              : `${projects.length} proje · konfigürasyondan okundu`}
          </p>
        </div>

        <div className="row">
          {canManageOrg && (
            <button
              type="button"
              className="btn"
              onClick={() => setAddingMember(true)}
            >
              + Üye Ekle
            </button>
          )}
          {canCreate && (
            <Link className="btn btn-primary" to="/projeler/yeni">
              + Yeni Proje
            </Link>
          )}
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Proje ara…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Proje ara"
        />
        <select
          className="select"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label="Dile göre filtrele"
        >
          <option value="">Tüm diller</option>
          {LANGUAGES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading ? (
        <SkeletonCards />
      ) : visible.length === 0 ? (
        <EmptyState
          title={projects.length === 0 ? 'Henüz proje yok' : 'Eşleşen proje yok'}
          description={
            projects.length === 0
              ? 'Konfigürasyon dizininde repo dosyası bulunamadı.'
              : 'Arama veya dil filtresini değiştirmeyi deneyin.'
          }
        />
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
  const client = useClient()
  const { busy, submit } = useProposal()
  const [login, setLogin] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    const target = login.trim()
    if (existing.some((l) => l.toLowerCase() === target.toLowerCase())) {
      return setError(`${target} zaten org üyesi.`)
    }
    if (!verified) {
      const user = await client.userExists(target)
      if (!user) return setError('Bu kullanıcı adı GitHub\'da bulunamadı.')
    }
    const result = await submit(
      () => proposePeopleUpdate({ client, add: target }),
      `${target} org üyeliğine eklendi`,
    )
    if (result) onClose()
  }

  return (
    <Modal
      title="Organizasyona üye ekle"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void confirm()}
            disabled={busy || !login.trim()}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            PR oluştur
          </button>
        </>
      }
    >
      <div className="stack">
        <UsernameField
          label="GitHub kullanıcı adı"
          value={login}
          onChange={(value) => {
            setLogin(value)
            setError(null)
          }}
          onVerified={setVerified}
          hint="people.yml üye listesine eklenir. Merge sonrası GitHub org daveti gönderilir. Bu adım yalnızca üyelik verir — repo erişimi ve yetki ayrıdır."
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
