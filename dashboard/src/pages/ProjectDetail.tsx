import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LabelChip } from '../components/LabelChip'
import { LanguageBadge } from '../components/LanguageBadge'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Person } from '../components/Person'
import { RepoSettingsDialog } from '../components/RepoSettingsDialog'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { MemberPicker } from '../components/MemberPicker'
import { useAuth, useClient } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useConfig, useProject } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import {
  canManageProject,
  effectiveBranchRules,
  proposeRepoConfigUpdate,
} from '../services/configRepo'
import { configFileUrl, repoUrl } from '../services/env'
import { assertCanAddMember, assertCanRemoveMentor } from '../services/validation'
import { applyEdits, parseRepoConfig } from '../services/yaml'
import { useT } from '../i18n'
import type { ProjectRole } from '../types/config'

const ROLE_LABEL: Record<ProjectRole, string> = {
  mentor: 'Mentör',
  developer: 'Developer',
  viewer: 'Viewer',
}

/** Dal koruması tablosu sütunları — başlıklara hover ile açıklama düşer. */
const RULE_COLUMNS: { labelKey: string; hintKey?: string }[] = [
  { labelKey: 'projectDetail.ruleCol.branch' },
  { labelKey: 'projectDetail.ruleCol.approvals', hintKey: 'projectDetail.ruleCol.approvalsHint' },
  { labelKey: 'projectDetail.ruleCol.codeowners', hintKey: 'projectDetail.ruleCol.codeownersHint' },
  {
    labelKey: 'projectDetail.ruleCol.statusCheck',
    hintKey: 'projectDetail.ruleCol.statusCheckHint',
  },
  { labelKey: 'projectDetail.ruleCol.forcePush', hintKey: 'projectDetail.ruleCol.forcePushHint' },
  { labelKey: 'projectDetail.ruleCol.source', hintKey: 'projectDetail.ruleCol.sourceHint' },
]

type MemberList = 'mentors' | 'developers' | 'viewers'

const LIST_KEY: Record<ProjectRole, MemberList> = {
  mentor: 'mentors',
  developer: 'developers',
  viewer: 'viewers',
}
const listKey = (role: ProjectRole): MemberList => LIST_KEY[role]

function VisibilityBadge({ value, isDefault }: { value?: string; isDefault: boolean }) {
  const t = useT()
  const isPrivate = value === 'private'
  return (
    <span
      className="badge"
      title={
        isPrivate
          ? t('projectDetail.visibility.privateTitle')
          : t('projectDetail.visibility.publicTitle')
      }
    >
      <span
        className="badge-dot"
        style={{ background: isPrivate ? 'var(--warning)' : 'var(--success)' }}
        aria-hidden="true"
      />
      {isPrivate ? '🔒 ' : '🌐 '}
      {value ?? '—'}
      {isDefault && t('projectDetail.defaultParen')}
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
  const { batchMode, add: addToCart } = useCart()
  const { busy, submit } = useProposal()
  const t = useT()

  const [addRole, setAddRole] = useState<ProjectRole | null>(null)
  const [toAdd, setToAdd] = useState<string[]>([])
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
        title={t('projectDetail.notFoundTitle')}
        description={t('projectDetail.notFoundDesc', { name: name ?? '' })}
        action={
          <Link className="btn" to="/">
            {t('projectDetail.backToProjects')}
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
    setToAdd([])
    setAddError(null)
  }

  /** Toplu mod: PR açmak yerine ekleme işlemini sepete koyar (yorum-koruyan transform). */
  function stageAdd() {
    if (!project || !addRole || toAdd.length === 0) return
    const blocked = assertCanAddMember(project.config)
    if (blocked) return setAddError(blocked)
    const key = listKey(addRole)
    const role = addRole
    const people = [...toAdd]
    addToCart({
      file: project.path,
      summary: `${project.name}: +${people.join(', ')} (${ROLE_LABEL[role]})`,
      detail: `\`${project.name}\` → ${people.map((l) => `\`${l}\``).join(', ')} **${ROLE_LABEL[role]}**`,
      transform: (text) => {
        const cfg = parseRepoConfig(text)
        const merged = [...(cfg[key] ?? [])]
        for (const login of people) {
          if (!merged.some((m) => m.toLowerCase() === login.toLowerCase())) merged.push(login)
        }
        return applyEdits(text, { [key]: merged })
      },
    })
    closeAdd()
  }

  async function confirmAdd() {
    if (!project || !addRole || toAdd.length === 0) return
    if (batchMode) return stageAdd()

    const key = listKey(addRole)

    const blocked = assertCanAddMember(project.config)
    if (blocked) return setAddError(blocked)

    // Seçilenlerin hepsi tek PR'da eklenir. Zaten org üyesi (picker'dan) ve repo'da
    // olmayanlar (exclude) — ek doğrulama gerekmez.
    const result = await submit(
      () =>
        proposeRepoConfigUpdate({
          client,
          project,
          edits: (cfg) => ({ [key]: [...(cfg[key] ?? []), ...toAdd] }),
          summary: `${toAdd.length} ${addRole} eklendi`,
          details: toAdd.map((login) => `\`${login}\` → **${ROLE_LABEL[addRole]}**`),
        }),
      `${toAdd.join(', ')} → ${ROLE_LABEL[addRole]} (${project.name})`,
    )

    if (result) closeAdd()
  }

  /** Toplu mod: çıkarma işlemini sepete koyar. */
  function stageRemove() {
    if (!project || !removeTarget) return
    const { login, role } = removeTarget
    const key = listKey(role)
    addToCart({
      file: project.path,
      summary: `${project.name}: −${login} (${ROLE_LABEL[role]})`,
      detail: `\`${login}\` → **${ROLE_LABEL[role]}** listesinden çıkarıldı (${project.name})`,
      transform: (text) => {
        const cfg = parseRepoConfig(text)
        return applyEdits(text, {
          [key]: (cfg[key] ?? []).filter((m) => m.toLowerCase() !== login.toLowerCase()),
        })
      },
    })
    setRemoveTarget(null)
  }

  async function confirmRemove() {
    if (!project || !removeTarget) return
    if (batchMode) return stageRemove()
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
    if (batchMode) {
      const p = project
      addToCart({
        file: p.path,
        summary: `${p.name}: archived → ${next}`,
        detail: next
          ? `\`${p.name}\` arşivlendi (\`archived: true\`)`
          : `\`${p.name}\` arşivden çıkarıldı (\`archived: false\`)`,
        transform: (text) => applyEdits(text, { archived: next }),
      })
      return setArchiving(false)
    }
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
            {t('projectDetail.roleHeading', { role: ROLE_LABEL[role] })}{' '}
            <span className="subtle">({people.length})</span>
          </h2>
          {canManage && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAddRole(role)}
              disabled={config.archived}
              title={config.archived ? t('projectDetail.archivedCannotEdit') : undefined}
            >
              + {t('projectDetail.addRole', { role: ROLE_LABEL[role] })}
            </button>
          )}
        </div>

        {people.length === 0 ? (
          <p className="subtle">{t('projectDetail.noMembers')}</p>
        ) : (
          <div className="person-list">
            {people.map((login) => (
              <span key={login} className="row" style={{ gap: 'var(--sp-1)' }}>
                <Person login={login} />
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={t('projectDetail.removeMemberAria', { login })}
                    title={removalBlocked(login) ?? t('projectDetail.removeMemberAria', { login })}
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
          {t('projectDetail.backLink')}
        </Link>
      </div>

      <div className="row-between">
        <div className="stack" style={{ gap: 'var(--sp-2)' }}>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <h1>{project.name}</h1>
            <LanguageBadge language={config.language} />
            {config.archived && (
              <span className="badge badge-warning">{t('projectDetail.archivedBadge')}</span>
            )}
            {!canManage && (
              <span className="badge" title={t('projectDetail.readonlyTitle')}>
                {t('projectDetail.readonly')}
              </span>
            )}
          </div>
          <p className="muted">{config.description || t('projectDetail.noDescription')}</p>
        </div>

        <div className="row">
          {canManage && (
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
              {t('projectDetail.settings')}
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-sm" onClick={() => setArchiving(true)}>
              {config.archived ? t('projectDetail.unarchive') : t('projectDetail.archive')}
            </button>
          )}
          <a
            className="btn btn-sm"
            href={repoUrl(project.name)}
            target="_blank"
            rel="noreferrer"
          >
            {t('projectDetail.openInGitHub')}
          </a>
        </div>
      </div>

      <section className="card card-pad">
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">{t('projectDetail.metaLanguage')}</span>
            <span className="meta-value">
              <LanguageBadge language={config.language} />
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">{t('projectDetail.metaVisibility')}</span>
            <span className="meta-value">
              <VisibilityBadge
                value={config.visibility ?? org?.defaults.visibility}
                isDefault={!config.visibility}
              />
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">{t('projectDetail.metaDefaultBranch')}</span>
            <span className="meta-value">
              <span className="badge">
                <BranchIcon />
                {config.default_branch ?? org?.defaults.default_branch ?? '—'}
                {!config.default_branch && t('projectDetail.defaultParen')}
              </span>
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">{t('projectDetail.metaConfigFile')}</span>
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
      {memberSection('viewer')}

      <section className="card card-pad section">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>{t('projectDetail.branchProtection')}</h2>
        <p className="subtle">{t('projectDetail.branchProtectionHint')}</p>

        <div className="table-scroll">
          <table className="rule-table">
            <thead>
              <tr>
                {RULE_COLUMNS.map((col) => {
                  const label = t(col.labelKey)
                  const hint = col.hintKey ? t(col.hintKey) : undefined
                  return (
                    <th key={col.labelKey} title={hint}>
                      {hint ? <span className="th-help">{label}</span> : label}
                    </th>
                  )
                })}
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
                      {t('projectDetail.protectionRemovedPre')}
                      <code>null</code>
                      {t('projectDetail.protectionRemovedPost')}
                    </td>
                    <td>
                      <span className="badge badge-warning">{t('projectDetail.sourceRepo')}</span>
                    </td>
                  </tr>
                ) : (
                  <tr key={branch}>
                    <td>
                      <code>{branch}</code>
                    </td>
                    <td>{rule.required_reviews ?? '—'}</td>
                    <td>
                      {rule.require_code_owner_review
                        ? t('projectDetail.cellRequired')
                        : t('projectDetail.cellNo')}
                    </td>
                    <td>
                      {rule.require_status_checks?.length
                        ? rule.require_status_checks.join(', ')
                        : '—'}
                    </td>
                    <td>
                      {rule.allow_force_push
                        ? t('projectDetail.cellOn')
                        : t('projectDetail.cellOff')}
                    </td>
                    <td>
                      <span className={rule.overridden ? 'badge badge-accent' : 'badge'}>
                        {rule.overridden
                          ? t('projectDetail.sourceRepo')
                          : t('projectDetail.sourceDefault')}
                      </span>
                    </td>
                  </tr>
                ),
              )}
              {Object.keys(rules).length === 0 && (
                <tr>
                  <td colSpan={6} className="subtle">
                    {t('projectDetail.noBranchRules')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(() => {
        const seedLabels = org?.defaults.labels ?? []
        const isCustom = Boolean(config.labels)
        const shown = config.labels ?? seedLabels
        return (
          <section className="card card-pad section">
            <div className="row-between">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>
                {t('projectDetail.labelsHeading')} <span className="subtle">({shown.length})</span>
              </h2>
              <span className={isCustom ? 'badge badge-accent' : 'badge'}>
                {isCustom
                  ? t('projectDetail.labelsCustomBadge')
                  : t('projectDetail.labelsInheritedBadge')}
              </span>
            </div>
            <p className="subtle">
              {isCustom
                ? t('projectDetail.labelsCustomHint')
                : t('projectDetail.labelsInheritedHint')}
            </p>
            {shown.length === 0 ? (
              <p className="subtle">{t('projectDetail.noLabels')}</p>
            ) : (
              <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {shown.map((label) => (
                  <LabelChip key={label.name} label={label} />
                ))}
              </div>
            )}
          </section>
        )
      })()}

      {addRole && (
        <Modal
          title={t('projectDetail.addRoleTitle', {
            role: ROLE_LABEL[addRole],
            name: project.name,
          })}
          onClose={closeAdd}
          footer={
            <>
              <button type="button" className="btn" onClick={closeAdd} disabled={busy}>
                {t('projectDetail.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmAdd()}
                disabled={busy || toAdd.length === 0}
              >
                {busy && <span className="spinner" aria-hidden="true" />}
                {batchMode
                  ? t('projectDetail.addToCart')
                  : toAdd.length > 1
                    ? t('projectDetail.addPeoplePr', { count: toAdd.length })
                    : t('projectDetail.createPr')}
              </button>
            </>
          }
        >
          <div className="stack">
            <MemberPicker
              label={t('projectDetail.selectRole', { role: ROLE_LABEL[addRole] })}
              all={peopleConfig?.members ?? []}
              selected={toAdd}
              onChange={setToAdd}
              exclude={[
                ...(config.mentors ?? []),
                ...(config.developers ?? []),
                ...(config.viewers ?? []),
              ]}
              hint={t('projectDetail.addHint')}
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
          title={t('projectDetail.removeTitle', { login: removeTarget.login })}
          message={
            <>
              <strong>{removeTarget.login}</strong>
              {t('projectDetail.removeMessage', {
                name: project.name,
                role: ROLE_LABEL[removeTarget.role].toLowerCase(),
              })}
            </>
          }
          confirmLabel={batchMode ? t('projectDetail.addToCart') : t('projectDetail.removeAndPr')}
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
              ? t('projectDetail.unarchiveTitle', { name: project.name })
              : t('projectDetail.archiveTitle', { name: project.name })
          }
          message={
            config.archived ? (
              <>
                <strong>{project.name}</strong>
                {t('projectDetail.unarchiveMsgPre')}
                <code>archived: false</code>
                {t('projectDetail.unarchiveMsgPost')}
              </>
            ) : (
              <div className="stack" style={{ gap: 'var(--sp-3)' }}>
                <p style={{ margin: 0 }}>
                  <strong>{project.name}</strong>
                  {t('projectDetail.archiveMsgPre')}
                  <code>archived: true</code>
                  {t('projectDetail.archiveMsgPost')}
                </p>
                <div
                  className="card card-pad"
                  style={{
                    background: 'var(--danger-soft)',
                    border: '1px solid var(--danger)',
                  }}
                >
                  <div className="meta-label" style={{ color: 'var(--danger)' }}>
                    ⚠️ Kalıcı silme (hard delete) neden panelde yok
                  </div>
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
          confirmLabel={
            batchMode
              ? t('projectDetail.addToCart')
              : config.archived
                ? t('projectDetail.unarchiveAndPr')
                : t('projectDetail.archiveAndPr')
          }
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
          defaultLabels={org?.defaults.labels ?? []}
          busy={busy}
          primaryLabel={batchMode ? 'Sepete ekle' : 'PR oluştur'}
          onCancel={() => setEditing(false)}
          onSave={async (changes, details) => {
            if (batchMode) {
              const p = project
              addToCart({
                file: p.path,
                summary: `${p.name}: ayarlar (${details.length} değişiklik)`,
                detail: `\`${p.name}\` ayarları — ${details.join('; ')}`,
                transform: (text) => applyEdits(text, changes),
              })
              setEditing(false)
              return
            }
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
