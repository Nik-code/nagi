// The 凪 seal used as the brand mark.
export function Hanko({ size = 22 }: { size?: number }) {
  return (
    <span
      className="hanko inline-flex shrink-0 items-center justify-center rounded-[4px] bg-accent text-on-accent"
      style={{ width: size, height: size, fontSize: size * 0.64 }}
      aria-label="Nagi"
    >
      凪
    </span>
  )
}
