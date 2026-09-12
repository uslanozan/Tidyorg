import type {
  ContentEntry,
  ContentFile,
  GitHubUser,
  IssueComment,
  PullRequest,
} from '../types/github'

const API = 'https://api.github.com'

export type ErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'rate-limit'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'network'
  | 'unknown'

/**
 * Single error type: carries HTTP status, error kind, and a user-facing
 * message together. The UI layer displays `userMessage` directly.
 */
export class GitHubError extends Error {
  readonly status: number
  readonly kind: ErrorKind
  readonly userMessage: string
  readonly rateLimitReset?: Date

  constructor(
    status: number,
    kind: ErrorKind,
    message: string,
    userMessage: string,
    rateLimitReset?: Date,
  ) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.kind = kind
    this.userMessage = userMessage
    this.rateLimitReset = rateLimitReset
  }
}

function minutesUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60000))
}

async function toError(response: Response): Promise<GitHubError> {
  let detail = ''
  try {
    const body = (await response.json()) as { message?: string }
    detail = body?.message ?? ''
  } catch {
    detail = response.statusText
  }

  const remaining = response.headers.get('x-ratelimit-remaining')
  const resetHeader = response.headers.get('x-ratelimit-reset')

  if ((response.status === 403 || response.status === 429) && remaining === '0') {
    const reset = resetHeader ? new Date(Number(resetHeader) * 1000) : undefined
    const wait = reset ? `${minutesUntil(reset)} minute(s)` : 'a while'
    return new GitHubError(
      response.status,
      'rate-limit',
      detail,
      `GitHub API limit exceeded, try again after ${wait}.`,
      reset,
    )
  }

  switch (response.status) {
    case 401:
      return new GitHubError(
        401,
        'unauthorized',
        detail,
        'Session expired, please sign in again.',
      )
    case 403:
      return new GitHubError(
        403,
        'forbidden',
        detail,
        'You do not have GitHub permissions for this action. Ensure you have repository write access.',
      )
    case 404:
      return new GitHubError(404, 'not-found', detail, 'Record not found.')
    case 409:
      return new GitHubError(
        409,
        'conflict',
        detail,
        'File was modified by someone else in the meantime.',
      )
    case 422:
      // Contents API may return 422 instead of 409 when an old sha is sent.
      return new GitHubError(
        422,
        /sha|does not match|is at/i.test(detail) ? 'conflict' : 'validation',
        detail,
        detail || 'GitHub rejected the request (validation error).',
      )
    default:
      return new GitHubError(
        response.status,
        'unknown',
        detail,
        detail || `GitHub returned an unexpected response (HTTP ${response.status}).`,
      )
  }
}

/* ─── base64 <-> UTF-8 ────────────────────────────────────────────────────
   YAML files contain UTF-8 characters; btoa/atob alone corrupts them.     */

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

export function decodeBase64(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export interface GitHubClient {
  readonly token: string
  request<T>(path: string, init?: RequestInit): Promise<T>
  getUser(): Promise<GitHubUser>
  userExists(login: string): Promise<GitHubUser | null>
  listDirectory(owner: string, repo: string, path: string, ref: string): Promise<ContentEntry[]>
  getFile(owner: string, repo: string, path: string, ref: string): Promise<ContentFile>
  readTextFile(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<{ text: string; sha: string }>
  getBranchSha(owner: string, repo: string, branch: string): Promise<string>
  createBranch(owner: string, repo: string, branch: string, fromSha: string): Promise<void>
  putFile(args: PutFileArgs): Promise<void>
  createPullRequest(args: CreatePrArgs): Promise<PullRequest>
  listPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<PullRequest[]>
  listIssueComments(owner: string, repo: string, issueNumber: number): Promise<IssueComment[]>
}

export interface PutFileArgs {
  owner: string
  repo: string
  path: string
  branch: string
  message: string
  content: string
  /** undefined for new files; mandatory for updates (lost update protection). */
  sha?: string
}

export interface CreatePrArgs {
  owner: string
  repo: string
  title: string
  body: string
  head: string
  base: string
}

export function createGitHubClient(token: string): GitHubClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response
    try {
      response = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
        ...init,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers,
        },
      })
    } catch (cause) {
      throw new GitHubError(
        0,
        'network',
        String(cause),
        'Network error, please check your internet connection.',
      )
    }

    if (!response.ok) throw await toError(response)
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  const client: GitHubClient = {
    token,
    request,

    getUser: () => request<GitHubUser>('/user'),

    async userExists(login) {
      try {
        return await request<GitHubUser>(`/users/${encodeURIComponent(login)}`)
      } catch (error) {
        if (error instanceof GitHubError && error.kind === 'not-found') return null
        throw error
      }
    },

    listDirectory: (owner, repo, path, ref) =>
      request<ContentEntry[]>(
        `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
      ),

    getFile: (owner, repo, path, ref) =>
      request<ContentFile>(
        `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
      ),

    async readTextFile(owner, repo, path, ref) {
      const file = await client.getFile(owner, repo, path, ref)
      if (!file.content) {
        // For files > 1 MB, Contents API returns empty content; fall back to blob.
        const blob = await request<{ content: string }>(
          `/repos/${owner}/${repo}/git/blobs/${file.sha}`,
        )
        return { text: decodeBase64(blob.content), sha: file.sha }
      }
      return { text: decodeBase64(file.content), sha: file.sha }
    },

    async getBranchSha(owner, repo, branch) {
      const ref = await request<{ object: { sha: string } }>(
        `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      )
      return ref.object.sha
    },

    createBranch: (owner, repo, branch, fromSha) =>
      request<void>(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
      }),

    putFile: ({ owner, repo, path, branch, message, content, sha }) =>
      request<void>(`/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: encodeBase64(content),
          branch,
          ...(sha ? { sha } : {}),
        }),
      }),

    createPullRequest: ({ owner, repo, title, body, head, base }) =>
      request<PullRequest>(`/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({ title, body, head, base }),
      }),

    listPullRequests: (owner, repo, state = 'open') =>
      request<PullRequest[]>(
        `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&sort=created&direction=desc`,
      ),

    listIssueComments: (owner, repo, issueNumber) =>
      request<IssueComment[]>(
        `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
      ),
  }

  return client
}
