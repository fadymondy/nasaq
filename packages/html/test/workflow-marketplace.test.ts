// The Blade workflow-marketplace example (packages/php/examples/rendered/workflow-marketplace.html) under real Alpine.
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
  host.innerHTML = rendered("workflow-marketplace");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const shown = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("ul > li[data-id]")].filter((li) => li.style.display !== "none").map((li) => li.dataset.id);

describe("workflow-marketplace (Blade example)", () => {
  it("is a catalog store with role badges on every card", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="catalog-store"]')).not.toBeNull();
    expect(shown(host)).toEqual(["welcome", "send-email", "new-order"]);
    expect(host.querySelector('[data-item="welcome"]')!.textContent).toContain("Preset");
    expect(host.querySelector('[data-item="new-order"]')!.textContent).toContain("Trigger");
    expect(host.querySelector('[data-item="send-email"]')!.textContent).toContain("Action");
  });

  it("the kind switch narrows the cards, the counts and the result text", async () => {
    const host = await mount();
    const toggles = [...host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    expect(toggles.slice(0, 3).map((t) => t.textContent!.trim())).toEqual(["All", "Steps", "Presets"]);
    toggles[2]!.click();
    await tick();
    expect(shown(host)).toEqual(["welcome"]);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("1 results");
    toggles[1]!.click();
    await tick();
    expect(shown(host)).toEqual(["send-email", "new-order"]);
    toggles[0]!.click();
    await tick();
    expect(shown(host)).toHaveLength(3);
  });

  it("opens the detail with the takes/gives lists, and the diagram for a preset", async () => {
    const host = await mount();
    host.querySelector<HTMLElement>('[data-item="send-email"] h3 button')!.click();
    await tick();
    const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(sheet.textContent).toContain("Takes");
    expect(sheet.textContent).toContain("Message id");
    expect(sheet.textContent).toContain("(required)");
    sheet.querySelector<HTMLElement>('[data-slot="sheet-close"]')?.click();
    await tick(300);
    host.querySelector<HTMLElement>('[data-item="welcome"] h3 button')!.click();
    await tick();
    const preset = document.querySelector<HTMLElement>('[data-slot="catalog-detail"][data-item="welcome"]');
    expect(preset?.textContent).toContain("What it does");
    expect(preset?.textContent).toContain("3 steps");
    expect(preset?.querySelector('[data-slot="workflow-network"]')).not.toBeNull();
  });
});
