import { useEffect, useRef, useState } from 'react'
import { CONFIG_BRANCH, CONFIG_OWNER, CONFIG_REPO } from '../services/env'
import { GitHubError } from '../services/githubApi'
import { useAuth } from './useAuth'

/**
 * "Config = reality" synchronization status. The dashboard always displays
 * the config (desired state); actual access on GitHub takes effect only after
 * Terraform apply finishes following a merge into main. Apply runs as the
 * `terraform-apply.yml` workflow on push to main — its run status is the single
 * authoritative answer to "is it synchronized".
 *
 * Apply does not broadcast comments/status (Actions log only), so we read the run
 * directly from the Actions API. This requires **Actions: Read** permission on the
 * dashboard App; if permission is missing, 403 is returned and the badge quietly
 * falls back to "unknown" (without throwing an error).
 */
export type SyncState = 'in-sync' | 'applying' | 'error' | 'unknown'

export interface SyncStatus {
  state: SyncState
  /** GitHub link for the related apply run. */
  runUrl?: string
  /** Missing Actions:Read permission — badge shows "unknown", user can grant permission. */
  forbidden?: boolean
}

interface WorkflowRun {
  status: string // queued | in_progress | completed | waiting | requested | pending
  conclusion: string | null // success | failure | cancelled | timed_out | null
  head_sha: string
  html_url: string
  updated_at: string
}
interface RunsResponse {
  workflow_runs?: WorkflowRun[]
}

const APPLY_WORKFLOW = 'terraform-apply.yml'
const POLL_IDLE_MS = 20_000
const POLL_ACTIVE_MS = 8_000

async function fetchStatus(
  request: <T>(path: string) => Promise<T>,
): Promise<SyncStatus> {
  try {
    const res = await request<RunsResponse>(
      `/repos/${CONFIG_OWNER}/${CONFIG_REPO}/actions/workflows/${APPLY_WORKFLOW}/runs` +
        `?branch=${encodeURIComponent(CONFIG_BRANCH)}&per_page=10`,
    )
    const runs = res.workflow_runs ?? []

    // If an apply is queued/in progress: currently applying.
    const active = runs.find((r) => r.status !== 'completed')
    if (active) return { state: 'applying', runUrl: active.html_url }

    const latest = runs[0]
    if (!latest) return { state: 'unknown' }
    return {
      state: latest.conclusion === 'success' ? 'in-sync' : 'error',
      runUrl: latest.html_url,
    }
  } catch (error) {
    if (error instanceof GitHubError && (error.kind === 'forbidden' || error.status === 403)) {
      return { state: 'unknown', forbidden: true }
    }
    // Transient error: badge is non-critical, quietly fall back to "unknown".
    return { state: 'unknown' }
  }
}

export function useSyncStatus(): SyncStatus {
  const { client, status } = useAuth()
  const [sync, setSync] = useState<SyncStatus>({ state: 'unknown' })
  const handle = useRef<number | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !client) {
      setSync({ state: 'unknown' })
      return
    }

    let cancelled = false
    const clear = () => {
      if (handle.current !== null) {
        clearTimeout(handle.current)
        handle.current = null
      }
    }

    const tick = async () => {
      clear()
      const next = await fetchStatus(client.request)
      if (cancelled) return
      setSync(next)
      // Poll frequently while apply is in progress, otherwise infrequently.
      const delay = next.state === 'applying' ? POLL_ACTIVE_MS : POLL_IDLE_MS
      handle.current = window.setTimeout(() => void tick(), delay)
    }
    void tick()

    const onFocus = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      clear()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [status, client])

  return sync
}
