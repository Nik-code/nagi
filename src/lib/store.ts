import type { Archived, Favorite, State } from './types'

export const DEFAULT_STATE: State = {
  settings: { appearance: 'auto', autoArchiveHours: 0, name: '', newTab: true, panel: true, toolbar: 'command' },
  favorites: [],
  archive: [],
}

const ARCHIVE_LIMIT = 300

export async function loadState(): Promise<State> {
  const stored = (await chrome.storage.local.get(DEFAULT_STATE)) as State
  return { ...stored, settings: { ...DEFAULT_STATE.settings, ...stored.settings } }
}

export function saveState(patch: Partial<State>) {
  return chrome.storage.local.set(patch)
}

export const newId = () => crypto.randomUUID()

export async function addFavorite(title: string, url: string) {
  const { favorites } = await loadState()
  if (favorites.some((f) => f.url === url)) return
  const next: Favorite = { id: newId(), title, url }
  await saveState({ favorites: [...favorites, next] })
}

export async function removeFavorite(id: string) {
  const { favorites } = await loadState()
  await saveState({ favorites: favorites.filter((f) => f.id !== id) })
}

export async function archiveTabs(tabs: chrome.tabs.Tab[]) {
  const closable = tabs.filter((t) => t.id !== undefined && t.url)
  if (!closable.length) return 0
  const entries: Archived[] = closable.map((t) => ({
    id: newId(),
    title: t.title || t.url!,
    url: t.url!,
    archivedAt: Date.now(),
  }))
  const { archive } = await loadState()
  await saveState({ archive: [...entries, ...archive].slice(0, ARCHIVE_LIMIT) })
  await chrome.tabs.remove(closable.map((t) => t.id!))
  return closable.length
}

export async function takeArchived(id: string) {
  const { archive } = await loadState()
  const entry = archive.find((a) => a.id === id)
  await saveState({ archive: archive.filter((a) => a.id !== id) })
  return entry
}
