# Chrome Web Store listings

Upload files come from `npm run package` (written to `release/`, not committed). Images are in this folder. Privacy policy URL for every listing: https://github.com/Nik-code/nagi/blob/main/PRIVACY.md

## Nagi (extension) · `release/nagi.zip`

**Category:** Productivity, Workflow & Planning · **Language:** English

**Summary (132 max)**

> A calm new tab, a spaces side panel and a command bar for your tabs. Reads no web pages; everything stays on your device.

**Description**

```
Nagi is a quiet layer over Chrome for people who keep a lot of tabs open.

SPACES PANEL (Option+S)
Your tab groups become spaces in Chrome's side panel. Focus one space and the rest fold away. Drag tabs between spaces, pin them, or leave them loose. Press / to find any tab by title, address or space.

COMMAND BAR (Option+K)
Fuzzy search across open tabs, favorites, bookmarks and history. Open an address or search the web, and run quick actions on the current tab: copy its link (or as Markdown), archive it, start a new space, close duplicates.

NEW TAB
A clock, your favorites, recently archived tabs and a small spec sheet, in warm oat or ink-dark sumi.

ARCHIVE
Optionally close tabs you have not looked at for 12 hours, a day or a week. They stay in the archive, one click from coming back.

YOURS TO SWITCH OFF
Turn the new tab page or the spaces panel off in settings, and choose what the toolbar icon opens.

PRIVATE BY DESIGN
Nagi has no content scripts and no access to the sites you visit. Settings, favorites and the archive live in Chrome's local storage on your device. No accounts, no analytics, no servers.

Pairs with the free Nagi Oat and Nagi Sumi themes. Open source: github.com/Nik-code/nagi
```

**Images:** `extension/1-new-tab-sumi.png` … `extension/5-settings.png` (1280×800), small promo `extension/promo-small-440x280.png`, marquee `extension/promo-marquee-1400x560.png`.

### Privacy practices tab

**Single purpose**

> Nagi helps you organise and move between your open tabs: it shows them as spaces in a side panel, finds them from a command bar, and keeps favorite and archived tabs on its new tab page.

**Permission justifications**

| Permission | Justification |
|---|---|
| `tabs` | Lists open tabs (titles and addresses) for the spaces panel and command bar, and switches, moves, pins and closes them on request. |
| `tabGroups` | Shows tab groups as spaces and lets the user create, rename, recolour, focus and fold them. |
| `bookmarks` | Command bar search includes the user's bookmarks. |
| `history` | Command bar search includes the user's browsing history. |
| `topSites` | The new tab page shows most visited sites when the user has no favorites yet. |
| `favicon` | Shows site icons from Chrome's own favicon cache. |
| `search` | Sends a query typed in the command bar to the user's default search engine. |
| `sidePanel` | The spaces panel lives in Chrome's side panel. |
| `storage` | Saves settings, favorites and archived tabs locally. |
| `alarms` | Runs the optional auto-archive check every 15 minutes. |
| `offscreen` | A keyboard shortcut copies the current tab's link; the service worker has no clipboard, so an offscreen document writes it. |
| `clipboardWrite` | Same copy-link shortcut. |

**Remote code:** No, I am not using remote code.

**Data usage:** tick **Web history** only (history, tab titles and addresses are read and processed locally; Nagi reads no page content, so not Website content or User activity). Then certify all three: not sold to third parties, not used for unrelated purposes, not used for creditworthiness or lending.

## Nagi Oat (theme) · `release/nagi-oat.zip`

**Category:** Themes

**Description**

```
A warm oat-paper theme for Chrome: soft cream frame and toolbar, a faint paper grain, and an atomic orange accent. It stays put when the window is in the background.

Made to pair with Nagi, a calm new tab, spaces panel and command bar for Chrome. Its dark sibling is Nagi Sumi.
```

**Images:** `theme-oat/1-oat.png`, small promo `theme-oat/promo-small-440x280.png`.

## Nagi Sumi (theme) · `release/nagi-sumi.zip`

**Category:** Themes

**Description**

```
An ink-dark theme for Chrome: near-black frame and toolbar, a faint grain, and an atomic orange accent. It stays put when the window is in the background.

Made to pair with Nagi, a calm new tab, spaces panel and command bar for Chrome. Its light sibling is Nagi Oat.
```

**Images:** `theme-sumi/1-sumi.png`, small promo `theme-sumi/promo-small-440x280.png`.

## Live listings

- Nagi: https://chromewebstore.google.com/detail/nagi/nilnmgcdkmgimidmlficfdjloecjkdhl
- Nagi Oat: https://chromewebstore.google.com/detail/nagi-oat/nlagpmgjghljhagokponiphlcednnkle
- Nagi Sumi: https://chromewebstore.google.com/detail/nagi-sumi/andmeafifmdgmcjjpailapkgjoilhgdg

For an update, bump `version` in `package.json` and `public/manifest.json` (or the theme's manifest), run `npm run package`, and upload the zip under Package in the dashboard.
