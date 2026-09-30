export type ResearchStageState = "pending" | "running" | "done" | "failed";

export interface ResearchStageLike {
  id: string;
  state: ResearchStageState;
}

/** Evidence id -> its number in the answer (1-based, in list order). */
export function evidenceNumbers(evidence: readonly { id: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  evidence.forEach((e) => {
    if (!map.has(e.id)) map.set(e.id, map.size + 1);
  });
  return map;
}

/** The citation numbers a block points at, ascending and without duplicates. Ids with no evidence are dropped. */
export function citedNumbers(cites: readonly string[] | undefined, numbers: ReadonlyMap<string, number>): { id: string; n: number }[] {
  const seen = new Set<string>();
  const out: { id: string; n: number }[] = [];
  for (const id of cites ?? []) {
    const n = numbers.get(id);
    if (n === undefined || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, n });
  }
  return out.sort((a, b) => a.n - b.n);
}

/** How far along the stages are: finished count, total, and the index of the running stage (or the first pending one). */
export function stageProgress(stages: readonly ResearchStageLike[]): { done: number; total: number; current: number } {
  const done = stages.filter((s) => s.state === "done").length;
  const running = stages.findIndex((s) => s.state === "running");
  const current = running >= 0 ? running : Math.max(0, stages.findIndex((s) => s.state === "pending"));
  return { done, total: stages.length, current: Math.min(current, Math.max(0, stages.length - 1)) };
}

/** Evidence that no answer block cites. Worth showing apart, so nothing kept is lost. */
export function uncitedEvidence<E extends { id: string }>(evidence: readonly E[], blocks: readonly { cites?: readonly string[] }[]): E[] {
  const cited = new Set(blocks.flatMap((b) => b.cites ?? []));
  return evidence.filter((e) => !cited.has(e.id));
}
