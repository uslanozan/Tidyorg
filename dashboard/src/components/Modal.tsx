import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Esc ile kapanan diyalog. Açılınca odağı içine alır, Tab ile odak panelde
 * hapsolur (arka plana kaçmaz) ve kapanınca odak tetikleyen öğeye geri döner.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!focusables || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    panel.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Odağı, diyaloğu açan öğeye (buton) geri ver — klavye kullanıcısı kaybolmasın.
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <h2 style={{ marginBottom: 'var(--sp-4)' }}>{title}</h2>
        {children}
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmProps {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Onayla',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Vazgeç
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <span className="spinner" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  )
}
