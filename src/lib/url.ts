const HOSTLIKE = /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[\w-]+\.)+[a-z]{2,})(:\d+)?([/?#]\S*)?$/i
const SCHEME = /^[a-z][a-z0-9+.-]*:\S+$/i

// Turns typed text into a URL when it looks like one, otherwise null (meaning: search it).
export function toUrl(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text)) return null
  const hostlike = HOSTLIKE.exec(text)
  if (hostlike) {
    const local = hostlike[1] === 'localhost' || /^\d/.test(hostlike[1])
    return `${local ? 'http' : 'https'}://${text}`
  }
  if (!SCHEME.test(text)) return null
  try {
    return new URL(text).href
  } catch {
    return null
  }
}

export function host(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '') || parsed.protocol.replace(':', '')
  } catch {
    return url
  }
}

export function faviconSrc(pageUrl: string, size = 32) {
  if (import.meta.env.DEV && !chrome.runtime?.id) {
    return `https://www.google.com/s2/favicons?sz=${size * 2}&domain=${encodeURIComponent(host(pageUrl))}`
  }
  const src = new URL(chrome.runtime.getURL('/_favicon/'))
  src.searchParams.set('pageUrl', pageUrl)
  src.searchParams.set('size', String(size))
  return src.href
}

export const isOwnPage = (url = '') =>
  url.startsWith(`chrome-extension://${chrome.runtime.id}/`) || url.startsWith('chrome://newtab')

export const isBlank = (url = '') => !url || url === 'about:blank' || isOwnPage(url)
