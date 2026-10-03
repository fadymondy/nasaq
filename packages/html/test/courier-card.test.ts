// courier-card and route-stops have no Alpine module: the rendered Blade example is the whole port, and a
// selectable row dispatches a bubbling event for the page to handle. This runs it under real Alpine.
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

describe("courier-card (Blade example)", () => {
  it("renders a selected, labelled toggle and dispatches nq-select with the courier id", async () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("courier-card");
    document.body.append(host);
    Alpine.initTree(host);
    await tick();

    const card = host.querySelector<HTMLElement>('[data-slot="courier-card"]')!;
    expect(card.hasAttribute("data-selected")).toBe(true);
    const button = card.querySelector<HTMLButtonElement>("button")!;
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Omar Haddad, Available, selected");
    expect(host.querySelector('[data-slot="avatar-fallback"]')?.textContent).toBe("OH");

    let detail: unknown;
    host.addEventListener("nq-select", (e) => (detail = (e as CustomEvent).detail));
    button.click();
    expect(detail).toEqual({ id: "c1" });
  });
});
