import type { NoteColor } from "./notes-model";

/** The soft tint and border of a coloured note, from the `--nq-tag-*` tokens. */
export function noteTint(color: NoteColor | null | undefined) {
  return color ? { background: `var(--nq-tag-${color}-soft)`, borderColor: `color-mix(in oklab, var(--nq-tag-${color}) 45%, transparent)` } : undefined;
}
