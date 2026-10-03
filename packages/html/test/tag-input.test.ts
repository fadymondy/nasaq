// The Blade tag-input example (packages/php/examples/rendered/tag-input.html) under real Alpine.
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("tag-input");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const field = () => document.querySelector<HTMLInputElement>('[data-slot="tag-input-field"]')!;
const chips = () => [...document.querySelectorAll('[data-slot="tag-input-tag"]')].map((e) => e.textContent?.trim());
const hidden = () => [...document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="labels"]')].map((e) => e.value);

async function type(text: string) {
  field().focus();
  field().value = text;
  field().dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
async function press(key: string) {
  field().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  await tick();
}

describe("tag-input (Blade example)", () => {
  it("renders the initial tags and a hidden input per tag", async () => {
    await mount();
    expect(chips()).toEqual(["design", "urgent"]);
    expect(hidden()).toEqual(["design", "urgent"]);
  });

  it("adds a tag on Enter and clears the field", async () => {
    await mount();
    await type("review");
    await press("Enter");
    expect(chips()).toEqual(["design", "urgent", "review"]);
    expect(field().value).toBe("");
    expect(hidden()).toContain("review");
  });

  it("refuses a duplicate with an alert and a reject event", async () => {
    const host = await mount();
    let detail: unknown;
    host.addEventListener("reject", (e) => (detail = (e as CustomEvent).detail));
    await type("DESIGN");
    await press("Enter");
    expect(chips()).toEqual(["design", "urgent"]);
    expect(detail).toEqual({ tag: "DESIGN", reason: "duplicate" });
    const alert = document.querySelector<HTMLElement>('[data-slot="tag-input-error"]')!;
    expect(alert.textContent).toContain("already added");
  });

  it("removes the last tag on Backspace and a chosen one with its button", async () => {
    await mount();
    await press("Backspace");
    expect(chips()).toEqual(["design"]);
    document.querySelector<HTMLButtonElement>('[data-slot="tag-input-tag"] button')!.click();
    await tick();
    expect(chips()).toEqual([]);
  });

  it("offers suggestions while typing and adds the picked one", async () => {
    await mount();
    await type("res");
    const list = document.querySelector<HTMLElement>('[data-slot="tag-input-suggestions"]')!;
    expect(list.style.display).not.toBe("none");
    document.querySelector<HTMLElement>('[data-slot="tag-input-suggestion"]')!.click();
    await tick();
    expect(chips()).toContain("research");
  });

  it("stops at maxTags", async () => {
    await mount();
    for (const t of ["a", "b", "c", "d"]) {
      await type(t);
      await press("Enter");
    }
    expect(chips()).toHaveLength(5);
    expect(document.querySelector('[data-slot="tag-input-error"]')!.textContent).toContain("up to 5");
  });
});
