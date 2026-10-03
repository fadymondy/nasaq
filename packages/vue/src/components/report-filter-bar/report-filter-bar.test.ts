import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import {
  NqReportExportMenu,
  NqReportFilterBar,
  NqReportSheet,
  NqSavedReportViews,
  emptyReportFilters,
  reportFiltersFromQuery,
  reportFiltersToQuery,
  reportToMarkdown,
  uniqueViewName,
  useReportFilters,
  type ReportFilterField,
  type ReportFilterState,
  type SavedReportView,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

const NOW = new Date("2026-09-29T09:00:00Z");
const fields: ReportFilterField[] = [
  { id: "status", kind: "multi", label: "Status", options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }] },
  { id: "owner", kind: "select", label: "Owner", options: [{ value: "sara", label: "Sara" }, { value: "omar", label: "Omar" }] },
  { id: "kind", kind: "toggle", label: "Kind", options: [{ value: "new", label: "New" }, { value: "renewal", label: "Renewal" }] },
];
const defaults = emptyReportFilters(fields, { kind: "relative", preset: "30d" });
const stateWith = (patch: Partial<ReportFilterState>): ReportFilterState => ({ ...defaults, ...patch, fields: { ...defaults.fields, ...(patch.fields ?? {}) } });

describe("report filter maths", () => {
  it("round-trips through the query and leaves defaults out", () => {
    expect(reportFiltersToQuery(defaults, fields, defaults)).toBe("");
    const state = stateWith({ range: { kind: "relative", preset: "7d" }, fields: { status: ["open", "won"], owner: ["sara"] } });
    const query = reportFiltersToQuery(state, fields, defaults);
    expect(query).toContain("status=open&status=won");
    expect(reportFiltersFromQuery(query, fields, defaults)).toEqual(state);
    expect(reportFiltersFromQuery("owner=nobody&range=junk&x=1", fields, defaults)).toEqual(defaults);
  });

  it("makes view names unique and exports Markdown", () => {
    expect(uniqueViewName(" Weekly ", ["weekly"])).toBe("Weekly (2)");
    const md = reportToMarkdown({ title: "Profit", filters: [{ label: "Period", value: "Q3" }], sections: [{ heading: "By project", table: { columns: ["Project", "Margin"], rows: [["A|B", 31]] } }] });
    expect(md).toContain("# Profit");
    expect(md).toContain("- **Period:** Q3");
    expect(md).toContain("| A\\|B | 31 |");
  });
});

describe("NqReportFilterBar", () => {
  const mountBar = (state = defaults, extra: Record<string, unknown> = {}) =>
    mount(NqReportFilterBar, { props: { fields, state, defaults, range: { now: NOW, timeZone: "UTC" }, ...extra }, attachTo: document.body });

  it("renders the group, the fields and a disabled reset at the defaults", () => {
    const w = mountBar();
    expect(w.attributes("data-slot")).toBe("report-filter-bar");
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Report filters");
    expect(w.findAll('[data-slot="report-filter-field"]')).toHaveLength(3);
    expect(w.findAll('[data-slot="report-filter-field"]')[0]!.text()).toContain("Status");
    const reset = w.findAll("button").find((b) => b.text() === "Reset filters")!;
    expect(reset.attributes("disabled")).toBeDefined();
    expect(w.find('[data-slot="report-filter-chips"]').exists()).toBe(false);
    w.unmount();
  });

  it("shows the applied count and a chip per choice, and removes a chip", async () => {
    const state = stateWith({ fields: { status: ["open", "won"], owner: ["sara"] } });
    const w = mountBar(state);
    expect(w.find('[aria-live="polite"]').text()).toBe("2 filters applied");
    const chips = w.findAll('[data-slot="report-filter-chips"] li');
    expect(chips.map((c) => c.text())).toEqual(["Status: Open", "Status: Won", "Owner: Sara"]);
    await w.find('button[aria-label="Remove filter Status: Open"]').trigger("click");
    const next = w.emitted("update:state")![0]![0] as ReportFilterState;
    expect(next.fields.status).toEqual(["won"]);
    expect(next.fields.owner).toEqual(["sara"]);
    w.unmount();
  });

  it("resets to the defaults and edits the range", async () => {
    const w = mountBar(stateWith({ fields: { owner: ["omar"] } }));
    await w.findAll("button").find((b) => b.text() === "Reset filters")!.trigger("click");
    expect(w.emitted("update:state")![0]![0]).toEqual(defaults);
    await w.findAll('[data-slot="toggle"]').find((t) => t.text() === "7d")!.trigger("click");
    await flushPromises();
    const next = w.emitted("update:state")![1]![0] as ReportFilterState;
    expect(next.range).toEqual({ kind: "relative", preset: "7d" });
    w.unmount();
  });

  it("offers the comparison select only when asked, and can hide the period", () => {
    expect(mountBar(defaults, { comparison: true }).find('[aria-label="Compare with"]').exists()).toBe(true);
    expect(mountBar().find('[aria-label="Compare with"]').exists()).toBe(false);
    expect(mountBar(defaults, { range: false }).find('[data-slot="time-range-picker"]').exists()).toBe(false);
  });

  it("speaks Arabic in an Arabic provider", async () => {
    const w = mount(
      defineComponent({
        render: () => h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqReportFilterBar, { fields, state: stateWith({ fields: { status: ["open"] } }), defaults, range: false })),
      }),
      { attachTo: document.body },
    );
    await flushPromises();
    expect(w.find('[data-slot="report-filter-bar"]').attributes("aria-label")).toBe("مرشّحات التقرير");
    expect(w.find('[aria-live="polite"]').text()).toBe("مرشّح واحد مطبّق");
    w.unmount();
  });
});

describe("useReportFilters", () => {
  const Host = defineComponent({
    props: { params: { type: String, default: undefined } },
    setup(props, { expose }) {
      const seen: string[] = [];
      const api = useReportFilters({ fields, syncLocation: false, params: () => props.params, onParamsChange: (p) => seen.push(p.toString()) });
      expose({ api, seen });
      return () => h("div", { "data-query": api.query.value, "data-count": api.activeCount.value });
    },
  });

  it("keeps state in memory without a URL and counts what differs", async () => {
    const w = mount(Host);
    const { api } = w.vm as unknown as { api: ReturnType<typeof useReportFilters> };
    api.setField("status", ["open"]);
    await flushPromises();
    expect(api.state.value.fields.status).toEqual(["open"]);
    expect(w.attributes("data-query")).toBe("status=open");
    expect(w.attributes("data-count")).toBe("1");
    api.reset();
    await flushPromises();
    expect(w.attributes("data-query")).toBe("");
  });

  it("is controlled by params and keeps the other keys", async () => {
    const w = mount(Host, { props: { params: "tab=sales&owner=sara" } });
    const { api, seen } = w.vm as unknown as { api: ReturnType<typeof useReportFilters>; seen: string[] };
    expect(api.state.value.fields.owner).toEqual(["sara"]);
    api.setField("status", ["won"]);
    expect(seen[0]).toContain("tab=sales");
    expect(seen[0]).toContain("status=won");
    expect(seen[0]).toContain("owner=sara");
  });

  it("writes the page address and reads it back", async () => {
    window.history.replaceState(null, "", "/report?x=1&owner=omar");
    const Loc = defineComponent({
      setup(_, { expose }) {
        const api = useReportFilters({ fields });
        expose({ api });
        return () => h("div");
      },
    });
    const w = mount(Loc);
    await flushPromises();
    const { api } = w.vm as unknown as { api: ReturnType<typeof useReportFilters> };
    expect(api.state.value.fields.owner).toEqual(["omar"]);
    api.setField("status", ["open"]);
    expect(window.location.search).toContain("x=1");
    expect(window.location.search).toContain("status=open");
    w.unmount();
  });
});

describe("NqSavedReportViews", () => {
  const views: SavedReportView[] = [
    { id: "a", name: "Weekly", query: "range=7d&owner=sara" },
    { id: "b", name: "Won", query: "status=won", shared: true },
  ];
  const mountViews = (props: Record<string, unknown> = {}, state = defaults) =>
    mount(NqSavedReportViews, { props: { views, fields, state, defaults, onApply: vi.fn(), onSave: vi.fn(), ...props }, attachTo: document.body });

  it("renders a pressed-state chip per view, with a Shared badge", () => {
    const w = mountViews();
    expect(w.attributes("data-slot")).toBe("saved-report-views");
    expect(w.attributes("aria-label")).toBe("Saved views");
    const chips = w.findAll("ul button[aria-pressed]");
    expect(chips.map((c) => c.text())).toEqual(["Weekly", "Won Shared"]);
    expect(chips.every((c) => c.attributes("aria-pressed") === "false")).toBe(true);
    expect(w.text()).toContain("Save view");
    w.unmount();
  });

  it("applies a view with its decoded state and marks it pressed", async () => {
    const onApply = vi.fn();
    const w = mountViews({ onApply });
    await w.findAll("ul button[aria-pressed]")[0]!.trigger("click");
    expect(onApply).toHaveBeenCalledTimes(1);
    const [view, next] = onApply.mock.calls[0]!;
    expect(view.id).toBe("a");
    expect(next.fields.owner).toEqual(["sara"]);
    expect(w.findAll("ul button[aria-pressed]")[0]!.attributes("aria-pressed")).toBe("true");
    w.unmount();
  });

  it("shows Changed with update and save-as-new when the filters moved away", async () => {
    const onUpdate = vi.fn();
    const w = mountViews({ onUpdate, activeId: "b" }, stateWith({ fields: { status: ["open"] } }));
    expect(w.text()).toContain("Changed");
    expect(w.text()).toContain("Save as new view");
    await w.findAll("button").find((b) => b.text() === "Update with current filters")!.trigger("click");
    await flushPromises();
    expect(onUpdate).toHaveBeenCalledWith(views[1], "status=open");
    w.unmount();
  });

  it("saves a new view from the dialog with a unique name", async () => {
    const onSave = vi.fn();
    const w = mountViews({ onSave }, stateWith({ fields: { owner: ["omar"] } }));
    await w.findAll("button").find((b) => b.text() === "Save as new view" || b.text() === "Save view")!.trigger("click");
    await flushPromises();
    const input = document.querySelector<HTMLInputElement>('[data-slot="dialog-content"] input')!;
    expect(input).toBeTruthy();
    input.value = "weekly";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.querySelector<HTMLButtonElement>('[data-slot="dialog-content"] button[type="submit"]')!.click();
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith("weekly (2)", "owner=omar");
    w.unmount();
  });

  it("opens a more menu with only the actions it was given", async () => {
    const w = mountViews({ onDelete: vi.fn(), onRename: vi.fn() });
    await w.find('button[aria-label="Actions for Weekly"]').trigger("click");
    await flushPromises();
    const labels = [...document.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent!.trim());
    expect(labels).toEqual(["Open view", "Rename", "Delete"]);
    w.unmount();
  });
});

describe("NqReportSheet and NqReportExportMenu", () => {
  it("prints the filters and the generated stamp, with the toolbar off paper", () => {
    const w = mount(NqReportSheet, {
      props: { title: "Deals", subtitle: "Q3", filters: [{ label: "Owner", value: "Sara" }], generatedAt: NOW, timeZone: "UTC" },
      slots: { default: "<section>Body</section>", toolbar: "<button>Tool</button>", footer: "Footer" },
    });
    expect(w.attributes("data-slot")).toBe("report-sheet");
    expect(w.find("h1").text()).toBe("Deals");
    expect(w.find("dl").attributes("aria-label")).toBe("Filters");
    expect(w.find("dl").text()).toContain("Owner:");
    expect(w.text()).toContain("Generated Sep 29, 2026");
    expect(w.find("[data-print-hide]").text()).toBe("Tool");
    expect(w.find("style").text()).toContain("@media print");
    expect(w.find("footer").text()).toBe("Footer");
  });

  it("opens the menu, calls onPrint and builds the document lazily", async () => {
    const onPrint = vi.fn();
    const onExported = vi.fn();
    const build = vi.fn(() => ({ title: "Deals", sections: [] }));
    const w = mount(NqReportExportMenu, { props: { document: build, onPrint, onExported }, attachTo: document.body });
    expect(w.find('[data-slot="report-export-menu"]').text()).toBe("Export");
    await w.find('[data-slot="report-export-menu"]').trigger("pointerdown", { button: 0, ctrlKey: false, pointerType: "mouse" });
    await w.find('[data-slot="report-export-menu"]').trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(items.map((i) => i.textContent!.trim())).toEqual(["Print or save as PDF", "Download Markdown", "Copy as Markdown"]);
    items[0]!.click();
    await flushPromises();
    expect(onPrint).toHaveBeenCalled();
    expect(onExported).toHaveBeenCalledWith("pdf");
    expect(build).not.toHaveBeenCalled();
    w.unmount();
  });
});

describe("end to end", () => {
  it("a bar bound to useReportFilters updates its chips", async () => {
    const App = defineComponent({
      setup() {
        const f = useReportFilters({ fields, syncLocation: false });
        const open = ref(false);
        return () => h("div", [h(NqReportFilterBar, { fields, state: f.state.value, defaults: f.defaults.value, range: false, "onUpdate:state": f.setState }), open.value ? "" : null]);
      },
    });
    const w = mount(App, { attachTo: document.body });
    expect(w.findAll('[data-slot="report-filter-chips"] li')).toHaveLength(0);
    const owner = w.findAll('[data-slot="report-filter-field"]')[2]!;
    await owner.findAll('[data-slot="toggle"]')[1]!.trigger("click");
    await flushPromises();
    expect(w.findAll('[data-slot="report-filter-chips"] li').map((l) => l.text())).toEqual(["Kind: New"]);
    w.unmount();
  });
});
