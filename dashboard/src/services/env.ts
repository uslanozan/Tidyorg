/**
 * Configuration is gathered in one place (see .env.example).
 *
 * Two sources, in this order:
 *   1. `window.__ENV__` — injected at runtime. In the Docker image, the
 *      entrypoint generates `env.js` from container environment variables; the same image
 *      runs for different orgs without rebuilding.
 *   2. `import.meta.env` — `.env` values embedded by Vite at build time.
 *      Used in local development and static hosting (Vercel/Netlify).
 *
 * `window.__ENV__` always wins; in dev, `public/env.js` provides an empty object.
 */

interface RuntimeEnv {
  VITE_GITHUB_CLIENT_ID?: string
  VITE_CONFIG_OWNER?: string
  VITE_CONFIG_REPO?: string
  VITE_CONFIG_BRANCH?: string
  VITE_OAUTH_PROXY?: string
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv
  }
}

function readEnv(key: keyof RuntimeEnv): string {
  const runtime = typeof window !== 'undefined' ? window.__ENV__?.[key] : undefined
  if (runtime !== undefined && runtime !== '') return runtime
  const built = import.meta.env[key] as string | undefined
  return built ?? ''
}

export const CLIENT_ID = readEnv('VITE_GITHUB_CLIENT_ID')

export const CONFIG_OWNER = readEnv('VITE_CONFIG_OWNER') || 'your-org'
export const CONFIG_REPO = readEnv('VITE_CONFIG_REPO') || 'tidyorg'
export const CONFIG_BRANCH = readEnv('VITE_CONFIG_BRANCH') || 'main'

/** Proxy path to github.com OAuth endpoints — required for CORS. */
export const OAUTH_PROXY = readEnv('VITE_OAUTH_PROXY') || '/gh-oauth'

/** Fixed paths in config repo. */
export const PATHS = {
  repositories: 'terraform/config/repositories',
  organization: 'terraform/config/organization.yml',
  people: 'terraform/config/people.yml',
  privileged: 'terraform/config/privileged.yml',
} as const

export const repoUrl = (name: string) =>
  `https://github.com/${CONFIG_OWNER}/${name}`

export const configFileUrl = (path: string) =>
  `https://github.com/${CONFIG_OWNER}/${CONFIG_REPO}/blob/${CONFIG_BRANCH}/${path}`
