import type { Presence } from "../profile-card";
import type { MentionKind } from "./mention-model";

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

