import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

// A stand-in for the browser's EventSource: tests push events through `sources[0].emit`.
class FakeSource {
  static all: FakeSource[] = [];
  closed = false;
  listeners: Record<string, ((e: { data: string }) => void)[]> = {};
  constructor(public url: string) {
    FakeSource.all.push(this);
  }
  addEventListener(type: string, fn: (e: { data: string }) => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  close() {
    this.closed = true;
  }
  emit(type: string, data: unknown = {}) {
    for (const fn of this.listeners[type] ?? []) fn({ data: JSON.stringify(data) });
  }
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const q = (host: HTMLElement, sel: string) => host.querySelector(sel) as HTMLElement;

async function boot() {
  FakeSource.all = [];
  vi.stubGlobal("EventSource", FakeSource);
  const host = await mount("test-run-stream");
  const root = q(host, "[data-slot=test-run-stream]");
  return { host, root, run: q(host, "[data-action=run]"), stop: q(host, "[data-action=stop]") };
}

describe("test-run-stream (alpine)", () => {
  it("starts idle with the empty state and a Run button", async () => {
    const { root, run, stop } = await boot();
    expect(root.getAttribute("data-state")).toBe("idle");
    expect(visible(run)).toBe(true);
    expect(visible(stop)).toBe(false);
  });

  it("runs through the test-run-start event, streaming steps and results", async () => {
    const { host, root, run, stop } = await boot();
    const states: string[] = [];
    root.addEventListener("test-run-state", (e) => states.push((e as CustomEvent).detail.state));
    run.click();
    await tick();
    expect(root.getAttribute("data-state")).toBe("running");
    expect(visible(stop)).toBe(true);
    expect(visible(run)).toBe(false);
    const es = FakeSource.all[0]!;
    expect(es.url).toContain("max=5");

    es.emit("step", { id: "fetch", name: "Fetch feed", status: "running" });
    await tick();
    expect(host.querySelectorAll("[data-slot=test-run-step]").length).toBe(1);
    es.emit("step", { id: "fetch", name: "Fetch feed", status: "ok", durationMs: 1200, count: 3 });
    es.emit("saved", { id: "a", title: "First post", url: "https://example.com/a", raw: { id: 1 } });
    await tick();
    expect(host.querySelectorAll("[data-slot=test-run-step]").length).toBe(1);
    expect(q(host, "[data-slot=test-run-step]").getAttribute("data-status")).toBe("ok");
    expect(host.querySelectorAll("[data-slot=test-run-result]").length).toBe(1);

    es.emit("complete");
    // The example calls on.done() from the "complete" listener.
    await tick();
    expect(root.getAttribute("data-state")).toBe("done");
    expect(es.closed).toBe(true);
    expect(q(host, "[data-slot=test-run-summary]").textContent).toMatch(/1|passed|نجحت/);
    expect(states).toEqual(["running", "done"]);
    expect(visible(run)).toBe(true);
  });

  it("stops a run and aborts its signal", async () => {
    const { root, stop, run } = await boot();
    run.click();
    await tick();
    const es = FakeSource.all[0]!;
    stop.click();
    await tick();
    expect(root.getAttribute("data-state")).toBe("stopped");
    expect(es.closed).toBe(true);
  });

  it("fails the run with a message and clears back to idle", async () => {
    const { host, root, run } = await boot();
    run.click();
    await tick();
    FakeSource.all[0]!.emit("error");
    await tick();
    expect(root.getAttribute("data-state")).toBe("error");
    const alert = q(host, "[role=alert]");
    expect(visible(alert)).toBe(true);
    expect(alert.textContent).toBe("The connection closed.");
    const clear = [...host.querySelectorAll("button")].find((b) => /Clear|مسح/.test(b.textContent ?? ""))!;
    expect(visible(clear)).toBe(true);
    clear.click();
    await tick();
    expect(root.getAttribute("data-state")).toBe("idle");
  });

  it("toggles a result's raw data", async () => {
    const { host, run } = await boot();
    run.click();
    await tick();
    const es = FakeSource.all[0]!;
    es.emit("saved", { id: "a", title: "First post", raw: { id: 1 } });
    await tick();
    const toggle = q(host, "[data-slot=test-run-result] button");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(q(host, "[data-slot=test-run-result]").textContent).toContain('"id": 1');
  });
});
