import { archiveTabs, loadState } from './lib/store'
import { focusAdjacentSpace } from './lib/tabs'
import { isOwnPage } from './lib/url'

const SWEEP = 'archive-sweep'
const HOUR = 3_600_000

async function ensureSweep() {
  if (!(await chrome.alarms.get(SWEEP))) await chrome.alarms.create(SWEEP, { periodInMinutes: 15 })
}

// Applies the surface switches from settings: whether the spaces panel exists and what the toolbar icon opens.
async function applySurfaces() {
  const { settings } = await loadState()
  const panelOnClick = settings.panel && settings.toolbar === 'panel'
  await chrome.sidePanel.setOptions({ enabled: settings.panel })
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: panelOnClick })
  await chrome.action.setPopup({ popup: panelOnClick ? '' : 'command/index.html' })
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureSweep()
  void applySurfaces()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureSweep()
  void applySurfaces()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) void applySurfaces()
})

// Windows whose panel is open. The open and close events keep it current; a worker that was asleep seeds it from the
// live contexts, and until that answer arrives it can't tell open from closed.
const panels = new Set<number>()
let panelsKnown = false
const panelsAtWake = chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] }).then((contexts) => {
  const open = new Set(contexts.map((c) => c.windowId))
  for (const id of open) panels.add(id)
  panelsKnown = true
  return open
})
chrome.sidePanel.onOpened.addListener(({ windowId }) => panels.add(windowId))
chrome.sidePanel.onClosed.addListener(({ windowId }) => panels.delete(windowId))

function togglePanel(windowId: number) {
  if (!panelsKnown) {
    // Open while the shortcut still counts as a user action, then close again if it turns out it was already open.
    chrome.sidePanel.open({ windowId }).catch(() => {})
    void panelsAtWake.then((open) => {
      if (open.has(windowId)) return chrome.sidePanel.close({ windowId })
    })
    return
  }
  if (panels.has(windowId)) void chrome.sidePanel.close({ windowId })
  // Rejects when the panel is switched off in settings; the shortcut then does nothing.
  else chrome.sidePanel.open({ windowId }).catch(() => {})
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (tab?.windowId === undefined) return
  // The panel must open synchronously inside the shortcut's user gesture, so it is handled before anything awaits.
  if (command === 'open-side-panel') return togglePanel(tab.windowId)
  if (command === 'copy-url' && tab.url) void copyLink(tab)
  if (command === 'next-space') void focusAdjacentSpace(tab.windowId, 1)
  if (command === 'previous-space') void focusAdjacentSpace(tab.windowId, -1)
})

let offscreen: Promise<void> | undefined

async function copyText(text: string) {
  const ready = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })
  if (!ready.length) {
    offscreen ??= chrome.offscreen
      .createDocument({ url: 'offscreen/index.html', reasons: ['CLIPBOARD'], justification: 'Copy the current tab link' })
      .finally(() => (offscreen = undefined))
    await offscreen
  }
  return (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'copy', text })) as boolean
}

// The toolbar badge is the only feedback a shortcut can give without touching the page.
async function copyLink(tab: chrome.tabs.Tab) {
  const ok = await copyText(tab.url!).catch(() => false)
  await chrome.action.setBadgeBackgroundColor({ color: ok ? '#e9631a' : '#8a887c' })
  await chrome.action.setBadgeTextColor({ color: '#fff6ee' })
  await chrome.action.setBadgeText({ tabId: tab.id, text: ok ? '✓' : '!' })
  setTimeout(() => void chrome.action.setBadgeText({ tabId: tab.id, text: '' }), 1600)
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SWEEP) void sweep()
})

// Closes tabs nobody has looked at for the configured time and keeps them in the archive.
async function sweep() {
  const { settings } = await loadState()
  if (!settings.autoArchiveHours) return
  const cutoff = Date.now() - settings.autoArchiveHours * HOUR
  const tabs = await chrome.tabs.query({})
  const stale = tabs.filter(
    (t) => !t.active && !t.pinned && !t.audible && t.url && !isOwnPage(t.url) && (t.lastAccessed ?? Date.now()) < cutoff,
  )
  await archiveTabs(stale)
}
