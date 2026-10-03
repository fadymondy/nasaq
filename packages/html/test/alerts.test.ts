// The Blade alerts example (packages/php/examples/rendered/alerts.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("alerts");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const list = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="alert-list"]')!;
const security = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="security-alerts"]')!;
const shown = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="alert-row"]')].filter((r) => getComputedStyle(r).display !== "none");
const ids = (root: HTMLElement) => shown(root).map((r) => r.dataset.alertId);
const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim().startsWith(text))!;
const type = async (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("alerts (Blade example)", () => {
  it("renders the rows with severity and status, sorted most severe first", async () => {
    const root = list(await mount());
    const rows = [...root.querySelectorAll<HTMLElement>('[data-slot="alert-row"]')];
    expect(rows.map((r) => r.dataset.alertId)).toEqual(["a1", "a2", "a3"]);
    expect(rows.map((r) => r.dataset.severity)).toEqual(["critical", "high", "low"]);
    expect(rows.map((r) => r.dataset.status)).toEqual(["open", "acknowledged", "resolved"]);
    expect(rows[0]!.textContent).toContain("Fired 4 times");
    expect(root.querySelector('[aria-live="polite"]')!.textContent).toBe("Showing 3 of 3");
  });

  it("filters by tab, severity and search, and clears from the empty state", async () => {
    const root = list(await mount());
    const tabs = [...root.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]')];
    tabs.find((t) => t.textContent?.includes("Open"))!.click();
    await tick();
    expect(ids(root)).toEqual(["a1"]);
    expect(root.querySelector('[aria-live="polite"]')!.textContent).toBe("Showing 1 of 3");
    tabs.find((t) => t.textContent?.includes("All"))!.click();
    await tick();
    await type(root.querySelector<HTMLInputElement>('input[type="search"]')!, "disk");
    expect(ids(root)).toEqual(["a2"]);
    await type(root.querySelector<HTMLInputElement>('input[type="search"]')!, "nothing like this");
    expect(ids(root)).toEqual([]);
    const empty = root.querySelector<HTMLElement>('[data-slot="empty-state"]')!;
    expect(getComputedStyle(empty.parentElement!).display).not.toBe("none");
    expect(empty.textContent).toContain("Nothing matches these filters.");
    button(empty, "Clear filters").click();
    await tick();
    expect(ids(root)).toEqual(["a1", "a2", "a3"]);
  });

  it("expands a row to its timeline", async () => {
    const root = list(await mount());
    const row = root.querySelector<HTMLElement>('[data-alert-id="a1"]')!;
    const toggle = button(row, "Show details");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toContain("Hide details");
    expect(row.querySelectorAll('[data-slot="timeline-item"]')).toHaveLength(2);
    expect(row.textContent).toContain("p95 latency crossed the threshold.");
    expect(row.textContent).toContain("Team notified");
  });

  it("fires the action events with the id, and shows a failure on that row", async () => {
    const root = list(await mount());
    const seen: string[] = [];
    root.addEventListener("nq-alert-acknowledge", (e) => {
      seen.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.resolve();
    });
    root.addEventListener("nq-alert-resolve", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Pager is down." })));
    const row = root.querySelector<HTMLElement>('[data-alert-id="a1"]')!;
    button(row, "Acknowledge").click();
    await tick(80);
    expect(seen).toEqual(["a1"]);
    button(row, "Resolve").click();
    await tick(80);
    const alert = row.querySelector<HTMLElement>('[data-slot="alert"]')!;
    expect(alert.textContent).toContain("Pager is down.");
    expect(getComputedStyle(alert.parentElement!).display).not.toBe("none");
    expect(button(row, "Resolve").disabled).toBe(false);
    // Reopen only exists on the resolved alert.
    expect(root.querySelector('[data-alert-id="a3"]')!.textContent).toContain("Reopen");
    expect(row.textContent).not.toContain("Reopen");
  });

  it("security alerts show the details, the actions and search the IP", async () => {
    const host = await mount();
    const root = security(host);
    const row = root.querySelector<HTMLElement>('[data-alert-id="s1"]')!;
    button(row, "Show details").click();
    await tick();
    expect(row.textContent).toContain("203.0.113.9");
    expect(row.textContent).toContain("Cairo, EG");
    expect(row.textContent).toContain("Recommended action");
    expect(row.textContent).toContain("Sign-in");
    const actions: Array<{ id: string; action: string }> = [];
    root.addEventListener("nq-alert-action", (e) => {
      const d = (e as CustomEvent).detail;
      actions.push({ id: d.id, action: d.action });
      d.resolve();
    });
    button(row, "Block IP").click();
    await tick(80);
    expect(actions).toEqual([{ id: "s1", action: "block-ip" }]);
    await type(root.querySelector<HTMLInputElement>('input[type="search"]')!, "203.0.113");
    expect(ids(root)).toEqual(["s1"]);
  });
});
