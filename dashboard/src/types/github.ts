/** Fields of GitHub REST responses needed by the dashboard. */

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
}

export interface GitHubOrg {
  login: string
  name: string | null
  description: string | null
  /** Org website (can be a bare domain). */
  blog: string | null
  avatar_url: string
  html_url: string
}

export interface ContentFile {
  type: 'file'
  name: string
  path: string
  sha: string
  size: number
  /** base64 — populated only when a single file is fetched. */
  content?: string
  encoding?: string
  html_url: string
}

export interface ContentEntry {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  name: string
  path: string
  sha: string
  html_url: string
}

export interface PullRequest {
  number: number
  title: string
  html_url: string
  state: 'open' | 'closed'
  draft: boolean
  created_at: string
  merged_at: string | null
  user: Pick<GitHubUser, 'login' | 'avatar_url'> | null
  head: { ref: string; sha: string }
  base: { ref: string }
}

export interface IssueComment {
  id: number
  body: string
  created_at: string
  html_url: string
  user: Pick<GitHubUser, 'login' | 'avatar_url'> | null
}

/** Responses for the two steps of the Device Flow. */
export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface AccessTokenResponse {
  access_token?: string
  token_type?: string
  scope?: string
  error?: string
  error_description?: string
  interval?: number
}
