import type { Appearance } from './types'

const KEY = 'nagi.appearance'

// Cached in localStorage so the first paint already has the right palette.
export function applyAppearance(value?: Appearance) {
  const next = value ?? readCached()
  document.documentElement.dataset.appearance = next
  if (!value) return
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // storage unavailable; the attribute is already set
  }
}

function readCached(): Appearance {
  try {
    return (localStorage.getItem(KEY) as Appearance | null) ?? 'auto'
  } catch {
    return 'auto'
  }
}

export const nextAppearance = (current: Appearance): Appearance =>
  current === 'auto' ? 'oat' : current === 'oat' ? 'sumi' : 'auto'
