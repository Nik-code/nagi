# Nagi 凪

A calm layer for Chrome: a new tab page, a spaces side panel, a command bar and two browser themes. The look comes from oat paper, atomic orange, spec-sheet mono labels and a low sun over a fan of rays.

Nagi never runs inside web pages. It has no content scripts and no host permissions, so sites behave exactly as they would without it, and Chrome updates leave it untouched.

## Install

```bash
npm install
npm run build
```

1. Open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `dist/`.
2. For the browser chrome, load a theme too (see [Themes](#themes)).
3. The first new tab asks whether to keep the change or go back to Google. Keep it.

After editing code, run `npm run build` and press the reload arrow on Nagi's card in `chrome://extensions`. After `npm run assets` changes a theme, load its folder again the same way.

## Use it as your tab list

No extension can remove Chrome's own tabs, so the closest setup shrinks them to a thin icon rail and lets the spaces panel do the work:

1. In `chrome://settings/appearance`, set **Side panel position** to **Left**, keep **Tab position** on **Vertical**, and turn off **Auto expand tabs on hover**.
2. Keep Chrome's vertical tabs collapsed (right-click the tab rail, **Collapse Tabs**).
3. Press Option+S to open or close Nagi in a window, then drag the panel's edge to the width you like.

Press `/` in the panel to find a tab by title, address or space name; ↑↓ pick, Enter switches, Esc clears.

| Right-click | Menu |
|---|---|
| A tab | New tab below, reload, duplicate, pin, mute, favorite, copy link, archive, move to another space, a new one or **Loose**, close this tab, the others or the ones below |
| A space (its header or its chip) | Rename, colour, new tab in space, focus and fold the rest, collapse, archive the space, ungroup, close the space |

Drag a tab onto another tab to place it above or below, onto a space header to add it to that space, onto **Pinned** to pin it, or onto **Loose** to take it out of its space. Esc cancels a drag. **New tab** at the top of the list opens next to the current tab, inside its space.

## Surfaces

| Surface | How to open | What it does |
|---|---|---|
| New tab | Any new tab | Clock, greeting, favorites shelf (falls back to your most visited sites), recently archived tabs, a small spec table |
| Spaces panel | Option+S opens and closes it | Your tab list. Spaces are tab groups: focus one to fold the rest, find a tab with `/`, right-click tabs and spaces, drag to reorder, favorites that jump to an open tab, the archive, settings |
| Command bar | Option+K, or the toolbar icon | Fuzzy search across open tabs, favorites, bookmarks and history; open a URL or search the web; actions such as copy link, new space, archive this tab, close duplicates. Type to reach the rest: copy as Markdown, pin, duplicate, mute, move to a new window, next or previous space |

| Shortcut | Does |
|---|---|
| Option+K | Command bar |
| Option+S | Open or close the spaces panel |
| Option+Shift+C | Copy the current tab's link (pin Nagi to the toolbar to see the ✓) |
| Unassigned | Next space, previous space; give them keys at `chrome://extensions/shortcuts` |

In the command bar, Enter opens in a new tab (or the current one if it is empty) and ⌘Enter replaces the current tab.

## Settings

Open them from the sliders button in the spaces panel, from `chrome://extensions` (**Details**, then **Extension options**), or by typing `settings` in the command bar.

| Setting | Choices |
|---|---|
| New tab page | Nagi's, or hand new tabs back to Chrome's own page |
| Spaces panel | On or off. Off removes it from Chrome's side panel and Option+S does nothing |
| Toolbar icon opens | The command bar or the spaces panel |
| Appearance | Auto (follows the system), Oat or Sumi |
| Greet me as | The name on the new tab greeting; leave it empty for none |
| Archive idle tabs | Off, 12h, 24h or 7d |

Auto-archive is off by default. Turn it on in the panel's settings (12h, 24h or 7d). Every 15 minutes it closes tabs you have not looked at for that long, never pinned, playing or active ones, and keeps them in the archive.

## Themes

Oat (light) and Sumi (dark) colour Chrome's frame, tab rail, toolbar and address bar to match Nagi, with a faint paper grain, and stay put when the window is in the background. They are separate from the extension, so you can use either on its own.

To load one from source, open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `themes/oat` or `themes/sumi`. Chrome holds one theme at a time; loading the other one switches. Remove it from `chrome://settings/appearance` with **Reset to default**.

## Permissions

| Permission | Why |
|---|---|
| `tabs`, `tabGroups` | List, switch, group and close tabs (titles and URLs only, never page content) |
| `bookmarks`, `history`, `topSites` | Command bar search and the frequent-sites fallback |
| `favicon` | Show site icons from Chrome's own cache |
| `search` | Send searches to your default search engine |
| `sidePanel`, `storage`, `alarms` | The panel, local settings, and the auto-archive timer |
| `offscreen`, `clipboardWrite` | Copy a link from a shortcut, which has no page to copy from |

Everything is stored in `chrome.storage.local` on your device. Nothing is sent anywhere. See the [privacy policy](PRIVACY.md).

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Serves the pages at `localhost:5173/newtab/`, `/sidepanel/`, `/command/` and `/options/` with the extension APIs faked (`src/dev/mock-chrome.ts`) |
| `npm run build` | Typechecks and builds the extension into `dist/` |
| `npm run verify` | Loads `dist/` into Chrome for Testing (from Playwright's cache), seeds real tabs and spaces, drives the panel's menus, dragging and command bar against the real APIs and writes screenshots to `.verify/` |
| `npm run assets` | Regenerates the toolbar icons and both themes |
| `npm run package` | Builds and writes the three Chrome Web Store uploads to `release/` (listing copy and images live in `store/`) |

## License

[MIT](LICENSE). If Nagi makes your browser a little calmer, a star on GitHub helps other people find it.
