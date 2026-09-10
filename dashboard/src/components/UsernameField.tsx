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
  /** Doğrulama sonucu. `members` verildiyse: org üyesi mi? Aksi halde: GitHub'da var mı? */
  onVerified?: (ok: boolean) => void
  /**
   * Varsayılan modda GitHub doğrulaması başarılı olunca çözülen kullanıcı (avatar +
   * gerçek ad) döner; alan boşaldığında / doğrulama başarısızsa `null`. Çağıran taraf
   * "kimi ekliyoruz" önizlemesi gösterebilsin diye.
   */
  onResolved?: (user: GitHubUser | null) => void
  hint?: string
  /**
   * Verilirse alan bir ÜYE SEÇİCİ olur: autocomplete bu listeden gelir ve yalnızca
   * listedeki (org üyesi) biri kabul edilir. GitHub'a istek atılmaz — üyeler zaten
   * doğrulanmış. Repo'ya mentör/developer eklerken kullanılır; engine org üyesi
   * olmayan birini zaten reddettiği için burada da engellemek doğru ve daha hızlı.
   */
  members?: string[]
}

type Check = 'idle' | 'checking' | 'ok' | 'missing' | 'error'

/**
 * GitHub kullanıcı adı girişi. İki mod:
 *  - Varsayılan: alandan çıkınca `GET /users/{login}` ile kullanıcının var olduğunu doğrular.
 *  - `members` verildiğinde: org üyesi seçici (datalist autocomplete + yerel doğrulama).
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

    // Üye seçici modu — yerel kontrol, GitHub'a gitmez.
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
