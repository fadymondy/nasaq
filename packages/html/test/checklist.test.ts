import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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


const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="checklist-item"]')];
const box = (label: string) => document.querySelector<HTMLButtonElement>(`[role="checkbox"][aria-label="${label}"]`)!;

describe("checklist (Blade example)", () => {
  it("renders items, subtasks, a mixed parent and progress", async () => {
    const host = await mount(rendered("checklist"));
    expect(items()).toHaveLength(4);
    expect(box("Prepare the launch").getAttribute("aria-checked")).toBe("mixed");
    expect(host.querySelector('[data-slot="progress"] [data-slot="progress-head"]')!.textContent).toContain("2 of 3 done");
  });

  it("ticking a parent ticks its subtasks and fires toggle", async () => {
    const host = await mount(rendered("checklist"));
    const root = host.querySelector<HTMLElement>('[data-slot="checklist"]')!;
    const seen: unknown[] = [];
    root.addEventListener("toggle", (e) => seen.push((e as unknown as CustomEvent).detail));
    box("Prepare the launch").click();
    await tick();
    expect(seen).toEqual([{ id: "2", done: true }]);
    expect(box("Schedule the post").getAttribute("aria-checked")).toBe("true");
    expect(host.querySelector('[data-slot="progress-head"]')!.textContent).toContain("All done");
  });

  it("adds an item and removes one", async () => {
    const host = await mount(rendered("checklist"));
    const root = host.querySelector<HTMLElement>('[data-slot="checklist"]')!;
    const seen: string[] = [];
    root.addEventListener("add", (e) => seen.push(`add:${(e as CustomEvent).detail.text}`));
    root.addEventListener("remove", (e) => seen.push(`remove:${(e as CustomEvent).detail.id}`));
    const input = host.querySelector<HTMLInputElement>('input[aria-label="New item"]')!;
    input.value = "Ship it";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(items()).toHaveLength(5);
    (document.querySelector('[aria-label="Delete Write the brief"]') as HTMLButtonElement).click();
    await tick();
    expect(items()).toHaveLength(4);
    expect(seen).toEqual(["add:Ship it", "remove:1"]);
  });
});
