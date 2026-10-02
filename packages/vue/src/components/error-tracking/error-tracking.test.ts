import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { etFormatDuration, etHttpTone, etSeriesTrend, etSortIssues, NqDiagnosticsViewer, NqErrorIssueDetail, NqErrorTracking, type ErrorIssue } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const issues: ErrorIssue[] = [
  {
    id: "e1",
    title: "TypeError: Cannot read properties of undefined",
    culprit: "checkout/cart.ts in totals",
    level: "error",
    status: "unresolved",
    count: 482,
    users: 61,
    firstSeen: "2026-09-20T09:00:00Z",
    lastSeen: "2026-09-30T08:12:00Z",
    series: [2, 4, 9, 14, 30, 41, 58],
    release: "1.4.2",
    environment: "production",
    tags: { browser: "Chrome 128" },
    frames: [{ file: "src/cart.ts", fn: "totals", line: 42, column: 7, inApp: true, context: [{ line: 41, code: "const a = 1;" }, { line: 42, code: "cart.items.map(x)" }] }],
    breadcrumbs: [{ at: "2026-09-30T08:11:00Z", type: "ui", message: "Clicked Pay" }],
    diagnostics: { console: [{ at: "2026-09-30T08:11:00Z", level: "error", message: "boom" }], network: [{ at: "2026-09-30T08:11:00Z", method: "POST", url: "/api/pay", status: 500, duration: 1400 }, { at: "2026-09-30T08:11:01Z", method: "GET", url: "/api/me", status: 200, duration: 80 }] },
  },
  { id: "e2", title: "Old warning", level: "warning", status: "resolved", count: 3, firstSeen: "2026-08-01T00:00:00Z", lastSeen: "2026-08-02T00:00:00Z" },
];

describe("error-tracking helpers", () => {
  it("ranks unresolved first, then severity", () => {
    expect(etSortIssues(issues).map((i) => i.id)).toEqual(["e1", "e2"]);
    expect(etSortIssues([...issues].reverse()).map((i) => i.id)).toEqual(["e1", "e2"]);
  });
  it("reads trends, http tones and durations", () => {
    expect(etSeriesTrend([1, 1, 5, 9])).toBe("up");
    expect(etSeriesTrend([9, 5, 1, 1])).toBe("down");
    expect(etSeriesTrend([1, 2])).toBe("flat");
    expect(etHttpTone(0)).toBe("danger");
    expect(etHttpTone(404)).toBe("warning");
    expect(etFormatDuration(1400)).toBe("1.4 s");
    expect(etFormatDuration(840)).toBe("840 ms");
  });
});

describe("NqErrorTracking", () => {
  it("lists issues with level, status and a sparkline, unresolved first", () => {
    const w = mount(NqErrorTracking, { props: { issues: [...issues].reverse() }, attachTo: document.body });
    const rows = w.findAll("tbody tr[data-row]");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("TypeError");
    expect(rows[0]!.text()).toContain("Unresolved");
    expect(rows[0]!.find('[data-slot="sparkline"]').exists()).toBe(true);
    expect(rows[1]!.text()).toContain("—");
  });

  it("opens the detail on row click and returns with Back", async () => {
    const onOpenIssue = vi.fn();
    const w = mount(NqErrorTracking, { props: { issues, onOpenIssue }, attachTo: document.body });
    await w.find("tbody tr[data-row]").trigger("click");
    await flushPromises();
    expect(onOpenIssue).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
    expect(w.find('[data-slot="error-detail"]').exists()).toBe(true);
    await w.findAll("button").find((b) => b.text().includes("All errors"))!.trigger("click");
    expect(w.find('[data-slot="error-detail"]').exists()).toBe(false);
  });

  it("resolves from the detail and shows the new status; an error keeps it open", async () => {
    const onStatusChange = vi.fn().mockResolvedValueOnce({ error: "Nope" }).mockResolvedValueOnce(undefined);
    const w = mount(NqErrorTracking, { props: { issues, onStatusChange }, attachTo: document.body });
    await w.find("tbody tr[data-row]").trigger("click");
    await flushPromises();
    const resolve = () => w.findAll("button").find((b) => b.text().includes("Resolve"))!;
    await resolve().trigger("click");
    await flushPromises();
    expect(w.find("[role=alert]").text()).toBe("Nope");
    expect(w.find('[data-slot="error-detail"]').attributes("data-status")).toBe("unresolved");
    await resolve().trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="error-detail"]').attributes("data-status")).toBe("resolved");
    expect(w.findAll("button").some((b) => b.text().includes("Reopen"))).toBe(true);
  });

  it("hides the actions without onStatusChange", async () => {
    const w = mount(NqErrorTracking, { props: { issues }, attachTo: document.body });
    await w.find("tbody tr[data-row]").trigger("click");
    await flushPromises();
    expect(w.findAll("button").some((b) => b.text().includes("Resolve"))).toBe(false);
  });

  it("renders in Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqErrorTracking, { issues })) }, { attachTo: document.body });
    expect(w.text()).toContain("غير محلول");
  });
});

describe("NqErrorIssueDetail", () => {
  it("shows the stack frame, expands its source and lists tags", async () => {
    const w = mount(NqErrorIssueDetail, { props: { issue: issues[0]! }, attachTo: document.body });
    expect(w.find("li[data-in-app=true]").text()).toContain("src/cart.ts:42:7");
    await w.find("li[data-in-app=true] button").trigger("click");
    expect(w.find("li[data-hot=true]").text()).toContain("cart.items.map(x)");
    expect(w.text()).toContain("Rising");
    expect(w.text()).toContain("production");
  });
});

describe("NqDiagnosticsViewer", () => {
  it("filters the network table to failed requests", async () => {
    const w = mount(NqDiagnosticsViewer, { props: { diagnostics: issues[0]!.diagnostics! }, attachTo: document.body });
    await w.findAll("[role=tab]").find((b) => b.text().includes("Network"))!.trigger("mousedown");
    await w.findAll("[role=tab]").find((b) => b.text().includes("Network"))!.trigger("keydown.enter");
    await flushPromises();
    await w.findAll("button").find((b) => b.text().includes("Failed only"))!.trigger("click");
    expect(document.body.textContent).toContain("/api/pay");
    expect(document.body.textContent).not.toContain("/api/me");
  });
});
