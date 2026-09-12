import { useMemo, useState, type ReactNode } from 'react'
import { LabelChip } from './LabelChip'
import { languageLabel } from './LanguageBadge'
import { Modal } from './Modal'
import { useT } from '../i18n'
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
 * All editable fields of the repo config (except mentor/developer — those have
 * their own flow in ProjectDetail). Only CHANGED keys are sent to `applyEdits`;
 * nested fields (protected_branches, code_owners, files) are rewritten as blocks,
 * preserving comments above the key.
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

const BRANCH_BOOL_FIELDS: { key: BranchBoolKey; labelKey: string }[] = [
  { key: 'require_code_owner_review', labelKey: 'repoSettings.branchBool.codeOwners' },
  { key: 'dismiss_stale_reviews', labelKey: 'repoSettings.branchBool.dismissStale' },
  { key: 'require_conversation_resolution', labelKey: 'repoSettings.branchBool.conversation' },
  { key: 'allow_force_push', labelKey: 'repoSettings.branchBool.forcePush' },
  { key: 'allow_deletions', labelKey: 'repoSettings.branchBool.deletions' },
]

type Tri = 'inherit' | 'on' | 'off'
const triToBool = (t: Tri): boolean | undefined =>
  t === 'inherit' ? undefined : t === 'on'
const boolToTri = (v: boolean | undefined): Tri =>
  v === undefined ? 'inherit' : v ? 'on' : 'off'

/** Branch rules specified in repo file — org defaults are not displayed here. */
type BranchState = 'default' | 'removed' | 'custom'

interface Props {
  repoName: string
  config: RepoConfig
  /** Branch names in org defaults — for "re-add protection to branch". */
  defaultBranches: string[]
  /** Org default label set — for inheritance preview and starting an override. */
  defaultLabels: RepoLabel[]
  busy: boolean
  /** Label for save button; in batch mode "Add to cart" is passed. Defaults to "Create PR". */
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
  primaryLabel = 'Create PR',
  onCancel,
  onSave,
}: Props) {
  const t = useT()
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

  // Labels: if override is off, org defaults are inherited. When enabled, starts
  // with a copy of org set (not an empty list) — making it easier to edit.
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
    // When overriding for the first time, start with a copy of org set instead of empty list.
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
      details.push('Description updated')
    }
    if (language !== config.language) {
      changes.language = language
      details.push(`Language: \`${config.language}\` → \`${language}\``)
    }

    const nextVisibility = visibility === 'inherit' ? undefined : visibility
    if (nextVisibility !== config.visibility) {
      changes.visibility = nextVisibility
      details.push(`Visibility: ${nextVisibility ?? 'default'}`)
    }

    const nextDefaultBranch = defaultBranch.trim() || undefined
    if (nextDefaultBranch !== config.default_branch) {
      changes.default_branch = nextDefaultBranch
      details.push(`Default branch: ${nextDefaultBranch ?? 'default'}`)
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
        details.push(`${key}: ${next ?? 'default'}`)
      }
    }

    // files — only non-"inherit" ones are written
    const nextFiles: Record<string, TemplateMode> = {}
    for (const key of FILE_KEYS) {
      if (files[key] !== 'inherit') nextFiles[key] = files[key] as TemplateMode
    }
    if (!shallowEqual(nextFiles, config.files ?? {})) {
      changes.files = Object.keys(nextFiles).length ? nextFiles : undefined
      details.push('Template file modes updated')
    }

    // workflows
    const nextWorkflows = overrideWorkflows ? workflows : undefined
    if (!arrayEqual(nextWorkflows, config.workflows)) {
      changes.workflows = nextWorkflows
      details.push(
        nextWorkflows ? `Workflows: ${nextWorkflows.join(', ')}` : 'Workflow override removed',
      )
    }

    // protected_branches
    const cleanBranches = pruneEmptyRules(branches)
    if (!deepEqual(cleanBranches, config.protected_branches ?? {})) {
      changes.protected_branches = Object.keys(cleanBranches).length
        ? (cleanBranches as unknown as YamlValue)
        : undefined
      details.push('Branch protection updated')
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
      details.push('CODEOWNERS rules updated')
    }

    // labels — if override is off, key is deleted (org defaults inherited); if on,
    // cleaned list is written (unnamed lines dropped, color normalized).
    const nextLabels = overrideLabels ? cleanLabels(labels) : undefined
    if (!deepEqual(nextLabels ?? null, config.labels ?? null)) {
      changes.labels = nextLabels as unknown as YamlValue | undefined
      details.push(
        overrideLabels
          ? `Label set customized for this repo (${nextLabels?.length ?? 0} labels)`
          : 'Label override removed — org defaults will be inherited',
      )
    }

    if (!details.length) return setError(t('repoSettings.noChanges'))
    onSave(changes, details)
  }

  return (
    <Modal
      title={t('repoSettings.dialogTitle', { name: repoName })}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {t('repoSettings.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            {primaryLabel}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--sp-5)' }}>
        <Section title={t('repoSettings.sectionBasic')}>
          <div className="field">
            <label className="label" htmlFor="rs-description">
              {t('repoSettings.labelDescription')}
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
              {t('repoSettings.labelLanguage')}
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

        <Section title={t('repoSettings.sectionRepo')}>
          <div className="field">
            <label className="label" htmlFor="rs-visibility">
              {t('repoSettings.labelVisibility')}
            </label>
            <select
              id="rs-visibility"
              className="select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            >
              <option value="inherit">{t('repoSettings.optInheritOrg')}</option>
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="rs-default-branch">
              {t('repoSettings.labelDefaultBranch')}
            </label>
            <input
              id="rs-default-branch"
              className="input"
              value={defaultBranch}
              placeholder={t('repoSettings.phDefaultBranch')}
              onChange={(e) => setDefaultBranch(e.target.value)}
            />
          </div>
          <TriField label={t('repoSettings.triArchived')} value={archived} onChange={setArchived} />
          <TriField label={t('repoSettings.triIssues')} value={hasIssues} onChange={setHasIssues} />
          <TriField
            label={t('repoSettings.triProjects')}
            value={hasProjects}
            onChange={setHasProjects}
          />
          <TriField label={t('repoSettings.triWiki')} value={hasWiki} onChange={setHasWiki} />
        </Section>

        <Section title={t('repoSettings.sectionSecurity')}>
          <TriField
            label={t('repoSettings.triVulnAlerts')}
            value={vulnAlerts}
            onChange={setVulnAlerts}
          />
          <TriField
            label={t('repoSettings.triSecretScanning')}
            value={secretScanning}
            onChange={setSecretScanning}
          />
          <p className="hint">{t('repoSettings.hintSecretScanning')}</p>
        </Section>

        <Section title={t('repoSettings.sectionTemplateFiles')}>
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
                <option value="inherit">{t('repoSettings.optDefault')}</option>
                <option value="strict">strict</option>
                <option value="seed">seed</option>
                <option value="none">none</option>
              </select>
            </div>
          ))}
        </Section>

        <Section title={t('repoSettings.sectionWorkflows')}>
          <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={overrideWorkflows}
              onChange={(e) => setOverrideWorkflows(e.target.checked)}
            />
            {t('repoSettings.overrideOrgDefault')}
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
            <p className="hint">{t('repoSettings.hintCi')}</p>
          )}
        </Section>

        <Section title={t('repoSettings.sectionBranchProtection')}>
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
                    <option value="default">{t('repoSettings.optOrgDefault')}</option>
                    <option value="custom">{t('repoSettings.optCustomRule')}</option>
                    <option value="removed">{t('repoSettings.optRemoveProtection')}</option>
                  </select>
                </div>

                {state === 'custom' && (
                  <div className="stack" style={{ gap: 'var(--sp-2)' }}>
                    <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
                      {t('repoSettings.labelApprovalCount')}
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
                    {BRANCH_BOOL_FIELDS.map(({ key, labelKey }) => (
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
                        {t(labelKey)}
                      </label>
                    ))}
                    <label className="field">
                      <span className="label">{t('repoSettings.labelStatusChecks')}</span>
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
                      <span className="label">{t('repoSettings.labelPushRoles')}</span>
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

        <Section title={t('repoSettings.sectionCodeowners')}>
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
                aria-label={t('repoSettings.ariaRemoveRow')}
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
            + {t('repoSettings.addPath')}
          </button>
        </Section>

        <Section title={t('repoSettings.sectionLabels')}>
          <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={overrideLabels}
              onChange={(e) => toggleOverrideLabels(e.target.checked)}
            />
            {t('repoSettings.overrideLabelsToggle')}
          </label>

          {!overrideLabels ? (
            <div className="stack" style={{ gap: 'var(--sp-2)' }}>
              <p className="hint">
                {t('repoSettings.hintInheritLabels', { count: defaultLabels.length })}
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
                  {t('repoSettings.hintEmptyLabelsPre')}
                  <code>labels: []</code>
                  {t('repoSettings.hintEmptyLabelsPost')}
                </p>
              )}
              {labels.map((row, i) => (
                <div key={i} className="row" style={{ gap: 'var(--sp-2)', alignItems: 'center' }}>
                  <input
                    type="color"
                    aria-label={t('repoSettings.ariaColor')}
                    style={{ width: 40, height: 32, padding: 0, flex: 'none' }}
                    value={`#${(row.color || 'ededed').replace('#', '')}`}
                    onChange={(e) => patchLabel(i, { color: e.target.value.replace('#', '') })}
                  />
                  <input
                    className="input"
                    placeholder={t('repoSettings.phLabelName')}
                    value={row.name}
                    onChange={(e) => patchLabel(i, { name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder={t('repoSettings.phLabelDescription')}
                    value={row.description ?? ''}
                    onChange={(e) => patchLabel(i, { description: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={t('repoSettings.ariaRemoveLabel')}
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
                + {t('repoSettings.addLabel')}
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
  const t = useT()
  return (
    <div className="field">
      <label className="label">{label}</label>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value as Tri)}
      >
        <option value="inherit">{t('repoSettings.optDefault')}</option>
        <option value="on">{t('repoSettings.triOn')}</option>
        <option value="off">{t('repoSettings.triOff')}</option>
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
 * Prepares label rows for writing: drops unnamed rows, normalizes color
 * to lowercase hex without `#`, drops empty description. GitHub/engine expects this format.
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
