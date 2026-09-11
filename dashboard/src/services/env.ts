/**
 * Ayarlar tek yerde toplanır (bkz. .env.example).
 *
 * İki kaynak, bu sırayla:
 *   1. `window.__ENV__` — çalışma zamanında enjekte edilir. Docker image'ında
 *      entrypoint `env.js`'i konteyner ortam değişkenlerinden üretir; aynı image
 *      farklı org'lara yeniden derlenmeden çalışır.
 *   2. `import.meta.env` — Vite'ın build sırasında gömdüğü `.env` değerleri.
 *      Yerel geliştirmede ve statik hosting'de (Vercel/Netlify) kullanılır.
 *
 * `window.__ENV__` her zaman kazanır; dev'de `public/env.js` boş nesne verir.
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

/** github.com'un OAuth uçlarına giden proxy yolu — CORS için gerekli. */
export const OAUTH_PROXY = readEnv('VITE_OAUTH_PROXY') || '/gh-oauth'

/** Config repo'sundaki sabit yollar. */
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
