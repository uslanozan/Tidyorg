import { useState } from 'react'
import { useClient } from '../hooks/useAuth'
import { validateUsername } from '../services/validation'
import { GitHubError } from '../services/githubApi'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  /** Doğrulama sonucu: GitHub'da var mı? */
  onVerified?: (exists: boolean) => void
  hint?: string
}

type Check = 'idle' | 'checking' | 'ok' | 'missing' | 'error'

/**
 * GitHub kullanıcı adı girişi — alandan çıkınca `GET /users/{login}` ile
 * kullanıcının gerçekten var olduğunu doğrular. Var olmayan bir kullanıcıyı
 * config'e yazmak Terraform apply'ını patlatır; hatayı burada yakalamak ucuz.
 */
export function UsernameField({ label, value, onChange, onVerified, hint }: Props) {
  const client = useClient()
  const [check, setCheck] = useState<Check>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function verify() {
    const login = value.trim()
    if (!login) {
      setCheck('idle')
      setMessage(null)
      return
    }

    const formatError = validateUsername(login)
    if (formatError) {
      setCheck('error')
      setMessage(formatError)
      onVerified?.(false)
      return
    }

    setCheck('checking')
    try {
      const user = await client.userExists(login)
      if (user) {
        setCheck('ok')
        setMessage(`${user.name ?? user.login} — GitHub'da bulundu`)
        onVerified?.(true)
      } else {
        setCheck('missing')
        setMessage('Bu kullanıcı adı GitHub\'da bulunamadı.')
        onVerified?.(false)
      }
    } catch (error) {
      setCheck('error')
      setMessage(
        error instanceof GitHubError ? error.userMessage : 'Doğrulama yapılamadı.',
      )
      onVerified?.(false)
    }
  }

  const invalid = check === 'missing' || check === 'error'

  return (
    <div className="field">
      <label className="label" htmlFor={`username-${label}`}>
        {label}
      </label>
      <input
        id={`username-${label}`}
        className="input"
        value={value}
        autoComplete="off"
        placeholder="github-kullanici-adi"
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.value)
          setCheck('idle')
          setMessage(null)
          onVerified?.(false)
        }}
        onBlur={verify}
      />
      {hint && !message && <span className="hint">{hint}</span>}
      {check === 'checking' && <span className="hint">Kontrol ediliyor…</span>}
      {message && (
        <span className={invalid ? 'field-error' : 'hint'}>
          {check === 'ok' ? '✓ ' : ''}
          {message}
        </span>
      )}
    </div>
  )
}
