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

describe("focus-status (Blade example)", () => {
  it("renders the chip with the time left and the avatar dot", async () => {
    const host = await mount(rendered("focus-status"));
    const chip = host.querySelector<HTMLElement>('[data-slot="focus-status"]')!;
    expect(chip.getAttribute("data-state")).toBe("focus");
    expect(chip.tagName).toBe("SPAN");
    expect(chip.querySelector("[dir=ltr]")!.getAttribute("aria-label")).toBe("12:34 left");
    const avatar = host.querySelector<HTMLElement>('[data-slot="focus-avatar"]')!;
    expect(avatar.querySelector('[data-slot="avatar"]')).not.toBeNull();
    expect(avatar.querySelector('[role="img"][title]')!.getAttribute("aria-label")).toBe("In focus");
  });

  it("the do not disturb switch flips the row state and the until text", async () => {
    const host = await mount(rendered("focus-status"));
    const row = host.querySelector<HTMLElement>('[data-slot="do-not-disturb"]')!;
    const toggle = row.querySelector<HTMLButtonElement>('[role="switch"]')!;
    const until = () => row.querySelector<HTMLElement>(".text-nq-warning-text")!;
    expect(row.getAttribute("data-state")).toBe("on");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(until().style.display).toBe("");
    expect(row.querySelector("label")!.getAttribute("for")).toBe(toggle.id);

    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(row.getAttribute("data-state")).toBe("off");
    expect(until().style.display).toBe("none");

    toggle.click();
    await tick();
    expect(row.getAttribute("data-state")).toBe("on");
    expect(until().style.display).toBe("");
  });
});
