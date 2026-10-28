import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { addFavorite, archiveTabs, removeFavorite } from '../lib/store'
import {
  GROUP_TONE,
  SPACE_COLORS,
  closeOtherTabs,
  closeTabsBelow,
  focusSpace,
  isGrouped,
  moveTab,
  newSpace,
  openTabAfter,
  openTabInSpace,
} from '../lib/tabs'
import { pad } from '../lib/time'
import type { Favorite } from '../lib/types'
import { host } from '../lib/url'
import { Icon, type IconName } from '../ui/Icon'

export interface MenuPoint {
  x: number
  y: number
}

type Action = () => unknown

export function TabMenu({
  tab,
  groups,
  favorites,
  at,
  onClose,
}: {
  tab: chrome.tabs.Tab
  groups: chrome.tabGroups.TabGroup[]
  favorites: Favorite[]
  at: MenuPoint
  onClose: () => void
}) {
  const id = tab.id!
  const url = tab.url ?? ''
  const web = /^https?:/.test(url)
  const favorite = favorites.find((f) => f.url === url)
  const muted = tab.mutedInfo?.muted ?? false
  const run = (action: Action) => () => {
    onClose()
    void Promise.resolve(action())
  }

  return (
    <Menu at={at} label="Tab" onClose={onClose}>
      <MenuLabel>{web ? host(url) : 'Tab'}</MenuLabel>
      <div className="grid grid-cols-4 gap-0.5">
        <Tile icon="plus" label="New tab" hint="New tab below this one" onSelect={run(() => openTabAfter(tab))} />
        <Tile icon="reload" label="Reload" onSelect={run(() => chrome.tabs.reload(id))} />
        <Tile icon="copy" label="Duplicate" onSelect={run(() => chrome.tabs.duplicate(id))} />
        <Tile
          icon="pin"
          label={tab.pinned ? 'Unpin' : 'Pin'}
          on={tab.pinned}
          onSelect={run(() => chrome.tabs.update(id, { pinned: !tab.pinned }))}
        />
        <Tile
          icon={muted ? 'speaker' : 'mute'}
          label={muted ? 'Unmute' : 'Mute'}
          onSelect={run(() => chrome.tabs.update(id, { muted: !muted }))}
        />
        <Tile
          icon="star"
          label="Favorite"
          hint={favorite ? 'Remove from favorites' : 'Add to favorites'}
          on={Boolean(favorite)}
          disabled={!web}
          onSelect={run(() => (favorite ? removeFavorite(favorite.id) : addFavorite(tab.title || host(url), url)))}
        />
        <Tile icon="link" label="Copy link" disabled={!url} onSelect={run(() => navigator.clipboard.writeText(url))} />
        <Tile icon="archive" label="Archive" hint="Close it and keep it in the archive" onSelect={run(() => archiveTabs([tab]))} />
      </div>

      <MenuSeparator />
      <MenuLabel>Move to space</MenuLabel>
      <SpacePicker
        groups={groups.filter((g) => g.id !== tab.groupId)}
        grouped={isGrouped(tab)}
        onPick={(groupId) => run(() => moveTab(id, { kind: 'space', groupId }))()}
        onLoose={run(() => moveTab(id, { kind: 'loose' }))}
        onCreate={(name) => run(() => newSpace(name, tab))()}
      />

      <MenuSeparator />
      <div className="flex items-center gap-0.5">
        <span className="label w-[52px] shrink-0 px-2">Close</span>
        <Segment danger onSelect={run(() => chrome.tabs.remove(id))}>
          Tab
        </Segment>
        <Segment hint="Close other tabs" onSelect={run(() => closeOtherTabs(tab))}>
          Others
        </Segment>
        <Segment hint="Close tabs below" onSelect={run(() => closeTabsBelow(tab))}>
          Below
        </Segment>
      </div>
    </Menu>
  )
}

export function SpaceMenu({
  group,
  count,
  at,
  onClose,
}: {
  group: chrome.tabGroups.TabGroup
  count: number
  at: MenuPoint
  onClose: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const run = (action: Action) => () => {
    onClose()
    void Promise.resolve(action())
  }
  const members = async () => (await chrome.tabs.query({ groupId: group.id })).flatMap((t) => (t.id === undefined ? [] : [t]))
  const ids = async () => (await members()).map((t) => t.id!)
  const ungroup = (list: number[]) => list.length > 0 && chrome.tabs.ungroup(list as [number, ...number[]])

  return (
    <Menu at={at} label="Space" onClose={onClose}>
      {renaming ? (
        <input
          autoFocus
          defaultValue={group.title}
          aria-label="Space name"
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run(() => chrome.tabGroups.update(group.id, { title: e.currentTarget.value.trim() || 'Untitled' }))()
            if (e.key === 'Escape') {
              e.stopPropagation()
              setRenaming(false)
            }
          }}
          className="mb-1 h-7 w-full rounded-[4px] border border-accent bg-bg px-2 text-[12.5px] outline-none"
        />
      ) : (
        <div className="flex items-center">
          <MenuLabel>
            {group.title || 'Untitled'} · {pad(count)}
          </MenuLabel>
          <button
            role="menuitem"
            aria-label="Rename"
            title="Rename"
            onClick={() => setRenaming(true)}
            className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-[4px] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink focus-visible:outline-none"
          >
            <Icon name="pencil" size={13} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between px-2 py-2">
        {SPACE_COLORS.map((color) => (
          <button
            key={color}
            role="menuitem"
            title={color}
            aria-label={`Colour ${color}`}
            aria-current={color === group.color}
            onClick={run(() => chrome.tabGroups.update(group.id, { color }))}
            className={`flex size-[18px] items-center justify-center rounded-full transition-shadow focus-visible:outline-none ${
              color === group.color ? 'ring-1 ring-ink ring-offset-2 ring-offset-surface' : 'hover:ring-1 hover:ring-line-2 focus:ring-1 focus:ring-ink-3'
            }`}
          >
            <span className="size-3 rounded-full" style={{ background: GROUP_TONE[color] }} />
          </button>
        ))}
      </div>

      <MenuSeparator />
      <div className="grid grid-cols-3 gap-0.5">
        <Tile icon="plus" label="New tab" hint="New tab in this space" onSelect={run(() => openTabInSpace(group.id))} />
        <Tile icon="focus" label="Focus" hint="Show this space, fold the rest" onSelect={run(() => focusSpace(group.windowId, group.id))} />
        <Tile
          icon="chevron"
          label={group.collapsed ? 'Expand' : 'Collapse'}
          onSelect={run(() => chrome.tabGroups.update(group.id, { collapsed: !group.collapsed }))}
        />
        <Tile icon="archive" label="Archive" hint="Archive every tab in this space" onSelect={run(async () => archiveTabs(await members()))} />
        <Tile icon="ungroup" label="Ungroup" hint="Keep the tabs, drop the space" onSelect={run(async () => ungroup(await ids()))} />
        <Tile icon="close" label="Close" hint="Close every tab in this space" danger onSelect={run(async () => chrome.tabs.remove(await ids()))} />
      </div>
    </Menu>
  )
}

function SpacePicker({
  groups,
  grouped,
  onPick,
  onLoose,
  onCreate,
}: {
  groups: chrome.tabGroups.TabGroup[]
  grouped: boolean
  onPick: (groupId: number) => void
  onLoose: () => void
  onCreate: (name: string) => void
}) {
  const [naming, setNaming] = useState(false)
  const chip =
    'flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-[11.5px] transition-colors focus-visible:outline-none'
  const solid = `${chip} border-line-2 text-ink-2 hover:border-ink hover:text-ink focus:border-ink focus:text-ink`

  return (
    <div className="flex flex-wrap gap-1 px-1.5 pb-1.5">
      {groups.map((g) => (
        <button key={g.id} role="menuitem" onClick={() => onPick(g.id)} className={solid}>
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: GROUP_TONE[g.color] }} />
          <span className="truncate">{g.title || 'Untitled'}</span>
        </button>
      ))}
      {grouped && (
        <button role="menuitem" title="Take it out of its space" onClick={onLoose} className={solid}>
          <span className="size-1.5 shrink-0 rounded-full border border-ink-3" />
          Loose
        </button>
      )}
      {naming ? (
        <input
          autoFocus
          aria-label="New space name"
          placeholder="Name it"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreate(e.currentTarget.value)
            if (e.key === 'Escape') {
              e.stopPropagation()
              setNaming(false)
            }
          }}
          className="h-6 w-28 rounded-full border border-accent bg-transparent px-2.5 text-[11.5px] outline-none"
        />
      ) : (
        <button
          role="menuitem"
          onClick={() => setNaming(true)}
          className={`${chip} border-dashed border-line-2 text-ink-3 hover:border-accent hover:text-accent focus:border-accent focus:text-accent`}
        >
          <Icon name="plus" size={11} /> New
        </button>
      )}
    </div>
  )
}

function Menu({ at, label, onClose, children }: { at: MenuPoint; label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  // Open at the pointer, then nudge back inside the panel once the real size is known.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // offset sizes ignore the pop-in scale, so the clamp uses the settled size.
    const { offsetWidth: width, offsetHeight: height } = el
    el.style.left = `${Math.max(8, Math.min(at.x, innerWidth - width - 8))}px`
    el.style.top = `${at.y + height > innerHeight - 8 ? Math.max(8, innerHeight - height - 8) : at.y}px`
    el.style.visibility = 'visible'
    el.focus()
  }, [at])

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    window.addEventListener('pointerdown', away, true)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('pointerdown', away, true)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  // Arrows walk the items in reading order, across the tile grids too.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!step || (e.target as HTMLElement).tagName === 'INPUT') return
    e.preventDefault()
    const items = [...ref.current!.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')]
    const i = items.indexOf(document.activeElement as HTMLElement)
    items[(i + step + items.length) % items.length]?.focus()
  }

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: at.x, top: at.y, visibility: 'hidden' }}
      className="pop scroll-thin fixed z-50 max-h-[calc(100vh-16px)] w-[248px] overflow-y-auto rounded-[6px] border border-line-2 bg-surface p-1 text-[12.5px] shadow-float outline-none"
    >
      {children}
    </div>
  )
}

const HOVER = 'hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink'
const HOVER_DANGER = 'hover:bg-accent-soft hover:text-accent focus:bg-accent-soft focus:text-accent'

function Tile({
  icon,
  label,
  hint,
  on = false,
  danger = false,
  disabled = false,
  onSelect,
}: {
  icon: IconName
  label: string
  hint?: string
  on?: boolean
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      role="menuitem"
      title={hint ?? label}
      disabled={disabled}
      onClick={onSelect}
      className={`flex h-[50px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[4px] px-1 text-[11px] text-ink-2 transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 ${
        danger ? HOVER_DANGER : HOVER
      }`}
    >
      <Icon name={icon} size={16} className={on ? 'text-accent' : 'opacity-80'} />
      <span className="max-w-full truncate leading-tight">{label}</span>
    </button>
  )
}

function Segment({
  hint,
  danger = false,
  onSelect,
  children,
}: {
  hint?: string
  danger?: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <button
      role="menuitem"
      title={hint}
      onClick={onSelect}
      className={`h-7 flex-1 rounded-[4px] text-center text-ink-2 transition-colors focus-visible:outline-none ${danger ? HOVER_DANGER : HOVER}`}
    >
      {children}
    </button>
  )
}

function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="label min-w-0 truncate px-2 pt-2 pb-2">{children}</div>
}

function MenuSeparator() {
  return <div className="mx-1 my-1 h-px bg-line" />
}
