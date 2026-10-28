export type Appearance = 'auto' | 'oat' | 'sumi'
export type ToolbarAction = 'command' | 'panel'

export interface Settings {
  appearance: Appearance
  autoArchiveHours: number
  name: string
  newTab: boolean
  panel: boolean
  toolbar: ToolbarAction
}

export interface Favorite {
  id: string
  title: string
  url: string
}

export interface Archived {
  id: string
  title: string
  url: string
  archivedAt: number
}

export interface State {
  settings: Settings
  favorites: Favorite[]
  archive: Archived[]
}
