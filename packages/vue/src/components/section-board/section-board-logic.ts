/** One section of a `NqSectionBoard`: what it shows, and the AI prompt, model and settings that produce it. */
export interface BoardSection {
  id: string;
  title: string;
  /** A short tag beside the title ("Daily", "Beta"). */
  badge?: string;
  /** The prompt that generates this section. */
  prompt?: string;
  /** A model id from `models`; unset means the default model. */
  model?: string;
  /** Free key/value settings passed to whatever renders the section. */
  settings?: Readonly<Record<string, string>>;
  /** What the section shows in view mode, unless the `content` slot is given. Plain text. */
  content?: string;
}

export interface BoardSectionModel {
  value: string;
  label?: string;
}

/** One editable settings line. Kept as a list so a half-typed key never collapses into another. */
export interface BoardSettingRow {
  key: string;
  value: string;
}

export const sectionSettingRows = (settings?: Readonly<Record<string, string>>): BoardSettingRow[] => Object.entries(settings ?? {}).map(([key, value]) => ({ key, value }));

/** Rows back to a settings object: keys are trimmed, rows with no key are dropped, a repeated key keeps its last value. */
export function sectionSettingsFromRows(rows: readonly BoardSettingRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (key) out[key] = row.value;
  }
  return out;
}

/** The trimmed keys that appear more than once, so the editor can flag them before saving. */
export function duplicateSectionSettingKeys(rows: readonly BoardSettingRow[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}

/** True when the editable parts of two sections differ (title, badge, prompt, model, settings). */
export function boardSectionChanged(a: BoardSection, b: BoardSection): boolean {
  if (a.title !== b.title || (a.badge ?? "") !== (b.badge ?? "") || (a.prompt ?? "") !== (b.prompt ?? "") || (a.model ?? "") !== (b.model ?? "")) return true;
  const x = Object.entries(a.settings ?? {});
  const y = b.settings ?? {};
  return x.length !== Object.keys(y).length || x.some(([k, v]) => y[k] !== v);
}

/**
 * Pointer drag over a grid: the index of the section whose centre is closest to where the dragged one now is
 * (its own centre moved by dx, dy). dnd-kit's closestCenter, with native pointer events.
 */
export function sectionDropIndex(centers: readonly { x: number; y: number }[], from: number, dx: number, dy: number): number {
  const origin = centers[from];
  if (!origin) return from;
  const x = origin.x + dx;
  const y = origin.y + dy;
  let best = from;
  let bestDistance = Infinity;
  centers.forEach((c, i) => {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}
