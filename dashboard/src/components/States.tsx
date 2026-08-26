import type { ReactNode } from 'react'
import { GitHubError } from '../services/githubApi'

/** Yükleniyor — iskelet blok. */
export function Skeleton({ height = 14, width = '100%' }: { height?: number; width?: string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid-cards" aria-busy="true" aria-label="Projeler yükleniyor">
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

/** Hata — GitHubError ise kullanıcıya dönük Türkçe mesajı gösterir. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: Error | GitHubError
  onRetry?: () => void
}) {
  const message =
    error instanceof GitHubError ? error.userMessage : (error.message ?? 'Bilinmeyen hata')

  return (
    <div className="state" role="alert">
      <div className="state-icon" aria-hidden="true">
        ⚠️
      </div>
      <div className="state-title">Bir şeyler ters gitti</div>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Tekrar dene
        </button>
      )}
    </div>
  )
}
