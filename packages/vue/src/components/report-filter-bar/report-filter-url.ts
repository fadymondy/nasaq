/*
 * The URL helpers with the time range codec already bound, so callers do not pass it.
 */
import { parseTimeRange, serializeTimeRange } from "../time-range-picker/time-range-math";
import {
  filtersFromParams,
  filtersToParams,
  type ReportFilterFieldSpec,
  type ReportFilterState,
  type ReportRangeCodec,
  type SavedReportView,
  viewMatches,
  viewToState,
} from "./report-filter-math";

export const REPORT_RANGE_CODEC: ReportRangeCodec = { parse: parseTimeRange, serialize: serializeTimeRange };

/** The filters as a query string (without the "?"). Defaults are left out. */
export function reportFiltersToQuery(state: ReportFilterState, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState): string {
  return filtersToParams(state, fields, defaults, REPORT_RANGE_CODEC).toString();
}

/** Reads the filters from a query string or `URLSearchParams`. Unknown keys and bad values fall back to the defaults. */
export function reportFiltersFromQuery(input: URLSearchParams | string, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState): ReportFilterState {
  return filtersFromParams(input, fields, defaults, REPORT_RANGE_CODEC);
}

export function savedViewState(view: Pick<SavedReportView, "query">, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState): ReportFilterState {
  return viewToState(view, fields, defaults, REPORT_RANGE_CODEC);
}

export function savedViewMatches(view: Pick<SavedReportView, "query">, state: ReportFilterState, fields: readonly ReportFilterFieldSpec[], defaults: ReportFilterState): boolean {
  return viewMatches(view, state, fields, defaults, REPORT_RANGE_CODEC);
}
