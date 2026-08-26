import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useAuth, useClient } from '../hooks/useAuth'
import { isDashboardBranch } from '../services/configRepo'
import { CONFIG_OWNER, CONFIG_REPO } from '../services/env'
import { GitHubError } from '../services/githubApi'
import { summarizePlan, type PlanSummary } from '../services/terraformPlan'
import type { PullRequest } from '../types/github'

const REFRESH_MS = 30_000

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
  if (plan.status === 'pending') {
    return (
      <span className="badge">
        <span className="spinner" style={{ width: 12, height: 12 }} aria-hidden="true" />
        Plan bekleniyor…
      </span>
    )
  }
  if (plan.status === 'error') return <span className="badge badge-danger">Plan hatası</span>
  if (plan.hasDestroy) return <span className="badge badge-danger">⚠ Yok etme içeriyor</span>
  if (plan.status === 'no-changes') return <span className="badge">Değişiklik yok</span>
  return <span className="badge badge-success">Plan hazır</span>
}

export function PullRequests() {
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
          <h1>Bekleyen PR'lar</h1>
          <p>
            Panelden açılan, henüz merge edilmemiş değişiklikler
            {refreshedAt && ` · son yenileme ${formatDate(refreshedAt.toISOString())}`}
          </p>
        </div>

        <div className="row">
          <label className="row" style={{ gap: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(event) => setOnlyMine(event.target.checked)}
            />
            Yalnızca benimkiler
          </label>
          <button type="button" className="btn btn-sm" onClick={() => void load()}>
            Yenile
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
          title="Bekleyen PR yok"
          description={
            onlyMine
              ? 'Panelden açtığınız tüm PR\'lar merge edilmiş ya da kapatılmış.'
              : 'Panelden açılmış açık bir PR bulunamadı.'
          }
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
                <div className="meta-label">Terraform planı</div>
                <div style={{ fontWeight: 550 }}>
                  {plan.hasDestroy && '⚠️ '}
                  {plan.text}
                </div>
                {plan.errorLine && (
                  <p className="subtle" style={{ overflowWrap: 'anywhere' }}>
                    {plan.errorLine}
                  </p>
                )}
                {plan.status === 'pending' && (
                  <p className="subtle">
                    GitOps workflow'u planı yazınca burası otomatik güncellenir (30 sn).
                  </p>
                )}
              </div>

              <div className="row">
                <a className="btn btn-sm" href={pr.html_url} target="_blank" rel="noreferrer">
                  GitHub'da aç ↗
                </a>
                {plan.commentUrl && (
                  <a
                    className="btn btn-sm btn-ghost"
                    href={plan.commentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Plan yorumunu gör ↗
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
