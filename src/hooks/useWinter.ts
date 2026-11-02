import { useCallback, useEffect, useState } from 'react'

const KEY = 'winter-mode'

/** По умолчанию зимний режим включён с ноября по февраль; ручной выбор запоминается. */
function initial(): boolean {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'on') return true
    if (v === 'off') return false
  } catch {
    /* приватный режим */
  }
  const m = new Date().getMonth()
  return m >= 10 || m <= 1
}

export function useWinter() {
  const [winter, setWinter] = useState(initial)

  useEffect(() => {
    document.documentElement.classList.toggle('winter', winter)
  }, [winter])

  const toggle = useCallback(() => {
    setWinter((w) => {
      try {
        localStorage.setItem(KEY, w ? 'off' : 'on')
      } catch {
        /* приватный режим */
      }
      return !w
    })
  }, [])

  return { winter, toggle }
}
