/* Pure figures for the business reports. No imports, so they run under node --test. */

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

/** Profit as a fraction of revenue. `null` when there is no revenue to measure against. */
export function profitMargin(revenue: number, cost: number): number | null {
  const r = safe(revenue);
  if (r <= 0) return null;
  return (r - safe(cost)) / r;
}

export interface ProfitTotals {
  revenue: number;
  cost: number;
  profit: number;
  margin: number | null;
  /** How many rows lose money. */
  losing: number;
}

export function profitTotals(rows: readonly { revenue: number; cost: number }[]): ProfitTotals {
  let revenue = 0;
  let cost = 0;
  let losing = 0;
  for (const r of rows) {
    revenue += safe(r.revenue);
    cost += safe(r.cost);
    if (safe(r.revenue) - safe(r.cost) < 0) losing += 1;
  }
  return { revenue, cost, profit: revenue - cost, margin: profitMargin(revenue, cost), losing };
}

export type MarginBand = "loss" | "thin" | "healthy";

/** Below zero is a loss, below `thinBelow` (default 15%) is thin. */
export function marginBand(margin: number | null, thinBelow = 0.15): MarginBand {
  if (margin === null) return "thin";
  if (margin < 0) return "loss";
  return margin < thinBelow ? "thin" : "healthy";
}

/** Actual against target as a fraction (0.8 is 80%). Zero target counts as no target: 0. */
export function attainment(actual: number, target: number): number {
  const t = safe(target);
  return t > 0 ? safe(actual) / t : 0;
}

export type KpiStatus = "ahead" | "on-track" | "behind";

export function kpiStatus(fraction: number, onTrackAt = 0.8): KpiStatus {
  if (fraction >= 1) return "ahead";
  return fraction >= onTrackAt ? "on-track" : "behind";
}

export interface PipelineStageInput {
  id: string;
  count: number;
  value: number;
  /** Deals that close won from this stage onwards are counted on the last stage. */
  won?: boolean;
}

export interface PipelineStageRow<T extends PipelineStageInput = PipelineStageInput> {
  stage: T;
  /** Share of the previous stage that reached this one (1 for the first). */
  fromPrevious: number;
  /** Share of the first stage that reached this one. */
  fromFirst: number;
  /** Average value of a deal at this stage. */
  average: number;
}

export function pipelineRows<T extends PipelineStageInput>(stages: readonly T[]): PipelineStageRow<T>[] {
  const first = stages[0]?.count ?? 0;
  return stages.map((stage, i) => {
    const prev = i === 0 ? stage.count : (stages[i - 1]?.count ?? 0);
    return {
      stage,
      fromPrevious: prev > 0 ? stage.count / prev : 0,
      fromFirst: first > 0 ? stage.count / first : 0,
      average: stage.count > 0 ? stage.value / stage.count : 0,
    };
  });
}

/** Won share of everything that entered the pipeline. */
export function winRate(stages: readonly PipelineStageInput[]): number {
  const first = stages[0]?.count ?? 0;
  const won = stages.find((s) => s.won)?.count ?? stages[stages.length - 1]?.count ?? 0;
  return first > 0 ? won / first : 0;
}

/** The 50th percentile, for response and resolution times where a mean is skewed by a few slow tickets. */
export function median(values: readonly number[]): number {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return 0;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? (v[mid] ?? 0) : ((v[mid - 1] ?? 0) + (v[mid] ?? 0)) / 2;
}

/** Share of tickets answered within the objective. */
export function slaRate(met: number, total: number): number {
  return total > 0 ? safe(met) / total : 0;
}
