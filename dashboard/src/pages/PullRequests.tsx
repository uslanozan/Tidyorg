import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useT } from '../i18n'
import { useAuth, useClient } from '../hooks/useAuth'
import { isDashboardBranch } from '../services/configRepo'
import { CONFIG_OWNER, CONFIG_REPO } from '../services/env'
import { GitHubError } from '../services/githubApi'
import {
  summarizePlan,
  type PlanAction,
  type PlanSummary,
} from '../services/terraformPlan'
import type { PullRequest } from '../types/github'

const REFRESH_MS = 30_000

const ACTION_META: Record<PlanAction, { labelKey: string; color: string }> = {
  create: { labelKey: 'pulls.actionCreate', color: 'var(--success)' },
  update: { labelKey: 'pulls.actionUpdate', color: 'var(--warning)' },
  destroy: { labelKey: 'pulls.actionDestroy', color: 'var(--danger)' },
  replace: { labelKey: 'pulls.actionReplace', color: 'var(--danger)' },
}

interface Row {
  pr: PullRequest
  plan: PlanSummary
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function PlanBadge({ plan }: { plan: PlanSummary }) {
  const t = useT()
  if (plan.status === 'pending') {
    return (
      <span className="badge">
        <span className="spinner" style={{ width: 12, height: 12 }} aria-hidden="true" />
        {t('pulls.badgePending')}
      </span>
    )
  }
  if (plan.status === 'error') return <span className="badge badge-danger">{t('pulls.badgeError')}</span>
  if (plan.hasDestroy) return <span className="badge badge-danger">{t('pulls.badgeDestroy')}</span>
  if (plan.status === 'no-changes') return <span className="badge">{t('pulls.badgeNoChanges')}</span>
  return <span className="badge badge-success">{t('pulls.badgeReady')}</span>
}

export function PullRequests() {
  const t = useT()
  const client = useClient()
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | GitHubError | null>(null)
  const [onlyMine, setOnlyMine] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const pulls = await client.listPullRequests(CONFIG_OWNER, CONFIG_REPO, 'open')
      const dashboardPulls = pulls.filter((pr) => isDashboardBranch(pr.head.ref))

      const next = await Promise.all(
        dashboardPulls.map(async (pr): Promise<Row> => {
          try {
            const comments = await client.listIssueComments(CONFIG_OWNER, CONFIG_REPO, pr.number)
            return { pr, plan: summarizePlan(comments) }
          } catch {
            // Yorumlar okunamazsa PR yine listelensin — plan "bekleniyor" kalır.
            return { pr, plan: summarizePlan([]) }
          }
        }),
      )

      if (!mounted.current) return
      setRows(next)
      setError(null)
      setRefreshedAt(new Date())
    } catch (caught) {
      if (mounted.current) setError(caught as Error)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void load()
  }, [load])

  // Plan yorumu bekleyen PR varsa 30 saniyede bir tazele; hepsi gelmişse dur.
  const hasPending = rows.some((row) => row.plan.status === 'pending')
  useEffect(() => {
    if (!hasPending) return
    const timer = setInterval(() => void load(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [hasPending, load])

  const visible = useMemo(
    () => (onlyMine ? rows.filter((row) => row.pr.user?.login === user?.login) : rows),
    [rows, onlyMine, user],
  )

  return (
    <div className="stack" style={{ gap: 'var(--sp-5)' }}>
      <div className="row-between page-header">
        <div>
          <h1>{t('pulls.title')}</h1>
          <p>
            {t('pulls.subtitle')}
            {refreshedAt &&
              ` · ${t('pulls.lastRefresh', { time: formatDate(refreshedAt.toISOString()) })}`}
          </p>
        </div>

        <div className="row">
          <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(event) => setOnlyMine(event.target.checked)}
            />
            {t('pulls.onlyMine')}
          </label>
          <button type="button" className="btn btn-sm" onClick={() => void load()}>
            {t('pulls.refresh')}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="stack">
          {[0, 1, 2].map((index) => (
            <div className="card card-pad stack" key={index}>
              <Skeleton height={16} width="45%" />
              <Skeleton height={12} width="70%" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="✅"
          title={t('pulls.emptyTitle')}
          description={onlyMine ? t('pulls.emptyMineDesc') : t('pulls.emptyAllDesc')}
        />
      ) : (
        <div className="stack">
          {visible.map(({ pr, plan }) => (
            <article className="card card-pad stack" key={pr.number}>
              <div className="row-between">
                <div className="stack" style={{ gap: 'var(--sp-1)' }}>
                  <h3 style={{ overflowWrap: 'anywhere' }}>
                    <a href={pr.html_url} target="_blank" rel="noreferrer">
                      #{pr.number} {pr.title}
                    </a>
                  </h3>
                  <span className="subtle">
                    {pr.user?.login} · {formatDate(pr.created_at)} ·{' '}
                    <code>{pr.head.ref}</code>
                  </span>
                </div>
                <PlanBadge plan={plan} />
              </div>

              <div
                className="card-pad"
                style={{
                  background: plan.hasDestroy ? 'var(--danger-soft)' : 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--sp-3) var(--sp-4)',
                }}
              >
                <div className="meta-label">{t('pulls.planLabel')}</div>
                <div style={{ fontWeight: 550 }}>
                  {plan.hasDestroy && '⚠️ '}
                  {plan.text}
                </div>
                {plan.resources.length > 0 && (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 'var(--sp-2) 0 0',
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--sp-1)',
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}
                  >
                    {plan.resources.map((r) => (
                      <li
                        key={r.address}
                        style={{
                          display: 'flex',
                          gap: 'var(--sp-2)',
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          style={{
                            color: ACTION_META[r.action].color,
                            fontWeight: 700,
                            fontSize: 'var(--text-xs)',
                            minWidth: 64,
                            flexShrink: 0,
                          }}
                        >
                          {t(ACTION_META[r.action].labelKey)}
                        </span>
                        <code style={{ overflowWrap: 'anywhere', fontSize: 'var(--text-xs)' }}>
                          {r.address}
                        </code>
                      </li>
                    ))}
                  </ul>
                )}
                {plan.errorLine && (
                  <p className="subtle" style={{ overflowWrap: 'anywhere' }}>
                    {plan.errorLine}
                  </p>
                )}
                {plan.status === 'pending' && (
                  <p className="subtle">{t('pulls.pendingHint')}</p>
                )}
              </div>

              <div className="row">
                <a className="btn btn-sm" href={pr.html_url} target="_blank" rel="noreferrer">
                  {t('pulls.openOnGitHub')}
                </a>
                {plan.commentUrl && (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={plan.commentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('pulls.viewPlanComment')}
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
