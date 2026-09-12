import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LanguageBadge } from '../components/LanguageBadge'
import { ConfirmDialog } from '../components/Modal'
import { EmptyState, Skeleton } from '../components/States'
import { useT } from '../i18n'
import { useAuth, useClient } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
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
import { PATHS } from '../services/env'
import { assertCanRemoveMentor } from '../services/validation'
import { applyEdits, parsePeopleConfig, parseRepoConfig, serializePeopleConfig } from '../services/yaml'
import type { ProjectRole } from '../types/config'

const ROLE_LABEL: Record<ProjectRole, string> = {
  mentor: 'Mentor',
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
  const t = useT()
  const { login = '' } = useParams<{ login: string }>()
  const { projects, people, privileged, loading } = useConfig()
  const { user } = useAuth()
  const client = useClient()
  const { batchMode, add: addToCart } = useCart()
  const { busy, submit } = useProposal()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [roleEdit, setRoleEdit] = useState<{
    project: string
    from: ProjectRole
    to: ProjectRole | 'remove'
  } | null>(null)

  const memberships = membershipsFor(login, projects)
  const standing = orgStanding(login, people, privileged)

  // Before "fully remove from org": repos person belongs to + whether they are the
  // SOLE mentor (if so, removing leaves repo without mentors → engine rejects in plan).
  const affectedRepos = useMemo(() => {
    const key = login.toLowerCase()
    const inList = (arr?: string[]) => (arr ?? []).some((l) => l.toLowerCase() === key)
    return projects
      .filter((p) => inList(p.config.mentors) || inList(p.config.developers) || inList(p.config.viewers))
      .map((p) => {
        const roles: string[] = []
        const isMentor = inList(p.config.mentors)
        if (isMentor) roles.push('mentor')
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

  /** Batch mode: stages full org removal cascade into cart (one item per file). */
  function stageRemoveFromOrg() {
    const key = login.toLowerCase()
    const has = (arr?: string[]) => (arr ?? []).some((l) => l.toLowerCase() === key)
    const affected = projects.filter(
      (p) => has(p.config.mentors) || has(p.config.developers) || has(p.config.viewers),
    )
    for (const project of affected) {
      addToCart({
        file: project.path,
        summary: `${project.name}: −${login} (org removal)`,
        detail: `\`${login}\` → removed from \`${project.name}\` roles`,
        transform: (text) => {
          const cfg = parseRepoConfig(text)
          const drop = (arr?: string[]) => (arr ?? []).filter((l) => l.toLowerCase() !== key)
          const edits: Record<string, string[]> = {}
          if (has(cfg.mentors)) edits.mentors = drop(cfg.mentors)
          if (has(cfg.developers)) edits.developers = drop(cfg.developers)
          if (has(cfg.viewers)) edits.viewers = drop(cfg.viewers)
          return applyEdits(text, edits)
        },
      })
    }
    addToCart({
      file: PATHS.people,
      summary: `people.yml: −${login} (org membership)`,
      detail: `\`${login}\` removed from people.yml member list`,
      transform: (text) => {
        const { members } = parsePeopleConfig(text)
        return serializePeopleConfig(members.filter((l) => l.toLowerCase() !== key))
      },
    })
    setConfirmRemove(false)
  }

  async function removeFromOrg() {
    if (batchMode) return stageRemoveFromOrg()
    const result = await submit(
      () => proposeOrgRemoval({ client, login, projects }),
      `${login} removed from organization`,
    )
    if (result) setConfirmRemove(false)
  }

  /** Batch mode: stages role change into cart (single repo file). */
  function stageRoleChange() {
    if (!roleEdit) return
    const project = projects.find((p) => p.name === roleEdit.project)
    if (!project) return
    const { from, to } = roleEdit
    const key = login.toLowerCase()
    addToCart({
      file: project.path,
      summary:
        to === 'remove'
          ? `${project.name}: −${login} (${ROLE_LABEL[from]})`
          : `${project.name}: ${login} ${ROLE_LABEL[from]}→${ROLE_LABEL[to]}`,
      detail:
        to === 'remove'
          ? `\`${login}\` removed from **${ROLE_LABEL[from]}** role (${project.name})`
          : `\`${login}\` **${ROLE_LABEL[from]}** → **${ROLE_LABEL[to]}** (${project.name})`,
      transform: (text) => {
        const cfg = parseRepoConfig(text)
        const drop = (arr?: string[]) => (arr ?? []).filter((l) => l.toLowerCase() !== key)
        const edits: Record<string, string[]> = {}
        edits[LIST_KEY[from]] = drop(cfg[LIST_KEY[from]])
        if (to !== 'remove') edits[LIST_KEY[to]] = [...drop(cfg[LIST_KEY[to]]), login]
        return applyEdits(text, edits)
      },
    })
    setRoleEdit(null)
  }

  async function applyRoleChange() {
    if (!roleEdit) return
    if (batchMode) return stageRoleChange()
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
              ? `${login} removed from ${ROLE_LABEL[from]} list`
              : `${login}: ${ROLE_LABEL[from]} → ${ROLE_LABEL[to]}`,
          details: [
            to === 'remove'
              ? `\`${login}\` removed from **${ROLE_LABEL[from]}** role`
              : `\`${login}\` **${ROLE_LABEL[from]}** → **${ROLE_LABEL[to]}**`,
          ],
        }),
      `${login} role updated (${roleEdit.project})`,
    )
    if (result) setRoleEdit(null)
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div>
        <Link className="subtle" to="/">
          ← {t('memberDetail.projects')}
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
            {standing.owner && <span className="badge badge-warning">{t('memberDetail.orgOwner')}</span>}
            {standing.roles.map((role) => (
              <span key={role} className="badge badge-accent">
                {role}
              </span>
            ))}
            {standing.member ? (
              <span className="badge">{t('memberDetail.orgMember')}</span>
            ) : (
              <span className="subtle">{t('memberDetail.notInPeople')}</span>
            )}
            <a
              href={`https://github.com/${encodeURIComponent(login)}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              {t('memberDetail.githubProfile')} ↗
            </a>
          </div>
        </div>
      </div>

      {canManageOrg && standing.member && !standing.owner && (
        <section className="card card-pad section">
          <div className="row-between">
            <div className="stack" style={{ gap: 'var(--sp-1)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)' }}>{t('memberDetail.orgMembership')}</h2>
              <p className="subtle">
                {t('memberDetail.orgMembershipDesc1')}
                <strong>{t('memberDetail.fully')}</strong>
                {t('memberDetail.orgMembershipDesc2')}
                <code>people.yml</code>
                {t('memberDetail.orgMembershipDesc3')}
                {' '}
                <code>privileged.yml</code>
                {t('memberDetail.orgMembershipDesc4')}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
            >
              {t('memberDetail.removeOrgFullyBtn')}
            </button>
          </div>
        </section>
      )}

      <section className="card card-pad section">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>
          {t('memberDetail.projects')} <span className="subtle">({memberships.length})</span>
        </h2>

        {memberships.length === 0 ? (
          <EmptyState
            icon="🗂️"
            title={t('memberDetail.emptyProjectsTitle')}
            description={t('memberDetail.emptyProjectsDesc')}
          />
        ) : (
          <div className="table-scroll">
            <table className="rule-table">
              <thead>
                <tr>
                  <th>{t('memberDetail.colProject')}</th>
                  <th>{t('memberDetail.colRole')}</th>
                  <th>{t('memberDetail.colLanguage')}</th>
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
                            aria-label={t('memberDetail.roleInProject', { project })}
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
                            <option value="remove">{t('memberDetail.removeFromRepo')}</option>
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
          title={t('memberDetail.roleChangeTitle', { project: roleEdit.project })}
          message={
            <div className="stack" style={{ gap: 'var(--sp-2)' }}>
              <p style={{ margin: 0 }}>
                <strong>{login}</strong>, <code>{roleEdit.project}</code>
                {t('memberDetail.roleChangeRepoMid')}
                {roleEdit.to === 'remove' ? (
                  <>
                    <strong>{ROLE_LABEL[roleEdit.from]}</strong>
                    {t('memberDetail.roleChangeRemoveSuffix')}
                  </>
                ) : (
                  <>
                    <strong>{ROLE_LABEL[roleEdit.from]}</strong> →{' '}
                    <strong>{ROLE_LABEL[roleEdit.to]}</strong>
                  </>
                )}
                {t('memberDetail.roleChangePrNote')}
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
                      ⚠️ {t('memberDetail.soleMentorWarnPre', { login })}
                      <strong>{t('memberDetail.planRejected')}</strong>
                      {t('memberDetail.soleMentorWarnPost')}
                    </p>
                  </div>
                ) : null
              })()}
            </div>
          }
          confirmLabel={batchMode ? t('memberDetail.addToCart') : t('memberDetail.roleChangeConfirm')}
          danger={roleEdit.to === 'remove'}
          busy={busy}
          onConfirm={() => void applyRoleChange()}
          onCancel={() => setRoleEdit(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title={t('memberDetail.removeOrgTitle', { login })}
          message={
            <div className="stack" style={{ gap: 'var(--sp-3)' }}>
              <p style={{ margin: 0 }}>
                <strong>{login}</strong>{t('memberDetail.removeOrgDesc1')}
                <strong>{t('memberDetail.fully')}</strong>
                {t('memberDetail.removeOrgDesc2')}
                <code>people.yml</code>
                {t('memberDetail.removeOrgDesc3')}{' '}
                <span className="subtle">
                  {t('memberDetail.removeOrgReversible')}
                </span>
              </p>

              {affectedRepos.length > 0 ? (
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <span className="meta-label">{t('memberDetail.reposToRemove')}</span>
                  <ul className="subtle" style={{ margin: 0, paddingLeft: '1.2em' }}>
                    {affectedRepos.map((r) => (
                      <li key={r.name}>
                        <code>{r.name}</code> — {r.roles.join(', ')}
                        {r.soleMentor && ` ⚠️ ${t('memberDetail.soleMentorTag')}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="subtle" style={{ margin: 0 }}>
                  {t('memberDetail.noRoleAnyRepo')}
                </p>
              )}

              {soleMentorRepos.length > 0 && (
                <div
                  className="card card-pad"
                  style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
                >
                  <div className="meta-label" style={{ color: 'var(--danger)' }}>
                    {t('memberDetail.soleMentorCount', { n: soleMentorRepos.length })}
                  </div>
                  <p className="subtle" style={{ margin: '4px 0 0' }}>
                    {soleMentorRepos.map((r) => r.name).join(', ')}
                    {t('memberDetail.soleMentorReposMid')}
                    <strong>{t('memberDetail.planRejected')}</strong>
                    {t('memberDetail.soleMentorReposPost')}
                  </p>
                </div>
              )}
            </div>
          }
          confirmLabel={batchMode ? t('memberDetail.addToCart') : t('memberDetail.removeOrgConfirm')}
          danger
          busy={busy}
          onConfirm={() => void removeFromOrg()}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}
