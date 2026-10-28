// In-memory stand-in for the chrome.* APIs so `npm run dev` can preview every page in a normal tab.

type Listener = (...args: any[]) => void

function createEvent() {
  const listeners = new Set<Listener>()
  return {
    addListener: (l: Listener) => listeners.add(l),
    removeListener: (l: Listener) => listeners.delete(l),
    emit: (...args: any[]) => listeners.forEach((l) => l(...args)),
  }
}

const MIN = 60_000
const now = Date.now()
let nextId = 100

const groups: any[] = [
  { id: 1, windowId: 1, title: 'Studio', color: 'orange', collapsed: false },
  { id: 2, windowId: 1, title: 'Work', color: 'blue', collapsed: false },
  { id: 3, windowId: 1, title: 'Reading', color: 'green', collapsed: true },
]

const tab = (title: string, url: string, extra: Record<string, unknown> = {}) => ({
  id: nextId++,
  windowId: 1,
  groupId: -1,
  pinned: false,
  active: false,
  audible: false,
  discarded: false,
  mutedInfo: { muted: false },
  lastAccessed: now - (nextId % 7) * 37 * MIN,
  title,
  url,
  ...extra,
})

const tabs: any[] = [
  tab('Inbox (3)', 'https://mail.google.com/mail/u/0/', { pinned: true }),
  tab('Calendar', 'https://calendar.google.com/', { pinned: true }),
  tab('Moodboard · Figma', 'https://www.figma.com/', { groupId: 1, active: true }),
  tab('Pull requests', 'https://github.com/pulls', { groupId: 1 }),
  tab('Type specimens · Are.na', 'https://www.are.na/', { groupId: 1 }),
  tab('Colour tokens', 'https://developer.mozilla.org/en-US/docs/Web/CSS/color', { groupId: 1 }),
  tab('Weekly plan', 'https://www.notion.so/', { groupId: 2 }),
  tab('Quarterly numbers', 'https://docs.google.com/spreadsheets/', { groupId: 2 }),
  tab('Long read: the quiet web', 'https://en.wikipedia.org/wiki/Slow_movement_(culture)', { groupId: 3 }),
  tab('Ukiyo-e · Wikipedia', 'https://en.wikipedia.org/wiki/Ukiyo-e', {}),
  tab('Kawase Hasui, coastal prints', 'https://www.artic.edu/artworks', {}),
  tab('Lofi beats to plan to', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', { audible: true }),
]

const store: Record<string, unknown> = {
  favorites: [
    { id: 'f1', title: 'GitHub', url: 'https://github.com/' },
    { id: 'f2', title: 'Linear', url: 'https://linear.app/' },
    { id: 'f3', title: 'Figma', url: 'https://www.figma.com/' },
    { id: 'f4', title: 'Notion', url: 'https://www.notion.so/' },
    { id: 'f5', title: 'Wikipedia', url: 'https://en.wikipedia.org/' },
    { id: 'f6', title: 'Claude', url: 'https://claude.ai/' },
    { id: 'f7', title: 'Are.na', url: 'https://www.are.na/' },
    { id: 'f8', title: 'YouTube', url: 'https://www.youtube.com/' },
  ],
  archive: [
    { id: 'a1', title: 'Grid systems every designer should know', url: 'https://thedesigntrip.com/grid', archivedAt: now - 3 * 60 * MIN },
    { id: 'a2', title: 'Instrument Serif on Google Fonts', url: 'https://fonts.google.com/specimen/Instrument+Serif', archivedAt: now - 20 * 60 * MIN },
    { id: 'a3', title: 'Chrome side panel API', url: 'https://developer.chrome.com/docs/extensions/reference/api/sidePanel', archivedAt: now - 50 * 60 * MIN },
  ],
}

const storageChanged = createEvent()
const tabsChanged = createEvent()
const groupsChanged = createEvent()
const noop = createEvent()

const indexed = () => tabs.map((t, index) => ({ ...t, index }))
const find = (id: number) => tabs.find((t) => t.id === id)

// Chrome keeps pinned tabs first and each group contiguous; mimic that after every change.
function place(t: any, index?: number) {
  tabs.splice(tabs.indexOf(t), 1)
  const pinnedEnd = tabs.filter((x) => x.pinned).length
  let at = index ?? -1
  if (t.groupId !== -1 && index === undefined) {
    const last = tabs.findLastIndex((x) => x.groupId === t.groupId)
    at = last === -1 ? tabs.length : last + 1
  }
  if (at < 0 || at > tabs.length) at = tabs.length
  at = t.pinned ? Math.min(at, pinnedEnd) : Math.max(at, pinnedEnd)
  tabs.splice(at, 0, t)
  settle()
}

function settle() {
  for (let i = groups.length - 1; i >= 0; i--) if (!tabs.some((x) => x.groupId === groups[i].id)) groups.splice(i, 1)
  tabsChanged.emit()
}

function matches(t: any, query: Record<string, unknown>) {
  return Object.entries(query).every(([k, v]) => (k === 'currentWindow' ? t.windowId === 1 : t[k] === v))
}

const sample = (q: string) =>
  [...tabs, ...(store.favorites as any[])].filter((x) => `${x.title} ${x.url}`.toLowerCase().includes(q.toLowerCase()))

;(globalThis as any).chrome = {
  runtime: { id: undefined, getURL: (p: string) => p },
  storage: {
    local: {
      get: async (defaults: Record<string, unknown>) =>
        Object.fromEntries(Object.keys(defaults).map((k) => [k, k in store ? store[k] : defaults[k]])),
      set: async (patch: Record<string, unknown>) => {
        Object.assign(store, patch)
        storageChanged.emit(patch, 'local')
      },
    },
    onChanged: storageChanged,
  },
  tabs: {
    query: async (q: Record<string, unknown>) => indexed().filter((t) => matches(t, q)),
    get: async (id: number) => indexed().find((t) => t.id === id),
    update: async (id: number, { muted, pinned, ...props }: any) => {
      const t = find(id)
      if (!t) return
      if (props.active) tabs.forEach((x) => (x.active = x.id === id))
      Object.assign(t, props, props.active ? { lastAccessed: Date.now() } : {})
      if (muted !== undefined) t.mutedInfo = { muted }
      if (pinned !== undefined && pinned !== t.pinned) {
        Object.assign(t, { pinned, groupId: -1 })
        return place(t, pinned ? Infinity : 0)
      }
      tabsChanged.emit()
    },
    create: async ({ url, index }: { url?: string; index?: number } = {}) => {
      tabs.forEach((t) => (t.active = false))
      const created = tab(url ? new URL(url).hostname : 'New Tab', url ?? 'chrome://newtab/', { active: true })
      tabs.push(created)
      place(created, index)
      return indexed().find((t) => t.id === created.id)
    },
    duplicate: async (id: number) => {
      const t = find(id)
      if (!t) return
      const copy = { ...t, id: nextId++, active: false }
      tabs.push(copy)
      place(copy, tabs.indexOf(t) + 1)
    },
    reload: async () => {},
    move: async (id: number, { index }: { index: number }) => place(find(id), index),
    remove: async (ids: number | number[]) => {
      for (const id of [ids].flat()) tabs.splice(tabs.findIndex((t) => t.id === id), 1)
      settle()
    },
    group: async ({ tabIds, groupId }: { tabIds: number | number[]; groupId?: number }) => {
      const id = groupId ?? Math.max(0, ...groups.map((g) => g.id)) + 1
      if (groupId === undefined) groups.push({ id, windowId: 1, title: '', color: 'grey', collapsed: false })
      for (const tabId of [tabIds].flat()) {
        const t = find(tabId)
        Object.assign(t, { groupId: id, pinned: false })
        place(t)
      }
      return id
    },
    ungroup: async (ids: number | number[]) => {
      for (const id of [ids].flat()) {
        const t = find(id)
        const last = tabs.findLastIndex((x) => x.groupId === t.groupId)
        t.groupId = -1
        place(t, last)
      }
    },
    onCreated: tabsChanged,
    onUpdated: noop,
    onRemoved: noop,
    onActivated: noop,
    onMoved: noop,
    onAttached: noop,
    onDetached: noop,
  },
  tabGroups: {
    query: async () => groups.map((g) => ({ ...g })),
    get: async (id: number) => ({ ...groups.find((g) => g.id === id) }),
    update: async (id: number, props: any) => {
      Object.assign(groups.find((g) => g.id === id), props)
      groupsChanged.emit()
    },
    onCreated: groupsChanged,
    onUpdated: noop,
    onRemoved: noop,
    onMoved: noop,
  },
  windows: { getCurrent: async () => ({ id: 1 }), update: async () => ({}) },
  bookmarks: { search: async (q: string) => sample(q).map((x, i) => ({ id: `b${i}`, title: x.title, url: x.url })) },
  history: { search: async ({ text }: { text: string }) => sample(text).map((x, i) => ({ id: `h${i}`, title: x.title, url: x.url })) },
  topSites: { get: async () => [] },
  search: { query: async ({ text }: { text: string }) => console.info('[mock] search', text) },
  sidePanel: { open: async () => console.info('[mock] open side panel') },
}

export {}
