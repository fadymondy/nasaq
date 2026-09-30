/** Pure path helpers for desktop locations (Orchestra workspace roots). No React, no filesystem. */

export type PathStyle = "windows" | "posix";

/** Windows drive (`C:\x`, `C:/x`), UNC (`\server\share`), or POSIX (`/x`, `~/x`) paths count as absolute. */
export function isAbsolutePath(path: string): boolean {
  const p = path.trim();
  return /^[a-zA-Z]:[\\/]/.test(p) || /^\\\\[^\\]/.test(p) || p.startsWith("/") || p === "~" || p.startsWith("~/");
}

export function pathStyle(path: string): PathStyle {
  const p = path.trim();
  return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith("\\\\") ? "windows" : "posix";
}

/** Trim, use one separator style, and drop trailing separators (but keep `/` and `C:\`). */
export function normalizePath(path: string): string {
  let p = path.trim();
  if (pathStyle(p) === "windows") {
    p = p.replaceAll("/", "\\");
    const unc = p.startsWith("\\\\");
    p = (unc ? "\\\\" : "") + p.slice(unc ? 2 : 0).replace(/\\{2,}/g, "\\");
    if (/^[a-zA-Z]:\\?$/.test(p)) return `${p.slice(0, 1).toUpperCase()}:\\`;
    return p.replace(/\\+$/, "");
  }
  p = p.replace(/\/{2,}/g, "/");
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

const fold = (p: string) => (pathStyle(p) === "windows" ? p.toLowerCase() : p);

/** True when both point at the same folder (Windows paths compare case-insensitively). */
export function samePath(a: string, b: string): boolean {
  return fold(normalizePath(a)) === fold(normalizePath(b));
}

/** True when `child` is `parent` or inside it. */
export function pathContains(parent: string, child: string): boolean {
  const p = fold(normalizePath(parent));
  const c = fold(normalizePath(child));
  if (p === c) return true;
  const sep = pathStyle(parent) === "windows" ? "\\" : "/";
  const prefix = p.endsWith(sep) ? p : p + sep;
  return c.startsWith(prefix);
}

/** The last segment: `D:\Sites\nasaq` gives `nasaq`; a drive or `/` gives itself. */
export function baseName(path: string): string {
  const p = normalizePath(path);
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p;
}

export type LocationProblem = "empty" | "relative" | "duplicate";
export type LocationWarning = "inside" | "contains";

export interface LocationCheck {
  problem: LocationProblem | null;
  /** Not blocking: the folder is already covered by another location, or covers one. */
  warning: LocationWarning | null;
  /** The other location's path the warning is about. */
  other?: string;
}

/** Validate a path typed or picked for a new location against the ones already added. */
export function checkLocationPath(path: string, existing: readonly string[]): LocationCheck {
  const p = path.trim();
  if (p === "") return { problem: "empty", warning: null };
  if (!isAbsolutePath(p)) return { problem: "relative", warning: null };
  const dup = existing.find((e) => samePath(e, p));
  if (dup) return { problem: "duplicate", warning: null, other: dup };
  const parent = existing.find((e) => pathContains(e, p));
  if (parent) return { problem: null, warning: "inside", other: parent };
  const child = existing.find((e) => pathContains(p, e));
  if (child) return { problem: null, warning: "contains", other: child };
  return { problem: null, warning: null };
}

/** Shorten a long path in the middle for narrow spaces, keeping the drive/root and the last two segments. */
export function shortenPath(path: string, max = 48): string {
  const p = normalizePath(path);
  if (p.length <= max) return p;
  const sep = pathStyle(p) === "windows" ? "\\" : "/";
  const parts = p.split(sep).filter((s, i) => s !== "" || i === 0);
  if (parts.length <= 3) return `\u2026${p.slice(-(max - 1))}`;
  const head = parts[0] === "" ? sep + (parts[1] ?? "") : parts[0];
  const tail = parts.slice(-2).join(sep);
  return `${head}${sep}\u2026${sep}${tail}`;
}
