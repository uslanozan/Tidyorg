import { useCallback, useEffect, useState } from 'react'
import { isDashboardBranch } from '../services/configRepo'
import { CONFIG_OWNER, CONFIG_REPO } from '../services/env'
import { useAuth } from './useAuth'

/**
 * Count of open PRs created from the console that have not been merged yet — for nav badge.
 * Single lightweight request; refreshed on tab focus. Since only AppShell consumes it
 * rather than a dedicated page, implemented as a simple hook instead of a context.
 */
export function usePendingPRs(): number {
  const { client, status } = useAuth()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (!client) return
    try {
      const pulls = await client.listPullRequests(CONFIG_OWNER, CONFIG_REPO, 'open')
      setCount(pulls.filter((pr) => isDashboardBranch(pr.head.ref)).length)
    } catch {
      // Badge is not critical: if count cannot be fetched, it remains hidden (0).
      setCount(0)
    }
  }, [client])

  useEffect(() => {
    if (status !== 'authenticated') {
      setCount(0)
      return
    }
    void load()

    const onFocus = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [status, load])

  return count
}
