// The Blade email-templates example (packages/php/examples/rendered/email-templates.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 60));

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).api;
});

async function mount(api?: Record<string, (...a: unknown[]) => unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).api = api ?? { saveTemplate: () => undefined, sendTest: () => undefined };
  const host = document.createElement("div");
  host.innerHTML = rendered("email-templates");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const slot = (h: HTMLElement, s: string) => h.querySelector<HTMLElement>(`[data-slot="${s}"]`);
const button = (h: ParentNode, text: string) => [...h.querySelectorAll("button")].find((b) => b.textContent!.trim() === text) as HTMLButtonElement;
const unsaved = (h: HTMLElement) => [...h.querySelectorAll("span")].find((e) => e.textContent === "Unsaved changes") as HTMLElement;
const set = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("email-templates (Blade example)", () => {
  it("renders a card per template with a sandboxed thumbnail and the filled subject", async () => {
    const h = await mount();
    expect(slot(h, "email-template-gallery")).not.toBeNull();
    const cards = h.querySelectorAll("ul li");
    expect(cards).toHaveLength(2);
    const frame = cards[0]!.querySelector("iframe")!;
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("srcdoc")).toContain("Hello Sara");
    expect(cards[0]!.textContent).toContain("Welcome, Sara");
    expect(cards[0]!.textContent).toContain("Active");
    expect(cards[1]!.textContent).toContain("Draft");
  });

  it("filters by search", async () => {
    const h = await mount();
    set(h.querySelector<HTMLInputElement>('input[type="search"]')!, "receipt");
    await tick();
    expect(h.querySelectorAll("ul li")).toHaveLength(1);
    set(h.querySelector<HTMLInputElement>('input[type="search"]')!, "zzz");
    await tick();
    expect(h.textContent).toContain("No templates match");
  });

  it("opens the editor, warns about unknown variables, tracks changes and saves through the event", async () => {
    const saved: unknown[] = [];
    const h = await mount({ saveTemplate: (t) => (saved.push(t), undefined), sendTest: () => undefined });
    h.querySelectorAll<HTMLButtonElement>("ul li > div > button")[1]!.click();
    await tick();
    expect(slot(h, "email-template-editor")).not.toBeNull();
    expect(h.textContent).toContain("Unknown variables: oops");
    const save = button(h, "Save template");
    expect(save.hasAttribute("disabled")).toBe(true);
    const name = h.querySelector<HTMLInputElement>('[data-slot="email-template-editor"] input')!;
    set(name, "Receipt 2");
    await tick();
    expect(unsaved(h).style.display).not.toBe("none");
    expect(button(h, "Save template").hasAttribute("disabled")).toBe(false);
    button(h, "Save template").click();
    await tick();
    expect(saved).toHaveLength(1);
    expect((saved[0] as { name: string }).name).toBe("Receipt 2");
    expect(h.textContent).toContain("Template saved.");
    expect(unsaved(h).style.display).toBe("none");
    // back to the gallery shows the new name
    button(h, "All templates").click();
    await tick();
    expect(h.textContent).toContain("Receipt 2");
  });

  it("shows an error from a failed save and keeps the changes", async () => {
    const h = await mount({ saveTemplate: () => Promise.resolve({ error: "Name taken" }), sendTest: () => undefined });
    h.querySelector<HTMLButtonElement>("ul li > div > button")!.click();
    await tick();
    set(h.querySelector<HTMLInputElement>('[data-slot="email-template-editor"] input')!, "Welcome 2");
    await tick();
    button(h, "Save template").click();
    await tick();
    expect(h.textContent).toContain("Name taken");
    expect(unsaved(h).style.display).not.toBe("none");
  });

  it("asks before deleting and removes the card", async () => {
    const h = await mount();
    h.querySelector<HTMLButtonElement>('button[aria-label="Delete: Welcome"]')!.click();
    await tick();
    expect(document.body.textContent).toContain("Delete Welcome?");
    button(document.body, "Delete").click();
    await tick();
    expect(h.querySelectorAll("ul li")).toHaveLength(1);
    expect(h.textContent).not.toContain("Welcome, Sara");
  });

  it("creates a new template from the gallery", async () => {
    const h = await mount();
    button(h, "New template").click();
    await tick();
    expect(slot(h, "email-template-editor")).not.toBeNull();
    expect(h.querySelector("iframe")!.getAttribute("srcdoc")).toContain('dir="ltr"');
  });
});
