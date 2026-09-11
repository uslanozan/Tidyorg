import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'tidyorg.dashboard.theme'

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* depolama kapalı olabilir */
  }
  return 'system'
}

/**
 * Varsayılan sistem tercihidir (`prefers-color-scheme`); kullanıcı isterse
 * ezebilir. Seçim `data-theme` özniteliğine yazılır, renkler tokens.css'te.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice)

  useEffect(() => {
    const root = document.documentElement
    if (choice === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', choice)

    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      /* yoksay */
    }
  }, [choice])

  const cycle = useCallback(() => {
    setChoice((current) =>
      current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system',
    )
  }, [])

  return { choice, setChoice, cycle }
}
