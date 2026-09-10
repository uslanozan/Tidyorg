import { useState, type ReactNode } from 'react'
import { LabelChip } from '../components/LabelChip'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useAuth, useClient } from '../hooks/useAuth'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import {
  isHeadOfEngineering,
  isOrgOwner,
  proposeOrgConfigUpdate,
  type OrgConfigChange,
} from '../services/configRepo'
import { configFileUrl } from '../services/env'
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

const BRANCH_BOOLS: { key: keyof ProtectedBranchRule; label: string }[] = [
  { key: 'require_code_owner_review', label: 'CODEOWNERS onayı zorunlu' },
  { key: 'dismiss_stale_reviews', label: 'Yeni commit onayları düşürür' },
  { key: 'require_conversation_resolution', label: 'Tüm yorumlar çözülmeli' },
  { key: 'allow_force_push', label: 'Force push serbest' },
  { key: 'allow_deletions', label: 'Dal silme serbest' },
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
    return <EmptyState icon="⚙" title="Org config bulunamadı" description="organization.yml okunamadı." />
  }

  const canManage =
    isOrgOwner(user?.login ?? '', privileged) ||
    isHeadOfEngineering(user?.login ?? '', privileged)

  return <OrgSettingsForm key={JSON.stringify(org)} org={org} canManage={canManage} />
}

/* ─────────────────────────────────────────────────────────────────────────── */

function OrgSettingsForm({ org, canManage }: { org: OrgConfig; canManage: boolean }) {
  const client = useClient()
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
    if (!changes.length) return setError('Hiçbir alan değişmedi.')
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
            src={`https://github.com/${encodeURIComponent(org.organization)}.png?size=120`}
            alt=""
            width={56}
            height={56}
            style={{ borderRadius: 'var(--radius-md)' }}
          />
          <div className="stack" style={{ gap: 'var(--sp-2)' }}>
            <h1>Org Ayarları</h1>
            <p className="muted">
              <code>organization.yml</code> — org geneli varsayılanlar, roller ve profil.{' '}
            {!canManage && (
              <span className="badge" title="Değiştirmek için org owner veya head-of-engineering olmalısın">
                Salt okunur
              </span>
              )}
            </p>
          </div>
        </div>
        <a className="btn btn-sm" href={configFileUrl(`terraform/config/organization.yml`)} target="_blank" rel="noreferrer">
          Dosyayı aç ↗
        </a>
      </div>

      <div
        className="card card-pad"
        style={{ background: 'var(--surface-sunken)', borderStyle: 'dashed' }}
      >
        <p className="subtle" style={{ margin: 0 }}>
          Her kaydetme <strong>bir PR açar</strong>; merge edilene kadar GitHub'da hiçbir şey
          değişmez. Bu dosya CODEOWNERS korumalı — değişiklik <strong>platform-admin onayı</strong>{' '}
          gerektirir. 🔒 Org owner'lar (<code>privileged.yml</code>) buradan{' '}
          <strong>değiştirilemez</strong>; yükseltme yalnızca elle PR + insan onayıyla olur.
        </p>
      </div>

      {/* PROFİL */}
      <Section title="Profil" hint="GitHub'da görünen org kimliği (kozmetik).">
        <div className="field">
          <label className="label">Fotoğraf</label>
          <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
            <img
              className="avatar"
              src={`https://github.com/${encodeURIComponent(org.organization)}.png?size=160`}
              alt=""
              width={64}
              height={64}
              style={{ borderRadius: 'var(--radius-md)' }}
            />
            <a
              className="btn btn-sm"
              href={`https://github.com/organizations/${encodeURIComponent(org.organization)}/settings/profile`}
              target="_blank"
              rel="noreferrer"
            >
              GitHub'da değiştir ↗
            </a>
          </div>
          <p className="hint">
            Org fotoğrafı yalnızca GitHub arayüzünden değiştirilebilir — Terraform/API ile
            ayarlanamaz, o yüzden config'de tutulmuyor. Burada canlı hâli gösterilir.
          </p>
        </div>
        <TextField label="Ad" value={name} onChange={setName} disabled={!canManage} />
        <TextField label="Açıklama" value={description} onChange={setDescription} disabled={!canManage} />
        <TextField label="Blog / web" value={blog} onChange={setBlog} disabled={!canManage} />
        <TextField label="Konum" value={location} onChange={setLocation} disabled={!canManage} />
      </Section>

      {/* DEFAULTS: GENEL */}
      <Section title="Varsayılanlar — genel" hint="Her repo bunları miras alır, repo bazında ezilebilir.">
        <div className="field">
          <label className="label">Görünürlük</label>
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
        <TextField label="Varsayılan dal" value={defaultBranch} onChange={setDefaultBranch} disabled={!canManage} />
        <BoolField label="Issues açık" value={hasIssues} onChange={setHasIssues} disabled={!canManage} />
        <BoolField label="Projects açık" value={hasProjects} onChange={setHasProjects} disabled={!canManage} />
        <BoolField label="Wiki açık" value={hasWiki} onChange={setHasWiki} disabled={!canManage} />
        <BoolField label="auto_init" value={autoInit} onChange={setAutoInit} disabled={!canManage} />
      </Section>

      {/* DEFAULTS: GÜVENLİK */}
      <Section title="Varsayılanlar — güvenlik">
        <BoolField label="Dependabot uyarıları (vulnerability_alerts)" value={vulnAlerts} onChange={setVulnAlerts} disabled={!canManage} />
        <BoolField label="Secret scanning + push protection" value={secretScanning} onChange={setSecretScanning} disabled={!canManage} />
      </Section>

      {/* DEFAULTS: WORKFLOWS */}
      <Section title="Varsayılanlar — workflow'lar" hint="terraform/templates/.github/workflows/<ad>.yml">
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
          <p className="hint">⚠️ `ci` yoksa `ci/test` status check'i hiç raporlanmaz — dal koruması onu bekliyorsa PR'lar takılır.</p>
        )}
      </Section>

      {/* DEFAULTS: FILES */}
      <Section title="Varsayılanlar — şablon dosyaları" hint="strict = TF sahiplenir · seed = ilk oluşturmada · none = yazılmaz">
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
      <Section title="Varsayılanlar — seed etiketleri" hint="Repo kendi labels'ını tanımlamazsa bu set uygulanır.">
        {labels.length === 0 && <p className="hint">Etiket yok.</p>}
        {labels.map((row, i) => (
          <div key={i} className="row" style={{ gap: 'var(--sp-2)', alignItems: 'center' }}>
            <input
              type="color"
              aria-label="Renk"
              style={{ width: 40, height: 32, padding: 0, flex: 'none' }}
              value={`#${(row.color || 'ededed').replace('#', '')}`}
              disabled={!canManage}
              onChange={(e) => patchLabel(i, { color: e.target.value.replace('#', '') })}
            />
            <input className="input" placeholder="ad" value={row.name} disabled={!canManage} onChange={(e) => patchLabel(i, { name: e.target.value })} />
            <input className="input" placeholder="açıklama (ops.)" value={row.description ?? ''} disabled={!canManage} onChange={(e) => patchLabel(i, { description: e.target.value })} />
            {canManage && (
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Etiketi kaldır" onClick={() => setLabels((prev) => prev.filter((_, j) => j !== i))}>
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
            + Etiket ekle
          </button>
        )}
      </Section>

      {/* DEFAULTS: PROTECTED BRANCHES */}
      <Section title="Varsayılanlar — dal koruması" hint="Org geneli branch protection. Repo kendi dosyasında ezebilir.">
        {Object.keys(branches).length === 0 && <p className="hint">Tanımlı dal koruması yok.</p>}
        {Object.entries(branches).map(([branch, rule]) => (
          <div key={branch} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
            <strong><code>{branch}</code></strong>
            <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
              Onay sayısı
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
            {BRANCH_BOOLS.map(({ key, label }) => (
              <label key={key} className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(rule[key])}
                  disabled={!canManage}
                  onChange={(e) => patchBranch(branch, { [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
            <div className="field">
              <span className="label">Status check'ler (virgülle)</span>
              <input
                className="input"
                value={(rule.require_status_checks ?? []).join(', ')}
                disabled={!canManage}
                onChange={(e) => patchBranch(branch, { require_status_checks: splitList(e.target.value) })}
              />
            </div>
            <div className="field">
              <span className="label">Push izinli roller (virgülle)</span>
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
      <Section title="Roller" hint="Yetkinin ne anlama geldiği. Repo dosyaları bu rol adlarını kullanır.">
        <div className="card card-pad" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
          <p className="subtle" style={{ margin: 0 }}>
            ⚠️ <strong>bypass_branch_protection</strong> bir yükseltme yüzeyidir: açık bir rol, o rolü
            taşıyan herkese korumalı dallarda muafiyet verir. Değişiklik CODEOWNERS onayına takılır
            ama dikkatli ol. Owner'lık burada DEĞİL, <code>privileged.yml</code>'da yaşar.
          </p>
        </div>
        {Object.entries(roles).map(([role, def]) => (
          <div key={role} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
            <strong><code>{role}</code></strong>
            <div className="field">
              <label className="label">Kapsam (scope)</label>
              <select className="select" value={def.scope} disabled={!canManage} onChange={(e) => patchRole(role, { scope: e.target.value as OrgRoleDefinition['scope'] })}>
                <option value="organization">organization</option>
                <option value="repository">repository</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Repo izni (repo_permission)</label>
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
      <Section title="Yapısal (salt-okunur)">
        <div className="meta-grid">
          <ReadOnly label="organization" value={org.organization} />
          <ReadOnly label="version" value={String(org.version)} />
          <ReadOnly label="org_admin_team" value={org.org_admin_team} />
        </div>
        <p className="hint">
          Gerçek GitHub org ayarları (base permission, repo-açma yetkisi, yeni-repo güvenlik
          varsayılanları, billing) <code>org-settings.tf</code>'te motorda tanımlı — config'de
          olmadığı için buradan düzenlenemez. Panele almak ayrı bir engine değişikliği gerektirir.
        </p>
      </Section>

      {error && <p className="field-error" role="alert">{error}</p>}

      {canManage && (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Kaydet (PR aç)
          </button>
        </div>
      )}
    </div>
  )
}

/* ── küçük yardımcı bileşenler ─────────────────────────────────────────────── */

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card card-pad stack" style={{ gap: 'var(--sp-3)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>{title}</h2>
        {hint && <p className="subtle" style={{ margin: '2px 0 0' }}>{hint}</p>}
      </div>
      {children}
    </section>
  )
}

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
