import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createGitHubClient, GitHubError, type GitHubClient } from '../services/githubApi'
import type { GitHubUser } from '../types/github'

/**
 * Token yalnızca sekme ömrü boyunca `sessionStorage`'da durur — `localStorage`
 * değil. Sekme kapanınca oturum biter; XSS penceresi kalıcı olmaz.
 */
const STORAGE_KEY = 'tidyorg.dashboard.token'

type Status = 'loading' | 'anonymous' | 'authenticated'

interface AuthValue {
  status: Status
  user: GitHubUser | null
  client: GitHubClient | null
  signIn: (token: string) => Promise<GitHubUser>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null // özel pencere / depolama kapalı
  }
}

function storeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(STORAGE_KEY, token)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* depolama yoksa oturum yalnızca bellekte yaşar */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken())
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [status, setStatus] = useState<Status>(() =>
    readStoredToken() ? 'loading' : 'anonymous',
  )

  const client = useMemo(() => (token ? createGitHubClient(token) : null), [token])

  const signOut = useCallback(() => {
    storeToken(null)
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const signIn = useCallback(async (nextToken: string) => {
    const profile = await createGitHubClient(nextToken).getUser()
    storeToken(nextToken)
    setToken(nextToken)
    setUser(profile)
    setStatus('authenticated')
    return profile
  }, [])

  // Sayfa yenilendiğinde saklı token hâlâ geçerli mi?
  useEffect(() => {
    if (!client || user) return
    let cancelled = false

    client
      .getUser()
      .then((profile) => {
        if (cancelled) return
        setUser(profile)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof GitHubError && error.kind === 'unauthorized') signOut()
        else setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [client, user, signOut])

  const value = useMemo<AuthValue>(
    () => ({ status, user, client, signIn, signOut }),
    [status, user, client, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir')
  return value
}

/** Giriş yapılmış sayfalarda client kesin vardır; her yerde null kontrolü yapmayalım. */
export function useClient(): GitHubClient {
  const { client } = useAuth()
  if (!client) throw new Error('Oturum yok')
  return client
}
