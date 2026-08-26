import { Link, useParams } from 'react-router-dom'
import { LanguageBadge } from '../components/LanguageBadge'
import { EmptyState, Skeleton } from '../components/States'
import { useConfig } from '../hooks/useProjects'
import { membershipsFor } from '../services/configRepo'

export function MemberDetail() {
  const { login = '' } = useParams<{ login: string }>()
  const { projects, people, loading } = useConfig()

  const memberships = membershipsFor(login, projects)
  const person = people?.people?.[login]

  if (loading && projects.length === 0) {
    return (
      <div className="stack">
        <Skeleton height={28} width="30%" />
        <Skeleton height={14} width="50%" />
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div>
        <Link className="subtle" to="/">
          ← Projeler
        </Link>
      </div>

      <div className="row" style={{ gap: 'var(--sp-4)' }}>
        <img
          className="avatar"
          src={`https://github.com/${encodeURIComponent(login)}.png?size=160`}
          alt=""
          width={64}
          height={64}
        />
        <div className="stack" style={{ gap: 'var(--sp-1)' }}>
          <h1>{login}</h1>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {person ? (
              <>
                <span className="badge">org: {person.org_role}</span>
                {person.roles?.map((role) => (
                  <span key={role} className="badge badge-accent">
                    {role}
                  </span>
                ))}
              </>
            ) : (
              <span className="subtle">people.yml içinde kayıtlı değil</span>
            )}
            <a
              href={`https://github.com/${encodeURIComponent(login)}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              GitHub profili ↗
            </a>
          </div>
        </div>
      </div>

      <section className="card card-pad section">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>
          Projeler <span className="subtle">({memberships.length})</span>
        </h2>

        {memberships.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title="Bu kişi hiçbir projede görünmüyor"
            description="Konfigürasyondaki mentör ve developer listelerinde adı geçmiyor."
          />
        ) : (
          <div className="table-scroll">
            <table className="rule-table">
              <thead>
                <tr>
                  <th>Proje</th>
                  <th>Rol</th>
                  <th>Dil</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map(({ project, role }) => {
                  const config = projects.find((item) => item.name === project)?.config
                  return (
                    <tr key={`${project}-${role}`}>
                      <td>
                        <Link to={`/projeler/${project}`}>{project}</Link>
                      </td>
                      <td>
                        <span
                          className={role === 'mentor' ? 'badge badge-accent' : 'badge'}
                        >
                          {role === 'mentor' ? 'Mentör' : 'Developer'}
                        </span>
                      </td>
                      <td>{config && <LanguageBadge language={config.language} />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
