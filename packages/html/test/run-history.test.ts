// The Blade run-history example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const row = (host: HTMLElement, id: string) => host.querySelector<HTMLButtonElement>(`[data-run-row="${id}"] button`)!;
const visibleRows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-run-row]")].filter((r) => r.style.display !== "none").map((r) => r.getAttribute("data-run-row"));
const detail = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="run-detail"]')].find((d) => d.parentElement!.style.display !== "none")!;

describe("run-history (Blade example)", () => {
  it("lists runs newest first with filter counts and nothing selected", async () => {
    const host = await mount("run-history");
    expect([...host.querySelectorAll("[data-run-row]")].map((r) => r.getAttribute("data-run-row"))).toEqual(["run_8f2a", "run_7c10"]);
    expect([...host.querySelectorAll('[data-slot="toggle"]')].map((t) => t.textContent!.replace(/\s+/g, " ").trim())).toEqual(["All 2", "Failed 1", "Succeeded 1", "Running 0"]);
    expect(row(host, "run_8f2a").getAttribute("aria-pressed")).toBe("false");
    expect(host.textContent).toContain("Choose a run");
  });

  it("filters by status and by search, with an empty state", async () => {
    const host = await mount("run-history");
    [...host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')][1]!.click();
    await tick();
    expect(visibleRows(host)).toEqual(["run_8f2a"]);
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = "zzz";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(visibleRows(host)).toEqual([]);
    const empty = [...host.querySelectorAll<HTMLElement>('[data-slot="empty-state"]')].find((e) => e.parentElement!.style.display !== "none" && e.textContent!.includes("No runs match"));
    expect(empty).toBeTruthy();
  });

  it("selecting a run shows its detail with the failing step expanded and the alert", async () => {
    const host = await mount("run-history");
    const root = host.querySelector<HTMLElement>('[data-slot="run-history"]')!;
    const ids: unknown[] = [];
    root.addEventListener("nq-run-select", (e) => ids.push((e as CustomEvent).detail.id));
    row(host, "run_8f2a").click();
    await tick();
    expect(ids).toEqual(["run_8f2a"]);
    expect(row(host, "run_8f2a").getAttribute("aria-pressed")).toBe("true");
    const d = detail(host);
    expect(d.querySelector("h2")!.textContent).toBe("Nightly sync");
    expect(d.querySelector('[data-slot="alert"]')!.textContent).toContain("Failed at Push to warehouse");
    const push = d.querySelector<HTMLElement>('[data-step="push"]')!;
    expect(push.hasAttribute("data-failing")).toBe(true);
    expect(push.querySelector("button")!.getAttribute("aria-expanded")).toBe("true");
    expect(push.textContent).toContain("502 Bad Gateway");
    const fetchBtn = d.querySelector<HTMLButtonElement>('[data-step="fetch"] button')!;
    expect(fetchBtn.getAttribute("aria-expanded")).toBe("false");
    fetchBtn.click();
    await tick();
    expect(fetchBtn.getAttribute("aria-expanded")).toBe("true");
    expect(d.querySelector('[data-step="fetch"]')!.textContent).toContain('"count": 42');
  });

  it("Run again dispatches nq-run-retry and shows a returned error", async () => {
    const host = await mount("run-history");
    const root = host.querySelector<HTMLElement>('[data-slot="run-history"]')!;
    const ids: string[] = [];
    root.addEventListener("nq-run-retry", (e) => {
      const ev = (e as CustomEvent).detail;
      ids.push(ev.id);
      ev.waitUntil(Promise.resolve({ error: "Queue is full" }));
    });
    row(host, "run_8f2a").click();
    await tick();
    detail(host).querySelector<HTMLButtonElement>('[data-slot="run-retry"]')!.click();
    await tick(600);
    expect(ids).toEqual(["run_8f2a"]);
    expect(detail(host).textContent).toContain("Queue is full");
  });

  it("the trace tab shows attributes of the chosen span", async () => {
    const host = await mount("run-history");
    row(host, "run_8f2a").click();
    await tick();
    const d = detail(host);
    [...d.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === "Trace")!.click();
    await tick();
    const spans = d.querySelectorAll<HTMLButtonElement>('[data-slot="run-trace"] button');
    expect(spans).toHaveLength(2);
    spans[1]!.click();
    await tick();
    expect(spans[1]!.getAttribute("aria-pressed")).toBe("true");
    const panel = d.querySelector('[data-slot="run-span-detail"]')!;
    expect(panel.textContent).toContain("http.status");
    expect(panel.textContent).toContain("502");
  });

  it("Show the step returns to the steps tab", async () => {
    const host = await mount("run-history");
    row(host, "run_8f2a").click();
    await tick();
    const d = detail(host);
    [...d.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.trim() === "Raw")!.click();
    await tick();
    d.querySelector<HTMLButtonElement>('[data-slot="run-show-step"]')!.click();
    await tick();
    const steps = [...d.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.includes("Steps"))!;
    expect(steps.getAttribute("aria-selected")).toBe("true");
  });
});
