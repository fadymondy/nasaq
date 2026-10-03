// The Blade password-input example (packages/php/examples/rendered/password-input.html) under real Alpine.
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
  host.innerHTML = rendered("password-input");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

async function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

describe("password-input (Blade example)", () => {
  it("renders a password input with the label wired and an off toggle", async () => {
    const host = await mount();
    const input = host.querySelector<HTMLInputElement>("input")!;
    expect(input.type).toBe("password");
    expect(input.id).toBe("new-password");
    expect(input.getAttribute("autocomplete")).toBe("new-password");
    const toggle = host.querySelector<HTMLButtonElement>('[data-slot="password-input-toggle"]')!;
    expect(toggle.getAttribute("aria-label")).toBe("Show password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("the toggle shows and hides the text", async () => {
    const host = await mount();
    const input = host.querySelector<HTMLInputElement>("input")!;
    const toggle = host.querySelector<HTMLButtonElement>('[data-slot="password-input-toggle"]')!;
    toggle.click();
    await tick();
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    toggle.click();
    await tick();
    expect(input.type).toBe("password");
  });

  it("scores the strength and ticks the rules as you type", async () => {
    const host = await mount();
    const input = host.querySelector<HTMLInputElement>("input")!;
    const strength = host.querySelector<HTMLElement>('[data-slot="password-input-strength"]')!;
    expect(strength.dataset.score).toBe("0");
    await type(input, "Tr0ub4dor&3xyz!!");
    expect(strength.dataset.score).toBe("4");
    expect(strength.textContent).toContain("Strong");
    expect(strength.querySelector('[data-slot="meter"]')!.getAttribute("data-tone")).toBe("success");
    const rules = [...host.querySelectorAll<HTMLElement>('[data-slot="password-input-rules"] li')];
    expect(rules).toHaveLength(5);
    expect(rules.every((r) => r.hasAttribute("data-met"))).toBe(true);
    await type(input, "abcdefgh");
    expect(rules.filter((r) => r.hasAttribute("data-met"))).toHaveLength(1);
    expect(rules[0]!.hasAttribute("data-met")).toBe(false);
    expect(rules[2]!.hasAttribute("data-met")).toBe(true);
  });
});
