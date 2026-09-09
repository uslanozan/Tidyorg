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

function VisibilityBadge({ value, isDefault }: { value?: string; isDefault: boolean }) {
  const isPrivate = value === 'private'
  return (
    <span className="badge" title={isPrivate ? 'Yalnızca org üyeleri görebilir' : 'Herkese açık'}>
      <span
        className="badge-dot"
        style={{ background: isPrivate ? 'var(--warning)' : 'var(--success)' }}
        aria-hidden="true"
      />
      {isPrivate ? '🔒 ' : '🌐 '}
      {value ?? '—'}
      {isDefault && ' (varsayılan)'}
    </span>
  )
}

function BranchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: '-2px', opacity: 0.75 }}
    >
      <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 5.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
    </svg>
  )
}

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
  const [archiving, setArchiving] = useState(false)

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

  async function confirmArchive() {
    if (!project) return
    const next = !config.archived
    const result = await submit(
      () =>
        proposeRepoConfigUpdate({
          client,
          project,
          edits: () => ({ archived: next }),
          summary: next
            ? `${project.name} arşivlendi`
            : `${project.name} arşivden çıkarıldı`,
          details: [
            next
              ? '`archived: true` — repo dondurulur (read-only), içerik korunur.'
              : '`archived: false` — repo tekrar yazılabilir.',
          ],
        }),
      next ? `${project.name} arşivleniyor` : `${project.name} arşivden çıkarılıyor`,
    )
    if (result) setArchiving(false)
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
              ⚙ Ayarlar
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-sm" onClick={() => setArchiving(true)}>
              {config.archived ? 'Arşivden çıkar' : '🗄 Arşivle'}
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
            <span className="meta-value">
              <LanguageBadge language={config.language} />
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Görünürlük</span>
            <span className="meta-value">
              <VisibilityBadge
                value={config.visibility ?? org?.defaults.visibility}
                isDefault={!config.visibility}
              />
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Varsayılan dal</span>
            <span className="meta-value">
              <span className="badge">
                <BranchIcon />
                {config.default_branch ?? org?.defaults.default_branch ?? '—'}
                {!config.default_branch && ' (varsayılan)'}
              </span>
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

      {archiving && (
        <ConfirmDialog
          title={
            config.archived
              ? `${project.name} arşivden çıkarılsın mı?`
              : `${project.name} arşivlensin mi?`
          }
          message={
            config.archived ? (
              <>
                <strong>{project.name}</strong> tekrar yazılabilir hale gelir (
                <code>archived: false</code>). Bu işlem bir PR açar.
              </>
            ) : (
              <div className="stack" style={{ gap: 'var(--sp-3)' }}>
                <p style={{ margin: 0 }}>
                  <strong>{project.name}</strong> arşivlenir: repo dondurulur (read-only),
                  tüm içerik ve geçmiş korunur, istediğinde geri alınır (
                  <code>archived: true</code>). Bir PR açılır; merge edilene kadar GitHub'da
                  hiçbir şey değişmez.
                </p>
                <div
                  className="card card-pad"
                  style={{ background: 'var(--surface-sunken)' }}
                >
                  <div className="meta-label">Kalıcı silme (hard delete) neden panelde yok</div>
                  <p className="subtle" style={{ margin: '4px 0 0' }}>
                    Panel repoyu <strong>silmez</strong>: geri dönüşü yok ve motorda{' '}
                    <code>prevent_destroy</code> kilidi var. Gerçekten silmek gerekiyorsa
                    elle, bilinçli adımlarla:
                  </p>
                  <ol className="subtle" style={{ margin: '6px 0 0', paddingLeft: '1.2em' }}>
                    <li>
                      Repoyu <code>config/repositories/{project.name}.yml</code>'den kaldır (PR).
                    </li>
                    <li>
                      Apply <em>silmez</em> (prevent_destroy) — bir platform-admin{' '}
                      <code>terraform state rm 'module.repositories["{project.name}"]'</code>{' '}
                      çalıştırır.
                    </li>
                    <li>
                      Repoyu GitHub'dan elle sil; geride kalan{' '}
                      <code>{project.name}-mentors</code> / <code>-devs</code> takımlarını da
                      temizle.
                    </li>
                  </ol>
                </div>
              </div>
            )
          }
          confirmLabel={config.archived ? 'Arşivden çıkar ve PR aç' : 'Arşivle ve PR aç'}
          busy={busy}
          onConfirm={() => void confirmArchive()}
          onCancel={() => setArchiving(false)}
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
