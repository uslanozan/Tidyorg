import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
  /** Toast içinde gösterilecek bağlantı (örn. açılan PR). */
  link?: { href: string; label: string }
}

interface ToastValue {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>, durationMs?: number) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastValue | null>(null)

const DEFAULTS: Record<ToastKind, number> = {
  success: 7000,
  info: 5000,
  warning: 8000,
  error: 10000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback<ToastValue['push']>(
    (toast, durationMs) => {
      const id = nextId.current++
      setToasts((current) => [...current, { ...toast, id }])
      setTimeout(() => dismiss(id), durationMs ?? DEFAULTS[toast.kind])
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast yalnızca ToastProvider içinde kullanılabilir')
  return value
}
