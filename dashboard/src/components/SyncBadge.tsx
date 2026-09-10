import { useI18n } from '../i18n'
import { useSyncStatus } from '../hooks/useSyncStatus'

/**
 * Header'da canlı senkron rozeti: config (main) ile GitHub gerçeği arasındaki
 * apply durumunu gösterir. Kaynak: terraform-apply workflow run'ı (useSyncStatus).
 * Actions:Read izni yoksa "kapalı" gösterir; geçici bilinmezlikte hiç görünmez.
 */
export function SyncBadge() {
  const sync = useSyncStatus()
  const { t } = useI18n()

  // İzin yoksa: kullanıcıya nazik ipucu (Actions:Read eklerse açılır).
  if (sync.forbidden) {
    return (
      <span className="badge" title={t('sync.forbiddenHint')} style={{ opacity: 0.65 }}>
        {t('sync.off')}
      </span>
    )
  }
  // Geçici bilinmezlik / run yok: rozet gizli kalsın.
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
