// A low sun over a fan of rays, centred on the same point the rays spread from.
export function SunMark({ size = 360, rays = 84, className = '' }: { size?: number; rays?: number; className?: string }) {
  const c = 200
  const lines = Array.from({ length: rays }, (_, i) => {
    const angle = ((-14 + (i / (rays - 1)) * 208) * Math.PI) / 180
    const reach = 176 - Math.abs(Math.sin(angle * 3)) * 6
    return [c + Math.cos(angle) * 66, c + Math.sin(angle) * 66, c + Math.cos(angle) * reach, c + Math.sin(angle) * reach]
  })

  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth={0.75} strokeLinecap="round" className="sun-rays">
        {lines.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{ animationDelay: `${i * 7}ms` }} />
        ))}
      </g>
      <circle cx={c} cy={c} r={52} fill="var(--accent)" />
    </svg>
  )
}
