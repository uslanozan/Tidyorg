import { CLIENT_ID, OAUTH_PROXY } from './env'
import type { AccessTokenResponse, DeviceCodeResponse } from '../types/github'

/**
 * GitHub App Device Flow.
 *
 * Statik SPA `client_secret` saklayamaz; Device Flow yalnızca `client_id`
 * ister. Tek pürüz CORS: github.com/login/* uçları tarayıcıya izin vermez,
 * bu yüzden istekler `OAUTH_PROXY` yolu üzerinden geçer (dev'de Vite proxy'si,
 * prod'da hosting rewrite'ı — çalışan bir sunucu kodu yok).
 *
 * `scope` GÖNDERİLMEZ: GitHub App'te yetki, App'in yüklü olduğu izinlerden gelir
 * (Contents RW, Pull requests RW, Metadata R) — OAuth scope'u yok. Kullanıcının
 * neye erişebileceğini App kurulumu belirler; kurulu olmayan repo'da GitHub 403 döner.
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
      'GitHub\'a ulaşılamadı. Bağlantınızı ve OAuth proxy ayarını kontrol edin.',
    )
  }

  if (!response.ok) {
    throw new DeviceFlowError(
      `HTTP ${response.status} — ${path}`,
      response.status === 404
        ? 'OAuth proxy yolu bulunamadı. VITE_OAUTH_PROXY ayarını kontrol edin.'
        : `GitHub giriş servisi hata döndü (HTTP ${response.status}).`,
    )
  }

  return (await response.json()) as T
}

export function isDeviceFlowConfigured(): boolean {
  return CLIENT_ID.trim().length > 0
}

/** 1. adım — kullanıcıya gösterilecek kodu al. */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  if (!isDeviceFlowConfigured()) {
    throw new DeviceFlowError(
      'VITE_GITHUB_CLIENT_ID tanımsız',
      'GitHub App henüz bağlanmadı (VITE_GITHUB_CLIENT_ID boş). Aşağıdaki token ile girişi kullanabilirsiniz.',
    )
  }

  const data = await postForm<DeviceCodeResponse & { error?: string }>(
    '/login/device/code',
    { client_id: CLIENT_ID },
  )

  if (data.error) {
    throw new DeviceFlowError(
      data.error,
      'GitHub cihaz kodu vermedi. GitHub App\'te "Enable Device Flow" işaretli mi?',
    )
  }

  return data
}

export interface PollOptions {
  deviceCode: string
  /** GitHub'ın söylediği bekleme aralığı (saniye). */
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
 * 2. adım — kullanıcı kodu girene kadar `interval` aralığıyla yokla.
 * Token dönene ya da kod süresi dolana kadar sürer.
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
        break // kullanıcı henüz onaylamadı — beklemeye devam
      case 'slow_down':
        // GitHub çok sık sorduğumuzu söylüyor; aralığı kendi verdiği kadar aç.
        waitMs = Math.max(waitMs + 5000, (data.interval ?? 0) * 1000)
        break
      case 'expired_token':
        throw new DeviceFlowError(
          'expired_token',
          'Kodun süresi doldu. Lütfen yeniden giriş başlatın.',
        )
      case 'access_denied':
        throw new DeviceFlowError('access_denied', 'Giriş isteği reddedildi.')
      default:
        throw new DeviceFlowError(
          data.error ?? 'unknown',
          data.error_description ?? 'Giriş tamamlanamadı.',
        )
    }
  }

  throw new DeviceFlowError(
    'timeout',
    'Kodun süresi doldu. Lütfen yeniden giriş başlatın.',
  )
}
