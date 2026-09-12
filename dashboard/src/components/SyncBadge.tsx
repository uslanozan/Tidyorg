import { useI18n } from '../i18n'
import { useSyncStatus } from '../hooks/useSyncStatus'

/**
 * Live sync badge in the header: displays apply status between
 * config (main) and GitHub reality. Source: terraform-apply workflow run (useSyncStatus).
 * Shows "off" if Actions:Read permission is missing; hidden completely on transient unknowns.
 */
export function SyncBadge() {
  const sync = useSyncStatus()
  const { t } = useI18n()

  // If permission is missing: gentle hint to user (enabled once Actions:Read is added).
  if (sync.forbidden) {
    return (
      <span className="badge" title={t('sync.forbiddenHint')} style={{ opacity: 0.65 }}>
        {t('sync.off')}
      </span>
    )
  }
  // Transient unknown / no run: keep badge hidden.
  if (sync.state === 'unknown') return null

  const meta =
    sync.state === 'applying'
      ? { className: 'badge', label: t('sync.applying'), spinner: true, dot: '' }
      : sync.state === 'error'
        ? { className: 'badge badge-danger', label: t('sync.error'), spinner: false, dot: 'var(--danger)' }
        : { className: 'badge badge-success', label: t('sync.inSync'), spinner: false, dot: 'var(--success)' }

  const inner = (
    <>
      {meta.spinner ? (
        <span className="spinner" style={{ width: 12, height: 12 }} aria-hidden="true" />
      ) : (
        <span className="badge-dot" style={{ background: meta.dot }} aria-hidden="true" />
      )}
      {meta.label}
    </>
  )

  return sync.runUrl ? (
    <a
      className={meta.className}
      href={sync.runUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`${t('sync.aria')}: ${meta.label}`}
      title={t('sync.aria')}
      style={{ textDecoration: 'none' }}
    >
      {inner}
    </a>
  ) : (
    <span className={meta.className} aria-label={`${t('sync.aria')}: ${meta.label}`}>
      {inner}
    </span>
  )
}
