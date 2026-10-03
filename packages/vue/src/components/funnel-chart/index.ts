export { default as NqFunnelChart } from "./NqFunnelChart.vue";
export { default as NqFunnelList } from "./NqFunnelList.vue";
export type { FunnelChartLabels, FunnelSegment, FunnelStep } from "./NqFunnelChart.vue";
export type { FunnelListLabels, FunnelSummary } from "./NqFunnelList.vue";
// Helpers are exported under funnel-prefixed names so the all-components index cannot clash with other components.
export {
  barWidth as funnelBarWidth,
  biggestDropIndex as funnelBiggestDropIndex,
  funnelRows,
  insertStep as funnelInsertStep,
  moveStep as funnelMoveStep,
  overallConversion as funnelOverallConversion,
  removeStep as funnelRemoveStep,
  windowKey as funnelWindowKey,
  windowMs as funnelWindowMs,
  type FunnelRow,
  type FunnelStepInput,
  type FunnelWindow,
  type WindowUnit as FunnelWindowUnit,
} from "./funnel-math";
