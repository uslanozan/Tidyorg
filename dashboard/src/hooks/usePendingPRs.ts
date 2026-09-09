import { useCallback, useEffect, useState } from 'react'
import { isDashboardBranch } from '../services/configRepo'
import { CONFIG_OWNER, CONFIG_REPO } from '../services/env'
import { useAuth } from './useAuth'

/**
 * Panelden açılmış, henüz merge edilmemiş açık PR sayısı — nav rozeti için.
 * Tek hafif istek; sekmeye geri dönülünce (focus) tazelenir. Ayrı sayfa değil,
 * yalnızca AppShell tükettiği için context yerine basit hook.
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
      // Rozet kritik değil: sayı alınamazsa gizli kalır (0).
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
