/** Pure helpers for the APM panels: percentiles, error rate, span depth and status classes. */

/** The p-th percentile (0 to 100) of `values`, by linear interpolation. Empty input gives 0. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (rank - lo);
}

/** Errors over requests as a fraction. Zero requests give 0. */
export function errorRate(errors: number, requests: number): number {
  return requests > 0 ? errors / requests : 0;
}

/** The response class of an HTTP status: "2xx", "3xx", "4xx", "5xx", or "other". */
export function statusClass(status: number): "2xx" | "3xx" | "4xx" | "5xx" | "other" {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}

export interface SpanLike {
  id: string;
  parentId?: string;
  startMs: number;
  durationMs: number;
}

/** Nesting depth of each span (root is 0), following `parentId`. A missing or cyclic parent counts as a root. */
export function spanDepths(spans: readonly SpanLike[]): Map<string, number> {
  const byId = new Map(spans.map((s) => [s.id, s]));
  const depths = new Map<string, number>();
  for (const span of spans) {
    let depth = 0;
    let cursor: SpanLike | undefined = span;
    const seen = new Set<string>();
    while (cursor?.parentId && byId.has(cursor.parentId) && !seen.has(cursor.parentId)) {
      seen.add(cursor.parentId);
      cursor = byId.get(cursor.parentId);
      depth++;
    }
    depths.set(span.id, depth);
  }
  return depths;
}

/** The trace's wall-clock length: from the earliest start to the latest end. */
export function traceExtent(spans: readonly SpanLike[]): number {
  if (spans.length === 0) return 0;
  const start = Math.min(...spans.map((s) => s.startMs));
  const end = Math.max(...spans.map((s) => s.startMs + s.durationMs));
  return end - start;
}
