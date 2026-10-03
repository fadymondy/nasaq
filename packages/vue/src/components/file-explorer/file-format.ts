/** Pure helpers for the file explorer: file kinds, tree walking, sorting and name checks. Copy of the React helpers. */

export type FileKind = "folder" | "image" | "video" | "audio" | "pdf" | "archive" | "code" | "sheet" | "doc" | "text" | "other";

export interface FileNodeShape {
  id: string;
  name: string;
  kind: "file" | "folder";
  size?: number | undefined;
  modifiedAt?: Date | number | string | undefined;
  mime?: string | undefined;
  children?: readonly FileNodeShape[] | undefined;
}

const EXT: Record<string, FileKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", avif: "image", svg: "image", bmp: "image", ico: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", flac: "audio",
  pdf: "pdf",
  zip: "archive", gz: "archive", tar: "archive", rar: "archive", "7z": "archive", tgz: "archive",
  ts: "code", tsx: "code", js: "code", jsx: "code", mjs: "code", json: "code", css: "code", html: "code", go: "code", py: "code", rs: "code", sh: "code", sql: "code", yml: "code", yaml: "code", php: "code",
  csv: "sheet", xlsx: "sheet", xls: "sheet", tsv: "sheet",
  doc: "doc", docx: "doc", pptx: "doc", ppt: "doc", odt: "doc",
  txt: "text", md: "text", log: "text", env: "text",
};

/** The lower-case extension without the dot, or "" (`.gitignore` has none). */
export function extension(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : "";
}

/** Which icon and preview a node gets: by MIME type first, then by extension. */
export function fileKind(node: { name: string; kind: "file" | "folder"; mime?: string | undefined }): FileKind {
  if (node.kind === "folder") return "folder";
  const mime = node.mime ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return EXT[extension(node.name)] ?? "other";
}

/** The chain of nodes from a root down to `id` inclusive, or null when it is not in the tree. */
export function findPath<T extends FileNodeShape>(nodes: readonly T[], id: string): T[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    if (node.children) {
      const rest = findPath(node.children as readonly T[], id);
      if (rest) return [node, ...rest];
    }
  }
  return null;
}

export function findNode<T extends FileNodeShape>(nodes: readonly T[], id: string): T | null {
  const path = findPath(nodes, id);
  return path ? (path[path.length - 1] ?? null) : null;
}

export type SortKey = "name" | "size" | "modified";

/** Folders first, then by `key`. A missing size or date sorts last, ties fall back to the name. */
export function sortNodes<T extends FileNodeShape>(nodes: readonly T[], key: SortKey = "name", direction: "asc" | "desc" = "asc", locale = "en"): T[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const sign = direction === "asc" ? 1 : -1;
  const value = (n: T): number | null => (key === "size" ? (n.size ?? null) : key === "modified" ? (n.modifiedAt === undefined ? null : new Date(n.modifiedAt).getTime()) : null);
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    if (key !== "name") {
      const x = value(a);
      const y = value(b);
      if (x === null && y !== null) return 1;
      if (y === null && x !== null) return -1;
      if (x !== null && y !== null && x !== y) return (x - y) * sign;
    }
    return collator.compare(a.name, b.name) * (key === "name" ? sign : 1);
  });
}

export type NameProblem = "empty" | "invalid" | "duplicate" | "reserved";

/** Check a new file or folder name against its siblings. Names are compared case-insensitively. */
export function checkName(name: string, siblings: readonly string[]): NameProblem | null {
  const n = name.trim();
  if (n === "") return "empty";
  if (n === "." || n === "..") return "reserved";
  if (/[\\/:*?"<>|\u0000]/.test(n)) return "invalid";
  if (siblings.some((s) => s.toLowerCase() === n.toLowerCase())) return "duplicate";
  return null;
}

/** Total bytes of the files directly inside a folder. */
export function folderSize(node: FileNodeShape): number {
  return (node.children ?? []).reduce((sum, c) => sum + (c.kind === "file" ? (c.size ?? 0) : 0), 0);
}
