// The Blade trends-feed example (packages/php/examples/rendered/trends-feed.html) under real Alpine.
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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  // The example answers every event itself; tests wire their own listeners, so strip those handlers.
  host.innerHTML = rendered("trends-feed").replace(/x-on:nq-(trend-action|source-toggle|source-retry)="[^"]*"/g, "");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const feed = host.querySelector<HTMLElement>('[data-slot="trends-feed"]')!;
  const catalogue = host.querySelector<HTMLElement>('[data-slot="sources-catalogue"]')!;
  return { host, feed, catalogue };
}

const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;
const menuItems = () => [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].filter((i) => i.closest('[data-slot="context-menu-content"]')?.hasAttribute('data-open'));

describe("trends-feed (Blade example)", () => {
  it("renders the tabs with counts, day groups, the hot badge, reasons and outlets", async () => {
    const { feed } = await mount();
    const tabs = [...feed.querySelectorAll('[data-slot="tabs-tab"]')].map((t) => t.textContent!.replace(/\s+/g, " ").trim());
    expect(tabs).toEqual(["New 2", "Saved 1", "Reviewed 0", "Dismissed 0"]);
    const panel = feed.querySelector<HTMLElement>('[data-slot="tabs-panel"]')!;
    expect([...panel.querySelectorAll("h3")].map((h) => h.textContent!.trim())).toEqual(["Today", "Yesterday"]);
    expect(panel.textContent).toContain("Saudi tourism visas go digital");
    expect(panel.textContent).toContain("Hot");
    expect(panel.textContent).toContain("Up 340% since yesterday");
    expect(panel.textContent).toContain("2 outlets");
    expect(panel.textContent).toContain("Show 2 articles");
    expect(feed.querySelectorAll('[data-slot="empty-state"]')).toHaveLength(2);
  });

  it("the articles open and close with the collapsible", async () => {
    const { feed } = await mount();
    const trigger = feed.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await tick(300);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("a button fires nq-trend-action and is busy until the promise settles", async () => {
    const { feed } = await mount();
    let release!: () => void;
    const seen: unknown[] = [];
    feed.addEventListener("nq-trend-action", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ id: d.id, action: d.action });
      d.waitUntil(new Promise<void>((r) => (release = r)));
    });
    const save = button(feed, "Save");
    save.click();
    await tick();
    expect(seen).toEqual([{ id: "t1", action: "save" }]);
    expect(save.disabled).toBe(true);
    expect(save.getAttribute("aria-busy")).toBe("true");
    release();
    await tick();
    expect(save.disabled).toBe(false);
  });

  it("a rejection shows the error on the topic", async () => {
    const { feed } = await mount();
    feed.addEventListener("nq-trend-action", (e) => (e as CustomEvent).detail.waitUntil(Promise.reject(new Error("no"))));
    button(feed, "Mark reviewed").click();
    await tick();
    const alert = [...feed.querySelectorAll<HTMLElement>('p[role="alert"]')].find((p) => p.textContent?.includes("Could not"))!;
    expect(alert.textContent).toContain("Could not mark reviewed. Try again.");
    expect(alert.style.display).not.toBe("none");
  });

  it("the context menu has the same actions and its Ellipsis button opens it", async () => {
    const { feed } = await mount();
    let id: unknown;
    feed.addEventListener("nq-trend-action", (e) => {
      id = `${(e as CustomEvent).detail.id}:${(e as CustomEvent).detail.action}`;
      (e as CustomEvent).detail.waitUntil(Promise.resolve());
    });
    feed.querySelector<HTMLElement>('button[aria-label="Actions for Saudi tourism visas go digital"]')!.click();
    await tick(80);
    expect(menuItems().map((i) => i.textContent!.trim())).toEqual(expect.arrayContaining(["Save", "Mark reviewed", "Dismiss", "Share"]));
    menuItems().find((i) => i.textContent!.trim() === "Dismiss")!.click();
    await tick(80);
    expect(id).toBe("t1:dismiss");
  });
});

describe("sources catalogue (Blade example)", () => {
  it("shows the fallback to tier 2, the active badge and the health of each source", async () => {
    const { catalogue } = await mount();
    expect(catalogue.textContent).toContain("Tier 1 has no working source, so tier 2 is being used.");
    const headings = [...catalogue.querySelectorAll("h3")].map((h) => h.parentElement!.textContent!.replace(/\s+/g, " ").trim());
    expect(headings[0]).not.toContain("Active");
    expect(headings[1]).toContain("Active");
    expect(catalogue.textContent).toContain("Down");
    expect(catalogue.textContent).toContain("Slow");
    expect(catalogue.textContent).toContain("Working");
    expect(catalogue.textContent).toContain("1,200 a day");
    expect(catalogue.textContent).toContain("Never");
  });

  it("the switch fires nq-source-toggle and goes back when the host rejects", async () => {
    const { catalogue } = await mount();
    const seen: unknown[] = [];
    catalogue.addEventListener("nq-source-toggle", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ id: d.id, enabled: d.enabled });
      d.waitUntil(Promise.reject(new Error("no")));
    });
    const sw = catalogue.querySelectorAll<HTMLElement>('[role="switch"]')[0]!;
    expect(sw.getAttribute("aria-checked")).toBe("true");
    sw.click();
    await tick(80);
    expect(seen).toEqual([{ id: "s1", enabled: false }]);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(catalogue.textContent).toContain("Could not change the source");
  });

  it("the menu retries a source that is not working", async () => {
    const { catalogue } = await mount();
    const retried: string[] = [];
    catalogue.addEventListener("nq-source-retry", (e) => {
      retried.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.waitUntil(Promise.resolve());
    });
    catalogue.querySelector<HTMLElement>('button[aria-label="Actions for Backup feed"]')!.click();
    await tick(80);
    expect(menuItems().some((i) => i.textContent!.trim() === "Disable")).toBe(true);
    menuItems().find((i) => i.textContent!.trim() === "Retry now")!.click();
    await tick(80);
    expect(retried).toEqual(["s2"]);
  });
});
