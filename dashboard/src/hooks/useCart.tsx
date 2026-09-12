import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * CHANGE CART + BATCH MODE.
 *
 * Normally every mutation immediately opens a PR. When "Batch mode" is enabled,
 * operations accumulate in a cart; then all are applied as a SINGLE PR + SINGLE apply
 * (proposeMultiChange). Onboarding 10 interns at once is handled this way.
 *
 * An item transforms a single config file (`transform`). If multiple items target
 * the same file, they are composed sequentially during apply (reduce) — transform always
 * operates on the current text, making merging conflict-free.
 *
 * Cart lives in memory; refresh/tab close clears it (intentional in v1).
 */
export interface CartItem {
  id: string
  /** Path of config file from repo root (grouping key). */
  file: string
  /** Short summary shown in the cart list: "payment-service: +ali (developer)". */
  summary: string
  /** Bullet point included in the PR body. */
  detail: string
  /** Transforms the current text of the file into new text (comment-preserving applyEdits, etc.). */
  transform: (text: string) => string
}

interface CartValue {
  batchMode: boolean
  setBatchMode: (on: boolean) => void
  items: CartItem[]
  count: number
  add: (item: Omit<CartItem, 'id'>) => void
  remove: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)

let seq = 0

export function CartProvider({ children }: { children: ReactNode }) {
  const [batchMode, setBatchMode] = useState(false)
  const [items, setItems] = useState<CartItem[]>([])

  const add = useCallback((item: Omit<CartItem, 'id'>) => {
    seq += 1
    setItems((prev) => [...prev, { ...item, id: `c${Date.now()}-${seq}` }])
  }, [])
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartValue>(
    () => ({ batchMode, setBatchMode, items, count: items.length, add, remove, clear }),
    [batchMode, items, add, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
