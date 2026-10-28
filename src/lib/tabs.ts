import { isBlank } from './url'

const NO_GROUP = -1

// Chrome's fixed tab group colours, re-toned to sit on oat paper.
export const GROUP_TONE: Record<string, string> = {
  grey: '#8a887c',
  blue: '#2f6fb0',
  red: '#c8402f',
  yellow: '#d9a425',
  green: '#4f7a52',
  pink: '#d46a86',
  purple: '#7a5ba6',
  cyan: '#3a9aa5',
  orange: '#e9631a',
}

export const SPACE_COLORS = ['orange', 'blue', 'green', 'purple', 'cyan', 'pink', 'yellow', 'red', 'grey'] as const
export type SpaceColor = (typeof SPACE_COLORS)[number]

export async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab as chrome.tabs.Tab | undefined
}

export async function focusTab(tab: chrome.tabs.Tab) {
  if (tab.id === undefined) return
  await chrome.tabs.update(tab.id, { active: true })
  await chrome.windows.update(tab.windowId, { focused: true })
}

// Enter opens in a new tab unless the current one is empty; `here` always replaces the current tab.
export async function openUrl(url: string, here = false) {
  const tab = await activeTab()
  if (tab?.id !== undefined && (here || isBlank(tab.url))) return chrome.tabs.update(tab.id, { url })
  return chrome.tabs.create({ url })
}

export async function searchWeb(text: string, here = false) {
  const tab = await activeTab()
  const reuse = here || isBlank(tab?.url)
  return chrome.search.query({ text, disposition: reuse ? 'CURRENT_TAB' : 'NEW_TAB' } as chrome.search.QueryInfo)
}

// Shows one space (tab group) and folds the rest; null unfolds everything.
export async function focusSpace(windowId: number, groupId: number | null) {
  const groups = await chrome.tabGroups.query({ windowId })
  if (groupId !== null) {
    const members = await chrome.tabs.query({ windowId, groupId })
    const [active] = await chrome.tabs.query({ windowId, active: true })
    const latest = members.toSorted((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0]
    if (latest?.id !== undefined && active?.groupId !== groupId) await chrome.tabs.update(latest.id, { active: true })
  }
  await Promise.all(
    groups.map((g) => chrome.tabGroups.update(g.id, { collapsed: groupId !== null && g.id !== groupId })),
  )
}

// Walks the spaces in strip order; from a loose tab, forward starts at the first space and back at the last.
export async function focusAdjacentSpace(windowId: number, step: 1 | -1) {
  const [groups, tabs] = await Promise.all([chrome.tabGroups.query({ windowId }), chrome.tabs.query({ windowId })])
  if (!groups.length) return
  const firstIndex = (g: chrome.tabGroups.TabGroup) => tabs.find((t) => t.groupId === g.id)?.index ?? 0
  const order = groups.toSorted((a, b) => firstIndex(a) - firstIndex(b))
  const current = order.findIndex((g) => g.id === tabs.find((t) => t.active)?.groupId)
  const next = current === -1 ? (step === 1 ? order[0] : order.at(-1)!) : order[(current + step + order.length) % order.length]
  await focusSpace(windowId, next.id)
}

export const markdownLink = (tab: chrome.tabs.Tab) => `[${(tab.title || tab.url || '').replace(/[[\]]/g, '\\$&')}](${tab.url})`

export async function newSpace(title: string, from?: chrome.tabs.Tab) {
  const tab = from ?? (await activeTab())
  if (tab?.id === undefined) return
  const used = new Set((await chrome.tabGroups.query({ windowId: tab.windowId })).map((g) => g.color as string))
  const color = SPACE_COLORS.find((c) => !used.has(c)) ?? 'grey'
  if (tab.pinned) await chrome.tabs.update(tab.id, { pinned: false })
  const groupId = await chrome.tabs.group({ tabIds: tab.id })
  await chrome.tabGroups.update(groupId, { title: title.trim() || 'Untitled', color })
}

// A new tab lands right after `anchor` and joins its space, so new tabs stay where you are working.
export async function openTabAfter(anchor?: chrome.tabs.Tab) {
  const ref = anchor ?? (await activeTab())
  const created = await chrome.tabs.create(ref ? { windowId: ref.windowId, index: ref.index + 1 } : {})
  if (ref && isGrouped(ref) && created.id !== undefined) await chrome.tabs.group({ groupId: ref.groupId, tabIds: created.id })
  return created
}

export async function openTabInSpace(groupId: number) {
  const members = await chrome.tabs.query({ groupId })
  return openTabAfter(members.at(-1))
}

export async function closeOtherTabs(tab: chrome.tabs.Tab) {
  const others = await chrome.tabs.query({ windowId: tab.windowId, pinned: false })
  const ids = others.flatMap((t) => (t.id !== undefined && t.id !== tab.id ? [t.id] : []))
  if (ids.length) await chrome.tabs.remove(ids)
}

export async function closeTabsBelow(tab: chrome.tabs.Tab) {
  const all = await chrome.tabs.query({ windowId: tab.windowId, pinned: false })
  const ids = all.flatMap((t) => (t.id !== undefined && t.index > tab.index ? [t.id] : []))
  if (ids.length) await chrome.tabs.remove(ids)
}

export async function spaceTabs(groupId: number) {
  return chrome.tabs.query({ groupId })
}

export type DropTarget =
  | { kind: 'tab'; tabId: number; after: boolean }
  | { kind: 'space'; groupId: number }
  | { kind: 'pinned' }
  | { kind: 'loose' }

// Moves a tab to a drop target from the panel, fixing up pinned state and space membership around Chrome's own rules.
export async function moveTab(tabId: number, target: DropTarget) {
  const tab = await chrome.tabs.get(tabId)

  if (target.kind === 'pinned') {
    if (!tab.pinned) await chrome.tabs.update(tabId, { pinned: true })
    return
  }

  if (target.kind === 'loose') {
    if (tab.pinned) await chrome.tabs.update(tabId, { pinned: false })
    if (isGrouped(await chrome.tabs.get(tabId))) await chrome.tabs.ungroup(tabId)
    await chrome.tabs.move(tabId, { index: -1 })
    return
  }

  if (target.kind === 'space') {
    if (tab.pinned) await chrome.tabs.update(tabId, { pinned: false })
    await chrome.tabs.group({ groupId: target.groupId, tabIds: tabId })
    return
  }

  if (target.tabId === tabId) return
  const anchor = await chrome.tabs.get(target.tabId)
  if (tab.pinned !== anchor.pinned) await chrome.tabs.update(tabId, { pinned: anchor.pinned })
  if (isGrouped(anchor)) await chrome.tabs.group({ groupId: anchor.groupId, tabIds: tabId })
  else if (isGrouped(await chrome.tabs.get(tabId))) await chrome.tabs.ungroup(tabId)

  // Indexes shift once the tab leaves its old slot, so read both again before the final move.
  const [moving, ref] = await Promise.all([chrome.tabs.get(tabId), chrome.tabs.get(target.tabId)])
  let index = ref.index + (target.after ? 1 : 0)
  if (moving.index < index) index -= 1
  if (index !== moving.index) await chrome.tabs.move(tabId, { index })

  const moved = await chrome.tabs.get(tabId)
  if (isGrouped(ref) && moved.groupId !== ref.groupId) await chrome.tabs.group({ groupId: ref.groupId, tabIds: tabId })
  if (!isGrouped(ref) && isGrouped(moved)) await chrome.tabs.ungroup(tabId)
}

export async function closeDuplicates() {
  const tabs = await chrome.tabs.query({})
  const keepFirst = tabs.toSorted((a, b) => Number(b.active) - Number(a.active) || Number(b.pinned) - Number(a.pinned))
  const seen = new Set<string>()
  const dupes: number[] = []
  for (const t of keepFirst) {
    const key = t.url?.split('#')[0]
    if (!key || t.id === undefined) continue
    if (seen.has(key)) dupes.push(t.id)
    else seen.add(key)
  }
  if (dupes.length) await chrome.tabs.remove(dupes)
  return dupes.length
}

export const isGrouped = (tab: chrome.tabs.Tab) => tab.groupId !== undefined && tab.groupId !== NO_GROUP
