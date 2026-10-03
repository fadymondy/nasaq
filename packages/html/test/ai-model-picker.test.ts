// The Blade ai-model-picker example (packages/php/examples/rendered/ai-model-picker.html) under real Alpine.
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
  host.innerHTML = rendered("ai-model-picker");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
}

const pickers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="ai-model-picker"]')];
const full = () => pickers()[0]!;
const compact = () => pickers()[1]!;
const cards = () => [...full().querySelectorAll<HTMLElement>('[data-slot="radio-card"]')];
const efforts = (root: HTMLElement = full()) => [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
const pressed = (root: HTMLElement = full()) => efforts(root).filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent?.trim());
const hidden = (name: string) => document.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)!;
const alertEl = () => full().querySelector<HTMLElement>('[role="alert"]')!;
const shown = (el: HTMLElement) => el.style.display !== "none";

describe("ai-model-picker (Blade example)", () => {
  it("renders the model cards with the first checked and the efforts of that model", async () => {
    await mount();
    expect(cards().map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(cards()[0]!.textContent).toContain("Opus 5.5");
    expect(cards()[0]!.textContent).toContain("Most capable");
    expect(cards()[0]!.textContent).toContain("1M context");
    expect(cards()[0]!.textContent).toMatch(/\$5 in, \$25 out per 1M tokens/);
    expect(efforts().map((b) => b.textContent?.trim())).toEqual(["Low", "Medium", "High", "Max"]);
    expect(pressed()).toEqual(["High"]);
    expect(hidden("run[model]").value).toBe("opus-5.5");
    expect(hidden("run[effort]").value).toBe("high");
    expect(hidden("run[effort]").disabled).toBe(false);
  });

  it("keeps the effort across a model that supports it, and drops it for one that has none", async () => {
    await mount();
    cards()[1]!.click();
    await tick();
    expect(cards()[1]!.getAttribute("aria-checked")).toBe("true");
    expect(efforts().map((b) => b.textContent?.trim())).toEqual(["Low", "Medium", "High"]);
    expect(pressed()).toEqual(["High"]);
    expect(hidden("run[model]").value).toBe("sonnet-5.5");
    cards()[2]!.click();
    await tick();
    expect(efforts()).toEqual([]);
    expect(hidden("run[effort]").disabled).toBe(true);
    cards()[0]!.click();
    await tick();
    expect(pressed()).toEqual(["Medium"]);
  });

  it("changes the effort with a click and never leaves none pressed", async () => {
    await mount();
    efforts()[0]!.click();
    await tick();
    expect(pressed()).toEqual(["Low"]);
    expect(hidden("run[effort]").value).toBe("low");
    efforts()[0]!.click();
    await tick();
    expect(pressed()).toEqual(["Low"]);
  });

  it("holds the required agent as invalid after the select is opened and left empty, then clears it", async () => {
    await mount();
    expect(shown(alertEl())).toBe(false);
    const trigger = full().querySelector<HTMLElement>('[data-slot="ai-agent-select"]')!;
    expect(trigger.getAttribute("aria-label")).toBe("Agent");
    trigger.click();
    await tick();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await tick();
    expect(shown(alertEl())).toBe(true);
    expect(alertEl().textContent).toContain("Choose the agent that will run this.");
    expect(trigger.hasAttribute("data-invalid")).toBe(true);
    document.body.querySelector<HTMLElement>('[data-slot="select-item"]')!.click();
    await tick();
    expect(shown(alertEl())).toBe(false);
    expect(hidden("run[agent]").value).toBe("review");
    expect(hidden("run[agent]").disabled).toBe(false);
  });

  it("compact variant: a model select plus the effort toggles", async () => {
    await mount();
    expect(compact().getAttribute("data-variant")).toBe("compact");
    expect(compact().querySelector('[data-slot="ai-model-select"]')!.textContent).toContain("Sonnet 5.5");
    expect(pressed(compact())).toEqual(["Medium"]);
  });

  it("the model-only select shows the chosen model", async () => {
    await mount();
    const triggers = [...document.querySelectorAll<HTMLElement>('[data-slot="ai-model-select"]')];
    expect(triggers[1]!.textContent).toContain("Haiku 4.5");
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"][name="model"]')!.value).toBe("haiku-4.5");
  });
});

describe("persona picker (Blade example)", () => {
  const picker = () => document.querySelector<HTMLElement>('[data-slot="persona-picker"]')!;
  const personaCards = () => [...picker().querySelectorAll<HTMLElement>('[data-slot="radio-card"]')];
  const starters = () => [...picker().querySelectorAll<HTMLElement>('[data-slot="persona-starters"] button')].map((b) => b.textContent?.trim());

  it("shows the starters of the selected persona and dispatches nq-starter", async () => {
    await mount();
    expect(personaCards().map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(starters()).toEqual(["Plan my week", "What should I do first?"]);
    const events: CustomEvent[] = [];
    document.addEventListener("nq-starter", (e) => events.push(e as CustomEvent));
    picker().querySelector<HTMLElement>('[data-slot="persona-starters"] button')!.click();
    await tick();
    expect(events[0]!.detail.prompt).toBe("Plan my week");
    expect(events[0]!.detail.persona.id).toBe("coach");
  });

  it("switches personas and their starters, and writes the hidden input", async () => {
    await mount();
    personaCards()[1]!.click();
    await tick();
    expect(starters()).toEqual(["Draft a launch email"]);
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"][name="persona"]')!.value).toBe("writer");
  });
});
