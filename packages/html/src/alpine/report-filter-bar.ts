// nqReportFilterBar, nqSavedReportViews and nqReportExportMenu: the filters of a report, named views of them, and the way a report leaves the page.
// The markup is the React ReportFilterBar's (see the Blade components); the state and the maths (report-filter-bar-logic) live here.
//
//   <div x-data="{ filters: null }">
//     <div data-slot="report-filter-bar" x-data="nqReportFilterBar({ fields, comparison: true })" x-modelable="state" x-model="filters">…</div>
//     <section data-slot="saved-report-views" x-data="nqSavedReportViews({ views, fields, canRename: true })" x-modelable="state" x-model="filters">…</section>
//   </div>
//
// `state` is x-modelable plain data: { range: { kind: 'relative', preset: '30d' }, comparison: 'none', fields: { status: ['open', 'won'] } }.
// An empty list means "all". Fires bubbling "filters-change" ({ state, query }) when it changes; `query` is the URL form (defaults left out).
// Saved views fire cancelable events; whoever handles one calls waitUntil(promise), resolve() or reject(message), and a view nobody claims
// is changed locally: "nq-view-save" { name, query }, "nq-view-rename" { view, name }, "nq-view-update" { view, query },
// "nq-view-share" { view, shared } (a string it resolves with is the link and is copied), "nq-view-delete" { view }, and the plain
// "nq-view-apply" { view, state }. The export menu fires "nq-report-print" (cancelable: preventDefault to replace the print dialog)
// and "nq-report-export" { format }.

import { saveExportBlob } from "./export-action-logic";
import {
  activeFilterCount,
  cleanFieldValues,
  emptyReportFilters,
  reportFiltersToQuery,
  reportToMarkdown,
  isValidViewName,
  sameReportRange,
  savedViewMatches,
  savedViewState,
  uniqueViewName,
  type ReportDoc,
  type ReportFilterFieldSpec,
  type ReportFilterState,
  type SavedReportView,
} from "./report-filter-bar-logic";
import type { Register } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Words = Record<string, string>;
interface FieldCfg extends ReportFilterFieldSpec {
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}

/** The placeholder of a "no filter" choice: a select or toggle item cannot have an empty value. */
const ALL = "__nq-all__";
const DEFAULT_RANGE = { kind: "relative", preset: "30d" } as const;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null));
const say = (text: string, ...args: (string | number)[]): string => args.reduce<string>((s, a, i) => s.split(`{${i}}`).join(String(a)), text);

/** A normalised state: every field has a list and only listed values. */
function normalise(state: any, specs: readonly FieldCfg[], defaults: ReportFilterState): ReportFilterState {
  const base = state ?? defaults;
  const fields: Record<string, string[]> = {};
  for (const f of specs) fields[f.id] = cleanFieldValues(f, base.fields?.[f.id] ?? []);
  return { range: clone(base.range ?? defaults.range), comparison: base.comparison ?? "none", fields };
}

/** Fires a cancelable event; whoever claims it with waitUntil / resolve / reject decides when it is done. */
async function claimable(root: HTMLElement, name: string, detail: Record<string, unknown>) {
  let claimed: Promise<unknown> | undefined;
  const claim = (p: Promise<unknown>) => void (claimed ??= p);
  root.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail: {
        ...detail,
        waitUntil: (p: Promise<unknown>) => claim(Promise.resolve(p)),
        resolve: () => claim(Promise.resolve()),
        reject: (message?: string) => claim(Promise.reject(new Error(message ?? ""))),
      },
    }),
  );
  return claimed ? { claimed: true, result: await claimed } : { claimed: false, result: undefined };
}

let counter = 0;

export const reportFilterBar: Register = (Alpine) => {
  Alpine.data(
    "nqReportFilterBar",
    (cfg: { fields?: FieldCfg[]; state?: ReportFilterState | null; defaults?: ReportFilterState | null; comparison?: boolean; t: Words }) => {
      const specs = cfg.fields ?? [];
      const defaults: ReportFilterState = cfg.defaults ?? emptyReportFilters(specs, clone(DEFAULT_RANGE) as any);
      let self: any;
      // The controls bind to these: a value per field (select), a list (toggle group) or a flag per option (checkbox).
      const sel: Record<string, string> = {};
      const tog: Record<string, string[]> = {};
      const chk: Record<string, boolean> = {};
      for (const f of specs) {
        const valuesOf = (): string[] => self.state?.fields?.[f.id] ?? [];
        Object.defineProperty(sel, f.id, {
          enumerable: true,
          get: () => valuesOf()[0] ?? ALL,
          set: (v: string) => self.setField(f.id, v && v !== ALL ? [v] : []),
        });
        Object.defineProperty(tog, f.id, {
          enumerable: true,
          get: () => (valuesOf().length ? [...valuesOf()] : [ALL]),
          set: (v: string[]) => self.setField(f.id, v.filter((x) => x !== ALL).slice(-1)),
        });
        for (const o of f.options) {
          Object.defineProperty(chk, `${f.id}:${o.value}`, {
            enumerable: true,
            get: () => valuesOf().includes(o.value),
            set: (on: boolean) => self.setField(f.id, on ? [...valuesOf(), o.value] : valuesOf().filter((v) => v !== o.value)),
          });
        }
      }
      return {
        state: null as ReportFilterState | null,
        defaults,
        specs,
        t: cfg.t,
        sel,
        tog,
        chk,
        last: "",
        init(this: any) {
          self = this;
          // The server-rendered chips give way to the reactive ones.
          this.$el.querySelectorAll("[data-nq-ssr]").forEach((n: Element) => n.remove());
          this.state = normalise(cfg.state, specs, defaults);
          this.last = JSON.stringify(this.state);
          this.$watch("state", (s: ReportFilterState | null) => {
            if (!s || !s.fields) {
              this.state = normalise(null, specs, defaults);
              return;
            }
            const next = JSON.stringify(s);
            if (next === this.last) return;
            this.last = next;
            this.syncCompare();
            this.$dispatch("filters-change", { state: clone(s), query: reportFiltersToQuery(s, specs, defaults) });
          });
        },
        /** The picker's value: reads and writes state.range. */
        get rangeValue() {
          return (this as any).state?.range ?? defaults.range;
        },
        set rangeValue(v: any) {
          const self2 = this as any;
          if (!v || (self2.state && sameReportRange(v, self2.state.range))) return;
          self2.state = { ...normalise(self2.state, specs, defaults), range: clone(v) };
        },
        setField(this: any, id: string, values: string[]) {
          const spec = specs.find((f) => f.id === id);
          if (!spec) return;
          const cleaned = cleanFieldValues(spec, values);
          const now = normalise(this.state, specs, defaults);
          if (JSON.stringify(now.fields[id]) === JSON.stringify(cleaned)) return;
          this.state = { ...now, fields: { ...now.fields, [id]: cleaned } };
        },
        hasValues(this: any, id: string) {
          return (this.state?.fields?.[id] ?? []).length > 0;
        },
        clearField(this: any, id: string) {
          this.setField(id, []);
        },
        /** What a multi-select shows: All, the one chosen option, or "n selected". */
        summary(this: any, id: string) {
          const f = specs.find((x) => x.id === id);
          const values: string[] = this.state?.fields?.[id] ?? [];
          if (!f) return "";
          if (values.length === 0) return f.allLabel ?? this.t.all;
          if (values.length === 1) return f.options.find((o) => o.value === values[0])?.label ?? values[0]!;
          return say(this.t.selected, values.length);
        },
        onCompare(this: any, event: CustomEvent) {
          if (!cfg.comparison) return;
          const mode = event.detail?.mode;
          if (!mode) return;
          const now = normalise(this.state, specs, defaults);
          if (now.comparison !== mode) this.state = { ...now, comparison: mode };
        },
        /** Keeps the picker's "Compare with" select in step when the comparison changes from outside (reset, a saved view). */
        syncCompare(this: any) {
          if (!cfg.comparison) return;
          const picker = this.$el.querySelector('[data-slot="time-range-picker"]');
          const data = picker ? (Alpine as any).$data(picker) : null;
          if (data && this.state && data.compare !== this.state.comparison) data.compare = this.state.comparison;
        },
        get count(): number {
          const s = (this as any).state;
          return s ? activeFilterCount(s, specs, defaults) : 0;
        },
        get activeText(): string {
          const n = (this as any).count;
          if (n === 0) return "";
          const t = (this as any).t;
          return say(n === 1 ? t.activeOne : n === 2 ? t.activeTwo : t.activeMany, n);
        },
        get chips() {
          const s = (this as any).state;
          if (!s) return [];
          return specs.flatMap((f) =>
            cleanFieldValues(f, s.fields[f.id] ?? []).map((v) => ({ key: `${f.id}:${v}`, id: f.id, value: v, fieldLabel: f.label, label: f.options.find((o) => o.value === v)?.label ?? v })),
          );
        },
        removeLabel(this: any, chip: { fieldLabel: string; label: string }) {
          return say(this.t.removeFilter, `${chip.fieldLabel}: ${chip.label}`);
        },
        removeChip(this: any, chip: { id: string; value: string }) {
          this.setField(
            chip.id,
            (this.state?.fields?.[chip.id] ?? []).filter((v: string) => v !== chip.value),
          );
        },
        reset(this: any) {
          this.state = clone(defaults);
        },
      };
    },
  );

  Alpine.data(
    "nqSavedReportViews",
    (cfg: {
      views?: SavedReportView[];
      fields?: FieldCfg[];
      state?: ReportFilterState | null;
      defaults?: ReportFilterState | null;
      activeId?: string | null;
      canRename?: boolean;
      canUpdate?: boolean;
      canShare?: boolean;
      canDelete?: boolean;
      t: Words;
    }) => {
      const specs = cfg.fields ?? [];
      const defaults: ReportFilterState = cfg.defaults ?? emptyReportFilters(specs, clone(DEFAULT_RANGE) as any);
      return {
        views: (cfg.views ?? []).map((v) => ({ ...v })) as SavedReportView[],
        state: null as ReportFilterState | null,
        t: cfg.t,
        opened: null as string | null,
        forcedId: cfg.activeId ?? null,
        kind: "" as "" | "save" | "rename",
        target: null as SavedReportView | null,
        doomed: null as SavedReportView | null,
        name: "",
        busy: false,
        error: "",
        note: "",
        nameOpen: false,
        deleteOpen: false,
        canRename: Boolean(cfg.canRename),
        canUpdate: Boolean(cfg.canUpdate),
        canShare: Boolean(cfg.canShare),
        canDelete: Boolean(cfg.canDelete),
        init(this: any) {
          this.state = normalise(cfg.state, specs, defaults);
          this.$watch("state", (s: ReportFilterState | null) => {
            if (!s || !s.fields) this.state = normalise(null, specs, defaults);
          });
        },
        get hasMore(): boolean {
          const s = this as any;
          return s.canRename || s.canUpdate || s.canShare || s.canDelete;
        },
        get matching(): SavedReportView | undefined {
          const s = this as any;
          return s.state ? s.views.find((v: SavedReportView) => savedViewMatches(v, s.state, specs, defaults)) : undefined;
        },
        get current(): SavedReportView | undefined {
          const s = this as any;
          const id = s.forcedId !== null ? s.forcedId : s.opened;
          return s.views.find((v: SavedReportView) => v.id === id) ?? s.matching;
        },
        get dirty(): boolean {
          const s = this as any;
          return s.current && s.state ? !savedViewMatches(s.current, s.state, specs, defaults) : false;
        },
        get viewQuery(): string {
          const s = this as any;
          return s.state ? reportFiltersToQuery(s.state, specs, defaults) : "";
        },
        get showUpdate(): boolean {
          const s = this as any;
          return Boolean(s.dirty && s.current && s.canUpdate);
        },
        get saveLabel(): string {
          const s = this as any;
          return s.dirty ? s.t.saveAsNew : s.t.saveView;
        },
        get nameTitle(): string {
          return (this as any).kind === "rename" ? (this as any).t.renameTitle : (this as any).t.saveTitle;
        },
        get nameValid(): boolean {
          return isValidViewName((this as any).name);
        },
        get nameInvalid(): boolean {
          const s = this as any;
          return s.name !== "" && !s.nameValid;
        },
        get busyLabel(): string {
          return (this as any).busy ? (this as any).t.saving : (this as any).t.save;
        },
        get deleteTitle(): string {
          const s = this as any;
          return s.doomed ? say(s.t.deleteTitle, s.doomed.name) : "";
        },
        isCurrent(this: any, view: SavedReportView) {
          return this.current?.id === view.id;
        },
        matches(this: any, view: SavedReportView) {
          return this.state ? savedViewMatches(view, this.state, specs, defaults) : false;
        },
        moreLabel(this: any, view: SavedReportView) {
          return say(this.t.more, view.name);
        },
        anchorX(this: any, e: Event) {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          return getComputedStyle(this.$el).direction === "rtl" ? r.right : r.left;
        },
        anchorY(e: Event) {
          return (e.currentTarget as HTMLElement).getBoundingClientRect().bottom + 4;
        },
        apply(this: any, view: SavedReportView) {
          this.opened = view.id;
          this.forcedId = null;
          const next = savedViewState(view, specs, defaults);
          this.state = next;
          this.$dispatch("nq-view-apply", { view: clone(view), state: clone(next) });
        },
        async run(this: any, fn: () => Promise<void>) {
          try {
            await fn();
          } catch {
            this.note = this.t.failed;
          }
        },
        openSave(this: any) {
          this.kind = "save";
          this.target = null;
          this.name = "";
          this.error = "";
          this.busy = false;
          this.nameOpen = true;
        },
        openRename(this: any, view: SavedReportView) {
          this.kind = "rename";
          this.target = view;
          this.name = view.name;
          this.error = "";
          this.busy = false;
          this.nameOpen = true;
        },
        async submitName(this: any) {
          if (!this.nameValid || this.busy) return;
          this.busy = true;
          this.error = "";
          const renaming = this.kind === "rename" ? this.target : null;
          const taken = this.views.filter((v: SavedReportView) => (renaming ? v.id !== renaming.id : true)).map((v: SavedReportView) => v.name);
          const name = uniqueViewName(this.name, taken);
          try {
            if (renaming) {
              await claimable(this.$root, "nq-view-rename", { view: clone(renaming), name });
              const live = this.views.find((v: SavedReportView) => v.id === renaming.id);
              if (live) live.name = name;
            } else {
              const query = this.viewQuery;
              await claimable(this.$root, "nq-view-save", { name, query });
              const id = `view-${++counter}`;
              this.views.push({ id, name, query, shared: false } as SavedReportView);
              this.opened = id;
              this.forcedId = null;
            }
            this.nameOpen = false;
            this.busy = false;
          } catch {
            this.error = this.t.failed;
            this.busy = false;
          }
        },
        updateView(this: any, view: SavedReportView) {
          if (this.matches(view)) return;
          const query = this.viewQuery;
          return this.run(async () => {
            await claimable(this.$root, "nq-view-update", { view: clone(view), query });
            const live = this.views.find((v: SavedReportView) => v.id === view.id);
            if (live) live.query = query;
          });
        },
        updateCurrent(this: any) {
          if (this.current) return this.updateView(this.current);
        },
        shareView(this: any, view: SavedReportView, shared: boolean) {
          return this.run(async () => {
            const { result } = await claimable(this.$root, "nq-view-share", { view: clone(view), shared });
            const live = this.views.find((v: SavedReportView) => v.id === view.id);
            if (live) (live as any).shared = shared;
            if (shared && typeof result === "string") await this.copyText(result, this.t.linkCopied);
          });
        },
        copyLink(this: any, view: SavedReportView) {
          return this.shareView(view, true);
        },
        async copyText(this: any, text: string, done: string) {
          try {
            await navigator.clipboard.writeText(text);
            this.note = done;
          } catch {
            this.note = this.t.failed;
          }
        },
        openDelete(this: any, view: SavedReportView) {
          this.doomed = view;
          this.deleteOpen = true;
        },
        confirmDelete(this: any) {
          const view = this.doomed;
          this.deleteOpen = false;
          if (!view) return;
          return this.run(async () => {
            await claimable(this.$root, "nq-view-delete", { view: clone(view) });
            this.views = this.views.filter((v: SavedReportView) => v.id !== view.id);
            if (this.opened === view.id) this.opened = null;
          });
        },
      };
    },
  );

  Alpine.data(
    "nqReportExportMenu",
    (cfg: { document?: ReportDoc | null; filename?: string | null; t: Words }) => ({
      note: "",
      t: cfg.t,
      doc: cfg.document ?? { title: "Report", sections: [] },
      rootEl: null as HTMLElement | null,
      init(this: any) {
        this.rootEl = this.$el;
      },
      fileName(this: any) {
        return (cfg.filename ?? this.doc.title).trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "") || "report";
      },
      async run(this: any, format: "pdf" | "markdown" | "copy") {
        try {
          if (format === "pdf") {
            const event = new CustomEvent("nq-report-print", { bubbles: true, cancelable: true });
            this.rootEl.dispatchEvent(event);
            if (!event.defaultPrevented) window.print();
          } else {
            const md = reportToMarkdown(this.doc);
            if (format === "markdown") saveExportBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${this.fileName()}.md`);
            else {
              await navigator.clipboard.writeText(md);
              this.note = this.t.copied;
            }
          }
          this.rootEl.dispatchEvent(new CustomEvent("nq-report-export", { bubbles: true, detail: { format } }));
        } catch {
          this.note = this.t.failed;
        }
      },
    }),
  );
};
