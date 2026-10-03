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

const dialog = () => document.querySelector<HTMLElement>('[data-slot="confirm-dialog"]')!;
const buttons = () => [...dialog().querySelectorAll<HTMLButtonElement>("button")];
const shown = (b: HTMLElement) => b.style.display !== "none";

describe("confirm-provider (Blade example)", () => {
  it("starts closed, opens from $confirm and resolves true on Confirm", async () => {
    const host = await mount(rendered("confirm-provider"));
    expect(dialog().style.display).toBe("none");
    let deleted: unknown = null;
    host.addEventListener("deleted", (e) => (deleted = (e as CustomEvent).detail));
    host.querySelector<HTMLButtonElement>('button[data-slot="button"]:not([x-show])')!.click();
    await tick();
    expect(dialog().hasAttribute("data-open")).toBe(true);
    expect(dialog().getAttribute("role")).toBe("alertdialog");
    const title = dialog().querySelector('[data-slot="alert-dialog-title"]')!;
    expect(title.textContent).toBe("Delete Billing?");
    expect(dialog().getAttribute("aria-labelledby")).toBe(title.id);
    const visible = buttons().filter(shown);
    expect(visible.map((b) => b.textContent!.trim())).toEqual(["Cancel", "Delete"]);
    expect(visible[1]!.className).toContain("bg-destructive");
    visible[1]!.click();
    await tick();
    expect(dialog().hasAttribute("data-open")).toBe(false);
    expect(deleted).toEqual({ id: "p1" });
  });

  it("resolves false on Cancel and Escape, and a second request cancels the first", async () => {
    await mount(rendered("confirm-provider"));
    const results: boolean[] = [];
    const request = (options: object) =>
      new Promise<boolean>((resolve) => window.dispatchEvent(new CustomEvent("nq:confirm", { detail: { options, resolve } }))).then((v) => results.push(v));
    void request({ title: "One" });
    await tick();
    void request({ title: "Two", danger: false, confirmLabel: "Go" });
    await tick();
    expect(results).toEqual([false]);
    expect(dialog().querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Two");
    const visible = buttons().filter(shown);
    expect(visible.map((b) => b.textContent!.trim())).toEqual(["Cancel", "Go"]);
    expect(visible[1]!.className).toContain("bg-primary");
    dialog().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(results).toEqual([false, false]);
    expect(dialog().hasAttribute("data-open")).toBe(false);
    void request({ title: "Three" });
    await tick();
    buttons().filter(shown)[0]!.click();
    await tick();
    expect(results).toEqual([false, false, false]);
  });
});
