import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { formatTestRunDuration, NqTestRunStream, settleTestRunSteps, testRunCounts, testRunStepStatus, upsertTestRunStep, type TestRunHandlers } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("test run maths", () => {
  it("normalises, upserts, settles, counts and formats", () => {
    expect(testRunStepStatus("success")).toBe("ok");
    expect(testRunStepStatus("failed")).toBe("error");
    expect(testRunStepStatus("whatever")).toBe("running");
    const list = upsertTestRunStep(upsertTestRunStep([], { id: "a", name: "A", status: "running" }), { id: "a", name: "A", status: "ok" });
    expect(list).toEqual([{ id: "a", name: "A", status: "ok" }]);
    expect(settleTestRunSteps([{ name: "x", status: "running" }])[0]!.status).toBe("skipped");
    expect(testRunCounts([{ name: "a", status: "ok" }, { name: "b", status: "error" }]).total).toBe(2);
    expect(formatTestRunDuration(850)).toBe("850 ms");
    expect(formatTestRunDuration(2400)).toBe("2.4 s");
    expect(formatTestRunDuration(65_000)).toBe("1 m 05 s");
  });
});

describe("NqTestRunStream", () => {
  it("starts idle with an empty state", () => {
    const w = mount(NqTestRunStream, { props: { run: () => {} }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("test-run-stream");
    expect(w.attributes("data-state")).toBe("idle");
    expect(w.text()).toContain("No test run yet");
    expect(w.find('[data-action="run"]').text()).toContain("Run test");
    w.unmount();
  });

  it("streams steps and results, then finishes", async () => {
    let on!: TestRunHandlers;
    const w = mount(NqTestRunStream, { props: { run: (h: TestRunHandlers) => void (on = h) }, attachTo: document.body });
    await w.find('[data-action="run"]').trigger("click");
    expect(w.attributes("data-state")).toBe("running");
    expect(w.text()).toContain("Waiting for the first step");
    on.step({ id: "fetch", name: "Fetch page", status: "running" });
    await flushPromises();
    expect(w.find('[data-slot="test-run-step"]').attributes("data-status")).toBe("running");
    on.step({ id: "fetch", name: "Fetch page", status: "ok", count: 4, durationMs: 850 });
    on.result({ id: "r1", title: "Hello", url: "https://example.com", meta: ["en"], raw: { a: 1 } });
    on.done();
    await flushPromises();
    expect(w.findAll('[data-slot="test-run-step"]')).toHaveLength(1);
    expect(w.find('[data-slot="test-run-step"]').attributes("data-status")).toBe("ok");
    expect(w.text()).toContain("4 items");
    expect(w.text()).toContain("850 ms");
    expect(w.attributes("data-state")).toBe("done");
    expect(w.find('[data-slot="test-run-summary"]').text()).toContain("1 passed");
    expect(w.find('[data-slot="test-run-result"]').text()).toContain("Hello");
    await w.find('[data-slot="test-run-result"] button').trigger("click");
    expect(w.find('[data-slot="code-block"]').exists()).toBe(true);
    expect(w.emitted("stateChange")!.map((e) => e[0])).toEqual(["running", "done"]);
    w.unmount();
  });

  it("stops, settling running steps as skipped, and ignores late events", async () => {
    let on!: TestRunHandlers;
    let aborted = false;
    const w = mount(NqTestRunStream, { props: { run: (h: TestRunHandlers, s: AbortSignal) => { on = h; s.addEventListener("abort", () => (aborted = true)); } }, attachTo: document.body });
    await w.find('[data-action="run"]').trigger("click");
    on.step({ name: "Slow", status: "running" });
    await flushPromises();
    await w.find('[data-action="stop"]').trigger("click");
    expect(aborted).toBe(true);
    expect(w.attributes("data-state")).toBe("stopped");
    expect(w.find('[data-slot="test-run-step"]').attributes("data-status")).toBe("skipped");
    on.step({ name: "Late", status: "ok" });
    await flushPromises();
    expect(w.findAll('[data-slot="test-run-step"]')).toHaveLength(1);
    w.unmount();
  });

  it("fails on a rejected promise and clears", async () => {
    const w = mount(NqTestRunStream, { props: { run: () => Promise.reject(new Error("Boom")) }, attachTo: document.body });
    await w.find('[data-action="run"]').trigger("click");
    await flushPromises();
    expect(w.attributes("data-state")).toBe("error");
    expect(w.find('[role="alert"]').text()).toBe("Boom");
    const clear = w.findAll("button").find((b) => b.text().includes("Clear"))!;
    await clear.trigger("click");
    expect(w.attributes("data-state")).toBe("idle");
    w.unmount();
  });

  it("is Arabic under an Arabic provider and renders the controls slot", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqTestRunStream, { run: () => {} }, { controls: () => h("i", { id: "c" }) })) }, { attachTo: document.body });
    expect(w.text()).toContain("تشغيل تجريبي");
    expect(w.find("#c").exists()).toBe(true);
    w.unmount();
  });
});
