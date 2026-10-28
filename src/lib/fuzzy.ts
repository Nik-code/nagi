// Scores how well `query` matches `text`: substring hits rank above scattered letters, -1 means no match.
function scoreWord(word: string, text: string) {
  const at = text.indexOf(word)
  if (at >= 0) return 1000 - at * 2 + (at === 0 || /\W/.test(text[at - 1]) ? 200 : 0)
  let score = 0
  let from = 0
  let streak = 0
  for (const ch of word) {
    const next = text.indexOf(ch, from)
    if (next < 0) return -1
    streak = next === from ? streak + 1 : 0
    score += 10 + streak * 6 - Math.min(next - from, 12)
    from = next + 1
  }
  return score
}

export function fuzzy(query: string, ...fields: (string | undefined)[]) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  let best = -1
  for (const field of fields) {
    if (!field) continue
    const text = field.toLowerCase()
    let total = 0
    for (const word of words) {
      const s = scoreWord(word, text)
      if (s < 0) {
        total = -1
        break
      }
      total += s
    }
    best = Math.max(best, total)
  }
  return best
}
