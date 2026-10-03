/** A tab in a detail page's sub-sidebar. Tabs with the same `section` are listed together under it. */
export interface DetailTabLike {
  key: string;
  section?: string;
  disabled?: boolean;
}

/** Groups tabs by `section`, in the order each section first appears. Tabs without one form a leading group. Pure. */
export function groupDetailTabs<T extends DetailTabLike>(tabs: readonly T[]): { section: string | null; tabs: T[] }[] {
  const groups: { section: string | null; tabs: T[] }[] = [];
  const unsectioned: T[] = [];
  const bySection = new Map<string, T[]>();
  for (const tab of tabs) {
    if (!tab.section) {
      unsectioned.push(tab);
      continue;
    }
    let list = bySection.get(tab.section);
    if (!list) {
      list = [];
      bySection.set(tab.section, list);
      groups.push({ section: tab.section, tabs: list });
    }
    list.push(tab);
  }
  return unsectioned.length ? [{ section: null, tabs: unsectioned }, ...groups] : groups;
}

/** The tab `step` places away from `active` among the enabled ones, wrapping around; for arrow keys. Pure. */
export function stepDetailTab<T extends DetailTabLike>(tabs: readonly T[], active: string, step: 1 | -1 | "first" | "last"): T | undefined {
  const enabled = tabs.filter((t) => !t.disabled);
  if (!enabled.length) return undefined;
  if (step === "first") return enabled[0];
  if (step === "last") return enabled[enabled.length - 1];
  const at = enabled.findIndex((t) => t.key === active);
  if (at === -1) return enabled[0];
  return enabled[(at + step + enabled.length) % enabled.length];
}
