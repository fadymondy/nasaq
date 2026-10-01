// The Blade knowledge-gaps example (packages/php/examples/rendered/knowledge-gaps.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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

async function mount(listener?: (e: CustomEvent) => void) {
  const host = document.createElement("div");
  host.innerHTML = rendered("knowledge-gaps");
  document.body.append(host);
  if (listener) host.addEventListener("nq-knowledge-gap-resolve", listener as EventListener);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
const group = (h: HTMLElement, s: string) => h.querySelector<HTMLElement>(`[data-status=${s}]`)!;
const rows = (h: HTMLElement, s: string) => [...group(h, s).querySelectorAll("li")];
const msg = (h: HTMLElement) => h.querySelector('[role="status"]')!.textContent;
const move = (li: Element, label: string) => [...li.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes(label) && visible(b))!;

describe("knowledge-gaps (Blade example)", () => {
  it("renders a group per status with rows, counts and the asked bar", async () => {
    const h = await mount();
    expect(rows(h, "open")).toHaveLength(1);
    expect(rows(h, "indexed")[0]!.textContent).toContain("Added to the returns policy.");
    expect(rows(h, "open")[0]!.textContent).toContain("Asked 14 times");
    expect(rows(h, "dismissed")[0]!.textContent).toContain("Asked 1 time");
    expect(h.textContent).toContain("1 unanswered");
  });

  it("filters by status", async () => {
    const h = await mount();
    const toggles = [...h.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')];
    toggles[2]!.click();
    await tick();
    expect(toggles[2]!.getAttribute("aria-pressed")).toBe("true");
    expect(visible(group(h, "indexed"))).toBe(true);
    expect(visible(group(h, "open"))).toBe(false);
  });

  it("moves a gap and announces it", async () => {
    const h = await mount((e) => {
      e.detail.promise = Promise.resolve();
    });
    move(rows(h, "open")[0]!, "Dismiss").click();
    await tick();
    expect(rows(h, "open")).toHaveLength(0);
    expect(rows(h, "dismissed")).toHaveLength(2);
    expect(msg(h)).toBe("Dismissed.");
  });

  it("keeps the gap and shows the error when the handler fails", async () => {
    const h = await mount((e) => {
      e.detail.promise = Promise.resolve({ error: "Nope" });
    });
    move(rows(h, "open")[0]!, "Mark as indexed").click();
    await tick();
    expect(rows(h, "open")).toHaveLength(1);
    expect(msg(h)).toBe("Nope");
  });

  it("offers only valid moves per status", async () => {
    const h = await mount();
    const labels = (li: Element) => [...li.querySelectorAll("button")].filter(visible).map((b) => b.textContent!.trim());
    expect(labels(rows(h, "open")[0]!)).toEqual(["Mark as indexed", "Dismiss"]);
    expect(labels(rows(h, "indexed")[0]!)).toEqual(["Reopen", "Dismiss"]);
  });
});
