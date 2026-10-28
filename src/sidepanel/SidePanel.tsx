import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { fuzzy } from '../lib/fuzzy'
import { saveState, takeArchived } from '../lib/store'
import { GROUP_TONE, focusSpace, focusTab, isGrouped, newSpace, openTabAfter } from '../lib/tabs'
import { ago, pad } from '../lib/time'
import type { Archived, Favorite } from '../lib/types'
import { host } from '../lib/url'
import { useStore } from '../lib/useStore'
import { SettingsForm } from '../settings/Settings'
import { Favicon } from '../ui/Favicon'
import { Hanko } from '../ui/Hanko'
import { Icon } from '../ui/Icon'
import { DragContext, ghostTransform, useDrag, useTabDrag } from './drag'
import { SpaceMenu, TabMenu, type MenuPoint } from './Menus'

type MenuTarget = { kind: 'tab'; id: number } | { kind: 'space'; id: number }

interface MenuApi {
  open: (e: MouseEvent, target: MenuTarget) => void
  current: MenuTarget | null
}

const MenuContext = createContext<MenuApi>({ open: () => {}, current: null })

export function SidePanel() {
  const state = useStore()
  const { windowId, tabs, groups } = useWindow()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menu, setMenu] = useState<{ at: MenuPoint; target: MenuTarget } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const scroller = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState('')
  const [pick, setPick] = useState(0)
  const dragApi = useTabDrag(scroller)
  const { drag } = dragApi

  const openMenu = useCallback((e: MouseEvent, target: MenuTarget) => {
    e.preventDefault()
    // The context-menu key reports 0,0, so anchor to the row instead.
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const fromKeyboard = e.clientX === 0 && e.clientY === 0
    setMenu({ at: fromKeyboard ? { x: box.left + 16, y: box.bottom } : { x: e.clientX, y: e.clientY }, target })
  }, [])

  if (!state) return null

  const pinned = tabs.filter((t) => t.pinned)
  const loose = tabs.filter((t) => !t.pinned && !isGrouped(t))
  const spaces = groups
    .map((group) => ({ group, members: tabs.filter((t) => t.groupId === group.id) }))
    .sort((a, b) => (a.members[0]?.index ?? 0) - (b.members[0]?.index ?? 0))
  const menuTab = menu?.target.kind === 'tab' ? tabs.find((t) => t.id === menu.target.id) : undefined
  const menuSpace = menu?.target.kind === 'space' ? spaces.find((s) => s.group.id === menu.target.id) : undefined
  const dragged = drag ? tabs.find((t) => t.id === drag.tabId) : undefined
  const spaceOf = (t: chrome.tabs.Tab) => groups.find((g) => g.id === t.groupId)
  const q = filter.trim()
  const matches = q
    ? tabs
        .map((t) => [t, fuzzy(q, t.title, t.url, spaceOf(t)?.title)] as const)
        .filter(([, score]) => score >= 0)
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t)
    : []

  const onFilterKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setPick((i) => (matches.length ? (i + step + matches.length) % matches.length : 0))
    } else if (e.key === 'Enter' && matches[pick]?.id !== undefined) {
      void chrome.tabs.update(matches[pick].id!, { active: true })
      setFilter('')
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      if (filter) setFilter('')
      else e.currentTarget.blur()
    }
  }

  return (
    <MenuContext.Provider value={{ open: openMenu, current: menu?.target ?? null }}>
      <DragContext.Provider value={dragApi}>
        <div className="grain flex h-screen flex-col text-[13px]">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Hanko size={20} />
              <span className="label text-ink-2">Spaces</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="label mr-2">{pad(tabs.length)} tabs</span>
              <IconButton icon="sliders" label="Settings" active={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)} />
            </div>
          </header>

          {settingsOpen ? (
            <div className="scroll-thin flex-1 overflow-y-auto">
              <SettingsForm settings={state.settings} />
            </div>
          ) : (
            <>
              <SpaceChips windowId={windowId} groups={groups} counts={spaces.map((s) => s.members.length)} />

              {state.favorites.length > 0 && <FavoriteGrid favorites={state.favorites} tabs={tabs} />}

              <div ref={scroller} className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
                <FilterField
                  value={filter}
                  onChange={(value) => {
                    setFilter(value)
                    setPick(0)
                  }}
                  onKeyDown={onFilterKey}
                />

                {q ? (
                  <section className="mt-4">
                    <h3 className="label mb-1.5 flex items-center gap-2 px-2">
                      Matches <span className="text-ink-3/70">{pad(matches.length)}</span>
                    </h3>
                    {matches.length === 0 && <p className="px-2 py-1.5 font-serif text-[15px] text-ink-3 italic">No tab by that name.</p>}
                    {matches.map((t, i) => (
                      <TabRow key={t.id} tab={t} selected={i === pick} space={spaceOf(t)} />
                    ))}
                  </section>
                ) : (
                  <>
                    {/* While dragging, the pin target takes the New tab slot so nothing below it moves. */}
                    {drag && pinned.length === 0 ? (
                      <DropStrip drop="pinned" className="mt-2">
                        Drop here to pin
                      </DropStrip>
                    ) : (
                      <NewTabRow />
                    )}

                    {pinned.length > 0 && (
                      <Section title="Pinned" drop="pinned" empty="">
                        {pinned.map((t) => (
                          <TabRow key={t.id} tab={t} />
                        ))}
                      </Section>
                    )}

                    {spaces.map(({ group, members }) => (
                      <SpaceSection key={group.id} group={group} members={members} />
                    ))}

                    {(loose.length > 0 || drag) && (
                      <Section title="Loose" count={loose.length} drop="loose" empty="Drop to take it out of its space">
                        {loose.map((t) => (
                          <TabRow key={t.id} tab={t} />
                        ))}
                      </Section>
                    )}
                  </>
                )}
              </div>

              <ArchiveDrawer entries={state.archive} />
            </>
          )}

          {menuTab && menu && (
            <TabMenu tab={menuTab} groups={groups} favorites={state.favorites} at={menu.at} onClose={closeMenu} />
          )}
          {menuSpace && menu && (
            <SpaceMenu group={menuSpace.group} count={menuSpace.members.length} at={menu.at} onClose={closeMenu} />
          )}
          {drag && dragged && (
            <div
              data-drag-ghost
              style={{ transform: ghostTransform(drag.x, drag.y) }}
              className="pointer-events-none fixed top-0 left-0 z-50 flex h-7 max-w-[220px] items-center gap-2 rounded-full border border-line-2 bg-surface pr-3 pl-2 text-[12px] text-ink shadow-float"
            >
              <Favicon url={dragged.url} size={14} />
              <span className="truncate">{dragged.title || dragged.url}</span>
            </div>
          )}
        </div>
      </DragContext.Provider>
    </MenuContext.Provider>
  )
}

function FilterField({
  value,
  onChange,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onSlash = (e: KeyboardEvent) => {
      if (e.key !== '/' || (e.target as HTMLElement).closest('input, textarea')) return
      e.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onSlash)
    return () => window.removeEventListener('keydown', onSlash)
  }, [])

  return (
    <label className="mt-2 flex h-8 items-center gap-2 rounded-md border border-line px-2 text-ink-3 transition-colors focus-within:border-line-2 focus-within:bg-surface/60">
      <Icon name="search" size={14} />
      <input
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Find a tab"
        aria-label="Find a tab"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none"
      />
      {value ? (
        <button onClick={() => onChange('')} aria-label="Clear" className="flex size-5 items-center justify-center rounded hover:text-ink">
          <Icon name="close" size={12} />
        </button>
      ) : (
        <span className="kbd">/</span>
      )}
    </label>
  )
}

function NewTabRow() {
  return (
    <button
      onClick={() => void openTabAfter()}
      className="group mt-2 flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-ink-3 transition-colors hover:bg-surface/70 hover:text-ink"
    >
      <span className="flex size-4 items-center justify-center rounded-[3px] border border-dashed border-line-2 group-hover:border-ink-3">
        <Icon name="plus" size={11} />
      </span>
      <span className="flex-1">New tab</span>
    </button>
  )
}

function SpaceChips({ windowId, groups, counts }: { windowId: number; groups: chrome.tabGroups.TabGroup[]; counts: number[] }) {
  const menu = useContext(MenuContext)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const open = groups.filter((g) => !g.collapsed)
  const allOpen = open.length === groups.length

  const create = async () => {
    await newSpace(name)
    setName('')
    setNaming(false)
  }

  return (
    <nav className="flex flex-wrap items-center gap-1.5 border-b border-line px-4 py-3">
      <Chip active={allOpen} onClick={() => void focusSpace(windowId, null)}>
        All
      </Chip>
      {groups.map((g, i) => (
        <Chip
          key={g.id}
          active={!allOpen && open.length === 1 && open[0].id === g.id}
          onClick={() => void focusSpace(windowId, g.id)}
          onContextMenu={(e) => menu.open(e, { kind: 'space', id: g.id })}
        >
          <span className="size-1.5 rounded-full" style={{ background: GROUP_TONE[g.color] }} />
          {g.title || 'Untitled'}
          <span className="font-mono text-[10px] text-ink-3">{counts[i]}</span>
        </Chip>
      ))}
      {naming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => !name && setNaming(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void create()
            if (e.key === 'Escape') setNaming(false)
          }}
          placeholder="Name this space"
          className="h-7 w-36 rounded-full border border-accent bg-transparent px-3 text-[12px] outline-none"
        />
      ) : (
        <button
          onClick={() => setNaming(true)}
          title="New space from this tab"
          className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-ink-3 transition-colors hover:text-accent"
        >
          <Icon name="plus" size={12} /> New
        </button>
      )}
    </nav>
  )
}

function Chip({
  active,
  onClick,
  onContextMenu,
  children,
}: {
  active: boolean
  onClick: () => void
  onContextMenu?: (e: MouseEvent) => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors ${
        active ? 'border-ink bg-ink text-bg' : 'border-line-2 text-ink-2 hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function FavoriteGrid({ favorites, tabs }: { favorites: Favorite[]; tabs: chrome.tabs.Tab[] }) {
  // A favorite jumps to its open tab when there is one, like a dock.
  const open = async (fav: Favorite) => {
    const match = tabs.find((t) => t.url && host(t.url) === host(fav.url))
    if (match) return focusTab(match)
    return chrome.tabs.create({ url: fav.url })
  }

  return (
    <div className="grid grid-cols-6 gap-1.5 border-b border-line px-4 py-3">
      {favorites.slice(0, 12).map((fav) => {
        const live = tabs.some((t) => t.url && host(t.url) === host(fav.url))
        return (
          <button
            key={fav.id}
            onClick={() => void open(fav)}
            title={fav.title}
            className="ticks relative flex aspect-square items-center justify-center rounded-[3px] border border-line bg-surface/60 transition-colors hover:border-line-2 hover:bg-surface"
          >
            <Favicon url={fav.url} size={18} />
            {live && <span className="absolute right-1 bottom-1 size-1 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}

function Section({
  title,
  count,
  drop,
  empty,
  children,
}: {
  title: string
  count?: number
  drop: 'pinned' | 'loose'
  empty: string
  children: ReactNode[]
}) {
  const { drag } = useDrag()
  const over = drag?.target?.kind === drop
  return (
    <section className="mt-4">
      <h3 data-drop={drop} className={`label mb-1.5 flex items-center gap-2 px-2 py-0.5 ${over ? 'text-accent' : ''}`}>
        {title}
        {count !== undefined && count > 0 && <span className={over ? '' : 'text-ink-3/70'}>{pad(count)}</span>}
      </h3>
      {children.length > 0 ? <div className="flex flex-col">{children}</div> : <DropStrip drop={drop}>{empty}</DropStrip>}
    </section>
  )
}

function DropStrip({ drop, className = '', children }: { drop: 'pinned' | 'loose'; className?: string; children: ReactNode }) {
  const { drag } = useDrag()
  const over = drag?.target?.kind === drop
  return (
    <div
      data-drop={drop}
      className={`flex h-8 items-center rounded-md border border-dashed px-3 font-serif text-[14px] italic transition-colors ${
        over ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 text-ink-3'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function SpaceSection({ group, members }: { group: chrome.tabGroups.TabGroup; members: chrome.tabs.Tab[] }) {
  const tone = GROUP_TONE[group.color]
  const menu = useContext(MenuContext)
  const { drag } = useDrag()
  const over = drag?.target?.kind === 'space' && drag.target.groupId === group.id
  const menuOpen = menu.current?.kind === 'space' && menu.current.id === group.id
  return (
    <section className="mt-4">
      <button
        data-drop={`space:${group.id}`}
        onClick={() => void chrome.tabGroups.update(group.id, { collapsed: !group.collapsed })}
        onContextMenu={(e) => menu.open(e, { kind: 'space', id: group.id })}
        className={`group mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
          over ? 'bg-accent-soft ring-1 ring-accent' : menuOpen ? 'bg-surface ring-1 ring-line-2' : 'hover:bg-surface'
        }`}
      >
        <span className="h-3 w-[3px] rounded-full" style={{ background: tone }} />
        <span className="flex-1 truncate text-[13px] font-medium">{group.title || 'Untitled'}</span>
        <span className="font-mono text-[10.5px] text-ink-3">{pad(members.length)}</span>
        <Icon
          name="chevron"
          size={12}
          className={`text-ink-3 transition-transform ${group.collapsed ? '' : 'rotate-90'}`}
        />
      </button>
      {!group.collapsed && (
        <div className="ml-[11px] flex flex-col border-l border-line pl-1.5">
          {members.map((t) => (
            <TabRow key={t.id} tab={t} />
          ))}
        </div>
      )}
    </section>
  )
}

function TabRow({ tab, selected = false, space }: { tab: chrome.tabs.Tab; selected?: boolean; space?: chrome.tabGroups.TabGroup }) {
  const menu = useContext(MenuContext)
  const { drag, start, clickAllowed } = useDrag()
  const id = tab.id!
  const dragging = drag?.tabId === id
  const line = !dragging && drag?.target?.kind === 'tab' && drag.target.tabId === id ? (drag.target.after ? 'after' : 'before') : null
  const menuOpen = menu.current?.kind === 'tab' && menu.current.id === id
  const activate = () => void chrome.tabs.update(id, { active: true })

  return (
    <div
      role="button"
      tabIndex={0}
      data-drop={`tab:${id}`}
      onClick={() => clickAllowed() && activate()}
      onKeyDown={(e) => e.key === 'Enter' && activate()}
      onAuxClick={(e) => e.button === 1 && void chrome.tabs.remove(id)}
      onPointerDown={(e) => start(e, id)}
      onContextMenu={(e) => menu.open(e, { kind: 'tab', id })}
      title={tab.url}
      className={`group relative flex h-8 cursor-default items-center gap-2.5 rounded-md px-2 transition-colors select-none ${
        dragging ? 'opacity-35' : ''
      } ${tab.active ? 'bg-surface text-ink' : 'text-ink-2 hover:bg-surface/70 hover:text-ink'} ${
        menuOpen || selected ? 'ring-1 ring-line-2' : ''
      }`}
    >
      {tab.active && <span className="absolute top-2 bottom-2 -left-0.5 w-[2px] rounded-full bg-accent" />}
      {line && (
        <span className={`pointer-events-none absolute right-1 left-1 h-[1.5px] bg-accent ${line === 'before' ? '-top-px' : '-bottom-px'}`}>
          <span className="absolute -top-[2px] -left-1 size-[5.5px] rounded-full border-[1.5px] border-accent bg-bg" />
        </span>
      )}
      <Favicon url={tab.url} size={16} className={tab.discarded ? 'opacity-50' : ''} />
      <span className="min-w-0 flex-1 truncate">{tab.title || tab.url}</span>
      {space && <span title={space.title} className="size-1.5 shrink-0 rounded-full" style={{ background: GROUP_TONE[space.color] }} />}
      {tab.mutedInfo?.muted && <Icon name="mute" size={13} className="text-ink-3" />}
      {tab.audible && !tab.mutedInfo?.muted && <Icon name="speaker" size={13} className="text-accent" />}
      <button
        onClick={(e) => {
          e.stopPropagation()
          void chrome.tabs.remove(id)
        }}
        aria-label="Close tab"
        className="flex size-5 items-center justify-center rounded text-ink-3 opacity-0 transition hover:bg-accent-soft hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  )
}

function ArchiveDrawer({ entries }: { entries: Archived[] }) {
  const [open, setOpen] = useState(false)

  const reopen = async (entry: Archived) => {
    await takeArchived(entry.id)
    await chrome.tabs.create({ url: entry.url })
  }

  return (
    <section className="border-t border-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-surface/60">
        <Icon name="archive" size={14} className="text-ink-3" />
        <span className="label flex-1 text-left text-ink-2">Archive</span>
        <span className="label">{pad(entries.length)}</span>
        <Icon name="chevron" size={12} className={`text-ink-3 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {open && (
        <div className="scroll-thin max-h-64 overflow-y-auto px-2 pb-2">
          {entries.length === 0 && (
            <p className="px-2 py-3 font-serif text-[16px] text-ink-3 italic">Nothing archived yet.</p>
          )}
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => void reopen(entry)}
              title={entry.url}
              className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-ink-2 hover:bg-surface hover:text-ink"
            >
              <Favicon url={entry.url} size={14} />
              <span className="min-w-0 flex-1 truncate">{entry.title}</span>
              <span className="label">{ago(entry.archivedAt)}</span>
            </button>
          ))}
          {entries.length > 0 && (
            <button onClick={() => void saveState({ archive: [] })} className="label mt-1 px-2 py-1 hover:text-accent">
              Clear archive
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function IconButton({ icon, label, active, onClick }: { icon: 'sliders'; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-7 items-center justify-center rounded-md transition-colors ${
        active ? 'bg-ink text-bg' : 'text-ink-3 hover:bg-surface hover:text-ink'
      }`}
    >
      <Icon name={icon} size={15} />
    </button>
  )
}

function useWindow() {
  const [data, setData] = useState({ windowId: -1, tabs: [] as chrome.tabs.Tab[], groups: [] as chrome.tabGroups.TabGroup[] })

  useEffect(() => {
    let windowId = -1
    let timer = 0
    const refresh = () => {
      clearTimeout(timer)
      timer = window.setTimeout(async () => {
        if (windowId < 0) windowId = (await chrome.windows.getCurrent()).id ?? -1
        const [tabs, groups] = await Promise.all([chrome.tabs.query({ windowId }), chrome.tabGroups.query({ windowId })])
        setData({ windowId, tabs, groups })
      }, 40)
    }
    const events = [
      chrome.tabs.onCreated,
      chrome.tabs.onUpdated,
      chrome.tabs.onRemoved,
      chrome.tabs.onActivated,
      chrome.tabs.onMoved,
      chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      chrome.tabGroups.onCreated,
      chrome.tabGroups.onUpdated,
      chrome.tabGroups.onRemoved,
      chrome.tabGroups.onMoved,
    ] as unknown as chrome.events.Event<() => void>[]
    events.forEach((e) => e.addListener(refresh))
    refresh()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => e.removeListener(refresh))
    }
  }, [])

  return data
}
