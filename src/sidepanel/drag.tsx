import { createContext, useContext, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { moveTab, type DropTarget } from '../lib/tabs'

export interface DragState {
  tabId: number
  target: DropTarget | null
  x: number
  y: number
}

interface DragApi {
  drag: DragState | null
  start: (e: ReactPointerEvent, tabId: number) => void
  clickAllowed: () => boolean
}

const THRESHOLD = 4
const EDGE = 36

export const DragContext = createContext<DragApi>({ drag: null, start: () => {}, clickAllowed: () => true })
export const useDrag = () => useContext(DragContext)

// Pointer-driven reordering: rows and headers mark themselves with data-drop, the pointer decides where a tab lands.
export function useTabDrag(scroller: RefObject<HTMLElement | null>): DragApi {
  const [drag, setDrag] = useState<DragState | null>(null)
  const suppress = useRef(false)

  const start = (e: ReactPointerEvent, tabId: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    const origin = { x: e.clientX, y: e.clientY }
    let active = false
    let target: DropTarget | null = null
    let key = ''

    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) < THRESHOLD) return
      if (!active) {
        active = true
        document.documentElement.classList.add('dragging')
      }
      scrollNearEdge(scroller.current, ev.clientY)
      target = dropTargetAt(ev.clientX, ev.clientY)
      const nextKey = JSON.stringify(target)
      const ghost = document.querySelector<HTMLElement>('[data-drag-ghost]')
      if (ghost) ghost.style.transform = ghostTransform(ev.clientX, ev.clientY)
      if (nextKey !== key || !ghost) {
        key = nextKey
        setDrag({ tabId, target, x: ev.clientX, y: ev.clientY })
      }
    }

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', escape, true)
      document.documentElement.classList.remove('dragging')
      if (!active) return
      suppress.current = true
      setTimeout(() => (suppress.current = false))
      setDrag(null)
      if (commit && target) void moveTab(tabId, target)
    }
    const up = () => finish(true)
    const cancel = () => finish(false)
    const escape = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return
      ev.stopPropagation()
      finish(false)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', escape, true)
  }

  return { drag, start, clickAllowed: () => !suppress.current }
}

// The pill follows the pointer but stays inside the panel's right edge.
export const ghostTransform = (x: number, y: number) => `translate(${Math.max(4, Math.min(x + 14, innerWidth - 228))}px, ${y + 10}px)`

function dropTargetAt(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]')
  const [kind, id] = (el?.dataset.drop ?? '').split(':')
  if (kind === 'tab') {
    const box = el!.getBoundingClientRect()
    return { kind, tabId: Number(id), after: y > box.top + box.height / 2 }
  }
  if (kind === 'space') return { kind, groupId: Number(id) }
  if (kind === 'pinned' || kind === 'loose') return { kind }
  return null
}

function scrollNearEdge(el: HTMLElement | null, y: number) {
  if (!el) return
  const box = el.getBoundingClientRect()
  if (y < box.top + EDGE) el.scrollTop -= 10
  else if (y > box.bottom - EDGE) el.scrollTop += 10
}
