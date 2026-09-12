import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  DeviceFlowError,
  isDeviceFlowConfigured,
  pollForToken,
  requestDeviceCode,
} from '../services/deviceFlow'
import { GitHubError } from '../services/githubApi'
import { useT } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import type { DeviceCodeResponse } from '../types/github'

type Phase = 'idle' | 'requesting' | 'waiting' | 'authorizing'

function errorMessage(error: unknown): string {
  if (error instanceof DeviceFlowError) return error.userMessage
  if (error instanceof GitHubError) return error.userMessage
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}

export function Login() {
  const { signIn } = useAuth()
  const t = useT()
  const [phase, setPhase] = useState<Phase>('idle')
  const [device, setDevice] = useState<DeviceCodeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [manualToken, setManualToken] = useState('')
  // Sign in with token is dev-only: a PAT bypasses GitHub App installation
  // constraints, which would breach security boundaries in production.
  const manualAllowed = import.meta.env.DEV
  const [showManual, setShowManual] = useState(manualAllowed && !isDeviceFlowConfigured())
  const abort = useRef<AbortController | null>(null)

  // Stop polling if navigating away from the page.
  useEffect(() => () => abort.current?.abort(), [])

  async function startDeviceFlow() {
    setError(null)
    setPhase('requesting')

    try {
      const response = await requestDeviceCode()
      setDevice(response)
      setPhase('waiting')

      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller

      const token = await pollForToken({
        deviceCode: response.device_code,
        interval: response.interval,
        expiresIn: response.expires_in,
        signal: controller.signal,
      })

      setPhase('authorizing')
      await signIn(token)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(errorMessage(caught))
      setPhase('idle')
      setDevice(null)
    }
  }

  async function submitManualToken(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPhase('authorizing')
    try {
      await signIn(manualToken.trim())
    } catch (caught) {
      setError(errorMessage(caught))
      setPhase('idle')
    }
  }

  async function copyCode() {
    if (!device) return
    try {
      await navigator.clipboard.writeText(device.user_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* if clipboard permission is missing, code is already on screen */
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card stack" style={{ gap: 'var(--sp-5)' }}>
        <div className="stack" style={{ alignItems: 'center', gap: 'var(--sp-3)' }}>
          <svg viewBox="0 0 32 32" width="48" height="48" aria-hidden="true">
            <g fill="#2f6fed">
              <rect x="2" y="12" width="8" height="8" rx="2" />
              <rect x="2" y="22" width="8" height="8" rx="2" />
              <rect x="12" y="22" width="8" height="8" rx="2" />
            </g>
            <g fill="#5b8ff5">
              <rect x="2" y="2" width="8" height="8" rx="2" />
              <rect x="12" y="12" width="8" height="8" rx="2" />
              <rect x="22" y="22" width="8" height="8" rx="2" />
            </g>
          </svg>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)' }}>{t('login.title')}</h1>
            <p className="subtle">{t('login.subtitle')}</p>
          </div>
        </div>

        {phase !== 'waiting' && (
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            onClick={startDeviceFlow}
            disabled={phase === 'requesting' || phase === 'authorizing'}
          >
            {(phase === 'requesting' || phase === 'authorizing') && (
              <span className="spinner" aria-hidden="true" />
            )}
            {phase === 'authorizing' ? t('login.authorizing') : t('login.signIn')}
          </button>
        )}

        {phase === 'waiting' && device && (
          <div className="stack" style={{ gap: 'var(--sp-4)' }}>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              1. Open the page below · 2. Enter this code · 3. Return to this screen
            </p>

            <code className="device-code">{device.user_code}</code>

            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-sm" onClick={copyCode}>
                {copied ? 'Copied ✓' : 'Copy code'}
              </button>
              <a
                className="btn btn-primary btn-sm"
                href={device.verification_uri}
                target="_blank"
                rel="noreferrer"
              >
                Confirm on GitHub ↗
              </a>
            </div>

            <div className="row" style={{ justifyContent: 'center' }}>
              <span className="spinner" aria-hidden="true" />
              <span className="subtle">Waiting for confirmation…</span>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                abort.current?.abort()
                setPhase('idle')
                setDevice(null)
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        {manualAllowed && <hr className="divider" />}

        {manualAllowed &&
          (showManual ? (
            <form className="stack" onSubmit={submitManualToken} style={{ textAlign: 'left' }}>
              <div className="field">
                <label className="label" htmlFor="pat">
                  Sign in with personal access token
                </label>
                <input
                  id="pat"
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder="ghp_… or github_pat_…"
                  value={manualToken}
                  onChange={(event) => setManualToken(event.target.value)}
                />
                <span className="hint">
                  For development/testing only (hidden in production builds).
                  `repo` scope is sufficient. Token is only kept in this tab.
                </span>
              </div>
              <button
                type="submit"
                className="btn btn-block"
                disabled={!manualToken.trim() || phase === 'authorizing'}
              >
                Continue with token
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowManual(true)}
            >
              Advanced: sign in with token
            </button>
          ))}
      </div>
    </div>
  )
}
