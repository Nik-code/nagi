import { useEffect, useState } from 'react'
import { applyAppearance } from './appearance'
import { loadState } from './store'
import type { State } from './types'

export function useStore() {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    let alive = true
    const refresh = () =>
      loadState().then((next) => {
        if (!alive) return
        applyAppearance(next.settings.appearance)
        setState(next)
      })
    const onChange = (_: unknown, area: string) => area === 'local' && refresh()
    refresh()
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      alive = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [])

  return state
}
