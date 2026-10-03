import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("ai-citations (Blade example)", () => {
  it("renders markers, chips, evidence and provenance", async () => {
    const host = await mount(rendered("ai-citations"));
    const markers = host.querySelectorAll('[data-slot="ai-citation-marker"]');
    expect(markers).toHaveLength(2);
    expect(markers[0]!.getAttribute("aria-label")).toBe("Source 1: Q3 report");
    expect(host.querySelectorAll('[data-slot="ai-source-chips"] li')).toHaveLength(2);
    expect(host.querySelector('[data-slot="ai-provenance"]')).not.toBeNull();
    expect(host.querySelector('[role="note"]')?.textContent).toContain("1 of 2 paragraphs");
  });

  it("opens a popover on press and lights the marker, chip and evidence card", async () => {
    const host = await mount(rendered("ai-citations"));
    const marker = host.querySelector<HTMLButtonElement>('[data-slot="ai-citation-marker"]')!;
    expect(marker.getAttribute("aria-expanded")).toBe("false");
    marker.click();
    await tick();
    expect(marker.getAttribute("aria-expanded")).toBe("true");
    expect(marker.hasAttribute("data-active")).toBe(true);
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain("Q3 report");
    const chip = host.querySelector('[data-slot="ai-source-chips"] li button')!;
    expect(chip.hasAttribute("data-active")).toBe(true);
    marker.click();
    await tick();
    expect(marker.hasAttribute("data-active")).toBe(false);
    expect(chip.hasAttribute("data-active")).toBe(false);
  });

  it("opens the evidence panel when a chip is pressed and announces it", async () => {
    const host = await mount(rendered("ai-citations"));
    const root = host.querySelector<HTMLElement>('[data-slot="ai-cited-answer"]')!;
    const opened: string[] = [];
    root.addEventListener("nq-source-open", (e) => opened.push((e as CustomEvent).detail.id));
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="collapsible-trigger"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    host.querySelectorAll<HTMLButtonElement>('[data-slot="ai-source-chips"] li button')[1]!.click();
    await tick(300);
    expect(opened).toEqual(["s2"]);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.textContent).toContain("Hide evidence");
    const cards = host.querySelectorAll('ul[aria-label="Evidence"] [data-slot="ai-evidence-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[1]!.hasAttribute("data-active")).toBe(true);
    expect(cards[0]!.hasAttribute("data-active")).toBe(false);
  });

  it("lights the matching chip while an evidence card is hovered", async () => {
    const host = await mount(rendered("ai-citations"));
    const card = host.querySelector<HTMLElement>('ul[aria-label="Evidence"] [data-slot="ai-evidence-card"]')!;
    card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    await tick();
    expect(host.querySelector('[data-slot="ai-source-chips"] li button')!.hasAttribute("data-active")).toBe(true);
    card.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    await tick();
    expect(host.querySelector('[data-slot="ai-source-chips"] li button')!.hasAttribute("data-active")).toBe(false);
  });
});
