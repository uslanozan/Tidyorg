import { useMemo, useState, type ReactNode } from 'react'
import { LabelChip } from './LabelChip'
import { languageLabel } from './LanguageBadge'
import { Modal } from './Modal'
import { validateDescription } from '../services/validation'
import type { YamlValue } from '../services/yaml'
import {
  LANGUAGES,
  type Language,
  type ProtectedBranchRule,
  type RepoConfig,
  type RepoLabel,
  type TemplateMode,
} from '../types/config'

/**
 * Repo config'inin tüm düzenlenebilir alanları (mentör/developer hariç — onlar
 * ProjectDetail'de kendi akışında). Yalnızca DEĞİŞEN anahtarlar `applyEdits`'e
 * gider; iç içe alanlar (protected_branches, code_owners, files) blok olarak
 * yeniden yazılır, anahtarın üstündeki yorumlar korunur.
 */

const FILE_KEYS = [
  'contributing',
  'security',
  'editorconfig',
  'pr_template',
  'issue_templates',
  'dependabot',
] as const

const WORKFLOW_KEYS = ['ci', 'release', 'dependabot'] as const

type BranchBoolKey =
  | 'require_code_owner_review'
  | 'dismiss_stale_reviews'
  | 'require_conversation_resolution'
  | 'allow_force_push'
  | 'allow_deletions'

const BRANCH_BOOL_FIELDS: { key: BranchBoolKey; label: string }[] = [
  { key: 'require_code_owner_review', label: 'CODEOWNERS onayı zorunlu' },
  { key: 'dismiss_stale_reviews', label: 'Yeni commit onayları düşürür' },
  { key: 'require_conversation_resolution', label: 'Tüm yorumlar çözülmeli' },
  { key: 'allow_force_push', label: 'Force push serbest' },
  { key: 'allow_deletions', label: 'Dal silme serbest' },
]

type Tri = 'inherit' | 'on' | 'off'
const triToBool = (t: Tri): boolean | undefined =>
  t === 'inherit' ? undefined : t === 'on'
const boolToTri = (v: boolean | undefined): Tri =>
  v === undefined ? 'inherit' : v ? 'on' : 'off'

/** Repo dosyasında yazan dal kuralları — org varsayılanı burada gösterilmez. */
type BranchState = 'default' | 'removed' | 'custom'

interface Props {
  repoName: string
  config: RepoConfig
  /** Org varsayılanındaki dal adları — "dala geri koruma ekle" için. */
  defaultBranches: string[]
  /** Org varsayılan etiket seti — miras önizlemesi ve "ez"e başlangıç için. */
  defaultLabels: RepoLabel[]
  busy: boolean
  /** Kaydet butonunun metni; toplu modda "Sepete ekle" geçilir. Varsayılan "PR oluştur". */
  primaryLabel?: string
  onCancel: () => void
  onSave: (changes: Record<string, YamlValue | undefined>, details: string[]) => void
}

export function RepoSettingsDialog({
  repoName,
  config,
  defaultBranches,
  defaultLabels,
  busy,
  primaryLabel = 'PR oluştur',
  onCancel,
  onSave,
}: Props) {
  const [description, setDescription] = useState(config.description ?? '')
  const [language, setLanguage] = useState<Language>(config.language)
  const [visibility, setVisibility] = useState<'inherit' | 'public' | 'private'>(
    config.visibility ?? 'inherit',
  )
  const [defaultBranch, setDefaultBranch] = useState(config.default_branch ?? '')
  const [archived, setArchived] = useState<Tri>(boolToTri(config.archived))
  const [hasIssues, setHasIssues] = useState<Tri>(boolToTri(config.has_issues))
  const [hasProjects, setHasProjects] = useState<Tri>(boolToTri(config.has_projects))
  const [hasWiki, setHasWiki] = useState<Tri>(boolToTri(config.has_wiki))
  const [vulnAlerts, setVulnAlerts] = useState<Tri>(boolToTri(config.vulnerability_alerts))
  const [secretScanning, setSecretScanning] = useState<Tri>(
    boolToTri(config.secret_scanning),
  )

  const [files, setFiles] = useState<Record<string, TemplateMode | 'inherit'>>(() => {
    const initial: Record<string, TemplateMode | 'inherit'> = {}
    for (const key of FILE_KEYS) initial[key] = config.files?.[key] ?? 'inherit'
    return initial
  })

  const [overrideWorkflows, setOverrideWorkflows] = useState(Boolean(config.workflows))
  const [workflows, setWorkflows] = useState<string[]>(config.workflows ?? ['ci'])

  const [branches, setBranches] = useState<Record<string, ProtectedBranchRule | null>>(
    () => ({ ...(config.protected_branches ?? {}) }),
  )

  const [codeOwners, setCodeOwners] = useState<{ path: string; logins: string }[]>(() =>
    Object.entries(config.code_owners ?? {}).map(([path, logins]) => ({
      path,
      logins: logins.join(', '),
    })),
  )

  // Etiketler: override kapalıysa org varsayılanı miras alınır. Açılınca org
  // setinden bir kopyayla başlanır (boş listeden değil) — düzenlemesi kolay olsun.
  const [overrideLabels, setOverrideLabels] = useState(Boolean(config.labels))
  const [labels, setLabels] = useState<RepoLabel[]>(() =>
    (config.labels ?? []).map((l) => ({ ...l })),
  )

  const [error, setError] = useState<string | null>(null)

  const branchNames = useMemo(() => {
    const set = new Set([...defaultBranches, ...Object.keys(branches)])
    return [...set].sort()
  }, [defaultBranches, branches])

  function branchState(name: string): BranchState {
    if (!(name in branches)) return 'default'
    return branches[name] === null ? 'removed' : 'custom'
  }

  function setBranchStateFor(name: string, state: BranchState) {
    setBranches((prev) => {
      const next = { ...prev }
      if (state === 'default') delete next[name]
      else if (state === 'removed') next[name] = null
      else next[name] = { ...(prev[name] ?? {}) }
      return next
    })
  }

  function patchBranch(name: string, patch: Partial<ProtectedBranchRule>) {
    setBranches((prev) => ({ ...prev, [name]: { ...(prev[name] ?? {}), ...patch } }))
  }

  function toggleOverrideLabels(on: boolean) {
    setOverrideLabels(on)
    // İlk kez ezerken boş listeyle değil, org setinin kopyasıyla başla.
    if (on && labels.length === 0) setLabels(defaultLabels.map((l) => ({ ...l })))
  }

  function patchLabel(index: number, patch: Partial<RepoLabel>) {
    setLabels((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function save() {
    setError(null)
    const invalid = validateDescription(description)
    if (invalid) return setError(invalid)

    const changes: Record<string, YamlValue | undefined> = {}
    const details: string[] = []

    if (description !== (config.description ?? '')) {
      changes.description = description
      details.push('Açıklama güncellendi')
    }
    if (language !== config.language) {
      changes.language = language
      details.push(`Dil: \`${config.language}\` → \`${language}\``)
    }

    const nextVisibility = visibility === 'inherit' ? undefined : visibility
    if (nextVisibility !== config.visibility) {
      changes.visibility = nextVisibility
      details.push(`Görünürlük: ${nextVisibility ?? 'varsayılan'}`)
    }

    const nextDefaultBranch = defaultBranch.trim() || undefined
    if (nextDefaultBranch !== config.default_branch) {
      changes.default_branch = nextDefaultBranch
      details.push(`Varsayılan dal: ${nextDefaultBranch ?? 'varsayılan'}`)
    }

    const bools: [string, Tri, boolean | undefined][] = [
      ['archived', archived, config.archived],
      ['has_issues', hasIssues, config.has_issues],
      ['has_projects', hasProjects, config.has_projects],
      ['has_wiki', hasWiki, config.has_wiki],
      ['vulnerability_alerts', vulnAlerts, config.vulnerability_alerts],
      ['secret_scanning', secretScanning, config.secret_scanning],
    ]
    for (const [key, tri, current] of bools) {
      const next = triToBool(tri)
      if (next !== current) {
        changes[key] = next
        details.push(`${key}: ${next ?? 'varsayılan'}`)
      }
    }

    // files — yalnızca "inherit" olmayanlar yazılır
    const nextFiles: Record<string, TemplateMode> = {}
    for (const key of FILE_KEYS) {
      if (files[key] !== 'inherit') nextFiles[key] = files[key] as TemplateMode
    }
    if (!shallowEqual(nextFiles, config.files ?? {})) {
      changes.files = Object.keys(nextFiles).length ? nextFiles : undefined
      details.push('Şablon dosya modları güncellendi')
    }

    // workflows
    const nextWorkflows = overrideWorkflows ? workflows : undefined
    if (!arrayEqual(nextWorkflows, config.workflows)) {
      changes.workflows = nextWorkflows
      details.push(
        nextWorkflows ? `Workflow'lar: ${nextWorkflows.join(', ')}` : 'Workflow ezmesi kaldırıldı',
      )
    }

    // protected_branches
    const cleanBranches = pruneEmptyRules(branches)
    if (!deepEqual(cleanBranches, config.protected_branches ?? {})) {
      changes.protected_branches = Object.keys(cleanBranches).length
        ? (cleanBranches as unknown as YamlValue)
        : undefined
      details.push('Dal koruması güncellendi')
    }

    // code_owners
    const nextOwners: Record<string, string[]> = {}
    for (const { path, logins } of codeOwners) {
      const p = path.trim()
      const list = logins
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (p && list.length) nextOwners[p] = list
    }
    if (!deepEqual(nextOwners, config.code_owners ?? {})) {
      changes.code_owners = Object.keys(nextOwners).length
        ? (nextOwners as unknown as YamlValue)
        : undefined
      details.push('CODEOWNERS kuralları güncellendi')
    }

    // labels — override kapalıysa anahtar silinir (org varsayılanı miras); açıksa
    // temizlenmiş liste yazılır (adsız satırlar düşer, renk normalize edilir).
    const nextLabels = overrideLabels ? cleanLabels(labels) : undefined
    if (!deepEqual(nextLabels ?? null, config.labels ?? null)) {
      changes.labels = nextLabels as unknown as YamlValue | undefined
      details.push(
        overrideLabels
          ? `Etiket seti bu repoya özel yapıldı (${nextLabels?.length ?? 0} etiket)`
          : 'Etiket ezmesi kaldırıldı — org varsayılanı miras alınacak',
      )
    }

    if (!details.length) return setError('Hiçbir alan değişmedi.')
    onSave(changes, details)
  }

  return (
    <Modal
      title={`Repo ayarları — ${repoName}`}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Vazgeç
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {primaryLabel}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--sp-5)' }}>
        <Section title="Temel">
          <div className="field">
            <label className="label" htmlFor="rs-description">
              Açıklama
            </label>
            <textarea
              id="rs-description"
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="rs-language">
              Programlama dili
            </label>
            <select
              id="rs-language"
              className="select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {languageLabel(l)}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section title="Repo ayarları">
          <div className="field">
            <label className="label" htmlFor="rs-visibility">
              Görünürlük
            </label>
            <select
              id="rs-visibility"
              className="select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            >
              <option value="inherit">Varsayılan (org)</option>
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="rs-default-branch">
              Varsayılan dal
            </label>
            <input
              id="rs-default-branch"
              className="input"
              value={defaultBranch}
              placeholder="varsayılan (org)"
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
          </div>
          <TriField label="Arşivlenmiş" value={archived} onChange={setArchived} />
          <TriField label="Issues açık" value={hasIssues} onChange={setHasIssues} />
          <TriField label="Projects açık" value={hasProjects} onChange={setHasProjects} />
          <TriField label="Wiki açık" value={hasWiki} onChange={setHasWiki} />
        </Section>

        <Section title="Güvenlik">
          <TriField
            label="Dependabot uyarıları (vulnerability_alerts)"
            value={vulnAlerts}
            onChange={setVulnAlerts}
          />
          <TriField
            label="Secret scanning + push protection"
            value={secretScanning}
            onChange={setSecretScanning}
          />
          <p className="hint">
            secret scanning yalnızca public repo'da ücretsiz; private repo GHAS ister,
            modül sessizce atlar.
          </p>
        </Section>

        <Section title="Şablon dosyaları">
          {FILE_KEYS.map((key) => (
            <div className="field" key={key}>
              <label className="label" htmlFor={`rs-file-${key}`}>
                {key}
              </label>
              <select
                id={`rs-file-${key}`}
                className="select"
                value={files[key]}
                onChange={(e) =>
                  setFiles((prev) => ({
                    ...prev,
                    [key]: e.target.value as TemplateMode | 'inherit',
                  }))
                }
              >
                <option value="inherit">Varsayılan</option>
                <option value="strict">strict</option>
                <option value="seed">seed</option>
                <option value="none">none</option>
              </select>
            </div>
          ))}
        </Section>

        <Section title="Workflow'lar">
          <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={overrideWorkflows}
              onChange={(e) => setOverrideWorkflows(e.target.checked)}
            />
            Org varsayılanını ez
          </label>
          {overrideWorkflows &&
            WORKFLOW_KEYS.map((wf) => (
              <label
                key={wf}
                className="row"
                style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}
              >
                <input
                  type="checkbox"
                  checked={workflows.includes(wf)}
                  onChange={(e) =>
                    setWorkflows((prev) =>
                      e.target.checked ? [...prev, wf] : prev.filter((w) => w !== wf),
                    )
                  }
                />
                {wf}
              </label>
            ))}
          {overrideWorkflows && !workflows.includes('ci') && (
            <p className="hint">
              ⚠️ `ci` yoksa `ci/test` status check'i hiç raporlanmaz — dal koruması
              onu bekliyorsa PR'lar takılır.
            </p>
          )}
        </Section>

        <Section title="Dal koruması">
          {branchNames.map((name) => {
            const state = branchState(name)
            const rule = state === 'custom' ? branches[name] ?? {} : {}
            return (
              <div key={name} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
                <div className="row-between">
                  <strong>
                    <code>{name}</code>
                  </strong>
                  <select
                    className="select"
                    style={{ width: 'auto' }}
                    value={state}
                    onChange={(e) => setBranchStateFor(name, e.target.value as BranchState)}
                  >
                    <option value="default">Org varsayılanı</option>
                    <option value="custom">Özel kural</option>
                    <option value="removed">Korumayı kaldır (null)</option>
                  </select>
                </div>

                {state === 'custom' && (
                  <div className="stack" style={{ gap: 'var(--sp-2)' }}>
                    <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
                      Onay sayısı
                      <input
                        type="number"
                        min={0}
                        className="input"
                        style={{ width: 80 }}
                        value={rule.required_reviews ?? 0}
                        onChange={(e) =>
                          patchBranch(name, { required_reviews: Number(e.target.value) })
                        }
                      />
                    </label>
                    {BRANCH_BOOL_FIELDS.map(({ key, label }) => (
                      <label
                        key={key}
                        className="row"
                        style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(rule[key])}
                          onChange={(e) => patchBranch(name, { [key]: e.target.checked })}
                        />
                        {label}
                      </label>
                    ))}
                    <label className="field">
                      <span className="label">Status check'ler (virgülle)</span>
                      <input
                        className="input"
                        value={(rule.require_status_checks ?? []).join(', ')}
                        placeholder="ci/test"
                        onChange={(e) =>
                          patchBranch(name, {
                            require_status_checks: splitList(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span className="label">Push izinli roller (virgülle)</span>
                      <input
                        className="input"
                        value={(rule.push_allowed_roles ?? []).join(', ')}
                        placeholder="mentor, head-of-engineering"
                        onChange={(e) =>
                          patchBranch(name, { push_allowed_roles: splitList(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            )
          })}
        </Section>

        <Section title="CODEOWNERS (yol → kişiler)">
          {codeOwners.map((row, i) => (
            <div key={i} className="row" style={{ gap: 'var(--sp-2)' }}>
              <input
                className="input"
                value={row.path}
                placeholder="/backend/"
                onChange={(e) =>
                  setCodeOwners((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, path: e.target.value } : r)),
                  )
                }
              />
              <input
                className="input"
                value={row.logins}
                placeholder="dev-1, dev-2"
                onChange={(e) =>
                  setCodeOwners((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, logins: e.target.value } : r)),
                  )
                }
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Satırı kaldır"
                onClick={() => setCodeOwners((prev) => prev.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setCodeOwners((prev) => [...prev, { path: '', logins: '' }])}
          >
            + Yol ekle
          </button>
        </Section>

        <Section title="Etiketler (issue label seti)">
          <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={overrideLabels}
              onChange={(e) => toggleOverrideLabels(e.target.checked)}
            />
            Org varsayılanını ez (bu repoya özel set)
          </label>

          {!overrideLabels ? (
            <div className="stack" style={{ gap: 'var(--sp-2)' }}>
              <p className="hint">
                Org genel etiket seti miras alınıyor ({defaultLabels.length} etiket). Ez'i
                işaretlersen org setinin bir kopyasıyla başlar, bu repoya özel düzenlersin.
              </p>
              {defaultLabels.length > 0 && (
                <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  {defaultLabels.map((label) => (
                    <LabelChip key={label.name} label={label} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="stack" style={{ gap: 'var(--sp-2)' }}>
              {labels.length === 0 && (
                <p className="hint">
                  ⚠️ Liste boş — kaydedersen bu repoda hiç etiket kalmaz (
                  <code>labels: []</code>).
                </p>
              )}
              {labels.map((row, i) => (
                <div key={i} className="row" style={{ gap: 'var(--sp-2)', alignItems: 'center' }}>
                  <input
                    type="color"
                    aria-label="Renk"
                    style={{ width: 40, height: 32, padding: 0, flex: 'none' }}
                    value={`#${(row.color || 'ededed').replace('#', '')}`}
                    onChange={(e) => patchLabel(i, { color: e.target.value.replace('#', '') })}
                  />
                  <input
                    className="input"
                    placeholder="ad (örn. type: bug)"
                    value={row.name}
                    onChange={(e) => patchLabel(i, { name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="açıklama (opsiyonel)"
                    value={row.description ?? ''}
                    onChange={(e) => patchLabel(i, { description: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label="Etiketi kaldır"
                    onClick={() => setLabels((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  setLabels((prev) => [...prev, { name: '', color: 'ededed', description: '' }])
                }
              >
                + Etiket ekle
              </button>
            </div>
          )}
        </Section>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stack" style={{ gap: 'var(--sp-3)' }}>
      <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-subtle)' }}>{title}</h3>
      {children}
    </section>
  )
}

function TriField({
  label,
  value,
  onChange,
}: {
  label: string
  value: Tri
  onChange: (t: Tri) => void
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value as Tri)}
      >
        <option value="inherit">Varsayılan</option>
        <option value="on">Açık</option>
        <option value="off">Kapalı</option>
      </select>
    </div>
  )
}

const splitList = (raw: string): string[] =>
  raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)

function pruneEmptyRules(
  input: Record<string, ProtectedBranchRule | null>,
): Record<string, ProtectedBranchRule | null> {
  const out: Record<string, ProtectedBranchRule | null> = {}
  for (const [name, rule] of Object.entries(input)) {
    if (rule === null) {
      out[name] = null
    } else if (rule && Object.keys(rule).length) {
      out[name] = rule
    }
  }
  return out
}

/**
 * Etiket satırlarını yazıma hazırlar: adsız satırları at, rengi `#`'siz küçük
 * harf hex'e normalize et, boş açıklamayı düşür. GitHub/engine bu formatı bekler.
 */
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

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  return ak.length === bk.length && ak.every((k) => a[k] === b[k])
}

function arrayEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
