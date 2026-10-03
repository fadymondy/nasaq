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
