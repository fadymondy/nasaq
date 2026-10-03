// The Blade checkbox, switch, radio-group, toggle-group and field examples under real Alpine with the Nasaq runtime.
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

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("checkbox (Blade example)", () => {
  it("toggles with its state attributes and is labelled by the field", async () => {
    const host = await mount("checkbox");
    const box = host.querySelector<HTMLElement>('[data-slot="checkbox"]')!;
    const label = host.querySelector<HTMLElement>('[data-slot="field-label"]')!;
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(box.hasAttribute("data-checked")).toBe(true);
    expect(label.getAttribute("for")).toBe(box.id);

    box.click();
    await tick();
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect(box.hasAttribute("data-checked")).toBe(false);
    expect(box.hasAttribute("data-unchecked")).toBe(true);
    const indicator = host.querySelector<HTMLElement>('[data-slot="checkbox-indicator"]')!;
    expect(indicator.style.display).toBe("none");
  });
});

describe("switch (Blade example)", () => {
  it("flips checked on the root and the thumb", async () => {
    const host = await mount("switch");
    const sw = host.querySelector<HTMLElement>('[data-slot="switch"]')!;
    const thumb = host.querySelector<HTMLElement>('[data-slot="switch-thumb"]')!;
    expect(sw.getAttribute("role")).toBe("switch");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(thumb.hasAttribute("data-checked")).toBe(true);

    sw.click();
    await tick();
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(sw.hasAttribute("data-unchecked")).toBe(true);
    expect(thumb.hasAttribute("data-checked")).toBe(false);
    expect(thumb.hasAttribute("data-unchecked")).toBe(true);
  });
});

describe("radio-group (Blade example)", () => {
  it("selects on click and moves with the arrow keys", async () => {
    const host = await mount("radio-group");
    const radios = [...host.querySelectorAll<HTMLElement>('[data-slot="radio"]')];
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
    expect(radios[0]!.tabIndex).toBe(0);
    expect(radios[1]!.tabIndex).toBe(-1);

    radios[1]!.click();
    await tick();
    expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
    expect(radios[0]!.getAttribute("aria-checked")).toBe("false");
    expect(radios[1]!.hasAttribute("data-checked")).toBe(true);
    expect(radios[1]!.tabIndex).toBe(0);

    radios[1]!.focus();
    key(radios[1]!, "ArrowDown"); // wraps to the first
    await tick();
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
  });

  it("names the group from the field label", async () => {
    const host = await mount("radio-group");
    const group = host.querySelector<HTMLElement>('[data-slot="radio-group"]')!;
    expect(group.getAttribute("aria-label") ?? group.getAttribute("aria-labelledby")).toBeTruthy();
  });
});

describe("toggle-group (Blade example)", () => {
  it("presses one at a time, clears on a second press and rolls focus", async () => {
    const host = await mount("toggle-group");
    const [list, grid] = [...host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    expect(list!.getAttribute("aria-pressed")).toBe("true");
    expect(list!.tabIndex).toBe(0);
    expect(grid!.tabIndex).toBe(-1);

    grid!.click();
    await tick();
    expect(grid!.getAttribute("aria-pressed")).toBe("true");
    expect(grid!.hasAttribute("data-pressed")).toBe(true);
    expect(list!.getAttribute("aria-pressed")).toBe("false");

    grid!.click();
    await tick();
    expect(grid!.getAttribute("aria-pressed")).toBe("false");

    list!.focus();
    key(list!, "ArrowRight");
    expect(document.activeElement).toBe(grid);
    key(grid!, "Home");
    expect(document.activeElement).toBe(list);
  });
});

describe("field (Blade example)", () => {
  it("wires the label, the control and the description", async () => {
    const host = await mount("field");
    const input = host.querySelector<HTMLElement>('[data-slot="input"]')!;
    const label = host.querySelector<HTMLElement>('[data-slot="field-label"]')!;
    const desc = host.querySelector<HTMLElement>('[data-slot="field-description"]')!;
    expect(input.id).toBeTruthy();
    expect(label.getAttribute("for")).toBe(input.id);
    expect(desc.id).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toContain(desc.id);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("marks the control invalid when the field is", async () => {
    const host = await mount("field");
    const root = host.querySelector<HTMLElement>('[data-slot="field"]')!;
    const input = host.querySelector<HTMLElement>('[data-slot="input"]')!;
    (Alpine.$data(root) as { invalid: boolean }).invalid = true;
    await tick();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.hasAttribute("data-invalid")).toBe(true);
    expect(root.hasAttribute("data-invalid")).toBe(true);
  });
});
