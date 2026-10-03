// nqApiReference: search, category and access filters, the Reference / Catalog switch and the open tool of the API reference.
// The markup (list, cards, every tool's detail) is server-rendered by the Blade component; this holds the state and shows or
// hides the rendered pieces.
//
//   <div x-data="nqApiReference({ tools: [{ id, name, summary, category, scope, access, args: ['title'] }], groups: [['a', 'b'], ['c']],
//        selectedId: 'a', defaultView: 'reference', labels: { results: '{n} tools' } })" x-on:nq:pick="pick($event.detail.id)">
//
// Events (bubbling, from the root): `nq:select` { id } when a tool opens, `nq:view` { view } when the view changes.

import { filterTools, type ToolAccess } from "./api-reference-logic";
import type { Magics, Register } from "./types";

type View = "reference" | "catalog";

interface ApiReferenceConfig {
  tools: { id: string; name: string; summary: string; category?: string | null; scope: string; access?: ToolAccess; args?: string[] }[];
  /** Tool ids per category group, in the order the markup renders the groups. */
  groups: string[][];
  selectedId?: string | null;
  defaultView?: View;
  labels: { results: string };
}

interface ApiReferenceState extends Magics {
  config: ApiReferenceConfig;
  query: string;
  categoryValue: string;
  accessValue: string[];
  viewValue: string[];
  view: View;
  openId: string | null;
  mobileList: boolean;
  readonly visible: Set<string>;
  setView(view: View): void;
}

export const apiReference: Register = (Alpine) => {
  Alpine.data("nqApiReference", (config: ApiReferenceConfig) => ({
    config,
    query: "",
    categoryValue: "all",
    accessValue: ["all"],
    viewValue: [config.defaultView ?? "reference"],
    view: (config.defaultView ?? "reference") as View,
    openId: config.selectedId ?? config.tools[0]?.id ?? null,
    mobileList: true,
    init(this: ApiReferenceState) {
      // The toggle groups may be emptied by pressing the pressed item; put the last value back.
      this.$watch("accessValue", (v: string[]) => {
        if (v.length === 0) this.accessValue = ["all"];
        else if (v.length > 1) this.accessValue = [v[v.length - 1]!];
      });
      this.$watch("viewValue", (v: string[]) => {
        if (v.length === 0) this.viewValue = [this.view];
        else if (v[0] !== this.view) this.setView(v[0] as View);
      });
    },
    get visible(): Set<string> {
      const found = filterTools(
        this.config.tools.map((x: ApiReferenceConfig["tools"][number]) => ({ ...x, category: x.category ?? undefined, args: (x.args ?? []).map((name) => ({ name })) })),
        { query: this.query, category: this.categoryValue, access: (this.accessValue[0] ?? "all") as ToolAccess | "all" },
      );
      return new Set(found.map((x) => x.id));
    },
    get count(): number {
      return this.visible.size;
    },
    get empty(): boolean {
      return this.visible.size === 0;
    },
    get catalogView(): boolean {
      return this.view === "catalog";
    },
    get referenceView(): boolean {
      return this.view === "reference";
    },
    get resultsLabel(): string {
      return this.config.labels.results.replace("{n}", this.visible.size.toLocaleString("en-US"));
    },
    /** True when no tool has this access level, so its filter is disabled. */
    none(level: string): boolean {
      return !this.config.tools.some((x: ApiReferenceConfig["tools"][number]) => (x.access ?? "read") === level);
    },
    matches(id: string): boolean {
      return this.visible.has(id);
    },
    groupShown(i: number): boolean {
      return (this.config.groups[i] ?? []).some((id: string) => this.visible.has(id));
    },
    isOpen(id: string): boolean {
      return this.openId === id;
    },
    setView(this: ApiReferenceState, view: View) {
      if (this.view === view) return;
      this.view = view;
      this.viewValue = [view];
      this.$dispatch("nq:view", { view });
    },
    pick(this: ApiReferenceState, id: string) {
      this.openId = id;
      this.mobileList = false;
      this.setView("reference");
      this.$dispatch("nq:select", { id });
    },
    clear(this: ApiReferenceState) {
      this.query = "";
      this.categoryValue = "all";
      this.accessValue = ["all"];
    },
  }));
};
