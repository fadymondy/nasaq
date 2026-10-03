/*
 * Paths into a nested form value: "address.city", "contacts[1].phone", "contacts[].phones[]" (a pattern for every
 * item). Pure functions with no imports, so they run on the server and in node tests. Keys must not contain
 * ".", "[" or "]". `null` stands for "every index" in a parsed pattern.
 */

export type SchemaPathSegment = string | number | null;

/**
 * "a.b", "a[1].b", "a.1.b", "/a/1/b" (a JSON pointer) and "a[].b" (a pattern) all parse.
 * A bare number after a dot or slash is an index, which is how many servers write list paths.
 */
export function schemaPathParse(path: string): SchemaPathSegment[] {
  if (!path) return [];
  const out: SchemaPathSegment[] = [];
  if (path.startsWith("/")) {
    for (const part of path.slice(1).split("/")) {
      if (part === "") continue;
      const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
      out.push(/^\d+$/.test(key) ? Number(key) : key);
    }
    return out;
  }
  const re = /([^.[\]]+)|\[(\d*)\]/g;
  for (let m = re.exec(path); m; m = re.exec(path)) {
    if (m[1] !== undefined) out.push(/^\d+$/.test(m[1]) && out.length > 0 ? Number(m[1]) : m[1]);
    else out.push(m[2] === "" ? null : Number(m[2]));
  }
  return out;
}

/** The canonical text of a path: keys joined by dots, indices in brackets. */
export function schemaPathFormat(segments: readonly SchemaPathSegment[]): string {
  let out = "";
  for (const seg of segments) {
    if (typeof seg === "string") out += out ? `.${seg}` : seg;
    else out += seg === null ? "[]" : `[${seg}]`;
  }
  return out;
}

/** Writes any accepted spelling of a path in the canonical one. */
export function schemaPathNormalize(path: string): string {
  return schemaPathFormat(schemaPathParse(path));
}

/** "contacts[1].phones[0]" becomes "contacts[].phones[]". */
export function schemaPathPattern(path: string): string {
  return schemaPathFormat(schemaPathParse(path).map((s) => (typeof s === "number" ? null : s)));
}

/** The path one level up: "contacts[1].phone" gives "contacts[1]", and "contacts[1]" gives "contacts". */
export function schemaPathParent(path: string): string {
  return schemaPathFormat(schemaPathParse(path).slice(0, -1));
}

/** The indices of a concrete path, in order. */
export function schemaPathIndices(path: string): number[] {
  return schemaPathParse(path).filter((s): s is number => typeof s === "number");
}

/** True when `path` is `ancestor` or lies inside it ("contacts[1].phone" is inside "contacts" and "contacts[1]"). */
export function schemaPathInside(path: string, ancestor: string): boolean {
  if (ancestor === "") return true;
  return path === ancestor || path.startsWith(`${ancestor}.`) || path.startsWith(`${ancestor}[`);
}

/** Whether a concrete path matches a pattern. A pattern without brackets matches only itself. */
export function schemaPathMatches(pattern: string, path: string): boolean {
  const p = schemaPathParse(pattern);
  const c = schemaPathParse(path);
  if (p.length !== c.length) return false;
  return p.every((seg, i) => (seg === null ? typeof c[i] === "number" : seg === c[i]));
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The value at a path, or `fallback` when any step is missing. */
export function schemaPathGet(source: unknown, path: string | readonly SchemaPathSegment[], fallback?: unknown): unknown {
  const segments = typeof path === "string" ? schemaPathParse(path) : path;
  let current: unknown = source;
  for (const seg of segments) {
    if (seg === null) return fallback;
    if (typeof seg === "number") {
      if (!Array.isArray(current) || seg >= current.length) return fallback;
      current = current[seg];
    } else {
      if (!isRecord(current) || !(seg in current)) return fallback;
      current = current[seg];
    }
  }
  return current === undefined ? fallback : current;
}

/**
 * A copy of `source` with the value set at the path. Only the objects and arrays along the path are copied, so
 * everything else keeps its identity. Missing steps are created: an array before an index, an object before a key.
 */
export function schemaPathSet<T>(source: T, path: string | readonly SchemaPathSegment[], value: unknown): T {
  const segments = typeof path === "string" ? schemaPathParse(path) : path;
  if (segments.length === 0) return value as T;
  const [head, ...rest] = segments as [SchemaPathSegment, ...SchemaPathSegment[]];
  if (head === null) return source;
  if (typeof head === "number") {
    const list = Array.isArray(source) ? [...source] : [];
    list[head] = schemaPathSet(list[head], rest, value);
    return list as T;
  }
  const base: Record<string, unknown> = isRecord(source) ? source : {};
  return { ...base, [head]: schemaPathSet(base[head], rest, value) } as T;
}

/**
 * Resolves a reference used in a rule to a concrete path, from the field the rule acts on (`from`):
 * - `./type` is a sibling of `from`, so inside an array item it reads the same item;
 * - `../type` is a sibling of the enclosing object or item;
 * - `contacts[].type` takes its indices, in order, from `from`;
 * - anything else is an absolute path.
 */
export function schemaPathResolve(ref: string, from: string): string {
  const fromSegments = schemaPathParse(from);
  let scope = fromSegments.slice(0, -1);
  let rest = ref;
  if (rest.startsWith("./")) rest = rest.slice(2);
  else if (rest.startsWith("../")) {
    while (rest.startsWith("../")) {
      rest = rest.slice(3);
      if (typeof scope[scope.length - 1] === "number") scope = scope.slice(0, -1);
      scope = scope.slice(0, -1);
    }
  } else scope = [];
  const indices = schemaPathIndices(from);
  let next = 0;
  const bound = schemaPathParse(rest).map((seg) => (seg === null ? (indices[next++] ?? null) : seg));
  return schemaPathFormat([...scope, ...bound]);
}
