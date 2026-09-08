import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LanguageBadge } from '../components/LanguageBadge'
import { ConfirmDialog } from '../components/Modal'
import { EmptyState, Skeleton } from '../components/States'
import { useAuth, useClient } from '../hooks/useAuth'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import {
  isHeadOfEngineering,
  isOrgOwner,
  membershipsFor,
  orgStanding,
  proposePeopleUpdate,
} from '../services/configRepo'

export function MemberDetail() {
  const { login = '' } = useParams<{ login: string }>()
  const { projects, people, privileged, loading } = useConfig()
  const { user } = useAuth()
  const client = useClient()
  const { busy, submit } = useProposal()
  const [confirmRemove, setConfirmRemove] = useState(false)

  const memberships = membershipsFor(login, projects)
  const standing = orgStanding(login, people, privileged)

  const canManageOrg =
    isHeadOfEngineering(user?.login ?? '', privileged) ||
    isOrgOwner(user?.login ?? '', privileged)

  if (loading && projects.length === 0) {
    return (
      <div className="stack">
        <Skeleton height={28} width="30%" />
        <Skeleton height={14} width="50%" />
      </div>
    )
  }

  async function removeFromOrg() {
    const result = await submit(
      () => proposePeopleUpdate({ client, remove: login }),
      `${login} org üyeliğinden çıkarıldı`,
    )
    if (result) setConfirmRemove(false)
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
            {standing.owner && <span className="badge badge-warning">org owner</span>}
            {standing.roles.map((role) => (
              <span key={role} className="badge badge-accent">
                {role}
              </span>
            ))}
            {standing.member ? (
              <span className="badge">org üyesi</span>
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

      {canManageOrg && standing.member && !standing.owner && (
        <section className="card card-pad section">
          <div className="row-between">
            <div className="stack" style={{ gap: 'var(--sp-1)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Organizasyon üyeliği</h2>
              <p className="subtle">
                Çıkarmak kişiyi org'dan atmaz; rolü <code>member</code>a düşer. Yetki
                (owner / head-of-engineering) buradan değiştirilemez — o{' '}
                <code>privileged.yml</code> içindedir.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
            >
              Org üyeliğinden çıkar
            </button>
          </div>
        </section>
      )}

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

      {confirmRemove && (
        <ConfirmDialog
          title={`${login} org üyeliğinden çıkarılsın mı?`}
          message={
            <>
              <strong>{login}</strong> <code>people.yml</code> üye listesinden çıkarılacak.
              Bu bir PR açar; merge edilene kadar GitHub'da hiçbir şey değişmez. Kişinin
              repo erişimleri ayrıca ilgili <code>repositories/*.yml</code> dosyalarından
              kaldırılmalıdır.
            </>
          }
          confirmLabel="Çıkar ve PR aç"
          danger
          busy={busy}
          onConfirm={() => void removeFromOrg()}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}
