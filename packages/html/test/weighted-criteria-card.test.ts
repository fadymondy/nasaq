// The Blade weighted-criteria-card example (packages/php/examples/rendered/weighted-criteria-card.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("weighted-criteria-card");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const rows = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>('[data-slot="weighted-criterion"]')];
const accept = (h: HTMLElement) => [...h.querySelectorAll<HTMLButtonElement>('[data-slot="card-footer"] button')].at(-1)!;

describe("weighted-criteria-card (Blade example)", () => {
  it("renders the rows with labelled switches and weight groups", async () => {
    const h = await mount();
    expect(rows(h)).toHaveLength(3);
    expect(rows(h)[0]!.hasAttribute("data-enabled")).toBe(true);
    expect(rows(h)[2]!.hasAttribute("data-enabled")).toBe(false);
    expect(rows(h)[0]!.querySelector('[role="switch"]')!.getAttribute("aria-label")).toBe("Include Price");
    expect(rows(h)[0]!.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("Weight of Price");
    expect(h.querySelector('[aria-live="polite"]')!.textContent).toBe("2 of 3 included");
    const pressed = rows(h)[0]!.querySelector<HTMLElement>('[data-slot="toggle"][data-pressed]')!;
    expect(pressed.textContent).toBe("High");
    // the weight group is disabled while its criterion is off
    expect(rows(h)[2]!.querySelector<HTMLButtonElement>('[data-slot="toggle"]')!.disabled).toBe(true);
  });

  it("switches a criterion on and off and updates the count and the bar", async () => {
    const h = await mount();
    rows(h)[2]!.querySelector<HTMLElement>('[role="switch"]')!.click();
    await tick();
    expect(rows(h)[2]!.hasAttribute("data-enabled")).toBe(true);
    expect(h.querySelector('[aria-live="polite"]')!.textContent).toBe("3 of 3 included");
    const bar = rows(h)[2]!.querySelector<HTMLElement>("[aria-hidden] > span.bg-primary")!;
    expect(bar.getAttribute("style")).toContain("width: 17%");
  });

  it("sets the weight and moves focus with the arrow keys", async () => {
    const h = await mount();
    const toggles = [...rows(h)[0]!.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')];
    toggles[0]!.click();
    await tick();
    expect(toggles[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(toggles[2]!.getAttribute("aria-pressed")).toBe("false");
    toggles[0]!.focus();
    toggles[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(toggles[1]);
  });

  it("adds a custom criterion that can be removed, ignoring duplicates", async () => {
    const h = await mount();
    const input = h.querySelector<HTMLInputElement>("form input")!;
    const add = h.querySelector<HTMLButtonElement>("form button")!;
    expect(add.disabled).toBe(true);
    input.value = "Quality";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(add.disabled).toBe(false);
    h.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(rows(h)).toHaveLength(4);
    const remove = rows(h)[3]!.querySelector<HTMLButtonElement>('button[aria-label="Remove Quality"]')!;
    expect(remove.style.display).not.toBe("none");
    expect(rows(h)[0]!.querySelector<HTMLElement>('button[aria-label^="Remove"]')!.style.display).toBe("none");
    input.value = "price";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    h.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(rows(h)).toHaveLength(4);
    remove.click();
    await tick();
    expect(rows(h)).toHaveLength(3);
  });

  it("accepts with the list, locks and shows Sent", async () => {
    const h = await mount();
    let detail: { criteria: { id: string }[] } | null = null;
    h.firstElementChild!.firstElementChild!.addEventListener("nq-weighted-criteria-accept", (e) => (detail = (e as CustomEvent).detail));
    accept(h).click();
    await tick();
    expect(detail!.criteria.map((c) => c.id)).toEqual(["price", "support", "speed"]);
    expect(h.querySelector('[data-slot="weighted-criteria-card"]')!.hasAttribute("data-sent")).toBe(true);
    expect(accept(h).textContent).toContain("Sent");
    expect(accept(h).disabled).toBe(true);
    expect(rows(h)[0]!.querySelector<HTMLButtonElement>('[role="switch"]')!.disabled).toBe(true);
  });

  it("shows an alert when the listener's promise reports an error", async () => {
    const h = await mount();
    h.firstElementChild!.firstElementChild!.addEventListener("nq-weighted-criteria-accept", (e) => {
      (e as CustomEvent).detail.promise = Promise.resolve({ error: "Nope" });
    });
    accept(h).click();
    await tick();
    const alert = h.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent).toContain("Nope");
    expect(h.querySelector('[data-slot="weighted-criteria-card"]')!.hasAttribute("data-sent")).toBe(false);
  });
});
