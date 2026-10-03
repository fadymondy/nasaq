export type KnowledgeGapStatus = "open" | "indexed" | "dismissed";

export const KNOWLEDGE_GAP_ORDER: readonly KnowledgeGapStatus[] = ["open", "indexed", "dismissed"];

export interface KnowledgeGapLike {
  id: string;
  status: KnowledgeGapStatus;
  hits: number;
  lastSeen: Date | string | number;
}

const time = (value: Date | string | number) => {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Groups gaps by status. Inside a group the most asked question comes first, then the most recent. */
export function groupGaps<G extends KnowledgeGapLike>(gaps: readonly G[]): Record<KnowledgeGapStatus, G[]> {
  const out: Record<KnowledgeGapStatus, G[]> = { open: [], indexed: [], dismissed: [] };
  for (const gap of gaps) (out[gap.status] ?? out.open).push(gap);
  for (const key of KNOWLEDGE_GAP_ORDER) out[key].sort((a, b) => b.hits - a.hits || time(b.lastSeen) - time(a.lastSeen));
  return out;
}

/** How many gaps are in each status. */
export function gapCounts(gaps: readonly KnowledgeGapLike[]): Record<KnowledgeGapStatus, number> {
  const out: Record<KnowledgeGapStatus, number> = { open: 0, indexed: 0, dismissed: 0 };
  for (const gap of gaps) out[gap.status] += 1;
  return out;
}

/** The statuses a gap can move to from where it is. */
export function gapTransitions(status: KnowledgeGapStatus): KnowledgeGapStatus[] {
  return KNOWLEDGE_GAP_ORDER.filter((s) => s !== status);
}

/** Width of the "asked N times" bar as 0..1, relative to the most asked gap in the list. */
export function hitShare(hits: number, max: number): number {
  if (!(max > 0) || !(hits > 0)) return 0;
  return Math.min(1, hits / max);
}
