// The Blade example (php/examples/engine-details.blade.php) mounted under real Alpine: the window switch dispatches nq-window-change.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("engine-details (Blade example)", () => {
  it("renders the page with the 7 day window pressed", async () => {
    const host = await mountHtml(rendered("engine-details"));
    const root = host.querySelector<HTMLElement>('[data-slot="engine-details"]')!;
    expect(root.dataset.engine).toBe("hydration");
    expect(root.querySelector("h1")!.textContent).toBe("Hydration");
    const toggles = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    expect(toggles).toHaveLength(3);
    expect(toggles[0]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("dispatches nq-window-change when another window is chosen", async () => {
    const host = await mountHtml(rendered("engine-details"));
    const root = host.querySelector<HTMLElement>('[data-slot="engine-details"]')!;
    const days: number[] = [];
    root.addEventListener("nq-window-change", (e) => days.push((e as CustomEvent).detail.days));
    const toggles = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    toggles[1]!.click();
    await tick();
    expect(days).toEqual([30]);
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the applied window when it is clicked again", async () => {
    const host = await mountHtml(rendered("engine-details"));
    const root = host.querySelector<HTMLElement>('[data-slot="engine-details"]')!;
    const days: number[] = [];
    root.addEventListener("nq-window-change", (e) => days.push((e as CustomEvent).detail.days));
    const toggles = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    toggles[0]!.click();
    await tick();
    expect(days).toEqual([]);
    expect(toggles[0]!.getAttribute("aria-pressed")).toBe("true");
  });
});
