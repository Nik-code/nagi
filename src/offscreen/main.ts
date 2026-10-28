// The service worker has no clipboard, so shortcut copies are written here.
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.target !== 'offscreen' || message.type !== 'copy') return
  const area = document.createElement('textarea')
  area.value = String(message.text)
  document.body.append(area)
  area.select()
  reply(document.execCommand('copy'))
  area.remove()
})
