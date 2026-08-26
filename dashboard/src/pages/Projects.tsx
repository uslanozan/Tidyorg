import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { EmptyState, ErrorState, SkeletonCards } from '../components/States'
import { useAuth } from '../hooks/useAuth'
import { useConfig } from '../hooks/useProjects'
import { isHeadOfEngineering } from '../services/configRepo'
import { LANGUAGES } from '../types/config'

export function Projects() {
  const { projects, people, loading, error, reload } = useConfig()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')

  const canCreate = isHeadOfEngineering(user?.login ?? '', people)

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

        {canCreate && (
          <Link className="btn btn-primary" to="/projeler/yeni">
            + Yeni Proje
          </Link>
        )}
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
    </div>
  )
}
