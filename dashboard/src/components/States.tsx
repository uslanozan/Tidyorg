import type { ReactNode } from 'react'
import { useT } from '../i18n'
import { GitHubError } from '../services/githubApi'

/** Yükleniyor — iskelet blok. */
export function Skeleton({ height = 14, width = '100%' }: { height?: number; width?: string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  const t = useT()
  return (
    <div className="grid-cards" aria-busy="true" aria-label={t('ui.projectsLoading')}>
      {Array.from({ length: count }, (_, index) => (
        <div className="card card-pad stack" key={index}>
          <Skeleton height={18} width="55%" />
          <Skeleton height={12} />
          <Skeleton height={12} width="80%" />
          <div className="row" style={{ marginTop: 'var(--sp-2)' }}>
            <Skeleton height={22} width="90px" />
            <Skeleton height={22} width="70px" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface StateProps {
  icon?: string
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: StateProps) {
  return (
    <div className="state">
      <div className="state-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="state-title">{title}</div>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

/**
 * Giriş başarılı ama GitHub App bu kullanıcı için config repo'suna kurulu değil
 * (Contents/PR isteği 403 döndü). Yetkiyi GitHub verir; panelde yapılacak bir şey yok.
 */
export function AccessDenied({
  login,
  onRetry,
}: {
  login?: string
  onRetry?: () => void
}) {
  const t = useT()
  return (
    <div className="login-wrap">
      <div className="card login-card stack" style={{ gap: 'var(--sp-4)', textAlign: 'center' }}>
        <div className="state-icon" aria-hidden="true">
          🔒
        </div>
        <div className="state-title">{t('ui.accessDeniedTitle')}</div>
        <p className="subtle">
          {t('ui.accessDeniedBody', { who: login ? login : t('ui.thisAccount') })}
        </p>
        {onRetry && (
          <button type="button" className="btn" onClick={onRetry}>
            {t('ui.retry')}
          </button>
        )}
      </div>
    </div>
  )
}

/** Hata — GitHubError ise kullanıcıya dönük Türkçe mesajı gösterir. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: Error | GitHubError
  onRetry?: () => void
}) {
  const t = useT()
  const message =
    error instanceof GitHubError ? error.userMessage : (error.message ?? t('ui.unknownError'))

  return (
    <div className="state" role="alert">
      <div className="state-icon" aria-hidden="true">
        ⚠️
      </div>
      <div className="state-title">{t('ui.errorTitle')}</div>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t('ui.retry')}
        </button>
      )}
    </div>
  )
}
