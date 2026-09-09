import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LanguageBadge } from '../components/LanguageBadge'
import { ConfirmDialog } from '../components/Modal'
import { EmptyState, Skeleton } from '../components/States'
import { useAuth, useClient } from '../hooks/useAuth'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import {
  canManageProject,
  isHeadOfEngineering,
  isOrgOwner,
  membershipsFor,
  orgStanding,
  proposeOrgRemoval,
  proposeRepoConfigUpdate,
} from '../services/configRepo'
import { assertCanRemoveMentor } from '../services/validation'
import type { ProjectRole } from '../types/config'

const ROLE_LABEL: Record<ProjectRole, string> = {
  mentor: 'Mentör',
  developer: 'Developer',
  viewer: 'Viewer',
}
const LIST_KEY: Record<ProjectRole, 'mentors' | 'developers' | 'viewers'> = {
  mentor: 'mentors',
  developer: 'developers',
  viewer: 'viewers',
}
const ROLE_ORDER: ProjectRole[] = ['mentor', 'developer', 'viewer']

export function MemberDetail() {
  const { login = '' } = useParams<{ login: string }>()
  const { projects, people, privileged, loading } = useConfig()
  const { user } = useAuth()
  const client = useClient()
  const { busy, submit } = useProposal()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [roleEdit, setRoleEdit] = useState<{
    project: string
    from: ProjectRole
    to: ProjectRole | 'remove'
  } | null>(null)

  const memberships = membershipsFor(login, projects)
  const standing = orgStanding(login, people, privileged)

  // "Org'dan tamamen çıkar" öncesi: kişinin bulunduğu repolar + o reponun TEK
  // mentörü mü (öyleyse çıkarınca repo mentörsüz kalır → engine plan'da reddeder).
  const affectedRepos = useMemo(() => {
    const key = login.toLowerCase()
    const inList = (arr?: string[]) => (arr ?? []).some((l) => l.toLowerCase() === key)
    return projects
      .filter((p) => inList(p.config.mentors) || inList(p.config.developers) || inList(p.config.viewers))
      .map((p) => {
        const roles: string[] = []
        const isMentor = inList(p.config.mentors)
        if (isMentor) roles.push('mentör')
        if (inList(p.config.developers)) roles.push('developer')
        if (inList(p.config.viewers)) roles.push('viewer')
        return { name: p.name, roles, soleMentor: isMentor && (p.config.mentors ?? []).length === 1 }
      })
  }, [projects, login])

  const soleMentorRepos = affectedRepos.filter((r) => r.soleMentor)

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
      () => proposeOrgRemoval({ client, login, projects }),
      `${login} organizasyondan çıkarıldı`,
    )
    if (result) setConfirmRemove(false)
  }

  async function applyRoleChange() {
    if (!roleEdit) return
    const project = projects.find((p) => p.name === roleEdit.project)
    if (!project) return
    const { from, to } = roleEdit
    const key = login.toLowerCase()
    const drop = (arr?: string[]) => (arr ?? []).filter((l) => l.toLowerCase() !== key)

    const result = await submit(
      () =>
        proposeRepoConfigUpdate({
          client,
          project,
          edits: (cfg) => {
            const changes: Record<string, string[]> = {}
            changes[LIST_KEY[from]] = drop(cfg[LIST_KEY[from]])
            if (to !== 'remove') changes[LIST_KEY[to]] = [...drop(cfg[LIST_KEY[to]]), login]
            return changes
          },
          summary:
            to === 'remove'
              ? `${login} ${ROLE_LABEL[from]} listesinden çıkarıldı`
              : `${login}: ${ROLE_LABEL[from]} → ${ROLE_LABEL[to]}`,
          details: [
            to === 'remove'
              ? `\`${login}\` **${ROLE_LABEL[from]}** rolünden çıkarıldı`
              : `\`${login}\` **${ROLE_LABEL[from]}** → **${ROLE_LABEL[to]}**`,
          ],
        }),
      `${login} rolü güncellendi (${roleEdit.project})`,
    )
    if (result) setRoleEdit(null)
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
                Kişiyi organizasyondan <strong>tamamen</strong> çıkarır: önce bulunduğu tüm
                repo rollerinden, sonra <code>people.yml</code> üyeliğinden — tek PR'da. Owner /
                head-of-engineering yetkisi buradan değiştirilemez ({' '}
                <code>privileged.yml</code> içindedir).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
            >
              Org'dan tamamen çıkar
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
            description="Konfigürasyondaki mentör, developer veya viewer listelerinde adı geçmiyor."
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
                  const proj = projects.find((item) => item.name === project)
                  const config = proj?.config
                  const editable =
                    proj != null &&
                    !config?.archived &&
                    canManageProject(user?.login ?? '', proj, privileged)
                  return (
                    <tr key={`${project}-${role}`}>
                      <td>
                        <Link to={`/projeler/${project}`}>{project}</Link>
                      </td>
                      <td>
                        {editable ? (
                          <select
                            className="select"
                            value={role}
                            disabled={busy}
                            aria-label={`${project} içindeki rol`}
                            onChange={(event) => {
                              const to = event.target.value as ProjectRole | 'remove'
                              if (to !== role) setRoleEdit({ project, from: role, to })
                            }}
                          >
                            {ROLE_ORDER.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                            <option value="remove">Repodan çıkar</option>
                          </select>
                        ) : (
                          <span className={role === 'mentor' ? 'badge badge-accent' : 'badge'}>
                            {ROLE_LABEL[role]}
                          </span>
                        )}
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

      {roleEdit && (
        <ConfirmDialog
          title={`${roleEdit.project} — rol değişikliği`}
          message={
            <div className="stack" style={{ gap: 'var(--sp-2)' }}>
              <p style={{ margin: 0 }}>
                <strong>{login}</strong>, <code>{roleEdit.project}</code> reposunda{' '}
                {roleEdit.to === 'remove' ? (
                  <>
                    <strong>{ROLE_LABEL[roleEdit.from]}</strong> rolünden çıkarılacak (repodan
                    tamamen)
                  </>
                ) : (
                  <>
                    <strong>{ROLE_LABEL[roleEdit.from]}</strong> →{' '}
                    <strong>{ROLE_LABEL[roleEdit.to]}</strong>
                  </>
                )}
                . Bir PR açar; merge edilene kadar GitHub'da değişmez.
              </p>

              {(() => {
                const cfg = projects.find((p) => p.name === roleEdit.project)?.config
                const orphans =
                  roleEdit.from === 'mentor' &&
                  roleEdit.to !== 'mentor' &&
                  cfg != null &&
                  Boolean(assertCanRemoveMentor(cfg, login))
                return orphans ? (
                  <div
                    className="card card-pad"
                    style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
                  >
                    <p className="subtle" style={{ margin: 0 }}>
                      ⚠️ {login} bu repo'nun tek mentörü — bu değişiklik repo'yu mentörsüz bırakır
                      ve <strong>plan aşamasında reddedilir</strong>. Önce başka bir mentör ata.
                    </p>
                  </div>
                ) : null
              })()}
            </div>
          }
          confirmLabel="Değiştir ve PR aç"
          danger={roleEdit.to === 'remove'}
          busy={busy}
          onConfirm={() => void applyRoleChange()}
          onCancel={() => setRoleEdit(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title={`${login} organizasyondan çıkarılsın mı?`}
          message={
            <div className="stack" style={{ gap: 'var(--sp-3)' }}>
              <p style={{ margin: 0 }}>
                <strong>{login}</strong> organizasyondan <strong>tamamen</strong> çıkarılacak:
                önce bulunduğu tüm repo rollerinden, sonra <code>people.yml</code> üyeliğinden —
                hepsi tek PR'da. Merge edilene kadar GitHub'da hiçbir şey değişmez; merge sonrası
                kişi org üyesi olmaktan çıkar ve erişimi kalmaz.{' '}
                <span className="subtle">
                  (Geri alınabilir: tekrar üye olarak eklersen yeni bir davet gider.)
                </span>
              </p>

              {affectedRepos.length > 0 ? (
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <span className="meta-label">Çıkarılacağı repolar</span>
                  <ul className="subtle" style={{ margin: 0, paddingLeft: '1.2em' }}>
                    {affectedRepos.map((r) => (
                      <li key={r.name}>
                        <code>{r.name}</code> — {r.roles.join(', ')}
                        {r.soleMentor && ' ⚠️ tek mentör'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="subtle" style={{ margin: 0 }}>
                  Hiçbir repoda rolü yok; yalnızca üyelikten çıkarılacak.
                </p>
              )}

              {soleMentorRepos.length > 0 && (
                <div
                  className="card card-pad"
                  style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
                >
                  <div className="meta-label" style={{ color: 'var(--danger)' }}>
                    ⚠️ Bu kişi {soleMentorRepos.length} repo'nun TEK mentörü
                  </div>
                  <p className="subtle" style={{ margin: '4px 0 0' }}>
                    {soleMentorRepos.map((r) => r.name).join(', ')} mentörsüz kalır. Engine bir
                    repo'yu mentörsüz kabul etmez → bu PR <strong>plan aşamasında reddedilir</strong>.
                    Önce bu repolara başka bir mentör atayın, sonra çıkarın.
                  </p>
                </div>
              )}
            </div>
          }
          confirmLabel="Org'dan çıkar ve PR aç"
          danger
          busy={busy}
          onConfirm={() => void removeFromOrg()}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}
