import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { messages, type Lang } from './messages'

const STORAGE_KEY = 'tidyorg.dashboard.lang'

type Vars = Record<string, string | number>

/** Stored selection → browser language → English. */
function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'tr' || saved === 'en') return saved
  } catch {
    /* private mode etc. — ignore silently */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : ''
  return nav.startsWith('tr') ? 'tr' : 'en'
}

/** Dot-path translation; falls back to tr if missing, then to key. */
function resolve(lang: Lang, key: string, vars?: Vars): string {
  const read = (dict: unknown): string | undefined => {
    let node: unknown = dict
    for (const part of key.split('.')) {
      if (node && typeof node === 'object') node = (node as Record<string, unknown>)[part]
      else return undefined
    }
    return typeof node === 'string' ? node : undefined
  }

  let text = read(messages[lang]) ?? read(messages.tr) ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  }
  return text
}

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  t: (key: string, vars?: Vars) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  useEffect(() => {
    try {
      document.documentElement.lang = lang
    } catch {
      /* ignore */
    }
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === 'tr' ? 'en' : 'tr'),
      t: (key, vars) => resolve(lang, key, vars),
    }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within I18nProvider')
  return value
}

/** Shortcut: for components that only need the translation function. */
export function useT() {
  return useI18n().t
}
