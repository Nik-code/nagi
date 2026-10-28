import { useStore } from '../lib/useStore'
import { SettingsForm } from '../settings/Settings'
import { Hanko } from '../ui/Hanko'

export function Options() {
  const state = useStore()
  if (!state) return null

  return (
    <main className="grain min-h-screen text-[13px]">
      <div className="rise mx-auto max-w-[460px] px-6 py-14">
        <header className="mb-6 flex items-center gap-3">
          <Hanko />
          <span className="label text-ink-2">Nagi · Settings</span>
        </header>
        <div className="rounded-md border border-line bg-surface/40">
          <SettingsForm settings={state.settings} />
        </div>
      </div>
    </main>
  )
}
