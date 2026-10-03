// The Blade section-board example (packages/php/examples/rendered/section-board.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { boardSectionChanged, duplicateSectionSettingKeys, sectionDropIndex, sectionSettingRows, sectionSettingsFromRows } from "../src/alpine/section-board-logic";

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
  document.documentElement.lang = "en";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("section-board");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const board = () => document.querySelector<HTMLElement>('[data-slot="section-board"]')!;
const state = () => Alpine.$data(board()) as { sections: { id: string; title: string; settings?: Record<string, string> }[]; editing: boolean };
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="section-board-section"]')];
const names = () => items().map((li) => li.dataset.section);
const label = (text: string) => document.querySelector<HTMLElement>(`[aria-label="${text}"]`);
const edit = async () => {
  document.querySelector<HTMLButtonElement>("button.underline")!.click();
  await tick();
};
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const dialogButton = (text: string) => [...dialog().querySelectorAll("button")].find((b) => b.textContent!.trim() === text)!;
const type = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("section-board helpers", () => {
  it("round-trips settings rows, flags repeated keys and detects edits", () => {
    expect(sectionSettingRows({ a: "1" })).toEqual([{ key: "a", value: "1" }]);
    expect(sectionSettingsFromRows([{ key: " a ", value: "1" }, { key: "", value: "x" }, { key: "a", value: "2" }])).toEqual({ a: "2" });
    expect(duplicateSectionSettingKeys([{ key: "a", value: "" }, { key: "a ", value: "" }, { key: "b", value: "" }])).toEqual(["a"]);
    const a = { id: "a", title: "A", settings: { k: "v" } };
    expect(boardSectionChanged(a, { ...a })).toBe(false);
    expect(boardSectionChanged(a, { ...a, settings: { k: "w" } })).toBe(true);
  });
  it("picks the closest centre in a grid", () => {
    const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
    expect(sectionDropIndex(c, 0, 90, 5)).toBe(1);
    expect(sectionDropIndex(c, 0, 10, 95)).toBe(2);
    expect(sectionDropIndex(c, 1, 1, 1)).toBe(1);
  });
});

describe("section-board (Blade example)", () => {
  it("view mode shows titles, tags and content only", async () => {
    await mount();
    expect(names()).toEqual(["news", "tips", "alerts"]);
    expect(board().getAttribute("data-editing")).toBeNull();
    expect(document.querySelector("ol")!.getAttribute("aria-label")).toBe("Sections");
    expect(document.querySelector("ol")!.className).toContain("sm:grid-cols-2");
    expect(items()[0]!.querySelector("h3")!.textContent).toBe("Morning news");
    expect(board().textContent).toContain("Daily");
    expect(board().textContent).toContain("Card payments grew 12% this quarter.");
    expect(label("Edit Morning news")).toBeNull();
    expect(board().querySelector('[data-slot="section-board-prompt"]')).toBeNull();
    expect(items()[0]!.querySelector('[data-slot="section-board-content"]')!.hasAttribute("inert")).toBe(false);
  });

  it("edit mode adds handles, edit and remove, the prompt footer and inert content", async () => {
    await mount();
    await edit();
    expect(board().getAttribute("data-editing")).toBe("true");
    expect(label("Move Morning news")).not.toBeNull();
    expect(label("Edit Morning news")).not.toBeNull();
    expect(label("Remove Morning news")).not.toBeNull();
    expect(items()[0]!.querySelector('[data-slot="section-board-content"]')!.hasAttribute("inert")).toBe(true);
    const footer = items()[0]!.querySelector('[data-slot="section-board-prompt"]')!;
    expect(footer.textContent).toContain("Fast");
    expect(footer.textContent).toContain("Summarise the top three headlines");
    expect([...board().querySelectorAll("button")].some((b) => b.textContent!.trim() === "Add section")).toBe(true);
  });

  it("the arrow keys move a section, announce it and fire change", async () => {
    await mount();
    await edit();
    let detail: { sections: { id: string }[] } | null = null;
    board().addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    label("Move Morning news")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    expect(names()).toEqual(["tips", "news", "alerts"]);
    expect(detail!.sections.map((s) => s.id)).toEqual(["tips", "news", "alerts"]);
    expect(board().querySelector('[role="status"]')!.textContent).toBe("Morning news is now at position 2 of 3");
    label("Move Morning news")!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await tick();
    expect(names()).toEqual(["tips", "alerts", "news"]);
  });

  it("dragging the handle onto another section reorders", async () => {
    await mount();
    await edit();
    const tops = [10, 110, 210];
    items().forEach((li, i) => {
      li.getBoundingClientRect = () => ({ left: 0, top: tops[i]!, width: 100, height: 80, right: 100, bottom: tops[i]! + 80, x: 0, y: tops[i]!, toJSON() {} }) as DOMRect;
    });
    const ev = (type: string, x: number, y: number) => {
      const e = new Event(type, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
      Object.assign(e, { clientX: x, clientY: y, pointerId: 1, pointerType: "touch", button: 0 });
      return e;
    };
    label("Move Morning news")!.dispatchEvent(ev("pointerdown", 10, 20));
    window.dispatchEvent(ev("pointermove", 10, 215));
    await tick();
    expect(items()[0]!.dataset.dragging).toBe("true");
    expect(items()[2]!.getAttribute("data-over")).toBe("");
    window.dispatchEvent(ev("pointerup", 10, 215));
    await tick();
    expect(names()).toEqual(["tips", "alerts", "news"]);
    expect(items().some((li) => li.dataset.dragging)).toBe(false);
  });

  it("remove drops the section and announces it", async () => {
    await mount();
    await edit();
    label("Remove Tip of the day")!.click();
    await tick();
    expect(state().sections.map((s) => s.id)).toEqual(["news", "alerts"]);
    expect(board().querySelector('[role="status"]')!.textContent).toBe("Tip of the day removed");
  });

  it("the editor edits a section and Save stays off until something changed", async () => {
    await mount();
    await edit();
    label("Edit Morning news")!.click();
    await tick();
    expect(dialog()).not.toBeNull();
    expect(dialogButton("Save").hasAttribute("disabled")).toBe(true);
    const title = dialog().querySelector<HTMLInputElement>("input")!;
    expect(title.value).toBe("Morning news");
    await type(title, "Headlines");
    expect(dialogButton("Save").hasAttribute("disabled")).toBe(false);
    dialogButton("Save").click();
    await tick();
    expect(state().sections[0]!.title).toBe("Headlines");
    expect(state().sections[0]!.settings).toEqual({ topic: "payments" });
    expect(board().querySelector('[role="status"]')!.textContent).toBe("Headlines saved");
  });

  it("the editor flags repeated setting keys and keeps Save off", async () => {
    await mount();
    await edit();
    label("Edit Morning news")!.click();
    await tick();
    dialogButton("Add setting").click();
    await tick();
    const inputs = dialog().querySelectorAll<HTMLInputElement>('[data-slot="section-board-setting"] input');
    await type(inputs[2]!, "topic");
    expect(dialog().textContent).toContain('"topic" is used more than once');
    expect(dialogButton("Save").hasAttribute("disabled")).toBe(true);
  });

  it("the model select lists the default and the given models", async () => {
    await mount();
    await edit();
    label("Edit Morning news")!.click();
    await tick();
    expect(dialog().querySelector('[data-slot="select-value"]')!.textContent).toBe("Fast");
    const texts = [...document.querySelectorAll('[data-slot="select-item-text"]')].map((e) => e.textContent);
    expect(texts).toEqual(["Default model", "Fast", "Deep reasoning"]);
  });

  it("Add section fires nq-add", async () => {
    await mount();
    await edit();
    let fired = false;
    board().addEventListener("nq-add", () => (fired = true));
    [...board().querySelectorAll("button")].find((b) => b.textContent!.trim() === "Add section")!.click();
    expect(fired).toBe(true);
  });
});
