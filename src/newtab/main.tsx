import { loadState } from '../lib/store'
import { boot } from '../ui/boot'
import { NewTab } from './NewTab'

// With Nagi's new tab switched off in settings, hand the tab straight to Chrome's own page.
async function start() {
  if (chrome.runtime?.id && !(await loadState()).settings.newTab) {
    const tab = await chrome.tabs.getCurrent()
    if (tab?.id !== undefined) return void chrome.tabs.update(tab.id, { url: 'chrome://new-tab-page/' })
  }
  void boot(NewTab)
}

void start()
