import { computed, onBeforeUnmount, onMounted, ref, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import type { TimeComparison, TimeRangeValue } from "../time-range-picker/time-range-math";
import {
  activeFilterCount,
  cleanFieldValues,
  emptyReportFilters,
  RESERVED_FILTER_IDS,
  type ReportFilterFieldSpec,
  type ReportFilterOption,
  type ReportFilterState,
} from "./report-filter-math";
import { reportFiltersFromQuery, reportFiltersToQuery } from "./report-filter-url";

/** A filter of the bar: a label, its options and how it chooses. */
export type ReportFilterField = ReportFilterFieldSpec & {
  label: string;
  options: readonly ReportFilterOption[];
  /** Text of the "no filter" choice. Default: the localised "All". */
  allLabel?: string;
};

export const REPORT_DEFAULT_RANGE: TimeRangeValue = { kind: "relative", preset: "30d" };

export interface UseReportFiltersOptions {
  fields: MaybeRefOrGetter<readonly ReportFilterField[]>;
  /** The range when the URL has none. Default: the last 30 days. */
  defaultRange?: TimeRangeValue;
  defaultComparison?: TimeComparison;
  /** Values for fields when the URL has none (a default owner, say). */
  defaultFields?: Record<string, string[]>;
  /**
   * Controlled mode: the current query (from your router). Filters are read from it, and `onParamsChange` is called with
   * the next query, which keeps your other params. Leave both out to use the page address.
   */
  params?: MaybeRefOrGetter<URLSearchParams | string | undefined>;
  onParamsChange?: (params: URLSearchParams) => void;
  /** Keep the filters in the page address (history.replaceState). Default true when `params` is not given; false keeps them in memory. */
  syncLocation?: boolean;
}

export interface ReportFiltersApi {
  state: ComputedRef<ReportFilterState>;
  defaults: ComputedRef<ReportFilterState>;
  fields: ComputedRef<readonly ReportFilterField[]>;
  setState: (next: ReportFilterState) => void;
  setRange: (range: TimeRangeValue) => void;
  setComparison: (mode: TimeComparison) => void;
  setField: (id: string, values: string[]) => void;
  reset: () => void;
  /** The filters as a query string, without "?". Empty at the defaults. */
  query: ComputedRef<string>;
  /** Number of filters that differ from the defaults. */
  activeCount: ComputedRef<number>;
}

function mergeParams(base: URLSearchParams, own: readonly string[], next: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams(base);
  for (const key of own) out.delete(key);
  next.forEach((value, key) => out.append(key, value));
  return out;
}

/**
 * The report filters as state, with the URL as the source of truth: they read from the query on load, write to it on
 * change, and follow the back button. Defaults stay out of the URL, so a shared link is short. Field ids "range" and
 * "compare" are reserved.
 */
export function useReportFilters(options: UseReportFiltersOptions): ReportFiltersApi {
  const fields = computed(() => toValue(options.fields));
  const specs = computed<readonly ReportFilterFieldSpec[]>(() => fields.value.map(({ id, kind, options: opts }) => ({ id, kind, options: opts })));
  const rawParams = () => toValue(options.params ?? undefined);
  const controlled = () => rawParams() !== undefined;
  const useLocation = () => !controlled() && (options.syncLocation ?? true);
  const defaults = computed<ReportFilterState>(() => {
    const base = emptyReportFilters(specs.value, options.defaultRange ?? REPORT_DEFAULT_RANGE, options.defaultComparison ?? "none");
    if (options.defaultFields) for (const f of specs.value) if (options.defaultFields[f.id]) base.fields[f.id] = cleanFieldValues(f, options.defaultFields[f.id]!);
    return base;
  });
  const own = computed(() => [...RESERVED_FILTER_IDS, ...specs.value.map((f) => f.id)]);
  const memory = ref<ReportFilterState>(defaults.value);
  const paramsKey = computed(() => {
    const p = rawParams();
    return p === undefined ? "" : typeof p === "string" ? p : p.toString();
  });
  const state = computed<ReportFilterState>(() => (controlled() ? reportFiltersFromQuery(paramsKey.value, specs.value, defaults.value) : memory.value));

  const read = () => {
    if (useLocation()) memory.value = reportFiltersFromQuery(window.location.search, specs.value, defaults.value);
  };
  onMounted(() => {
    read();
    window.addEventListener("popstate", read);
  });
  onBeforeUnmount(() => window.removeEventListener("popstate", read));

  function setState(next: ReportFilterState) {
    const clean: ReportFilterState = { ...next, fields: Object.fromEntries(specs.value.map((f) => [f.id, cleanFieldValues(f, next.fields[f.id] ?? [])])) };
    const nextParams = new URLSearchParams(reportFiltersToQuery(clean, specs.value, defaults.value));
    if (controlled()) {
      options.onParamsChange?.(mergeParams(new URLSearchParams(paramsKey.value), own.value, nextParams));
      return;
    }
    memory.value = clean;
    if (useLocation()) {
      const merged = mergeParams(new URLSearchParams(window.location.search), own.value, nextParams).toString();
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${merged ? `?${merged}` : ""}${window.location.hash}`);
    }
    options.onParamsChange?.(nextParams);
  }

  return {
    state,
    defaults,
    fields,
    setState,
    setRange: (range) => setState({ ...state.value, range }),
    setComparison: (comparison) => setState({ ...state.value, comparison }),
    setField: (id, values) => setState({ ...state.value, fields: { ...state.value.fields, [id]: values } }),
    reset: () => setState(defaults.value),
    query: computed(() => reportFiltersToQuery(state.value, specs.value, defaults.value)),
    activeCount: computed(() => activeFilterCount(state.value, specs.value, defaults.value)),
  };
}
