// Generates the toolbar icons and the two Chrome themes (Oat and Sumi). Run with `npm run assets`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { crc32, deflateSync } from 'node:zlib'

type RGB = [number, number, number]
type Shape = (x: number, y: number) => boolean

const root = join(import.meta.dirname, '..')
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB

function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

function png(width: number, height: number, rgba: Uint8Array) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const roundRect =
  (r: number): Shape =>
  (x, y) => {
    const dx = Math.max(r - x, 0, x - (1 - r))
    const dy = Math.max(r - y, 0, y - (1 - r))
    return dx * dx + dy * dy <= r * r
  }
const disc =
  (cx: number, cy: number, r: number): Shape =>
  (x, y) =>
    (x - cx) ** 2 + (y - cy) ** 2 <= r * r
const bar =
  (x0: number, x1: number, y0: number, y1: number): Shape =>
  (x, y) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1

// Sun over a calm horizon on an ink tile, supersampled 4x4 for clean edges.
function icon(size: number) {
  const t = Math.max(0.055, 1.1 / size)
  const layers: [Shape, RGB][] = [
    [roundRect(0.23), hex('#161512')],
    [disc(0.5, 0.42, 0.2), hex('#e9631a')],
    [bar(0.2, 0.8, 0.7, 0.7 + t), hex('#ebebdf')],
    [bar(0.33, 0.67, 0.81, 0.81 + t), hex('#ebebdf')],
  ]
  const ss = 4
  const out = new Uint8Array(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, hits = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss) / size
          const y = (py + (sy + 0.5) / ss) / size
          const top = layers.findLast(([shape]) => shape(x, y))
          if (!top) continue
          r += top[1][0]
          g += top[1][1]
          b += top[1][2]
          hits++
        }
      }
      const i = (py * size + px) * 4
      if (!hits) continue
      out.set([r / hits, g / hits, b / hits, (hits / (ss * ss)) * 255], i)
    }
  }
  return png(size, size, out)
}

// Deterministic paper grain so regenerated themes are byte-identical.
function grain(base: RGB, amount: number, size = 160) {
  let seed = 0x6e616769
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const n = (rand() - 0.5) * 2 * amount
    out.set([base[0] + n, base[1] + n, base[2] + n, 255], i * 4)
  }
  return png(size, size, out)
}

interface Palette {
  name: string
  description: string
  frame: string
  frameInactive: string
  toolbar: string
  ink: string
  muted: string
  omnibox: string
  ntp: string
  accent: string
  grain: number
}

const themes: Record<string, Palette> = {
  oat: {
    name: 'Nagi Oat',
    description: 'A warm oat-paper theme for Chrome with a faint grain and an atomic orange accent. Pairs with the Nagi extension.',
    frame: '#e2e0d2',
    frameInactive: '#e9e8dd',
    toolbar: '#f4f3ec',
    ink: '#1a1a17',
    muted: '#6f6d63',
    omnibox: '#e9e7dc',
    ntp: '#ebebdf',
    accent: '#e9631a',
    grain: 5,
  },
  sumi: {
    name: 'Nagi Sumi',
    description: 'An ink-dark theme for Chrome with a faint grain and an atomic orange accent. Pairs with the Nagi extension.',
    frame: '#11110f',
    frameInactive: '#181816',
    toolbar: '#1c1b18',
    ink: '#ebebdf',
    muted: '#9a988c',
    omnibox: '#2a2723',
    ntp: '#141412',
    accent: '#f0702b',
    grain: 4,
  },
}

function themeManifest(p: Palette) {
  return {
    manifest_version: 3,
    name: p.name,
    version: '0.2.0',
    description: p.description,
    theme: {
      images: {
        theme_frame: 'images/frame.png',
        theme_frame_inactive: 'images/frame_inactive.png',
        theme_toolbar: 'images/toolbar.png',
      },
      // Chrome lightens frame images in inactive windows unless a theme says otherwise; 0.5 lightness keeps them as drawn.
      tints: {
        frame: [-1, -1, 0.5],
        frame_inactive: [-1, -1, 0.5],
        background_tab: [-1, -1, 0.5],
        background_tab_inactive: [-1, -1, 0.5],
      },
      colors: {
        frame: hex(p.frame),
        frame_inactive: hex(p.frameInactive),
        background_tab: hex(p.frame),
        background_tab_inactive: hex(p.frameInactive),
        toolbar: hex(p.toolbar),
        toolbar_text: hex(p.ink),
        toolbar_button_icon: hex(p.muted),
        tab_text: hex(p.ink),
        tab_background_text: hex(p.muted),
        tab_background_text_inactive: hex(p.muted),
        bookmark_text: hex(p.muted),
        omnibox_background: hex(p.omnibox),
        omnibox_text: hex(p.ink),
        ntp_background: hex(p.ntp),
        ntp_text: hex(p.ink),
        ntp_link: hex(p.accent),
      },
    },
  }
}

const iconDir = join(root, 'public/icons')
mkdirSync(iconDir, { recursive: true })
for (const size of [16, 32, 48, 128]) writeFileSync(join(iconDir, `${size}.png`), icon(size))

for (const [key, palette] of Object.entries(themes)) {
  const dir = join(root, 'themes', key)
  mkdirSync(join(dir, 'images'), { recursive: true })
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(themeManifest(palette), null, 2)}\n`)
  writeFileSync(join(dir, 'images/frame.png'), grain(hex(palette.frame), palette.grain))
  writeFileSync(join(dir, 'images/frame_inactive.png'), grain(hex(palette.frameInactive), palette.grain))
  writeFileSync(join(dir, 'images/toolbar.png'), grain(hex(palette.toolbar), Math.max(2, palette.grain - 2)))
}

console.log('icons → public/icons, themes → themes/oat, themes/sumi')
