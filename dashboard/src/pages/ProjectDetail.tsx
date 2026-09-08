import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LanguageBadge } from '../components/LanguageBadge'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Person } from '../components/Person'
import { RepoSettingsDialog } from '../components/RepoSettingsDialog'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { UsernameField } from '../components/UsernameField'
import { useAuth, useClient } from '../hooks/useAuth'
import { useConfig, useProject } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import {
  canManageProject,
  effectiveBranchRules,
  proposeRepoConfigUpdate,
} from '../services/configRepo'
import { configFileUrl, repoUrl } from '../services/env'
import { assertCanAddMember, assertCanRemoveMentor } from '../services/validation'
import type { ProjectRole } from '../types/config'

const ROLE_LABEL: Record<ProjectRole, string> = {
  mentor: 'Mentör',
  developer: 'Developer',
}

type MemberList = 'mentors' | 'developers'

const listKey = (role: ProjectRole): MemberList =>
  role === 'mentor' ? 'mentors' : 'developers'

export function ProjectDetail() {
  const { name } = useParams<{ name: string }>()
  const { project, loading, error } = useProject(name)
  const { org, privileged, people: peopleConfig, reload } = useConfig()
  const { user } = useAuth()
  const client = useClient()
  const { busy, submit } = useProposal()

  const [addRole, setAddRole] = useState<ProjectRole | null>(null)
  const [newLogin, setNewLogin] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ login: string; role: ProjectRole } | null>(
    null,
  )
  const [editing, setEditing] = useState(false)

  if (loading && !project) {
    return (
      <div className="stack">
        <Skeleton height={30} width="35%" />
        <Skeleton height={14} width="60%" />
        <div className="card card-pad stack" style={{ marginTop: 'var(--sp-4)' }}>
          <Skeleton height={14} />
          <Skeleton height={14} width="70%" />
        </div>
      </div>
    )
  }

  if (error && !project) return <ErrorState error={error} onRetry={() => void reload()} />

  if (!project) {
    return (
      <EmptyState
        icon="🔍"
        title="Proje bulunamadı"
        description={`"${name}" adında bir konfigürasyon dosyası yok.`}
        action={
          <Link className="btn" to="/">
            Projelere dön
          </Link>
        }
      />
    )
  }

  const { config } = project
  const rules = effectiveBranchRules(config, org)
  // Yazma butonları yalnızca yetkiliye görünür (UI ipucu; asıl kapı GitHub).
  const canManage = canManageProject(user?.login ?? '', project, privileged)

  function closeAdd() {
    setAddRole(null)
    setNewLogin('')
    setAddError(null)
  }

  async function confirmAdd() {
    if (!project || !addRole) return

    const login = newLogin.trim()
    const key = listKey(addRole)
    const current = project.config[key] ?? []

    const blocked = assertCanAddMember(project.config)
    if (blocked) return setAddError(blocked)

    if (current.some((item) => item.toLowerCase() === login.toLowerCase())) {
      return setAddError(`${login} zaten ${ROLE_LABEL[addRole].toLowerCase()} listesinde.`)
    }

    // Repo'ya eklenen kişi mutlaka org üyesi olmalı — engine bunu zaten zorunlu
    // kılıyor (repo_people_missing_from_people), UI'da baştan engelliyoruz.
    const isMember = (peopleConfig?.members ?? []).some(
      (m) => m.toLowerCase() === login.toLowerCase(),
    )
    if (!isMember) {
      return setAddError('Org üyesi değil. Önce "Üye Ekle" ile organizasyona ekleyin.')
    }

    const result = await submit(
      () =>
        proposeRepoConfigUpdate({
          client,
          project,
          edits: (cfg) => ({ [key]: [...(cfg[key] ?? []), login] }),
          summary: `${login} ${addRole} olarak eklendi`,
          details: [`\`${login}\` → **${ROLE_LABEL[addRole]}**`],
        }),
      `${login} → ${ROLE_LABEL[addRole]} (${project.name})`,
    )

    if (result) closeAdd()
  }

  async function confirmRemove() {
    if (!project || !removeTarget) return
    const { login, role } = removeTarget
    const key = listKey(role)

    const result = await submit(
      () =>
        proposeRepoConfigUpdate({
          client,
          project,
          edits: (cfg) => ({
            [key]: (cfg[key] ?? []).filter(
              (item) => item.toLowerCase() !== login.toLowerCase(),
            ),
          }),
          summary: `${login} ${role} listesinden çıkarıldı`,
          details: [`\`${login}\` → **${ROLE_LABEL[role]}** listesinden çıkarıldı`],
        }),
      `${login} çıkarıldı (${project.name})`,
    )

    if (result) setRemoveTarget(null)
  }

  const memberSection = (role: ProjectRole) => {
    const people = config[listKey(role)] ?? []
    const removalBlocked = (login: string) =>
      role === 'mentor' ? assertCanRemoveMentor(config, login) : null

    return (
      <section className="card card-pad section">
        <div className="row-between">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>
            {ROLE_LABEL[role]}ler{' '}
            <span className="subtle">({people.length})</span>
          </h2>
          {canManage && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAddRole(role)}
              disabled={config.archived}
              title={config.archived ? 'Arşivlenmiş repo düzenlenemez' : undefined}
            >
              + {ROLE_LABEL[role]} Ekle
            </button>
          )}
        </div>

        {people.length === 0 ? (
          <p className="subtle">Henüz kimse yok.</p>
        ) : (
          <div className="person-list">
            {people.map((login) => (
              <span key={login} className="row" style={{ gap: 'var(--sp-1)' }}>
                <Person login={login} />
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={`${login} kişisini çıkar`}
                    title={removalBlocked(login) ?? `${login} kişisini çıkar`}
                    disabled={Boolean(removalBlocked(login)) || config.archived}
                    onClick={() => setRemoveTarget({ login, role })}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div>
        <Link className="subtle" to="/">
          ← Projeler
        </Link>
      </div>

      <div className="row-between">
        <div className="stack" style={{ gap: 'var(--sp-2)' }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <h1>{project.name}</h1>
            <LanguageBadge language={config.language} />
            {config.archived && <span className="badge badge-warning">Arşivli</span>}
            {!canManage && (
              <span className="badge" title="Bu projeyi düzenlemek için mentör veya owner olmalısın">
                Salt okunur
              </span>
            )}
          </div>
          <p className="muted">{config.description || 'Açıklama yok'}</p>
        </div>

        <div className="row">
          {canManage && (
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
              Bilgileri düzenle
            </button>
          )}
          <a
            className="btn btn-sm"
            href={repoUrl(project.name)}
            target="_blank"
            rel="noreferrer"
          >
            GitHub'da aç ↗
          </a>
        </div>
      </div>

      <section className="card card-pad">
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Dil</span>
            <span className="meta-value">{config.language}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Görünürlük</span>
            <span className="meta-value">
              {config.visibility ?? `${org?.defaults.visibility ?? '—'} (varsayılan)`}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Varsayılan dal</span>
            <span className="meta-value">
              {config.default_branch ?? `${org?.defaults.default_branch ?? '—'} (varsayılan)`}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Config dosyası</span>
            <a
              className="meta-value"
              href={configFileUrl(project.path)}
              target="_blank"
              rel="noreferrer"
            >
              {project.name}.yml ↗
            </a>
          </div>
        </div>
      </section>

      {memberSection('mentor')}
      {memberSection('developer')}

      <section className="card card-pad section">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Dal koruması</h2>
        <p className="subtle">
          Repo dosyasında yazmayan alanlar organizasyon varsayılanından gelir.
        </p>

        <div className="table-scroll">
          <table className="rule-table">
            <thead>
              <tr>
                <th>Dal</th>
                <th>Onay</th>
                <th>CODEOWNERS</th>
                <th>Status check</th>
                <th>Force push</th>
                <th>Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rules).map(([branch, rule]) =>
                rule.removed ? (
                  // `branch: null` — repo dosyası varsayılan korumayı kaldırmış.
                  <tr key={branch}>
                    <td>
                      <code>{branch}</code>
                    </td>
                    <td colSpan={4} className="muted">
                      Koruma kaldırılmış (config'de <code>null</code>)
                    </td>
                    <td>
                      <span className="badge badge-warning">Repo</span>
                    </td>
                  </tr>
                ) : (
                  <tr key={branch}>
                    <td>
                      <code>{branch}</code>
                    </td>
                    <td>{rule.required_reviews ?? '—'}</td>
                    <td>{rule.require_code_owner_review ? 'Zorunlu' : 'Hayır'}</td>
                    <td>
                      {rule.require_status_checks?.length
                        ? rule.require_status_checks.join(', ')
                        : '—'}
                    </td>
                    <td>{rule.allow_force_push ? 'Açık' : 'Kapalı'}</td>
                    <td>
                      <span className={rule.overridden ? 'badge badge-accent' : 'badge'}>
                        {rule.overridden ? 'Repo' : 'Varsayılan'}
                      </span>
                    </td>
                  </tr>
                ),
              )}
              {Object.keys(rules).length === 0 && (
                <tr>
                  <td colSpan={6} className="subtle">
                    Tanımlı dal koruması yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {addRole && (
        <Modal
          title={`${ROLE_LABEL[addRole]} Ekle — ${project.name}`}
          onClose={closeAdd}
          footer={
            <>
              <button type="button" className="btn" onClick={closeAdd} disabled={busy}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmAdd()}
                disabled={busy || !newLogin.trim()}
              >
                {busy && <span className="spinner" aria-hidden="true" />}
                PR oluştur
              </button>
            </>
          }
        >
          <div className="stack">
            <UsernameField
              label="Org üyesi"
              value={newLogin}
              onChange={setNewLogin}
              members={peopleConfig?.members ?? []}
              hint="Yalnızca mevcut org üyeleri. PR merge edilince repo'da yetkilenir."
            />
            {addError && (
              <p className="field-error" role="alert">
                {addError}
              </p>
            )}
          </div>
        </Modal>
      )}

      {removeTarget && (
        <ConfirmDialog
          title={`${removeTarget.login} çıkarılsın mı?`}
          message={
            <>
              <strong>{removeTarget.login}</strong>, {project.name} projesinin{' '}
              {ROLE_LABEL[removeTarget.role].toLowerCase()} listesinden çıkarılacak.
              Bu işlem bir PR açar; merge edilene kadar GitHub'da hiçbir şey değişmez.
            </>
          }
          confirmLabel="Çıkar ve PR aç"
          danger
          busy={busy}
          onConfirm={() => void confirmRemove()}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {editing && (
        <RepoSettingsDialog
          repoName={project.name}
          config={config}
          defaultBranches={Object.keys(org?.defaults.protected_branches ?? {})}
          busy={busy}
          onCancel={() => setEditing(false)}
          onSave={async (changes, details) => {
            const result = await submit(
              () =>
                proposeRepoConfigUpdate({
                  client,
                  project,
                  edits: () => changes,
                  summary: 'repo ayarları güncellendi',
                  details,
                }),
              `${project.name} ayarları güncellendi`,
            )
            if (result) setEditing(false)
          }}
        />
      )}
    </div>
  )
}
