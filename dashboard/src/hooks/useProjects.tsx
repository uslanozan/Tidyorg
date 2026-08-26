import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadOrgConfig, loadPeople, loadProjects } from '../services/configRepo'
import { GitHubError } from '../services/githubApi'
import { useAuth } from './useAuth'
import type { OrgConfig, PeopleConfig, Project } from '../types/config'

interface ConfigValue {
  projects: Project[]
  org: OrgConfig | null
  people: PeopleConfig | null
  loading: boolean
  error: GitHubError | Error | null
  reload: () => Promise<void>
}

const ConfigContext = createContext<ConfigValue | null>(null)

/**
 * Config repo'su tek seferde okunur ve tüm sayfalar aynı kopyayı paylaşır.
 * Her sayfa kendi isteğini atsaydı GitHub'ın saatlik istek limiti hızla dolardı.
 */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const { client, status, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [org, setOrg] = useState<OrgConfig | null>(null)
  const [people, setPeople] = useState<PeopleConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GitHubError | Error | null>(null)

  const reload = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)

    try {
      const [nextProjects, nextOrg, nextPeople] = await Promise.all([
        loadProjects(client),
        // organization.yml / people.yml okunamazsa liste yine de gösterilir:
        // ikisi de yalnızca zenginleştirme (varsayılan kurallar, roller).
        loadOrgConfig(client).catch(() => null),
        loadPeople(client).catch(() => null),
      ])
      setProjects(nextProjects)
      setOrg(nextOrg)
      setPeople(nextPeople)
    } catch (caught) {
      if (caught instanceof GitHubError && caught.kind === 'unauthorized') signOut()
      setError(caught as Error)
    } finally {
      setLoading(false)
    }
  }, [client, signOut])

  useEffect(() => {
    if (status === 'authenticated') void reload()
  }, [status, reload])

  const value = useMemo<ConfigValue>(
    () => ({ projects, org, people, loading, error, reload }),
    [projects, org, people, loading, error, reload],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigValue {
  const value = useContext(ConfigContext)
  if (!value) throw new Error('useConfig yalnızca ConfigProvider içinde kullanılabilir')
  return value
}

export function useProject(name: string | undefined) {
  const { projects, loading, error } = useConfig()
  const project = useMemo(
    () => projects.find((item) => item.name === name) ?? null,
    [projects, name],
  )
  return { project, loading, error }
}
