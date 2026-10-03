import type { IconEntry } from "./icon-catalog";

/** Lower-case, drop Arabic diacritics and tatweel, fold alef / yeh / teh marbuta variants, so "احمد" finds "أحمد". */
export function normalizeIconQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ̀-ͯ]/g, "")
    .replace(/[آأإ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[-_\s]+/g, " ")
    .trim();
}

/**
 * Filters icons by category and query. Every word of the query must match the start of a word in the icon's
 * name or in its English or Arabic keywords. Name matches rank first.
 */
export function filterIcons(icons: readonly IconEntry[], query: string, category?: string | null): IconEntry[] {
  const pool = category ? icons.filter((i) => i.category === category) : icons;
  const words = normalizeIconQuery(query).split(" ").filter(Boolean);
  if (!words.length) return [...pool];
  const scored: { entry: IconEntry; score: number }[] = [];
  for (const entry of pool) {
    const nameWords = normalizeIconQuery(entry.name).split(" ");
    const extra = normalizeIconQuery(`${entry.keywords} ${entry.keywordsAr ?? ""}`).split(" ");
    let score = 0;
    let all = true;
    for (const w of words) {
      if (nameWords.some((n) => n.startsWith(w))) score += 2;
      else if (extra.some((n) => n.startsWith(w))) score += 1;
      else if (normalizeIconQuery(entry.name).includes(w)) score += 0.5;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.entry);
}

/** The index the grid focus moves to. `rtl` swaps left and right. Returns the same index when the key does nothing. */
export function nextGridIndex(key: string, index: number, count: number, columns: number, rtl = false): number {
  if (count <= 0) return -1;
  const step = key === "ArrowRight" ? (rtl ? -1 : 1) : key === "ArrowLeft" ? (rtl ? 1 : -1) : 0;
  let next = index;
  switch (key) {
    case "ArrowRight":
    case "ArrowLeft":
      next = index + step;
      break;
    case "ArrowDown":
      next = index + columns;
      if (next >= count) next = index; // stay on the last row
      break;
    case "ArrowUp":
      next = index - columns;
      break;
    case "Home":
      next = index - (index % columns);
      break;
    case "End":
      next = Math.min(count - 1, index - (index % columns) + columns - 1);
      break;
    case "PageDown":
      next = Math.min(count - 1, index + columns * 4);
      break;
    case "PageUp":
      next = Math.max(0, index - columns * 4);
      break;
    default:
      return index;
  }
  return next < 0 || next >= count ? index : next;
}

/** Puts `name` first in the recent list, without duplicates, keeping at most `max`. */
export function pushRecent(recent: readonly string[], name: string, max = 8): string[] {
  return [name, ...recent.filter((n) => n !== name)].slice(0, max);
}
