import { Link } from 'react-router-dom'
import { LanguageBadge } from './LanguageBadge'
import type { Project } from '../types/config'

export function ProjectCard({ project }: { project: Project }) {
  const { config } = project
  const mentors = config.mentors?.length ?? 0
  const developers = config.developers?.length ?? 0

  return (
    <Link className="card card-pad card-link stack" to={`/projeler/${project.name}`}>
      <div className="row-between" style={{ gap: 'var(--sp-2)' }}>
        <h3 style={{ overflowWrap: 'anywhere' }}>{project.name}</h3>
        {config.archived && <span className="badge badge-warning">Arşivli</span>}
      </div>

      <p className="muted" style={{ fontSize: 'var(--text-sm)', minHeight: '2.6em' }}>
        {project.parseError
          ? 'Bu dosya okunamadı — YAML bozuk olabilir.'
          : config.description || 'Açıklama yok'}
      </p>

      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {!project.parseError && <LanguageBadge language={config.language} />}
        <span className="badge">
          {mentors} mentör · {developers} developer
        </span>
        {config.visibility === 'private' && <span className="badge">Private</span>}
      </div>
    </Link>
  )
}
