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

describe("score-explainer (Blade example)", () => {
  it("renders the badge with its band and opens the explainer in a popover", async () => {
    const host = await mount(rendered("score-explainer"));
    const badge = host.querySelector<HTMLButtonElement>('[data-slot="score-badge"]')!;
    expect(badge.dataset.band).toBe("high");
    expect(badge.getAttribute("aria-label")).toContain("Score 72 of 100");
    expect(badge.getAttribute("aria-expanded")).toBe("false");

    badge.click();
    await tick(200);
    expect(badge.getAttribute("aria-expanded")).toBe("true");
    const panel = document.body.querySelector('[data-slot="popover-content"]')!;
    expect(panel.querySelector('[data-slot="score-explainer"]')).not.toBeNull();
    expect(panel.querySelectorAll('[data-slot="score-dimension"]')).toHaveLength(2);
    expect(panel.querySelector('a[data-slot="score-source"]')!.getAttribute("href")).toBe("https://example.com");
  });
});
