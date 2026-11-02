import { useCallback, useEffect, useState } from 'react'
import { useMediaQuery } from './useMediaQuery'

type Pref = 'light' | 'dark' | null

function readPref(): Pref {
  try {
    const v = localStorage.getItem('theme')
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** Тема: по умолчанию системная; ручной выбор запоминается. */
export function useTheme() {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [pref, setPref] = useState<Pref>(readPref)
  const dark = pref ? pref === 'dark' : systemDark

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-transition')
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    const t = setTimeout(() => root.classList.remove('theme-transition'), 500)
    return () => clearTimeout(t)
  }, [dark])

  const toggle = useCallback(() => {
    const next = dark ? 'light' : 'dark'
    // Если выбор совпал с системой — снова следуем за системой
    const nextPref: Pref = (next === 'dark') === systemDark ? null : next
    setPref(nextPref)
    try {
      if (nextPref) localStorage.setItem('theme', nextPref)
      else localStorage.removeItem('theme')
    } catch {
      /* приватный режим */
    }
  }, [dark, systemDark])

  return { dark, toggle }
}
