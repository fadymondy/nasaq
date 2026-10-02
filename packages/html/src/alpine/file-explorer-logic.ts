// Pure helpers for nqFileExplorer: name checks, the item count text, sorting and the delete confirm body. No DOM, no Alpine.

export type NameProblem = "empty" | "invalid" | "duplicate" | "reserved";

/** Check a new folder name against its siblings. Names are compared case-insensitively. */
export function checkFolderName(name: string, siblings: readonly string[]): NameProblem | null {
  const n = name.trim();
  if (n === "") return "empty";
  if (n === "." || n === "..") return "reserved";
  if (/[\\/:*?"<>|\u0000]/.test(n)) return "invalid";
  if (siblings.some((s) => s.toLowerCase() === n.toLowerCase())) return "duplicate";
  return null;
}

export interface ItemsLabels {
  one: string;
  two: string;
  few: string;
  many: string;
}

/** "3 items": the labels carry an {n} placeholder (one and two usually do not need it). */
export function itemsText(n: number, labels: ItemsLabels): string {
  const text = n === 1 ? labels.one : n === 2 ? labels.two : n >= 3 && n <= 10 ? labels.few : labels.many;
  return text.replace("{n}", String(n));
}

export interface SortableNode {
  id: string;
  parent: string;
  name: string;
  folder: boolean;
  size: number | null;
  mod: number | null;
  count: number;
}

export type SortKey = "name" | "modified" | "size";

/** The 0-based position of every node among its siblings: folders first, then by `key`. Missing values sort last. */
export function rankSiblings(nodes: readonly SortableNode[], key: SortKey, dir: "asc" | "desc", locale: string): Record<string, number> {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const sign = dir === "asc" ? 1 : -1;
  const value = (n: SortableNode): number | null => (key === "size" ? (n.folder ? n.count : n.size) : key === "modified" ? n.mod : null);
  const groups = new Map<string, SortableNode[]>();
  for (const n of nodes) groups.set(n.parent, [...(groups.get(n.parent) ?? []), n]);
  const out: Record<string, number> = {};
  for (const list of groups.values()) {
    list.sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1;
      if (key !== "name") {
        const x = value(a);
        const y = value(b);
        if (x === null && y !== null) return 1;
        if (y === null && x !== null) return -1;
        if (x !== null && y !== null && x !== y) return (x - y) * sign;
      }
      return collator.compare(a.name, b.name) * (key === "name" ? sign : 1);
    });
    list.forEach((n, i) => (out[n.id] = i));
  }
  return out;
}
