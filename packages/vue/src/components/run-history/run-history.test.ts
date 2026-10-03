import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { NqRunDetail, NqRunHistory, failingStep, filterRuns, formatRunDuration, sortRuns, type RunRecord } from ".";

const runs: RunRecord[] = [
  {
    id: "run_old",
    name: "Nightly sync",
    status: "success",
    startedAt: "2026-09-28T08:40:00Z",
    durationMs: 2100,
    trigger: "Schedule",
    steps: [{ id: "a", name: "Fetch", status: "success", durationMs: 2100 }],
  },
  {
    id: "run_bad",
    name: "Nightly sync",
    status: "error",
    startedAt: "2026-09-29T08:40:00Z",
    durationMs: 4200,
    trigger: "Webhook",
    error: "Upstream returned 502",
    steps: [
      { id: "fetch", name: "Fetch orders", status: "success", startedAtMs: 0, durationMs: 1200, output: { count: 42 } },
      { id: "push", name: "Push to warehouse", status: "error", startedAtMs: 1200, durationMs: 3000, error: "Upstream returned 502", logs: ["502 Bad Gateway"] },
    ],
    spans: [
      { id: "s1", name: "sync", service: "worker", startMs: 0, durationMs: 4200 },
      { id: "s2", parentId: "s1", name: "POST /v1/orders", service: "http", startMs: 1200, durationMs: 3000, error: true, attributes: { "http.status": 502 } },
    ],
  },
  { id: "run_live", name: "Import", status: "running", startedAt: "2026-09-29T08:59:00Z", steps: [] },
];

describe("run model", () => {
  it("sorts newest first, filters and finds the failing step", () => {
    expect(sortRuns(runs).map((r) => r.id)).toEqual(["run_live", "run_bad", "run_old"]);
    expect(filterRuns(runs, "failed").map((r) => r.id)).toEqual(["run_bad"]);
    expect(filterRuns(runs, "all", "webhook").map((r) => r.id)).toEqual(["run_bad"]);
    expect(failingStep(runs[1]!)?.id).toBe("push");
    expect(formatRunDuration(850)).toBe("850 ms");
    expect(formatRunDuration(125_000)).toBe("2 min 05 s");
  });
});

describe("NqRunHistory", () => {
  it("lists runs newest first with filter counts and nothing selected", () => {
    const w = mount(NqRunHistory, { props: { runs } });
    expect(w.find('[data-slot="run-history"]').exists()).toBe(true);
    expect(w.findAll("[data-run-row]").map((r) => r.attributes("data-run-row"))).toEqual(["run_live", "run_bad", "run_old"]);
    expect(w.text()).toContain("Choose a run");
    expect(w.findAll('[data-slot="toggle"]').map((t) => t.text())).toEqual(["All 3", "Failed 1", "Succeeded 1", "Running 1"]);
  });

  it("filters by status and by search, with an empty state", async () => {
    const w = mount(NqRunHistory, { props: { runs } });
    await w.findAll('[data-slot="toggle"]')[1]!.trigger("click");
    expect(w.findAll("[data-run-row]").map((r) => r.attributes("data-run-row"))).toEqual(["run_bad"]);
    await w.find('input[type="search"]').setValue("zzz");
    expect(w.find('[data-slot="empty-state"]').text()).toContain("No runs match");
  });

  it("selecting a run opens its detail with the failing step expanded and the alert", async () => {
    const onSelect: unknown[] = [];
    const w = mount(NqRunHistory, { props: { runs, onSelect: (r: RunRecord | null) => onSelect.push(r?.id ?? null) }, attachTo: document.body });
    await w.find('[data-run-row="run_bad"] button').trigger("click");
    expect(onSelect).toEqual(["run_bad"]);
    expect(w.find('[data-run-row="run_bad"] button').attributes("aria-pressed")).toBe("true");
    expect(w.find('[data-slot="run-detail"]').exists()).toBe(true);
    expect(w.find('[data-slot="alert"]').text()).toContain("Failed at Push to warehouse");
    const failing = w.find('[data-step="push"]');
    expect(failing.attributes("data-failing")).toBeDefined();
    expect(failing.find("button").attributes("aria-expanded")).toBe("true");
    expect(failing.text()).toContain("502 Bad Gateway");
    expect(w.find('[data-step="fetch"] button').attributes("aria-expanded")).toBe("false");
    await w.find('[data-step="fetch"] button').trigger("click");
    expect(w.find('[data-step="fetch"]').text()).toContain('"count": 42');
    w.unmount();
  });

  it("controlled selection", async () => {
    const w = mount(NqRunHistory, { props: { runs, selectedId: "run_old" } });
    expect(w.find('[data-slot="run-detail"] h2').text()).toBe("Nightly sync");
    await w.find('[data-run-row="run_bad"] button').trigger("click");
    expect(w.emitted("update:selectedId")![0]).toEqual(["run_bad"]);
    expect(w.find('[data-run-row="run_old"]').classes()).toContain("bg-nq-selected");
  });

  it("shows a skeleton list while loading", () => {
    const w = mount(NqRunHistory, { props: { runs: [], loading: true } });
    expect(w.find("[data-slot=run-history]").attributes("aria-busy")).toBe("true");
    expect(w.findAll('[data-slot="skeleton"]')).toHaveLength(4);
  });

  it("Arabic strings and RTL-safe classes", () => {
    const w = mount({ render: () => h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqRunHistory, { runs })) });
    expect(w.text()).toContain("اختر تشغيلًا");
    expect(w.html()).toContain("start-3");
    expect(w.html()).toContain("ps-9");
  });
});

describe("NqRunDetail", () => {
  it("Run again calls onRetry and shows a returned error", async () => {
    const onRetry = vi.fn(async () => ({ error: "Queue is full" }));
    const w = mount(NqRunDetail, { props: { run: runs[1]!, onRetry } });
    const btn = w.findAll("button").find((b) => b.text().includes("Run again"))!;
    await btn.trigger("click");
    await flushPromises();
    expect(onRetry).toHaveBeenCalledWith(runs[1]);
    expect(w.text()).toContain("Queue is full");
  });

  it("running runs offer Cancel instead", () => {
    const w = mount(NqRunDetail, { props: { run: runs[2]!, onRetry: vi.fn(), onCancel: vi.fn() } });
    expect(w.text()).toContain("Cancel run");
    expect(w.text()).not.toContain("Run again");
    expect(w.text()).toContain("This run recorded no steps.");
  });

  it("trace tab draws the span waterfall and shows attributes of the chosen span", async () => {
    const w = mount(NqRunDetail, { props: { run: runs[1]!, defaultTab: "trace" }, attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="run-trace"]').exists()).toBe(true);
    expect(w.find('[data-slot="run-span-detail"]').text()).toContain("Choose a span");
    const span = w.findAll('[data-slot="run-trace"] button')[1]!;
    await span.trigger("click");
    expect(span.attributes("aria-pressed")).toBe("true");
    expect(w.find('[data-slot="run-span-detail"]').text()).toContain("http.status");
    expect(w.find('[data-slot="run-span-detail"]').text()).toContain("502");
    w.unmount();
  });

  it("Show the step opens the steps tab", async () => {
    const w = mount(NqRunDetail, { props: { run: runs[1]!, defaultTab: "raw" }, attachTo: document.body });
    await flushPromises();
    await w.findAll("button").find((b) => b.text() === "Show the step")!.trigger("click");
    await flushPromises();
    expect(w.find('[data-step="push"]').exists()).toBe(true);
    w.unmount();
  });
});
