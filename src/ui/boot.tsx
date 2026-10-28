import type { ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/fonts'
import '../styles/base.css'
import { applyAppearance } from '../lib/appearance'

export async function boot(App: ComponentType) {
  applyAppearance()
  // `npm run dev` previews the pages in a normal tab, where the extension APIs are faked.
  if (import.meta.env.DEV && (typeof chrome === 'undefined' || !chrome.runtime?.id)) await import('../dev/mock-chrome')
  createRoot(document.getElementById('root')!).render(<App />)
}
