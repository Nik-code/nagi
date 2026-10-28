import { useState } from 'react'
import { faviconSrc, host, isOwnPage } from '../lib/url'
import { Hanko } from './Hanko'

export function Favicon({ url, size = 16, className = '' }: { url?: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const web = /^https?:/.test(url ?? '')

  if (url && isOwnPage(url)) return <Hanko size={size} />

  if (!url || !web || failed) {
    return (
      <span className={`favicon-fallback ${className}`} style={{ width: size, height: size, fontSize: size * 0.58 }} aria-hidden>
        {web ? host(url!).charAt(0).toUpperCase() : ''}
      </span>
    )
  }

  return (
    <img
      src={faviconSrc(url, size <= 16 ? 16 : 32)}
      width={size}
      height={size}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-[3px] ${className}`}
    />
  )
}
