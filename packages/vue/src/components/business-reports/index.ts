export { default as NqProfitabilityReport } from "./NqProfitabilityReport.vue";
export type { ProfitabilityRow } from "./NqProfitabilityReport.vue";
export { default as NqEmployeeKpiDashboard } from "./NqEmployeeKpiDashboard.vue";
export type { EmployeeKpi } from "./NqEmployeeKpiDashboard.vue";
export { default as NqPipelineReport } from "./NqPipelineReport.vue";
export type { PipelineStage } from "./NqPipelineReport.vue";
export { default as NqSupportStatsReport } from "./NqSupportStatsReport.vue";
export type { SupportAgentRow, SupportSummary } from "./NqSupportStatsReport.vue";
export type { BusinessReportsLabels } from "./strings";
// Helpers carry the business-reports prefix so the all-components index cannot clash with other components.
export {
  attainment as businessReportsAttainment,
  kpiStatus as businessReportsKpiStatus,
  marginBand as businessReportsMarginBand,
  median as businessReportsMedian,
  pipelineRows as businessReportsPipelineRows,
  profitMargin as businessReportsProfitMargin,
  profitTotals as businessReportsProfitTotals,
  slaRate as businessReportsSlaRate,
  winRate as businessReportsWinRate,
} from "./business-reports-math";
export type {
  KpiStatus as BusinessReportsKpiStatus,
  MarginBand as BusinessReportsMarginBand,
  PipelineStageInput as BusinessReportsPipelineStageInput,
  PipelineStageRow as BusinessReportsPipelineStageRow,
  ProfitTotals as BusinessReportsProfitTotals,
} from "./business-reports-math";
