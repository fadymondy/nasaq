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

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="check-in-kiosk"]')!;
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.textContent!.trim() === text).pop()!;

describe("check-in-kiosk (Blade example)", () => {
  it("starts on the scan view and checks in a booking code", async () => {
    const host = await mount(rendered("check-in-kiosk"));
    expect(root(host).dataset.view).toBe("input");
    const input = host.querySelector<HTMLInputElement>("#kiosk-code")!;
    input.value = "booking:BK-7F3Q9K";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(root(host).dataset.view).toBe("ticket");
    expect(host.querySelector('[data-slot="kiosk-ticket"]')!.textContent).toBe("A-021");
    expect(host.textContent).toContain("2 people are ahead of you.");
    button(host, "Done").click();
    await tick();
    expect(root(host).dataset.view).toBe("input");
  });

  it("types a phone number, finds nothing and offers a walk-in; two bookings ask which one", async () => {
    const host = await mount(rendered("check-in-kiosk"));
    button(host, "Phone number").click();
    await tick();
    for (const k of "0155500000") button(host, k).click();
    await tick();
    expect(host.querySelector("output span")!.textContent!.trim()).toBe("0155500000");
    button(host, "Find my booking").click();
    await tick(80);
    expect(root(host).dataset.view).toBe("message");
    expect(host.textContent).toContain("We could not find a booking for that.");
    expect(button(host, "Join the line without a booking")).toBeTruthy();
    button(host, "Try again").click();
    await tick();
    expect(root(host).dataset.view).toBe("input");
  });

  it("a phone with two bookings shows the choice", async () => {
    const host = await mount(rendered("check-in-kiosk"));
    button(host, "Phone number").click();
    await tick();
    for (const k of "01220001111") button(host, k).click();
    await tick();
    button(host, "Find my booking").click();
    await tick(80);
    expect(root(host).dataset.view).toBe("choose");
    expect(host.textContent).toContain("Which one is yours?");
  });
});
