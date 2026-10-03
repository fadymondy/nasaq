// Pure helpers of nqSectionBoard (the same maths as the React / Vue section-board logic). No Alpine here.

export interface BoardSection {
  id: string;
  title: string;
  badge?: string;
  prompt?: string;
  model?: string;
  settings?: Readonly<Record<string, string>>;
  content?: string;
}

export interface BoardSectionModel {
  value: string;
  label?: string;
}

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

/** The trimmed keys that appear more than once. */
export function duplicateSectionSettingKeys(rows: readonly BoardSettingRow[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return [...dupes];
}

/** True when the editable parts of two sections differ (title, badge, prompt, model, settings). */
export function boardSectionChanged(a: BoardSection, b: BoardSection): boolean {
  if (a.title !== b.title || (a.badge ?? "") !== (b.badge ?? "") || (a.prompt ?? "") !== (b.prompt ?? "") || (a.model ?? "") !== (b.model ?? "")) return true;
  const x = Object.entries(a.settings ?? {});
  const y = b.settings ?? {};
  return x.length !== Object.keys(y).length || x.some(([k, v]) => y[k] !== v);
}

/** The index of the section whose centre is closest to the dragged one's centre moved by dx, dy (dnd-kit's closestCenter). */
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
