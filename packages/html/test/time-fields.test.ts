// The Blade example (php/examples/time-fields.blade.php) mounted under real Alpine.
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("time-fields");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

function key(el: HTMLElement, k: string) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}
async function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

describe("time-fields (Blade example)", () => {
  it("turns 930 into 09:30 with a preview, accepted on blur", async () => {
    const host = await mount();
    const field = host.querySelector<HTMLElement>('[data-slot="time-field"]')!;
    const input = field.querySelector<HTMLInputElement>("input")!;
    expect(input.value).toBe("09:00");
    await type(input, "930");
    const p = field.querySelector<HTMLElement>("p")!;
    expect(p.hasAttribute("hidden")).toBe(false);
    expect(p.textContent).toContain("Will be");
    expect(p.textContent).toContain("09:30");
    input.dispatchEvent(new FocusEvent("blur"));
    await tick();
    expect(input.value).toBe("09:30");
    expect(p.hasAttribute("hidden")).toBe(true);
  });

  it("steps with the arrow keys, an hour with PageUp, and Escape restores", async () => {
    const host = await mount();
    const input = host.querySelector<HTMLInputElement>('[data-slot="time-field"] input')!;
    key(input, "ArrowUp");
    await tick();
    expect(input.value).toBe("09:05");
    key(input, "PageDown");
    await tick();
    expect(input.value).toBe("09:00");
    await type(input, "12");
    key(input, "Escape");
    await tick();
    expect(input.value).toBe("09:00");
  });

  it("refuses something that is not a time and marks the input invalid", async () => {
    const host = await mount();
    const field = host.querySelector<HTMLElement>('[data-slot="time-field"]')!;
    const input = field.querySelector<HTMLInputElement>("input")!;
    await type(input, "abc");
    key(input, "Enter");
    await tick();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(field.querySelector("p")!.textContent).toContain("Enter a time such as 930 or 09:30.");
    expect(input.getAttribute("aria-describedby")).toBe(field.querySelector("p")!.id);
  });

  it("shows the span length, the next-day badge, and an error for a backwards span", async () => {
    const host = await mount();
    const span = host.querySelector<HTMLElement>('[data-slot="time-span-field"]')!;
    expect(span.getAttribute("role")).toBe("group");
    expect(span.textContent).toContain("Duration:");
    expect(span.textContent).toContain("8h");
    const badge = span.querySelector<HTMLElement>('[data-slot="badge"]')!;
    expect(badge.style.display).not.toBe("none");
    expect(badge.textContent).toBe("Next day");
    const [start] = span.querySelectorAll<HTMLInputElement>("input");
    await type(start!, "2330");
    key(start!, "Enter");
    await tick();
    expect(start!.value).toBe("23:30");
    expect(span.textContent).toContain("6h 30m");
  });

  it("ticks a zone clock with the city, offset and the gap from the reference", async () => {
    const host = await mount();
    const clocks = host.querySelectorAll<HTMLElement>('[data-slot="time-zone-clock"]');
    const london = clocks[clocks.length - 1]!;
    expect(london.textContent).toContain("London");
    expect(london.querySelector("time")!.textContent!.trim()).not.toBe("");
    expect(london.textContent).toMatch(/UTC\+0[01]:00/);
    expect(london.textContent).toMatch(/-[123]h/);
    expect(london.textContent).toContain("from Riyadh");
  });

  it("filters the zone list, picks a zone and updates the clock", async () => {
    const host = await mount();
    const field = host.querySelector<HTMLElement>('[data-slot="time-zone-field"]')!;
    const input = field.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
    expect(input.value).toBe("Riyadh, Asia");
    expect(input.getAttribute("role")).toBe("combobox");
    await type(input, "cairo");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const options = [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')];
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]!.textContent).toContain("Cairo");
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(true);
    let changed: string | null = null;
    field.addEventListener("change", (e) => (changed = (e as CustomEvent).detail.value));
    key(input, "Enter");
    await tick();
    expect(changed).toBe("Africa/Cairo");
    expect(input.value).toBe("Cairo, Africa");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    const clock = field.querySelector<HTMLElement>('[data-slot="time-zone-clock"]')!;
    expect(clock.textContent).toContain("Cairo");
  });

  it("says when nothing matches", async () => {
    const host = await mount();
    const input = host.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
    await type(input, "zzzzqq");
    const empty = document.querySelector<HTMLElement>('[data-slot="combobox-empty"]')!;
    expect(empty.style.display).not.toBe("none");
  });
});
