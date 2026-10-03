// The Blade landing-page-editor example (packages/php/examples/rendered/landing-page-editor.html) under real Alpine.
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
  (window as any).api = api ?? { save: () => undefined, publish: () => undefined };
  const host = document.createElement("div");
  host.innerHTML = rendered("landing-page-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="landing-page-editor"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement) => Alpine.$data(root(h)) as any;
const preview = (h: HTMLElement) => h.querySelector<HTMLElement>('[role="region"]')!;
const button = (h: ParentNode, text: string) => [...h.querySelectorAll("button")].find((b) => b.textContent!.trim() === text) as HTMLButtonElement;
const unsaved = (h: HTMLElement) => [...h.querySelectorAll("span")].find((e) => e.textContent === "Unsaved changes") as HTMLElement;
const set = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const field = (h: HTMLElement, label: string) => {
  const l = [...h.querySelectorAll("label")].find((x) => x.textContent!.trim() === label)!;
  return document.getElementById(l.getAttribute("for")!) as HTMLInputElement | HTMLTextAreaElement;
};

describe("landing-page-editor (Blade example)", () => {
  it("renders the outline, the preview and the form of the first section", async () => {
    const h = await mount();
    expect(root(h).getAttribute("role")).toBe("group");
    expect(h.querySelectorAll("ol > li")).toHaveLength(3);
    expect(preview(h).textContent).toContain("A headline that says it in one line");
    expect(preview(h).textContent).toContain("Ready to start?");
    expect(field(h, "Headline").value).toBe("A headline that says it in one line");
    expect(preview(h).getAttribute("dir")).toBe("ltr");
  });

  it("edits a field live, tracks changes and saves through the event", async () => {
    const saved: unknown[] = [];
    const h = await mount({ save: (p) => (saved.push(p), undefined), publish: () => undefined });
    expect(button(h, "Save draft").hasAttribute("disabled")).toBe(true);
    set(field(h, "Headline"), "New headline");
    await tick();
    expect(preview(h).textContent).toContain("New headline");
    expect(unsaved(h).style.display).not.toBe("none");
    expect(button(h, "Save draft").hasAttribute("disabled")).toBe(false);
    button(h, "Save draft").click();
    await tick();
    expect(saved).toHaveLength(1);
    expect((saved[0] as { sections: { data: { headline: string } }[] }).sections[0]!.data.headline).toBe("New headline");
    expect(h.textContent).toContain("Draft saved.");
    expect(unsaved(h).style.display).toBe("none");
  });

  it("shows an error from a failed save and keeps the changes", async () => {
    const h = await mount({ save: () => Promise.resolve({ error: "Nope" }), publish: () => undefined });
    set(field(h, "Headline"), "Other");
    await tick();
    button(h, "Save draft").click();
    await tick();
    expect(h.textContent).toContain("Nope");
    expect(unsaved(h).style.display).not.toBe("none");
  });

  it("blocks publish on an unsafe link, then publishes once it is fixed", async () => {
    const published: unknown[] = [];
    const h = await mount({ save: () => undefined, publish: (p) => (published.push(p), undefined) });
    set(field(h, "Main button link"), "javascript:alert(1)");
    await tick();
    expect(h.textContent).toContain("Use https://, a path starting with /, or #.");
    expect(h.textContent).toContain("Fix the invalid button links.");
    expect(button(h, "Publish").hasAttribute("disabled")).toBe(true);
    set(field(h, "Main button link"), "/signup");
    await tick();
    expect(button(h, "Publish").hasAttribute("disabled")).toBe(false);
    button(h, "Publish").click();
    await tick();
    expect((published[0] as { status: string }).status).toBe("published");
    expect(h.textContent).toContain("Page published.");
    expect(h.textContent).toContain("Publish changes");
    expect(h.textContent).toContain("Published");
  });

  it("adds, moves, hides, duplicates and deletes sections", async () => {
    const h = await mount();
    const d = data(h);
    d.select("s-faq");
    d.add("text");
    await tick();
    expect(d.page.sections.map((s: { type: string }) => s.type)).toEqual(["hero", "faq", "text", "cta"]);
    expect(d.selected.type).toBe("text");
    expect(h.querySelector<HTMLTextAreaElement>("textarea.font-mono")!.value).toContain("Write your text here.");
    d.move(2, -1);
    expect(d.page.sections.map((s: { type: string }) => s.type)).toEqual(["hero", "text", "faq", "cta"]);
    d.toggleVisible("s-cta");
    await tick();
    expect(preview(h).textContent).not.toContain("Ready to start?");
    d.duplicate(0);
    await tick();
    expect(d.page.sections).toHaveLength(5);
    expect(new Set(d.page.sections.map((s: { id: string }) => s.id)).size).toBe(5);
    d.remove(d.selectedId);
    await tick();
    expect(d.page.sections).toHaveLength(4);
    expect(h.querySelectorAll("ol > li")).toHaveLength(4);
  });

  it("edits faq items and the page settings", async () => {
    const h = await mount();
    h.querySelectorAll<HTMLButtonElement>("ol > li > button")[1]!.click();
    await tick();
    button(h, "Add question").click();
    await tick();
    expect(data(h).selected.data.items).toHaveLength(2);
    expect(preview(h).querySelectorAll("dt")).toHaveLength(2);
    button(h, "Page").click();
    await tick();
    set(field(h, "Address"), "Bad Slug!");
    await tick();
    expect(h.textContent).toContain("Use lowercase letters, numbers and hyphens only.");
    set(field(h, "Search title"), "Hello");
    await tick();
    expect(h.textContent).toContain("5 of 60 characters");
  });
});
