const PATHS = {
  close: 'M7 7l10 10M17 7L7 17',
  plus: 'M12 5v14M5 12h14',
  archive: 'M4 6.5h16v3H4zM5.5 9.5V18h13V9.5M10 13h4',
  sliders: 'M4 8h9M17 8h3M4 16h3M11 16h9M15 6v4M9 14v4',
  chevron: 'M10 7l5 5-5 5',
  arrow: 'M8 16L16 8M9.5 8H16v6.5',
  search: 'M10.5 16a5.5 5.5 0 100-11 5.5 5.5 0 000 11zM15 15l4.5 4.5',
  speaker: 'M5 10h3l4-3.5v11L8 14H5zM15.5 9.5a3.5 3.5 0 010 5',
  layers: 'M12 4.5l8 4-8 4-8-4zM4 12.5l8 4 8-4M4 16l8 4 8-4',
  star: 'M12 4.5l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  restore: 'M5 12a7 7 0 107-7 7 7 0 00-5.2 2.3M6.5 4v3.5H10',
  panel: 'M4 5.5h16v13H4zM14.5 5.5v13',
  globe: 'M12 20a8 8 0 100-16 8 8 0 000 16zM4 12h16M12 4c2.2 2.3 3.2 5 3.2 8s-1 5.7-3.2 8c-2.2-2.3-3.2-5-3.2-8s1-5.7 3.2-8z',
  contrast: 'M12 20a8 8 0 100-16v16z',
  pin: 'M9 4h6l-1 5 3 3H7l3-3zM12 12v8',
  reload: 'M18.5 12a6.5 6.5 0 11-1.9-4.6M17 4.5v3.3h-3.3',
  link: 'M10.5 13.5l3-3M9 10.5l-2 2a3 3 0 004.2 4.2l2-2M15 13.5l2-2a3 3 0 00-4.2-4.2l-2 2',
  mute: 'M5 10h3l4-3.5v11L8 14H5zM15.5 10l4 4M19.5 10l-4 4',
  pencil: 'M5.5 18.5l.8-3.6L15.6 5.6l2.8 2.8-9.3 9.3zM13.8 7.4l2.8 2.8',
  focus: 'M5 9.5V5h4.5M14.5 5H19v4.5M19 14.5V19h-4.5M9.5 19H5v-4.5',
  ungroup: 'M4.5 6.5h6v6h-6zM13.5 11.5h6v6h-6z',
  tab: 'M4 18.5V8.5a1.5 1.5 0 011.5-1.5h5L12 9h6.5A1.5 1.5 0 0120 10.5v8',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
