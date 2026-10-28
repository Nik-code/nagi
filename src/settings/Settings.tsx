import type { ReactNode } from 'react'
import { REPO, THEMES } from '../lib/links'
import { saveState } from '../lib/store'
import type { Appearance, Settings, ToolbarAction } from '../lib/types'
import { Icon } from '../ui/Icon'

const ARCHIVE_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 12, label: '12h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
]

const APPEARANCE_OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'oat', label: 'Oat' },
  { value: 'sumi', label: 'Sumi' },
]

const NEW_TAB_OPTIONS = [
  { value: true, label: 'Nagi' },
  { value: false, label: 'Chrome' },
]

const ON_OFF = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
]

const TOOLBAR_OPTIONS: { value: ToolbarAction; label: string }[] = [
  { value: 'command', label: 'Search' },
  { value: 'panel', label: 'Spaces' },
]

// Shared by the spaces panel and the options page, so every surface can be switched back on from somewhere.
export function SettingsForm({ settings }: { settings: Settings }) {
  const update = (patch: Partial<Settings>) => saveState({ settings: { ...settings, ...patch } })

  return (
    <div className="flex flex-col">
      <Group title="Surfaces">
        <Field label="New tab page">
          <Segmented options={NEW_TAB_OPTIONS} value={settings.newTab} onChange={(newTab) => void update({ newTab })} />
        </Field>
        <Field label="Spaces panel">
          <Segmented options={ON_OFF} value={settings.panel} onChange={(panel) => void update({ panel })} />
        </Field>
        {settings.panel && (
          <Field label="Toolbar icon opens">
            <Segmented options={TOOLBAR_OPTIONS} value={settings.toolbar} onChange={(toolbar) => void update({ toolbar })} />
          </Field>
        )}
        <Field label="Shortcuts">
          <button
            onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
            className="flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-accent"
          >
            Change <Icon name="arrow" size={12} />
          </button>
        </Field>
      </Group>

      <Group title="Look">
        <Field label="Appearance">
          <Segmented options={APPEARANCE_OPTIONS} value={settings.appearance} onChange={(appearance) => void update({ appearance })} />
        </Field>
        <Field label="Greet me as">
          <input
            defaultValue={settings.name}
            placeholder="Your name"
            onBlur={(e) => void update({ name: e.target.value.trim() })}
            className="h-7 w-28 rounded-md border border-line-2 bg-transparent px-2 text-right text-[12px] outline-none placeholder:text-ink-3/70 focus:border-accent"
          />
        </Field>
      </Group>

      <Group title="Tabs">
        <Field label="Archive idle tabs">
          <Segmented options={ARCHIVE_OPTIONS} value={settings.autoArchiveHours} onChange={(autoArchiveHours) => void update({ autoArchiveHours })} />
        </Field>
      </Group>

      <footer className="flex flex-col gap-1.5 px-4 py-4 text-[12px] leading-relaxed text-ink-3">
        <p>
          Nagi is free and open source.{' '}
          <a href={REPO} target="_blank" rel="noreferrer" className="whitespace-nowrap text-ink-2 hover:text-accent">
            <Icon name="star" size={12} className="mr-1 inline align-[-1px]" />
            Star it on GitHub
          </a>
        </p>
        <p>
          Dress Chrome to match with the{' '}
          <a href={THEMES} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-accent">
            Oat and Sumi themes
          </a>
          .
        </p>
      </footer>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4">
      <h3 className="label text-ink-2">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="label">{label}</span>
      {children}
    </div>
  )
}

function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex rounded-full border border-line-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.label}
          onClick={() => onChange(o.value)}
          className={`h-6 rounded-full px-2.5 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors ${
            o.value === value ? 'bg-ink text-bg' : 'text-ink-3 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
