/** How fresh a plugin's last activity is: within the hour, within the day, longer ago, or never. */
export type PluginActivity = "live" | "recent" | "idle" | "never";

/** Buckets the last activity time. `now` defaults to the current time. Pure. */
export function pluginActivity(
  lastActiveAt: number | string | Date | null | undefined,
  now: number = Date.now(),
  { liveMinutes = 60, recentHours = 24 }: { liveMinutes?: number; recentHours?: number } = {},
): PluginActivity {
  if (lastActiveAt === null || lastActiveAt === undefined || lastActiveAt === "") return "never";
  const at = lastActiveAt instanceof Date ? lastActiveAt.getTime() : typeof lastActiveAt === "number" ? lastActiveAt : Date.parse(lastActiveAt);
  if (!Number.isFinite(at)) return "never";
  const minutes = Math.max(0, now - at) / 60_000;
  if (minutes <= liveMinutes) return "live";
  if (minutes <= recentHours * 60) return "recent";
  return "idle";
}

/** A plugin kind as words when there is no translation: `ai_provider` gives "Ai provider", `mcp-server` "Mcp server". Pure. */
export function humanizePluginKind(kind: string): string {
  const words = kind.replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : "";
}

/** Adds or removes `id`, keeping the order the ids were selected in. Pure. */
export function togglePluginSelected(selected: readonly string[], id: string, next: boolean): string[] {
  const has = selected.includes(id);
  if (next === has) return [...selected];
  return next ? [...selected, id] : selected.filter((s) => s !== id);
}

/** Whether all, some or none of `ids` are selected, for a "select all" checkbox. Pure. */
export function pluginSelectionState(selected: readonly string[], ids: readonly string[]): "all" | "some" | "none" {
  if (ids.length === 0) return "none";
  const chosen = new Set(selected);
  const count = ids.filter((id) => chosen.has(id)).length;
  return count === 0 ? "none" : count === ids.length ? "all" : "some";
}
