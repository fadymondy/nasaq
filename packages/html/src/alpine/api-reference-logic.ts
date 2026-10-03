// Pure logic of the API reference (a copy of the React api-reference-format.ts that the Alpine module needs): search folding and filtering.

export type ToolAccess = "read" | "write" | "destructive";

export interface ToolRow {
  id: string;
  name: string;
  summary: string;
  category?: string;
  scope: string;
  access?: ToolAccess;
  args?: { name: string; description?: string }[];
}

/** Search folding: case and accents are ignored, `_`, `-` and `.` count as spaces so "create issue" finds `create_issue`. */
export function foldTool(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_.\-/:]+/g, " ")
    .toLowerCase();
}

export interface ToolFilter {
  query?: string;
  category?: string;
  access?: ToolAccess | "all";
}

export function filterTools<T extends ToolRow>(tools: T[], { query = "", category = "all", access = "all" }: ToolFilter): T[] {
  const q = foldTool(query.trim());
  return tools.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (access !== "all" && (t.access ?? "read") !== access) return false;
    if (!q) return true;
    const hay = foldTool([t.name, t.summary, t.scope, ...(t.args ?? []).map((a) => a.name)].join(" "));
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}

/** Tools grouped by category in first-seen order; tools without one go under `""`. */
export function groupTools<T extends ToolRow>(tools: T[]): { category: string; tools: T[] }[] {
  const map = new Map<string, T[]>();
  for (const t of tools) {
    const key = t.category ?? "";
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return [...map].map(([category, list]) => ({ category, tools: list }));
}

/** How many tools each access level has. */
export function countByAccess(tools: { access?: ToolAccess }[]): Record<ToolAccess, number> {
  const out: Record<ToolAccess, number> = { read: 0, write: 0, destructive: 0 };
  for (const t of tools) out[t.access ?? "read"] += 1;
  return out;
}

/** A tool call as a JSON string: `{ "tool": name, "arguments": {...} }`, for the example panel. */
export function formatCall(name: string, args: Record<string, unknown>): string {
  return JSON.stringify({ tool: name, arguments: args }, null, 2);
}

/** A sample value for an argument type, for generating example calls. */
export function sampleValue(type: string, name = ""): unknown {
  const t = type.toLowerCase();
  if (t.includes("[]") || t.startsWith("array")) return [];
  if (t.startsWith("int") || t === "number") return 1;
  if (t.startsWith("bool")) return true;
  if (t.startsWith("object")) return {};
  return name ? `<${name}>` : "";
}
