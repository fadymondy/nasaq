/** Pure helpers for mentions: grouping the picker by kind, ranking matches, and splitting text into text and mention parts. */

export type MentionKind = "person" | "team" | "group";

/** The order sections appear in the picker. */
export const MENTION_KINDS: readonly MentionKind[] = ["person", "team", "group"];

export interface KindedOption {
  id: string;
  name: string;
  kind?: MentionKind;
  handle?: string;
  description?: string;
  keywords?: readonly string[];
}

export const kindOf = (option: { kind?: MentionKind }): MentionKind => option.kind ?? "person";

/**
 * Options that match `query`, best first, then grouped by kind (people, teams, groups) so a section heading
 * and the keyboard order always agree. Ranking: name starts with the query, a word of the name starts with
 * it, then anything that contains it (name, handle, description, keywords). The sort is stable.
 */
export function rankOptions<T extends KindedOption>(options: readonly T[], query: string, normalize: (s: string) => string, limit = Number.POSITIVE_INFINITY): T[] {
  const q = normalize(query.trim());
  const scored: { option: T; score: number; index: number }[] = [];
  options.forEach((option, index) => {
    if (!q) {
      scored.push({ option, score: 0, index });
      return;
    }
    const name = normalize(option.name);
    const handle = option.handle ? normalize(option.handle) : "";
    let score = -1;
    if (name.startsWith(q) || handle.startsWith(q)) score = 0;
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 1;
    else if (name.includes(q) || handle.includes(q)) score = 2;
    else if ([option.description ?? "", ...(option.keywords ?? [])].some((s) => normalize(s).includes(q))) score = 3;
    if (score >= 0) scored.push({ option, score, index });
  });
  scored.sort((a, b) => MENTION_KINDS.indexOf(kindOf(a.option)) - MENTION_KINDS.indexOf(kindOf(b.option)) || a.score - b.score || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.option);
}

/** Sections in display order, empty ones dropped. Feed it the output of `rankOptions`. */
export function groupByKind<T extends { kind?: MentionKind }>(options: readonly T[]): { kind: MentionKind; items: T[] }[] {
  return MENTION_KINDS.map((kind) => ({ kind, items: options.filter((o) => kindOf(o) === kind) })).filter((g) => g.items.length > 0);
}

export interface MentionRange {
  id: string;
  name: string;
  start: number;
  end: number;
}

export type MentionSegment = { type: "text"; text: string } | { type: "mention"; text: string; mention: MentionRange };

/** Cuts `text` into plain and mention parts by range. Overlapping or out-of-range mentions are skipped. */
export function splitMentions(text: string, mentions: readonly MentionRange[]): MentionSegment[] {
  const out: MentionSegment[] = [];
  let cursor = 0;
  for (const mention of [...mentions].sort((a, b) => a.start - b.start)) {
    if (mention.start < cursor || mention.end > text.length || mention.end <= mention.start) continue;
    if (mention.start > cursor) out.push({ type: "text", text: text.slice(cursor, mention.start) });
    out.push({ type: "mention", text: text.slice(mention.start, mention.end), mention });
    cursor = mention.end;
  }
  if (cursor < text.length) out.push({ type: "text", text: text.slice(cursor) });
  return out;
}

export type Presence = "online" | "away" | "busy" | "offline";

export interface MentionOption {
  id: string;
  /** Inserted after the trigger and matched by the query. */
  name: string;
  /** Second line in the list, for example an email or a role. */
  description?: string;
  /** Avatar image. Initials are used without it. */
  avatar?: string;
  /** `person` (default), `team` or `group`. The list is sectioned by kind, and teams and groups get a group icon. */
  kind?: MentionKind;
  /** Without the `@`. Also matched by the query, so `sara` finds "Sara Ali". */
  handle?: string;
  /** Shows a presence dot on the avatar. */
  presence?: Presence;
  /** Extra words the query matches (a team's members, an old name). */
  keywords?: readonly string[];
}

export interface Mention {
  id: string;
  name: string;
  /** Index of the trigger character in the text. */
  start: number;
  /** Index after the last character of the name (the range is `text.slice(start, end)`). */
  end: number;
}

const MIRRORED = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "letterSpacing",
  "wordSpacing",
  "tabSize",
] as const;

/** Where the caret is, relative to the textarea's padding box, measured with an off-screen copy of it. */
export function caretPoint(el: HTMLTextAreaElement, position: number) {
  const mirror = document.createElement("div");
  const style = getComputedStyle(el);
  for (const prop of MIRRORED) (mirror.style as unknown as Record<string, string>)[prop] = (style as unknown as Record<string, string>)[prop] ?? "";
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.textContent = el.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = el.value.slice(position) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const line = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
  const point = {
    top: marker.offsetTop + line - el.scrollTop,
    left: marker.offsetLeft - el.scrollLeft,
  };
  document.body.removeChild(mirror);
  return point;
}

export interface Active {
  /** Index of the trigger character. */
  start: number;
  /** Caret index. */
  caret: number;
  query: string;
}

/** The mention being typed at the caret: a trigger at the start of a word, followed by non-space characters. */
export function findActive(value: string, caret: number, trigger: string): Active | null {
  for (let i = caret - 1; i >= 0; i--) {
    if (value.startsWith(trigger, i)) {
      if (i === 0 || /\s/.test(value[i - 1] as string)) return { start: i, caret, query: value.slice(i + trigger.length, caret) };
      return null;
    }
    if (/\s/.test(value[i] as string)) return null;
  }
  return null;
}

/** Keep mention ranges right after `prev` became `next`: shift the ones after the edit, drop the ones it touched. */
export function syncMentions(mentions: Mention[], prev: string, next: string): Mention[] {
  let p = 0;
  const max = Math.min(prev.length, next.length);
  while (p < max && prev[p] === next[p]) p++;
  let s = 0;
  while (s < max - p && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++;
  const delta = next.length - prev.length;
  const out: Mention[] = [];
  for (const m of mentions) {
    if (m.end <= p) out.push(m);
    else if (m.start >= prev.length - s) out.push({ ...m, start: m.start + delta, end: m.end + delta });
  }
  return out;
}

export const validOnly = (mentions: Mention[], value: string, trigger: string) =>
  mentions.filter((m) => value.slice(m.start, m.end) === `${trigger}${m.name}`);

