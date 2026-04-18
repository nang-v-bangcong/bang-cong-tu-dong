import { useCallback, useEffect } from 'react'

interface Opts {
  today: string
  yearMonth: string
  getTarget: (today: string) => HTMLElement | null
  scrollOpts: ScrollIntoViewOptions
  bindKey: boolean
}

export function useTodayScroll({ today, yearMonth, getTarget, scrollOpts, bindKey }: Opts) {
  const hasToday = !!today && today.startsWith(yearMonth + '-')

  const onGoToday = useCallback(() => {
    if (!hasToday) return
    getTarget(today)?.scrollIntoView(scrollOpts)
  }, [hasToday, today, getTarget, scrollOpts])

  useEffect(() => {
    if (!bindKey) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); onGoToday() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bindKey, onGoToday])

  return { hasToday, onGoToday }
}
