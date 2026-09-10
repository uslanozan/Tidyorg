import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/**
 * DEĞİŞİKLİK SEPETİ + TOPLU MOD.
 *
 * Normalde her mutasyon anında bir PR açar. "Toplu mod" açıkken işlemler bir
 * sepete birikir; sonra hepsi TEK PR + TEK apply olarak uygulanır
 * (proposeMultiChange). 10 stajyeri tek seferde onboard etmek buradan geçer.
 *
 * Bir öğe tek bir config dosyasını dönüştürür (`transform`). Aynı dosyaya birden
 * çok öğe düşerse apply sırasında sırayla bestelenir (reduce) — transform daima
 * güncel metin üzerinde çalışır, o yüzden birleşme çakışmasızdır.
 *
 * Sepet bellekte yaşar; F5/sekme kapanışı temizler (bilinçli — v1, kasmıyoruz).
 */
export interface CartItem {
  id: string
  /** Repo kökünden config dosyası yolu (gruplama anahtarı). */
  file: string
  /** Sepet listesinde görünen kısa özet: "odeme-servisi: +ali (developer)". */
  summary: string
  /** PR gövdesine giren madde. */
  detail: string
  /** Dosyanın güncel metnini yeni metne dönüştürür (yorum-koruyan applyEdits vb.). */
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
