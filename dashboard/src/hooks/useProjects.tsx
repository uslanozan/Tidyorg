import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadOrgConfig,
  loadPeople,
  loadPrivileged,
  loadProjects,
} from '../services/configRepo'
import { GitHubError } from '../services/githubApi'
import { useAuth } from './useAuth'
import type {
  OrgConfig,
  PeopleConfig,
  PrivilegedConfig,
  Project,
} from '../types/config'

interface ConfigValue {
  projects: Project[]
  org: OrgConfig | null
  people: PeopleConfig | null
  privileged: PrivilegedConfig | null
  loading: boolean
  error: GitHubError | Error | null
  reload: () => Promise<void>
}

const ConfigContext = createContext<ConfigValue | null>(null)

/**
 * The config repo is read once and all pages share the same copy.
 * If each page made its own request, GitHub's hourly rate limit would deplete quickly.
 */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const { client, status, signOut } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [org, setOrg] = useState<OrgConfig | null>(null)
  const [people, setPeople] = useState<PeopleConfig | null>(null)
  const [privileged, setPrivileged] = useState<PrivilegedConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<GitHubError | Error | null>(null)

  const reload = useCallback(async () => {
    if (!client) return
    setLoading(true)
    setError(null)

    try {
      const [nextProjects, nextOrg, nextPeople, nextPrivileged] = await Promise.all([
        loadProjects(client),
        // If organization.yml / people.yml / privileged.yml cannot be read, the list
        // is still displayed: all are only enrichments (default rules, roles).
        loadOrgConfig(client).catch(() => null),
        loadPeople(client).catch(() => null),
        loadPrivileged(client).catch(() => null),
      ])
      setProjects(nextProjects)
      setOrg(nextOrg)
      setPeople(nextPeople)
      setPrivileged(nextPrivileged)
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
    () => ({ projects, org, people, privileged, loading, error, reload }),
    [projects, org, people, privileged, loading, error, reload],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig(): ConfigValue {
  const value = useContext(ConfigContext)
  if (!value) throw new Error('useConfig must be used within ConfigProvider')
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
