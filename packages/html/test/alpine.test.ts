// Runs the Blade examples, as rendered by Laravel (packages/php/examples/rendered), under real Alpine with the
// Nasaq runtime: the same HTML an HTML/Alpine, Blade, Livewire or Filament page ships.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq, { components } from "../src/alpine";

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

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("alpine runtime", () => {
  it("registers every module", () => {
    expect(Object.keys(components)).toEqual(expect.arrayContaining(["dialog", "tabs"]));
  });

  it("$nq formats money as USD, or SAR in Arabic", () => {
    const nq = Alpine.store("nq") as { money(n: number): string; setLocale(l: string): void };
    expect(nq.money(12)).toBe("$12.00");
    nq.setLocale("ar");
    expect(nq.money(12)).toMatch(/12\.00/);
    expect(nq.money(12)).toMatch(/ر\.س|SAR/);
    nq.setLocale("en");
  });
});

describe("dialog (Blade example)", () => {
  it("opens from the trigger, labels itself and closes", async () => {
    const host = await mount("dialog");
    const popup = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    expect(popup().style.display).toBe("none");

    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await tick();

    expect(popup().style.display).toBe("");
    expect(popup().hasAttribute("data-open")).toBe(true);
    expect(popup().getAttribute("role")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const title = popup().querySelector('[data-slot="dialog-title"]')!;
    expect(title.id).toBeTruthy();
    expect(popup().getAttribute("aria-labelledby")).toBe(title.id);

    popup().querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
    expect(popup().hasAttribute("data-closed")).toBe(true);
  });

  it("closes on Escape and on the backdrop", async () => {
    const host = await mount("dialog");
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]')!;
    const popup = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;

    trigger.click();
    await tick();
    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);

    trigger.click();
    await tick();
    document.querySelector<HTMLElement>('[data-slot="dialog-backdrop"]')!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
  });
});

describe("tabs (Blade example)", () => {
  it("marks the active tab and switches panels", async () => {
    const host = await mount("tabs");
    const [board, timeline] = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const [boardPanel, timelinePanel] = host.querySelectorAll<HTMLElement>('[role="tabpanel"]');

    expect(board!.hasAttribute("data-active")).toBe(true);
    expect(board!.getAttribute("aria-selected")).toBe("true");
    expect(timeline!.tabIndex).toBe(-1);
    expect(timelinePanel!.hidden).toBe(true);
    expect(board!.getAttribute("aria-controls")).toBe(boardPanel!.id);

    timeline!.click();
    await tick();
    expect(timeline!.hasAttribute("data-active")).toBe(true);
    expect(board!.hasAttribute("data-active")).toBe(false);
    expect(boardPanel!.hidden).toBe(true);
    expect(timelinePanel!.hidden).toBe(false);
  });

  it("moves focus with the arrow keys and Home/End", async () => {
    const host = await mount("tabs");
    const list = host.querySelector<HTMLElement>('[role="tablist"]')!;
    const [board, timeline] = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    board!.focus();
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(timeline);
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.activeElement).toBe(board);
  });
});
