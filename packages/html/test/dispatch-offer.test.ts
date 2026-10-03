// The Blade dispatch-offer example (packages/php/examples/rendered/dispatch-offer.html) under real Alpine.
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

async function mount(html = rendered("dispatch-offer")) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="dispatch-offer"]')!;
const buttons = (h: HTMLElement) => [...h.querySelectorAll<HTMLButtonElement>("footer button")];

describe("dispatch-offer (Blade example)", () => {
  it("renders the ring, the route, the fee and both buttons", async () => {
    const h = await mount();
    expect(root(h).getAttribute("data-mode")).toBe("courier");
    expect(h.querySelector('[data-slot="timer-ring"]')).not.toBeNull();
    expect(h.querySelector('[data-stop="pickup"]')!.textContent).toContain("Al-Quds Bakery");
    expect(h.querySelector('[data-slot="offer-fee"]')!.textContent).toContain("$15.00");
    expect(h.querySelector("h2")!.textContent).toBe("New delivery offer");
    expect(buttons(h)).toHaveLength(2);
    expect(buttons(h)[1]!.disabled).toBe(false);
    expect(h.querySelector('[role="status"]')!.textContent).toBe("30 seconds left to answer");
  });

  it("fires accept and decline events that bubble", async () => {
    const h = await mount();
    const seen: string[] = [];
    h.addEventListener("nq-dispatch-offer-accept", () => seen.push("accept"));
    h.addEventListener("nq-dispatch-offer-decline", () => seen.push("decline"));
    buttons(h)[1]!.click();
    buttons(h)[0]!.click();
    expect(seen).toEqual(["accept", "decline"]);
  });

  it("expires: disables Accept, fires expire once, shows the expired title", async () => {
    const h = await mount(rendered("dispatch-offer").replace("expiresIn\\u0022:30", "expiresIn\\u0022:0.3"));
    let expired = 0;
    h.addEventListener("nq-dispatch-offer-expire", () => expired++);
    await tick(900);
    expect(expired).toBe(1);
    expect(root(h).hasAttribute("data-expired")).toBe(true);
    expect(buttons(h)[1]!.disabled).toBe(true);
    expect(h.querySelector("h2")!.textContent).toBe("Offer expired");
    const seen: string[] = [];
    h.addEventListener("nq-dispatch-offer-accept", () => seen.push("accept"));
    buttons(h)[1]!.click();
    expect(seen).toEqual([]);
  });
});
