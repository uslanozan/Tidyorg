/** .env üzerinden gelen ayarlar tek yerde toplanır (bkz. .env.example). */

export const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID ?? ''

export const CONFIG_OWNER = import.meta.env.VITE_CONFIG_OWNER ?? 'your-org'
export const CONFIG_REPO =
  import.meta.env.VITE_CONFIG_REPO ?? 'Tidyorg'
export const CONFIG_BRANCH = import.meta.env.VITE_CONFIG_BRANCH ?? 'main'

/** github.com'un OAuth uçlarına giden proxy yolu — CORS için gerekli. */
export const OAUTH_PROXY = import.meta.env.VITE_OAUTH_PROXY || '/gh-oauth'

/** Config repo'sundaki sabit yollar. */
export const PATHS = {
  repositories: 'terraform/config/repositories',
  organization: 'terraform/config/organization.yml',
  people: 'terraform/config/people.yml',
} as const

export const repoUrl = (name: string) =>
  `https://github.com/${CONFIG_OWNER}/${name}`

export const configFileUrl = (path: string) =>
  `https://github.com/${CONFIG_OWNER}/${CONFIG_REPO}/blob/${CONFIG_BRANCH}/${path}`
