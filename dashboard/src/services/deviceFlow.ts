import { CLIENT_ID, OAUTH_PROXY } from './env'
import type { AccessTokenResponse, DeviceCodeResponse } from '../types/github'

/**
 * GitHub App Device Flow.
 *
 * A static SPA cannot store a `client_secret`; Device Flow requires only a `client_id`.
 * The only catch is CORS: github.com/login/* endpoints do not allow browsers,
 * which is why requests route through the `OAUTH_PROXY` path (Vite proxy in dev,
 * hosting rewrite in prod — no running server code).
 *
 * `scope` IS NOT SENT: in a GitHub App, permissions come from the installed permissions
 * of the App (Contents RW, Pull requests RW, Metadata R) — there are no OAuth scopes.
 * The App installation determines what the user can access; GitHub returns 403 for uninstalled repos.
 */

export class DeviceFlowError extends Error {
  readonly userMessage: string
  constructor(message: string, userMessage: string) {
    super(message)
    this.name = 'DeviceFlowError'
    this.userMessage = userMessage
  }
}

async function postForm<T>(path: string, params: Record<string, string>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${OAUTH_PROXY}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    })
  } catch (cause) {
    throw new DeviceFlowError(
      String(cause),
      'Could not reach GitHub. Check your connection and OAuth proxy settings.',
    )
  }

  if (!response.ok) {
    throw new DeviceFlowError(
      `HTTP ${response.status} — ${path}`,
      response.status === 404
        ? 'OAuth proxy path not found. Check the VITE_OAUTH_PROXY setting.'
        : `GitHub login service returned an error (HTTP ${response.status}).`,
    )
  }

  return (await response.json()) as T
}

export function isDeviceFlowConfigured(): boolean {
  return CLIENT_ID.trim().length > 0
}

/** Step 1 — fetch the code to display to the user. */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  if (!isDeviceFlowConfigured()) {
    throw new DeviceFlowError(
      'VITE_GITHUB_CLIENT_ID undefined',
      'GitHub App is not connected yet (VITE_GITHUB_CLIENT_ID is empty). You can use token login below.',
    )
  }

  const data = await postForm<DeviceCodeResponse & { error?: string }>(
    '/login/device/code',
    { client_id: CLIENT_ID },
  )

  if (data.error) {
    throw new DeviceFlowError(
      data.error,
      'GitHub did not return a device code. Is "Enable Device Flow" checked in your GitHub App?',
    )
  }

  return data
}

export interface PollOptions {
  deviceCode: string
  /** Polling interval specified by GitHub (seconds). */
  interval: number
  expiresIn: number
  signal?: AbortSignal
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })

/**
 * Step 2 — poll at `interval` frequency until the user enters the code.
 * Continues until a token is returned or the code expires.
 */
export async function pollForToken({
  deviceCode,
  interval,
  expiresIn,
  signal,
}: PollOptions): Promise<string> {
  let waitMs = Math.max(interval, 5) * 1000
  const deadline = Date.now() + expiresIn * 1000

  while (Date.now() < deadline) {
    await sleep(waitMs, signal)

    const data = await postForm<AccessTokenResponse>('/login/oauth/access_token', {
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    if (data.access_token) return data.access_token

    switch (data.error) {
      case 'authorization_pending':
        break // user has not authorized yet — keep waiting
      case 'slow_down':
        // GitHub indicates we are polling too frequently; increase interval as specified.
        waitMs = Math.max(waitMs + 5000, (data.interval ?? 0) * 1000)
        break
      case 'expired_token':
        throw new DeviceFlowError(
          'expired_token',
          'Code has expired. Please initiate login again.',
        )
      case 'access_denied':
        throw new DeviceFlowError('access_denied', 'Login request was denied.')
      default:
        throw new DeviceFlowError(
          data.error ?? 'unknown',
          data.error_description ?? 'Login could not be completed.',
        )
    }
  }

  throw new DeviceFlowError(
    'timeout',
    'Code has expired. Please initiate login again.',
  )
}
