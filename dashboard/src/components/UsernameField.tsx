import { useState } from 'react'
import { useT } from '../i18n'
import { useClient } from '../hooks/useAuth'
import { validateUsername } from '../services/validation'
import { GitHubError } from '../services/githubApi'
import type { GitHubUser } from '../types/github'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  /** Validation result. If `members` is provided: org member? Otherwise: exists on GitHub? */
  onVerified?: (ok: boolean) => void
  /**
   * In default mode, resolves to the user (avatar + display name) when GitHub validation
   * succeeds; `null` when field is cleared / validation fails. Allows the caller
   * to display a "who are we adding" preview.
   */
  onResolved?: (user: GitHubUser | null) => void
  hint?: string
  /**
   * If provided, the field becomes a MEMBER PICKER: autocomplete comes from this list and only
   * someone in the list (org member) is accepted. No request is sent to GitHub — members are already
   * verified. Used when adding mentor/developer to repo; since engine rejects non-org members anyway,
   * preventing it here is proper and faster.
   */
  members?: string[]
}

type Check = 'idle' | 'checking' | 'ok' | 'missing' | 'error'

/**
 * GitHub username input. Two modes:
 *  - Default: on blur, validates user exists via `GET /users/{login}`.
 *  - When `members` provided: org member picker (datalist autocomplete + local validation).
 */
export function UsernameField({
  label,
  value,
  onChange,
  onVerified,
  onResolved,
  hint,
  members,
}: Props) {
  const t = useT()
  const client = useClient()
  const [check, setCheck] = useState<Check>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const listId = `members-${label}`

  async function verify() {
    const login = value.trim()
    if (!login) {
      setCheck('idle')
      setMessage(null)
      onResolved?.(null)
      return
    }

    // Member picker mode — local check, does not call GitHub.
    if (members) {
      const found = members.some((m) => m.toLowerCase() === login.toLowerCase())
      if (found) {
        setCheck('ok')
        setMessage(t('ui.orgMemberOk', { login }))
        onVerified?.(true)
      } else {
        setCheck('missing')
        setMessage(t('ui.notOrgMember'))
        onVerified?.(false)
      }
      return
    }

    const formatError = validateUsername(login)
    if (formatError) {
      setCheck('error')
      setMessage(formatError)
      onVerified?.(false)
      onResolved?.(null)
      return
    }

    setCheck('checking')
    try {
      const user = await client.userExists(login)
      if (user) {
        setCheck('ok')
        setMessage(t('ui.githubFound', { name: user.name ?? user.login }))
        onVerified?.(true)
        onResolved?.(user)
      } else {
        setCheck('missing')
        setMessage(t('ui.githubNotFound'))
        onVerified?.(false)
        onResolved?.(null)
      }
    } catch (error) {
      setCheck('error')
      setMessage(
        error instanceof GitHubError ? error.userMessage : t('ui.verifyFailed'),
      )
      onVerified?.(false)
      onResolved?.(null)
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
        list={members ? listId : undefined}
        placeholder={members ? t('ui.selectMemberPlaceholder') : t('ui.usernamePlaceholder')}
        aria-invalid={invalid}
        onChange={(event) => {
          onChange(event.target.value)
          setCheck('idle')
          setMessage(null)
          onVerified?.(false)
          onResolved?.(null)
        }}
        onBlur={verify}
      />
      {members && (
        <datalist id={listId}>
          {members.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      )}
      {hint && !message && <span className="hint">{hint}</span>}
      {check === 'checking' && <span className="hint">{t('ui.checking')}</span>}
      {message && (
        <span className={invalid ? 'field-error' : 'hint'}>
          {check === 'ok' ? '✓ ' : ''}
          {message}
        </span>
      )}
    </div>
  )
}
