import { useEffect, useState, type FormEvent } from 'react'
import { addFavorite, removeFavorite, takeArchived } from '../lib/store'
import { ago, dateLabel, dayOfYear, greeting, isoWeek, pad, utcOffset } from '../lib/time'
import type { Archived, Favorite } from '../lib/types'
import { host, toUrl } from '../lib/url'
import { useStore } from '../lib/useStore'
import { Favicon } from '../ui/Favicon'
import { Hanko } from '../ui/Hanko'
import { Icon } from '../ui/Icon'
import { SunMark } from '../ui/SunMark'

const SHELF_SIZE = 12

export function NewTab() {
  const state = useStore()
  const now = useMinute()
  const counts = useCounts()
  const frequent = useFrequent(state !== null && state.favorites.length === 0)

  if (!state) return null

  return (
    <main className="grain min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1180px] flex-col px-8 pt-8 pb-10 sm:px-14">
        <header className="rise flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hanko />
            <span className="label text-ink-2">Nagi</span>
          </div>
          <span className="label hidden sm:block">
            No. {pad(dayOfYear(now))} / {now.getFullYear() % 4 === 0 ? 366 : 365}
          </span>
          <span className="label">
            {dateLabel(now)} · W{pad(isoWeek(now))}
          </span>
        </header>

        <section className="mt-[5vh] grid grid-cols-12 items-center gap-6">
          <div className="rise col-span-12 md:col-span-7" style={{ animationDelay: '60ms' }}>
            <p className="label">Local time · {utcOffset(now)}</p>
            <h1 className="mt-4 font-serif text-[clamp(104px,13vw,184px)] leading-[0.82] tracking-[-0.03em] tabular-nums">
              {pad(now.getHours())}
              <span className="text-accent">:</span>
              {pad(now.getMinutes())}
            </h1>
            <p className="mt-6 font-serif text-[clamp(28px,3vw,40px)] leading-tight text-ink-2 italic">
              {greeting(now.getHours())}
              {state.settings.name ? `, ${state.settings.name}` : ''}.
            </p>
          </div>
          <div className="col-span-5 hidden justify-end text-ink md:flex">
            <SunMark size={340} className="opacity-90" />
          </div>
        </section>

        <Shelf favorites={state.favorites} frequent={frequent} />

        <footer className="rise mt-auto grid grid-cols-12 items-end gap-x-10 gap-y-8 pt-10" style={{ animationDelay: '220ms' }}>
          <Archive entries={state.archive.slice(0, 4)} />
          <dl className="col-span-12 grid grid-cols-2 border-t border-line lg:col-span-4">
            <Spec term="Open tabs" value={counts.tabs} />
            <Spec term="Spaces" value={counts.spaces} />
            <Spec term="Archived" value={state.archive.length} />
            <Spec term="Page access" value="None" accent />
          </dl>
        </footer>
      </div>
    </main>
  )
}

function Spec({ term, value, accent = false }: { term: string; value: number | string; accent?: boolean }) {
  return (
    <div className="border-b border-line px-1 py-3.5 odd:border-r even:pl-5">
      <dt className="label">{term}</dt>
      <dd className={`mt-2.5 font-mono text-[20px] tracking-tight tabular-nums ${accent ? 'text-accent' : 'text-ink'}`}>
        {typeof value === 'number' ? pad(value) : value}
      </dd>
    </div>
  )
}

function Shelf({ favorites, frequent }: { favorites: Favorite[]; frequent: chrome.topSites.MostVisitedURL[] }) {
  const [adding, setAdding] = useState(false)
  const showingFrequent = favorites.length === 0 && frequent.length > 0
  const items = showingFrequent
    ? frequent.map((s) => ({ id: s.url, title: s.title || host(s.url), url: s.url }))
    : favorites.slice(0, SHELF_SIZE)

  return (
    <section className="rise mt-[5vh]" style={{ animationDelay: '140ms' }}>
      <div className="mb-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="label text-ink-2">{showingFrequent ? 'Frequent' : 'Favorites'}</h2>
          {items.length > 0 && <span className="label">01–{pad(items.length)}</span>}
        </div>
        {!adding && favorites.length < SHELF_SIZE && (
          <button onClick={() => setAdding(true)} className="label flex items-center gap-1.5 transition-colors hover:text-accent">
            <Icon name="plus" size={12} /> Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <ShelfCard
            key={item.id}
            index={i}
            title={item.title}
            url={item.url}
            action={
              showingFrequent
                ? { icon: 'plus', label: 'Add to favorites', run: () => addFavorite(item.title, item.url) }
                : { icon: 'close', label: 'Remove', run: () => removeFavorite(item.id) }
            }
          />
        ))}
        {adding && <AddCard onDone={() => setAdding(false)} />}
        {items.length === 0 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="col-span-full flex h-[108px] items-center justify-center rounded-[3px] border border-dashed border-line-2 font-serif text-[22px] text-ink-3 italic transition-colors hover:border-accent hover:text-accent"
          >
            Pin the places you return to.
          </button>
        )}
      </div>
    </section>
  )
}

interface CardAction {
  icon: 'plus' | 'close'
  label: string
  run: () => Promise<unknown>
}

function ShelfCard({ index, title, url, action }: { index: number; title: string; url: string; action: CardAction }) {
  return (
    <div className="group ticks relative h-[108px] rounded-[3px] border border-line bg-surface/50 transition-colors hover:border-line-2 hover:bg-surface">
      <a href={url} className="flex h-full flex-col justify-between p-4 outline-none" title={url}>
        <div className="flex items-start justify-between">
          <Favicon url={url} size={20} />
          <span className="label group-hover:opacity-0">{pad(index + 1)}</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium tracking-[-0.01em]">{title}</div>
          <div className="mt-1 truncate font-mono text-[11px] text-ink-3">{host(url)}</div>
        </div>
      </a>
      <button
        onClick={() => void action.run()}
        title={action.label}
        aria-label={action.label}
        className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-ink-3 opacity-0 transition hover:bg-accent-soft hover:text-accent group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Icon name={action.icon} size={13} />
      </button>
    </div>
  )
}

function AddCard({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const url = toUrl(address)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!url) return
    await addFavorite(title.trim() || host(url), url)
    onDone()
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && onDone()}
      className="flex h-[108px] flex-col justify-between rounded-[3px] border border-accent bg-surface p-4"
    >
      <input
        autoFocus
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address"
        className="bg-transparent font-mono text-[12px] outline-none"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={url ? host(url) : 'Name'}
        className="bg-transparent text-[15px] font-medium outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="label">{url ? '↵ Save' : 'Esc to cancel'}</span>
        <button type="submit" disabled={!url} className="label text-accent disabled:opacity-30">
          Save
        </button>
      </div>
    </form>
  )
}

function Archive({ entries }: { entries: Archived[] }) {
  const reopen = async (entry: Archived) => {
    await takeArchived(entry.id)
    location.href = entry.url
  }

  return (
    <section className="col-span-12 lg:col-span-8">
      <h2 className="label mb-3 text-ink-2">Recently archived</h2>
      {entries.length === 0 && (
        <p className="border-y border-line py-3 font-serif text-[18px] text-ink-3 italic">
          Idle tabs rest here once auto-archive is on.
        </p>
      )}
      <ul className="divide-y divide-line border-line [&:not(:empty)]:border-y">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              onClick={() => void reopen(entry)}
              className="group flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:text-accent"
            >
              <Favicon url={entry.url} size={16} />
              <span className="min-w-0 flex-1 truncate text-[14px]">{entry.title}</span>
              <span className="hidden truncate font-mono text-[11px] text-ink-3 sm:block">{host(entry.url)}</span>
              <span className="label w-10 text-right">{ago(entry.archivedAt)}</span>
              <Icon name="restore" size={14} className="text-ink-3 group-hover:text-accent" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function useMinute() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      const next = new Date()
      setNow((prev) => (prev.getMinutes() === next.getMinutes() ? prev : next))
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function useCounts() {
  const [counts, setCounts] = useState({ tabs: 0, spaces: 0 })
  useEffect(() => {
    const refresh = async () => {
      const [tabs, groups] = await Promise.all([chrome.tabs.query({}), chrome.tabGroups.query({})])
      setCounts({ tabs: tabs.length, spaces: groups.length })
    }
    void refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  return counts
}

function useFrequent(enabled: boolean) {
  const [sites, setSites] = useState<chrome.topSites.MostVisitedURL[]>([])
  useEffect(() => {
    if (!enabled) return
    chrome.topSites.get().then((list) => setSites(list.slice(0, 8)))
  }, [enabled])
  return sites
}
