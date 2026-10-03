/*
 * Line diff for version history: common prefix and suffix are trimmed, the middle is matched with a longest common
 * subsequence, and unchanged runs can be folded away. Pure, so the view and the tests share it.
 */
export type DiffType = "same" | "add" | "del";

export interface DiffLine {
  type: DiffType;
  text: string;
  /** 1-based line number in the older text (not for additions). */
  oldLine?: number;
  /** 1-based line number in the newer text (not for deletions). */
  newLine?: number;
}

export type DiffItem = DiffLine | { type: "gap"; count: number };

/** The most cells the LCS table may have before the middle is treated as fully replaced. */
const LIMIT = 4_000_000;

const split = (text: string): string[] => (text === "" ? [] : text.replace(/\r\n/g, "\n").split("\n"));

/** Line-by-line differences from `older` to `newer`, in reading order. */
export function diffLines(older: string, newer: string): DiffLine[] {
  const a = split(older);
  const b = split(newer);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const out: DiffLine[] = [];
  for (let i = 0; i < start; i++) out.push({ type: "same", text: a[i] as string, oldLine: i + 1, newLine: i + 1 });

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  const mid: DiffLine[] = [];
  if (n * m > LIMIT) {
    midA.forEach((text, i) => mid.push({ type: "del", text, oldLine: start + i + 1 }));
    midB.forEach((text, j) => mid.push({ type: "add", text, newLine: start + j + 1 }));
  } else {
    // lcs[i][j]: length of the longest common subsequence of midA[i..] and midB[j..]
    const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--) lcs[i]![j] = midA[i] === midB[j] ? (lcs[i + 1]![j + 1] as number) + 1 : Math.max(lcs[i + 1]![j] as number, lcs[i]![j + 1] as number);
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        mid.push({ type: "same", text: midA[i] as string, oldLine: start + i + 1, newLine: start + j + 1 });
        i++;
        j++;
      } else if (i < n && (j === m || (lcs[i + 1]![j] as number) >= (lcs[i]![j + 1] as number))) {
        mid.push({ type: "del", text: midA[i] as string, oldLine: start + i + 1 });
        i++;
      } else {
        mid.push({ type: "add", text: midB[j] as string, newLine: start + j + 1 });
        j++;
      }
    }
  }
  out.push(...mid);
  for (let k = 0; endA + k < a.length; k++) out.push({ type: "same", text: a[endA + k] as string, oldLine: endA + k + 1, newLine: endB + k + 1 });
  return out;
}

export function diffStats(lines: readonly DiffLine[]): { added: number; removed: number; changed: boolean } {
  const added = lines.filter((l) => l.type === "add").length;
  const removed = lines.filter((l) => l.type === "del").length;
  return { added, removed, changed: added + removed > 0 };
}

/** Folds runs of unchanged lines longer than `2 * context` into a gap marker, keeping `context` lines around each change. */
export function foldDiff(lines: readonly DiffLine[], context = 3): DiffItem[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.type === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true;
  });
  const out: DiffItem[] = [];
  let hidden = 0;
  lines.forEach((l, i) => {
    if (keep[i]) {
      if (hidden) out.push({ type: "gap", count: hidden });
      hidden = 0;
      out.push(l);
    } else hidden++;
  });
  if (hidden) out.push({ type: "gap", count: hidden });
  return out;
}

/** Newest first; ties broken by higher version. */
export function sortVersions<T extends { savedAt: Date | number | string; version: number }>(versions: readonly T[]): T[] {
  return [...versions].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime() || b.version - a.version);
}
