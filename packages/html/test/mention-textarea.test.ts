// The Blade mention-textarea example (packages/php/examples/rendered/mention-textarea.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const area = () => document.querySelector<HTMLTextAreaElement>('[data-slot="textarea"]')!;
const list = () => document.querySelector<HTMLElement>('[data-slot="mention-list"]')!;
const visible = (el: HTMLElement | null) => !!el && el.style.display !== "none";
const options = () => [...document.querySelectorAll<HTMLElement>('[data-slot="mention-option"]')];

async function type(text: string) {
  const el = area();
  el.focus();
  el.value = text;
  el.setSelectionRange(text.length, text.length);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { key: "x", bubbles: true }));
  await tick();
}
async function press(key: string) {
  area().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  await tick();
}

describe("mention-textarea (Blade example)", () => {
  it("is a closed combobox wired to the field label", async () => {
    await mount("mention-textarea");
    expect(area().getAttribute("role")).toBe("combobox");
    expect(area().getAttribute("aria-autocomplete")).toBe("list");
    expect(area().getAttribute("aria-expanded")).toBe("false");
    expect(visible(list())).toBe(false);
    expect(document.querySelector("label")!.getAttribute("for")).toBe(area().id);
  });

  it("opens on the trigger and wires aria-controls and activedescendant", async () => {
    await mount("mention-textarea");
    await type("hi @");
    expect(visible(list())).toBe(true);
    expect(list().getAttribute("role")).toBe("listbox");
    expect(list().getAttribute("aria-label")).toBe("Mentions");
    expect(area().getAttribute("aria-expanded")).toBe("true");
    expect(area().getAttribute("aria-controls")).toBe(list().id);
    expect(options()).toHaveLength(2);
    expect(options()[0]!.textContent).toContain("Sara Ali");
    expect(options()[0]!.hasAttribute("data-active")).toBe(true);
    expect(options()[0]!.getAttribute("aria-selected")).toBe("true");
    expect(area().getAttribute("aria-activedescendant")).toBe(options()[0]!.id);
    expect(document.querySelector('[role="status"]')!.textContent).toBe("2 suggestions");
  });

  it("filters while typing and shows the empty state", async () => {
    await mount("mention-textarea");
    await type("@omar");
    expect(options()).toHaveLength(1);
    await type("@zzz");
    expect(visible(list())).toBe(false);
    const empty = document.querySelector<HTMLElement>('[data-slot="mention-empty"]')!;
    expect(visible(empty)).toBe(true);
    expect(empty.textContent).toContain("No matches");
  });

  it("only opens at the start of a word", async () => {
    await mount("mention-textarea");
    await type("me@");
    expect(visible(list())).toBe(false);
  });

  it("arrows move, Enter inserts the name and reports the mention", async () => {
    const host = await mount("mention-textarea");
    let detail: { mentions: unknown[] } | undefined;
    host.addEventListener("nq-mentions-change", (e) => (detail = (e as CustomEvent).detail));
    await type("hi @");
    await press("ArrowDown");
    expect(options()[1]!.hasAttribute("data-active")).toBe(true);
    await press("ArrowUp");
    await press("Enter");
    await tick();
    expect(area().value).toBe("hi @Sara Ali ");
    expect(detail!.mentions).toEqual([{ id: "u1", name: "Sara Ali", start: 3, end: 12 }]);
    expect(visible(list())).toBe(false);
    expect(document.querySelector("output")!.textContent).toBe("1 mentioned");
  });

  it("a click on an option inserts it", async () => {
    await mount("mention-textarea");
    await type("@");
    options()[1]!.click();
    await tick();
    expect(area().value).toBe("@Omar Nasser ");
  });

  it("Escape only silences the current mention", async () => {
    await mount("mention-textarea");
    await type("@");
    await press("Escape");
    expect(visible(list())).toBe(false);
    await type("@o");
    expect(visible(list())).toBe(false);
    await type("@o x @");
    expect(visible(list())).toBe(true);
  });

  it("drops a mention when its text is edited", async () => {
    const host = await mount("mention-textarea");
    let detail: { mentions: { id: string }[] } | undefined;
    host.addEventListener("nq-mentions-change", (e) => (detail = (e as CustomEvent).detail));
    await type("@");
    await press("Enter");
    await tick();
    expect(detail!.mentions).toHaveLength(1);
    await type("@Sar Ali ");
    expect(detail!.mentions).toHaveLength(0);
  });

  it("closes on blur", async () => {
    await mount("mention-textarea");
    await type("@");
    expect(visible(list())).toBe(true);
    area().dispatchEvent(new FocusEvent("blur"));
    await tick();
    expect(visible(list())).toBe(false);
  });
});
