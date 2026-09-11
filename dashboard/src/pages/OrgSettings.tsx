import { useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { LabelChip } from '../components/LabelChip'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useAuth, useClient } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import {
  isHeadOfEngineering,
  isOrgOwner,
  proposeOrgConfigUpdate,
  type OrgConfigChange,
} from '../services/configRepo'
import { CONFIG_OWNER, configFileUrl, PATHS } from '../services/env'
import { setYamlPath } from '../services/yaml'
import type { YamlValue } from '../services/yaml'
import type {
  OrgConfig,
  OrgRoleDefinition,
  ProtectedBranchRule,
  RepoLabel,
  TemplateMode,
} from '../types/config'

// OrgConfigChange.value = YamlValue (services/yaml). Değişiklikler bu tipte taşınır.
type ChangeValue = YamlValue

const FILE_KEYS = [
  'contributing',
  'security',
  'editorconfig',
  'pr_template',
  'issue_templates',
  'dependabot',
] as const
const WORKFLOW_KEYS = ['ci', 'release', 'dependabot'] as const
const ROLE_PERMISSIONS = ['pull', 'triage', 'push', 'maintain', 'admin'] as const

// label metinleri render sırasında t(`orgSettings.branches.${key}`) ile çözülür.
const BRANCH_BOOLS: { key: keyof ProtectedBranchRule }[] = [
  { key: 'require_code_owner_review' },
  { key: 'dismiss_stale_reviews' },
  { key: 'require_conversation_resolution' },
  { key: 'allow_force_push' },
  { key: 'allow_deletions' },
]

const splitList = (raw: string): string[] =>
  raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

function cleanLabels(rows: RepoLabel[]): RepoLabel[] {
  const out: RepoLabel[] = []
  for (const row of rows) {
    const name = row.name.trim()
    if (!name) continue
    const color = row.color.replace('#', '').trim().toLowerCase() || 'ededed'
    const label: RepoLabel = { name, color }
    const description = row.description?.trim()
    if (description) label.description = description
    out.push(label)
  }
  return out
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function OrgSettings() {
  const t = useT()
  const { org, privileged, loading, error, reload } = useConfig()
  const { user } = useAuth()

  if (loading && !org) {
    return (
      <div className="stack">
        <Skeleton height={30} width="30%" />
        <div className="card card-pad stack" style={{ marginTop: 'var(--sp-4)' }}>
          <Skeleton height={14} />
          <Skeleton height={14} width="70%" />
        </div>
      </div>
    )
  }
  if (error && !org) return <ErrorState error={error} onRetry={() => void reload()} />
  if (!org) {
    return <EmptyState icon="⚙" title={t('orgSettings.notFoundTitle')} description={t('orgSettings.notFoundDesc')} />
  }

  const canManage =
    isOrgOwner(user?.login ?? '', privileged) ||
    isHeadOfEngineering(user?.login ?? '', privileged)

  return <OrgSettingsForm key={JSON.stringify(org)} org={org} canManage={canManage} />
}

/* ─────────────────────────────────────────────────────────────────────────── */

function OrgSettingsForm({ org, canManage }: { org: OrgConfig; canManage: boolean }) {
  const t = useT()
  const client = useClient()
  const { batchMode, add: addToCart } = useCart()
  const { busy, submit } = useProposal()
  const d = org.defaults

  // --- Profil ---------------------------------------------------------------
  const [name, setName] = useState(org.profile?.name ?? '')
  const [description, setDescription] = useState(org.profile?.description ?? '')
  const [blog, setBlog] = useState(org.profile?.blog ?? '')
  const [location, setLocation] = useState(org.profile?.location ?? '')

  // --- Defaults: genel ------------------------------------------------------
  const [visibility, setVisibility] = useState<'public' | 'private'>(d.visibility ?? 'public')
  const [defaultBranch, setDefaultBranch] = useState(d.default_branch ?? '')
  const [hasIssues, setHasIssues] = useState(Boolean(d.has_issues))
  const [hasProjects, setHasProjects] = useState(Boolean(d.has_projects))
  const [hasWiki, setHasWiki] = useState(Boolean(d.has_wiki))
  const [autoInit, setAutoInit] = useState(Boolean(d.auto_init))
  const [vulnAlerts, setVulnAlerts] = useState(Boolean(d.vulnerability_alerts))
  const [secretScanning, setSecretScanning] = useState(Boolean(d.secret_scanning))

  // --- Defaults: workflows / files / labels ---------------------------------
  const [workflows, setWorkflows] = useState<string[]>(d.workflows ?? [])
  const [files, setFiles] = useState<Record<string, TemplateMode>>(() => ({ ...(d.files ?? {}) }))
  const [labels, setLabels] = useState<RepoLabel[]>(() => (d.labels ?? []).map((l) => ({ ...l })))

  // --- Defaults: protected_branches (leaf düzenleme) ------------------------
  const [branches, setBranches] = useState<Record<string, ProtectedBranchRule>>(() =>
    JSON.parse(JSON.stringify(d.protected_branches ?? {})),
  )

  // --- Roller ---------------------------------------------------------------
  const [roles, setRoles] = useState<Record<string, OrgRoleDefinition>>(() =>
    JSON.parse(JSON.stringify(org.roles ?? {})),
  )

  const [error, setError] = useState<string | null>(null)

  function patchBranch(branch: string, patch: Partial<ProtectedBranchRule>) {
    setBranches((prev) => ({ ...prev, [branch]: { ...prev[branch], ...patch } }))
  }
  function patchRole(role: string, patch: Partial<OrgRoleDefinition>) {
    setRoles((prev) => ({ ...prev, [role]: { ...prev[role], ...patch } }))
  }
  function patchLabel(i: number, patch: Partial<RepoLabel>) {
    setLabels((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  }

  function computeChanges(): { changes: OrgConfigChange[]; details: string[] } {
    const changes: OrgConfigChange[] = []
    const details: string[] = []
    const push = (path: string[], value: ChangeValue, detail: string) => {
      changes.push({ path, value: value as YamlValue })
      details.push(detail)
    }

    // Profil
    if (name !== (org.profile?.name ?? '')) push(['profile', 'name'], name, `Profil adı: ${name}`)
    if (description !== (org.profile?.description ?? ''))
      push(['profile', 'description'], description, 'Profil açıklaması güncellendi')
    if (blog !== (org.profile?.blog ?? '')) push(['profile', 'blog'], blog, `Blog: ${blog}`)
    if (location !== (org.profile?.location ?? ''))
      push(['profile', 'location'], location, `Konum: ${location}`)

    // Defaults skalerleri
    if (visibility !== (d.visibility ?? 'public'))
      push(['defaults', 'visibility'], visibility, `Varsayılan görünürlük: ${visibility}`)
    if (defaultBranch !== (d.default_branch ?? ''))
      push(['defaults', 'default_branch'], defaultBranch, `Varsayılan dal: ${defaultBranch}`)
    const boolLeaves: [string, boolean, boolean][] = [
      ['has_issues', hasIssues, Boolean(d.has_issues)],
      ['has_projects', hasProjects, Boolean(d.has_projects)],
      ['has_wiki', hasWiki, Boolean(d.has_wiki)],
      ['auto_init', autoInit, Boolean(d.auto_init)],
      ['vulnerability_alerts', vulnAlerts, Boolean(d.vulnerability_alerts)],
      ['secret_scanning', secretScanning, Boolean(d.secret_scanning)],
    ]
    for (const [key, next, orig] of boolLeaves)
      if (next !== orig) push(['defaults', key], next, `defaults.${key}: ${next}`)

    // workflows (flow-liste)
    if (!same(workflows, d.workflows ?? []))
      push(['defaults', 'workflows'], workflows, `Workflow'lar: ${workflows.join(', ') || '—'}`)

    // files (blok, iç yorum yok → tam değiştir)
    const nextFiles: Record<string, TemplateMode> = {}
    for (const k of FILE_KEYS) if (files[k]) nextFiles[k] = files[k]
    if (!same(nextFiles, d.files ?? {}))
      push(['defaults', 'files'], nextFiles, 'Şablon dağıtım modları güncellendi')

    // labels (blok, iç yorum yok → tam değiştir)
    const nextLabels = cleanLabels(labels)
    if (!same(nextLabels, d.labels ?? []))
      push(['defaults', 'labels'], nextLabels as unknown as ChangeValue, `Seed etiket seti (${nextLabels.length})`)

    // protected_branches (LEAF bazında — yorumlar korunsun)
    for (const [branch, orig] of Object.entries(d.protected_branches ?? {})) {
      const draft = branches[branch] ?? {}
      const leafKeys: (keyof ProtectedBranchRule)[] = [
        'required_reviews',
        'require_code_owner_review',
        'dismiss_stale_reviews',
        'require_conversation_resolution',
        'allow_force_push',
        'allow_deletions',
        'require_status_checks',
        'push_allowed_roles',
      ]
      for (const key of leafKeys) {
        if (!same(draft[key], orig[key])) {
          push(
            ['defaults', 'protected_branches', branch, key],
            draft[key] as ChangeValue,
            `${branch}.${key} güncellendi`,
          )
        }
      }
    }

    // roles (LEAF bazında — viewer yorumu vb. korunsun)
    for (const [role, orig] of Object.entries(org.roles ?? {})) {
      const draft = roles[role]
      if (!draft) continue
      if (draft.scope !== orig.scope)
        push(['roles', role, 'scope'], draft.scope, `${role}.scope: ${draft.scope}`)
      if (draft.repo_permission !== orig.repo_permission)
        push(['roles', role, 'repo_permission'], draft.repo_permission, `${role}.repo_permission: ${draft.repo_permission}`)
      if (draft.bypass_branch_protection !== orig.bypass_branch_protection)
        push(
          ['roles', role, 'bypass_branch_protection'],
          draft.bypass_branch_protection,
          `⚠️ ${role}.bypass_branch_protection: ${draft.bypass_branch_protection}`,
        )
    }

    return { changes, details }
  }

  async function save() {
    setError(null)
    const { changes, details } = computeChanges()
    if (!changes.length) return setError(t('orgSettings.noFieldsChanged'))
    if (batchMode) {
      addToCart({
        file: PATHS.organization,
        summary: `Org ayarları: ${details.length} değişiklik`,
        detail: `organization.yml — ${details.join('; ')}`,
        transform: (text) => changes.reduce((t, c) => setYamlPath(t, c.path, c.value), text),
      })
      return
    }
    await submit(
      () =>
        proposeOrgConfigUpdate({
          client,
          changes,
          summary: 'organizasyon ayarları güncellendi',
          details,
        }),
      'Org ayarları güncellendi',
    )
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <div className="row-between">
        <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
          <img
            className="avatar"
            src={`https://github.com/${encodeURIComponent(CONFIG_OWNER)}.png?size=120`}
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: 'var(--radius-md)' }}
          />
          <div className="stack" style={{ gap: 'var(--sp-2)' }}>
            <h1>{t('orgSettings.header.title')}</h1>
            <p className="muted">
              <code>organization.yml</code> {t('orgSettings.header.intro')}{' '}
            {!canManage && (
              <span className="badge" title={t('orgSettings.header.readOnlyTitle')}>
                {t('orgSettings.header.readOnly')}
              </span>
              )}
            </p>
          </div>
        </div>
        <a className="btn btn-sm" href={configFileUrl(`terraform/config/organization.yml`)} target="_blank" rel="noreferrer">
          {t('orgSettings.header.openFile')}
        </a>
      </div>

      <div
        className="card card-pad"
        style={{ background: 'var(--surface-sunken)', borderStyle: 'dashed' }}
      >
        <p className="subtle" style={{ margin: 0 }}>
          {t('orgSettings.prCallout.s1')}
          <strong>{t('orgSettings.prCallout.b1')}</strong>
          {t('orgSettings.prCallout.s2')}
          <strong>{t('orgSettings.prCallout.b2')}</strong>
          {t('orgSettings.prCallout.s3')}
          <code>privileged.yml</code>
          {t('orgSettings.prCallout.s4')}
          <strong>{t('orgSettings.prCallout.b3')}</strong>
          {t('orgSettings.prCallout.s5')}
        </p>
      </div>

      {/* PROFİL */}
      <Section title={t('orgSettings.section.profileTitle')} hint={t('orgSettings.section.profileHint')} icon={ICONS.profile}>
        <div className="field">
          <label className="label">{t('orgSettings.profile.photo')}</label>
          <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
            <img
              className="avatar"
              src={`https://github.com/${encodeURIComponent(CONFIG_OWNER)}.png?size=160`}
              alt=""
              width={64}
              height={64}
              style={{ borderRadius: 'var(--radius-md)' }}
            />
            <a
              className="btn btn-sm"
              href={`https://github.com/organizations/${encodeURIComponent(CONFIG_OWNER)}/settings/profile`}
              target="_blank"
              rel="noreferrer"
            >
              {t('orgSettings.profile.changeOnGitHub')}
            </a>
          </div>
          <p className="hint">{t('orgSettings.profile.photoHint')}</p>
        </div>
        <TextField label={t('orgSettings.profile.name')} value={name} onChange={setName} disabled={!canManage} />
        <TextField label={t('orgSettings.profile.description')} value={description} onChange={setDescription} disabled={!canManage} />
        <TextField label={t('orgSettings.profile.blog')} value={blog} onChange={setBlog} disabled={!canManage} />
        <TextField label={t('orgSettings.profile.location')} value={location} onChange={setLocation} disabled={!canManage} />
      </Section>

      {/* DEFAULTS: GENEL */}
      <Section title={t('orgSettings.section.generalTitle')} hint={t('orgSettings.section.generalHint')} icon={ICONS.general}>
        <div className="field">
          <label className="label">{t('orgSettings.general.visibility')}</label>
          <select
            className="select"
            value={visibility}
            disabled={!canManage}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
          >
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
        </div>
        <TextField label={t('orgSettings.general.defaultBranch')} value={defaultBranch} onChange={setDefaultBranch} disabled={!canManage} />
        <BoolField label={t('orgSettings.general.hasIssues')} value={hasIssues} onChange={setHasIssues} disabled={!canManage} />
        <BoolField label={t('orgSettings.general.hasProjects')} value={hasProjects} onChange={setHasProjects} disabled={!canManage} />
        <BoolField label={t('orgSettings.general.hasWiki')} value={hasWiki} onChange={setHasWiki} disabled={!canManage} />
        <BoolField label="auto_init" value={autoInit} onChange={setAutoInit} disabled={!canManage} />
      </Section>

      {/* DEFAULTS: GÜVENLİK */}
      <Section title={t('orgSettings.section.securityTitle')} icon={ICONS.security}>
        <BoolField label={t('orgSettings.security.vulnAlerts')} value={vulnAlerts} onChange={setVulnAlerts} disabled={!canManage} />
        <BoolField label={t('orgSettings.security.secretScanning')} value={secretScanning} onChange={setSecretScanning} disabled={!canManage} />
      </Section>

      {/* DEFAULTS: WORKFLOWS */}
      <Section title={t('orgSettings.section.workflowsTitle')} hint={t('orgSettings.section.workflowsHint')} icon={ICONS.workflows}>
        {WORKFLOW_KEYS.map((wf) => (
          <label key={wf} className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={workflows.includes(wf)}
              disabled={!canManage}
              onChange={(e) =>
                setWorkflows((prev) => (e.target.checked ? [...prev, wf] : prev.filter((w) => w !== wf)))
              }
            />
            {wf}
          </label>
        ))}
        {!workflows.includes('ci') && (
          <p className="hint">{t('orgSettings.workflows.ciWarning')}</p>
        )}
      </Section>

      {/* DEFAULTS: FILES */}
      <Section title={t('orgSettings.section.filesTitle')} hint={t('orgSettings.section.filesHint')} icon={ICONS.files}>
        {FILE_KEYS.map((key) => (
          <div className="field" key={key}>
            <label className="label">{key}</label>
            <select
              className="select"
              value={files[key] ?? 'none'}
              disabled={!canManage}
              onChange={(e) => setFiles((prev) => ({ ...prev, [key]: e.target.value as TemplateMode }))}
            >
              <option value="strict">strict</option>
              <option value="seed">seed</option>
              <option value="none">none</option>
            </select>
          </div>
        ))}
      </Section>

      {/* DEFAULTS: SEED LABELS */}
      <Section title={t('orgSettings.section.labelsTitle')} hint={t('orgSettings.section.labelsHint')} icon={ICONS.labels}>
        {labels.length === 0 && <p className="hint">{t('orgSettings.labels.empty')}</p>}
        {labels.map((row, i) => (
          <div key={i} className="row" style={{ gap: 'var(--sp-2)', alignItems: 'center' }}>
            <input
              type="color"
              aria-label={t('orgSettings.labels.colorAria')}
              style={{ width: 40, height: 32, padding: 0, flex: 'none' }}
              value={`#${(row.color || 'ededed').replace('#', '')}`}
              disabled={!canManage}
              onChange={(e) => patchLabel(i, { color: e.target.value.replace('#', '') })}
            />
            <input className="input" placeholder={t('orgSettings.labels.namePlaceholder')} value={row.name} disabled={!canManage} onChange={(e) => patchLabel(i, { name: e.target.value })} />
            <input className="input" placeholder={t('orgSettings.labels.descPlaceholder')} value={row.description ?? ''} disabled={!canManage} onChange={(e) => patchLabel(i, { description: e.target.value })} />
            {canManage && (
              <button type="button" className="btn btn-ghost btn-sm" aria-label={t('orgSettings.labels.removeAria')} onClick={() => setLabels((prev) => prev.filter((_, j) => j !== i))}>
                ✕
              </button>
            )}
          </div>
        ))}
        {labels.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            {cleanLabels(labels).map((l) => (
              <LabelChip key={l.name} label={l} />
            ))}
          </div>
        )}
        {canManage && (
          <button type="button" className="btn btn-sm" onClick={() => setLabels((prev) => [...prev, { name: '', color: 'ededed', description: '' }])}>
            {t('orgSettings.labels.add')}
          </button>
        )}
      </Section>

      {/* DEFAULTS: PROTECTED BRANCHES */}
      <Section title={t('orgSettings.section.branchesTitle')} hint={t('orgSettings.section.branchesHint')} icon={ICONS.branches}>
        {Object.keys(branches).length === 0 && <p className="hint">{t('orgSettings.branches.empty')}</p>}
        {Object.entries(branches).map(([branch, rule]) => (
          <div key={branch} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
            <strong><code>{branch}</code></strong>
            <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
              {t('orgSettings.branches.requiredReviews')}
              <input
                type="number"
                min={0}
                className="input"
                style={{ width: 80 }}
                value={rule.required_reviews ?? 0}
                disabled={!canManage}
                onChange={(e) => patchBranch(branch, { required_reviews: Number(e.target.value) })}
              />
            </label>
            {BRANCH_BOOLS.map(({ key }) => (
              <label key={key} className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(rule[key])}
                  disabled={!canManage}
                  onChange={(e) => patchBranch(branch, { [key]: e.target.checked })}
                />
                {t(`orgSettings.branches.${key}`)}
              </label>
            ))}
            <div className="field">
              <span className="label">{t('orgSettings.branches.statusChecks')}</span>
              <input
                className="input"
                value={(rule.require_status_checks ?? []).join(', ')}
                disabled={!canManage}
                onChange={(e) => patchBranch(branch, { require_status_checks: splitList(e.target.value) })}
              />
            </div>
            <div className="field">
              <span className="label">{t('orgSettings.branches.pushRoles')}</span>
              <input
                className="input"
                value={(rule.push_allowed_roles ?? []).join(', ')}
                disabled={!canManage}
                onChange={(e) => patchBranch(branch, { push_allowed_roles: splitList(e.target.value) })}
              />
            </div>
          </div>
        ))}
      </Section>

      {/* ROLLER */}
      <Section title={t('orgSettings.section.rolesTitle')} hint={t('orgSettings.section.rolesHint')} icon={ICONS.roles}>
        <div className="card card-pad" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
          <p className="subtle" style={{ margin: 0 }}>
            ⚠️ <strong>bypass_branch_protection</strong>
            {t('orgSettings.roles.warn1')}
            <code>privileged.yml</code>
            {t('orgSettings.roles.warn2')}
          </p>
        </div>
        {Object.entries(roles).map(([role, def]) => (
          <div key={role} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
            <strong><code>{role}</code></strong>
            <div className="field">
              <label className="label">{t('orgSettings.roles.scope')}</label>
              <select className="select" value={def.scope} disabled={!canManage} onChange={(e) => patchRole(role, { scope: e.target.value as OrgRoleDefinition['scope'] })}>
                <option value="organization">organization</option>
                <option value="repository">repository</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t('orgSettings.roles.repoPermission')}</label>
              <select className="select" value={def.repo_permission} disabled={!canManage} onChange={(e) => patchRole(role, { repo_permission: e.target.value })}>
                {ROLE_PERMISSIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
              <input type="checkbox" checked={def.bypass_branch_protection} disabled={!canManage} onChange={(e) => patchRole(role, { bypass_branch_protection: e.target.checked })} />
              bypass_branch_protection ⚠️
            </label>
          </div>
        ))}
      </Section>

      {/* SALT-OKUNUR: kimlik + gerçek GitHub org ayarları */}
      <Section title={t('orgSettings.section.structuralTitle')} icon={ICONS.structural}>
        <div className="meta-grid">
          <ReadOnly label="organization" value={CONFIG_OWNER} />
          <ReadOnly label="version" value={String(org.version)} />
          <ReadOnly label="org_admin_team" value={org.org_admin_team} />
        </div>
        <p className="hint">
          {t('orgSettings.structural.hint1')}
          <code>org-settings.tf</code>
          {t('orgSettings.structural.hint2')}
        </p>
      </Section>

      {error && <p className="field-error" role="alert">{error}</p>}

      {canManage && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {batchMode ? t('orgSettings.save.addToCart') : t('orgSettings.save.save')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── küçük yardımcı bileşenler ─────────────────────────────────────────────── */

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card card-pad stack" style={{ gap: 'var(--sp-3)' }}>
      <div className="row-between" style={{ alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{title}</h2>
          {hint && <p className="subtle" style={{ margin: '2px 0 0' }}>{hint}</p>}
        </div>
        {icon && (
          <span className="section-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

/* ── bölüm ikonları (çizgi stili, currentColor) ────────────────────────────── */

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

const ICONS = {
  profile: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></>),
  general: svg(
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="var(--surface-sunken)" />
      <circle cx="15" cy="12" r="2" fill="var(--surface-sunken)" />
      <circle cx="8" cy="18" r="2" fill="var(--surface-sunken)" />
    </>,
  ),
  security: svg(<><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>),
  workflows: svg(<><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" /></>),
  files: svg(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>),
  labels: svg(
    <>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>,
  ),
  branches: svg(<><line x1="6" y1="4" x2="6" y2="14" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M18 8.5a9 9 0 0 1-9 9" /></>),
  roles: svg(<><circle cx="8" cy="15" r="4" /><path d="M10.9 12.1L20 3M17 6l2 2M14.5 8.5l2 2" /></>),
  structural: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>),
} as const

function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function BoolField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
      <input type="checkbox" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>
      <span className="meta-value"><code>{value}</code></span>
    </div>
  )
}
