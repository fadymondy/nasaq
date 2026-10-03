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

const popup = () => document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;

describe("alert-dialog (Blade example)", () => {
  it("opens as an alertdialog, labels itself, ignores the backdrop and closes on Cancel", async () => {
    const host = await mount(rendered("alert-dialog"));
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!;
    expect(popup().style.display).toBe("none");
    trigger.click();
    await tick();
    expect(popup().style.display).toBe("");
    expect(popup().hasAttribute("data-open")).toBe(true);
    expect(popup().getAttribute("role")).toBe("alertdialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const title = popup().querySelector('[data-slot="alert-dialog-title"]')!;
    expect(popup().getAttribute("aria-labelledby")).toBe(title.id);
    expect(popup().querySelector('[aria-label="Close"]')).toBeNull();

    document.querySelector<HTMLElement>('[data-slot="alert-dialog-backdrop"]')!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(true);

    popup().querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]')!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
  });

  it("closes on Escape and when the action is pressed", async () => {
    const host = await mount(rendered("alert-dialog"));
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!;
    trigger.click();
    await tick();
    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
    trigger.click();
    await tick();
    popup().querySelector<HTMLButtonElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
  });
});
