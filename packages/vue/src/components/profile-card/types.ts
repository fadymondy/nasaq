import type { Presence } from "./profile-model";

/** A person as the cards show them. Everything but `id` and `name` is optional. */
export interface PersonProfile {
  id: string;
  name: string;
  /** Without the `@`. Shown under the name. */
  handle?: string;
  email?: string;
  avatar?: string;
  /** Job title or workspace role. */
  role?: string;
  presence?: Presence;
  /** A custom status, such as "In a meeting until 3". */
  statusText?: string;
  /** IANA time zone (`Asia/Riyadh`). Enables the local time line. */
  timeZone?: string;
  /** Teams the person is in. */
  teams?: readonly string[];
  location?: string;
}

export type MentionKind = "person" | "team" | "group";

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
