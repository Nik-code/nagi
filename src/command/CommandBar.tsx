import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { nextAppearance } from '../lib/appearance'
import { fuzzy } from '../lib/fuzzy'
import { addFavorite, archiveTabs, saveState, takeArchived } from '../lib/store'
import { closeDuplicates, focusAdjacentSpace, focusTab, markdownLink, newSpace, openUrl, searchWeb } from '../lib/tabs'
import type { State } from '../lib/types'
import { host, isOwnPage, toUrl } from '../lib/url'
import { useStore } from '../lib/useStore'
import { Favicon } from '../ui/Favicon'
import { Icon, type IconName } from '../ui/Icon'

interface Item {
  key: string
  section: string
  title: string
  detail?: string
  icon: ReactNode
  verb: string
  run: (here: boolean) => unknown
  // Only listed once you type something that matches it.
  searchOnly?: boolean
}

interface Sources {
  state: State
  current?: chrome.tabs.Tab
  tabs: chrome.tabs.Tab[]
  bookmarks: chrome.bookmarks.BookmarkTreeNode[]
  history: chrome.history.HistoryItem[]
}

const LIMITS = { Actions: 4, Tabs: 6, Favorites: 4, Bookmarks: 4, History: 6 }

export function CommandBar() {
  const state = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const { current, tabs } = useTabs()
  const { bookmarks, history } = useLookups(query)
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo(
    () => (state ? buildItems(query, { state, current, tabs, bookmarks, history }) : []),
    [query, state, current, tabs, bookmarks, history],
  )

  useEffect(() => setSelected(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const run = async (item: Item | undefined, here: boolean) => {
    if (!item) return
    await item.run(here)
    window.close()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault()
      setSelected((i) => (items.length ? (i + 1) % items.length : 0))
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault()
      setSelected((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void run(items[selected], e.metaKey || e.ctrlKey)
    }
  }

  let lastSection = ''

  return (
    <div className="grain flex flex-col">
      <label className="flex h-14 items-center gap-3 border-b border-line px-4">
        <span className="size-2.5 shrink-0 rounded-full bg-accent" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Go anywhere"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] tracking-[-0.01em] outline-none"
        />
        <span className="kbd">esc</span>
      </label>

      <div ref={listRef} className="scroll-thin max-h-[420px] overflow-y-auto px-2 py-2">
        {items.length === 0 && <p className="px-3 py-6 font-serif text-[18px] text-ink-3 italic">Nothing here. Try another word.</p>}
        {items.map((item, i) => {
          const header = item.section !== lastSection ? item.section : null
          lastSection = item.section
          const active = i === selected
          return (
            <div key={item.key}>
              {header && <div className="label px-3 pt-3 pb-1.5">{header}</div>}
              <button
                data-index={i}
                onMouseMove={() => !active && setSelected(i)}
                onClick={(e) => void run(item, e.metaKey || e.ctrlKey)}
                className={`relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-left ${active ? 'bg-surface' : ''}`}
              >
                {active && <span className="absolute top-2.5 bottom-2.5 left-0 w-[2px] rounded-full bg-accent" />}
                <span className="flex w-5 shrink-0 justify-center text-ink-2">{item.icon}</span>
                <span className="min-w-0 shrink truncate text-[14px]">{item.title}</span>
                {item.detail && <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-3">{item.detail}</span>}
                <span className={`ml-auto flex shrink-0 items-center gap-2 ${active ? '' : 'invisible'}`}>
                  <span className="label">{item.verb}</span>
                  <span className="kbd">↵</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <footer className="flex h-9 items-center gap-4 border-t border-line px-4">
        <Hint keys="↑↓" label="Move" />
        <Hint keys="↵" label="Open" />
        <Hint keys="⌘↵" label="In this tab" />
        <span className="label ml-auto">凪 Nagi</span>
      </footer>
    </div>
  )
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="kbd">{keys}</span>
      <span className="label">{label}</span>
    </span>
  )
}

const icon = (name: IconName) => <Icon name={name} size={15} />
const favicon = (url?: string) => <Favicon url={url} size={16} />

function buildItems(query: string, src: Sources): Item[] {
  const q = query.trim()
  const out: Item[] = []
  const seen = new Set<string>()
  const take = <T,>(list: T[], score: (x: T) => number, limit: number) =>
    list
      .map((x) => [x, score(x)] as const)
      .filter(([, s]) => s >= 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([x]) => x)

  if (q) {
    const url = toUrl(q)
    out.push(
      url
        ? { key: 'go', section: 'Go', title: host(url), detail: url, icon: icon('arrow'), verb: 'Open', run: (here) => openUrl(url, here) }
        : { key: 'go', section: 'Go', title: q, detail: 'Search the web', icon: icon('search'), verb: 'Search', run: (here) => searchWeb(q, here) },
    )
  }

  const actions = buildActions(q, src)
  for (const a of q ? take(actions, (a) => fuzzy(q, a.title, a.keywords), LIMITS.Actions) : actions.filter((a) => !a.searchOnly)) out.push(a)

  const others = src.tabs.filter((t) => t.id !== src.current?.id && !isOwnPage(t.url))
  const tabs = q
    ? take(others, (t) => fuzzy(q, t.title, t.url), LIMITS.Tabs)
    : others.toSorted((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0)).slice(0, LIMITS.Tabs)
  for (const t of tabs) {
    if (t.url) seen.add(t.url)
    out.push({
      key: `tab-${t.id}`,
      section: q ? 'Tabs' : 'Recent tabs',
      title: t.title || t.url || 'Tab',
      detail: t.url ? host(t.url) : undefined,
      icon: favicon(t.url),
      verb: 'Switch',
      run: () => focusTab(t),
    })
  }

  if (!q) return out

  for (const f of take(src.state.favorites, (f) => fuzzy(q, f.title, f.url), LIMITS.Favorites)) {
    if (seen.has(f.url)) continue
    seen.add(f.url)
    out.push({ key: `fav-${f.id}`, section: 'Favorites', title: f.title, detail: host(f.url), icon: favicon(f.url), verb: 'Open', run: (here) => openUrl(f.url, here) })
  }

  for (const b of take(src.bookmarks.filter((b) => b.url), (b) => fuzzy(q, b.title, b.url), LIMITS.Bookmarks)) {
    if (seen.has(b.url!)) continue
    seen.add(b.url!)
    out.push({ key: `bm-${b.id}`, section: 'Bookmarks', title: b.title || b.url!, detail: host(b.url!), icon: favicon(b.url), verb: 'Open', run: (here) => openUrl(b.url!, here) })
  }

  for (const h of take(src.history.filter((h) => h.url), (h) => fuzzy(q, h.title, h.url), LIMITS.History)) {
    if (seen.has(h.url!)) continue
    seen.add(h.url!)
    out.push({ key: `h-${h.id}`, section: 'History', title: h.title || h.url!, detail: host(h.url!), icon: favicon(h.url), verb: 'Open', run: (here) => openUrl(h.url!, here) })
  }

  return out
}

type Action = Item & { keywords?: string }

function buildActions(q: string, { state, current }: Sources): Action[] {
  const action = (key: string, title: string, name: IconName, run: () => unknown, detail?: string): Action => ({
    key: `action-${key}`,
    section: 'Actions',
    title,
    detail,
    icon: icon(name),
    verb: 'Run',
    run,
  })
  const hidden = (a: Action, keywords = ''): Action => ({ ...a, searchOnly: true, keywords })
  const list: Action[] = []
  const realTab = current && !isOwnPage(current.url) ? current : undefined

  if (realTab) {
    const id = realTab.id!
    const muted = realTab.mutedInfo?.muted ?? false
    list.push(action('copy', 'Copy link', 'link', () => navigator.clipboard.writeText(realTab.url!), '⌥⇧C'))
    list.push(action('space', q ? `New space “${q}”` : 'New space from this tab', 'layers', () => newSpace(q)))
    list.push(action('fav', 'Add this tab to favorites', 'star', () => addFavorite(realTab.title || host(realTab.url!), realTab.url!), host(realTab.url!)))
    list.push(action('archive', 'Archive this tab', 'archive', () => archiveTabs([realTab])))
    list.push(hidden(action('markdown', 'Copy link as Markdown', 'link', () => navigator.clipboard.writeText(markdownLink(realTab))), 'md'))
    list.push(hidden(action('pin', realTab.pinned ? 'Unpin this tab' : 'Pin this tab', 'pin', () => chrome.tabs.update(id, { pinned: !realTab.pinned }))))
    list.push(hidden(action('duplicate', 'Duplicate this tab', 'copy', () => chrome.tabs.duplicate(id))))
    list.push(hidden(action('mute', muted ? 'Unmute this tab' : 'Mute this tab', muted ? 'speaker' : 'mute', () => chrome.tabs.update(id, { muted: !muted })), 'sound audio'))
    list.push(hidden(action('window', 'Move this tab to a new window', 'arrow', () => chrome.windows.create({ tabId: id })), 'detach'))
  }
  if (current) {
    list.push(hidden(action('next-space', 'Next space', 'chevron', () => focusAdjacentSpace(current.windowId, 1)), 'switch'))
    list.push(hidden(action('previous-space', 'Previous space', 'chevron', () => focusAdjacentSpace(current.windowId, -1)), 'switch back'))
  }
  list.push(action('dupes', 'Close duplicate tabs', 'copy', closeDuplicates))
  list.push(hidden(action('settings', 'Nagi settings', 'sliders', () => chrome.runtime.openOptionsPage()), 'preferences options'))
  if (current) {
    // sidePanel.open needs the keypress gesture, so it must not wait on anything first.
    list.push(hidden(action('panel', 'Open spaces panel', 'panel', () => chrome.sidePanel.open({ windowId: current.windowId }), '⌥S'), 'sidebar'))
  }
  const [last] = state.archive
  if (last) {
    list.push(action('restore', 'Reopen last archived', 'restore', async () => {
      await takeArchived(last.id)
      await chrome.tabs.create({ url: last.url })
    }, host(last.url)))
  }
  const next = nextAppearance(state.settings.appearance)
  list.push(action('appearance', `Appearance: ${next === 'auto' ? 'follow system' : next === 'oat' ? 'Oat' : 'Sumi'}`, 'contrast', () =>
    saveState({ settings: { ...state.settings, appearance: next } }),
  ))
  return list
}

function useTabs() {
  const [data, setData] = useState<{ current?: chrome.tabs.Tab; tabs: chrome.tabs.Tab[] }>({ tabs: [] })
  useEffect(() => {
    Promise.all([chrome.tabs.query({ active: true, currentWindow: true }), chrome.tabs.query({})]).then(([[current], tabs]) =>
      setData({ current, tabs }),
    )
  }, [])
  return data
}

function useLookups(query: string) {
  const [data, setData] = useState<{ bookmarks: chrome.bookmarks.BookmarkTreeNode[]; history: chrome.history.HistoryItem[] }>({
    bookmarks: [],
    history: [],
  })
  useEffect(() => {
    const q = query.trim()
    if (!q) return setData({ bookmarks: [], history: [] })
    let alive = true
    const timer = setTimeout(async () => {
      const [bookmarks, history] = await Promise.all([
        chrome.bookmarks.search(q),
        chrome.history.search({ text: q, maxResults: 40, startTime: 0 }),
      ])
      if (alive) setData({ bookmarks, history })
    }, 70)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query])
  return data
}
