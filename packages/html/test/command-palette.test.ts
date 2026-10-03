// The Blade command-palette example under real Alpine (nqCommandPalette and nqSearchTrigger).
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const dialog = () => document.querySelector<HTMLElement>('[data-slot="command-palette"]')!;
const input = () => dialog().querySelector<HTMLInputElement>("input")!;
const options = () => [...dialog().querySelectorAll<HTMLElement>('[data-slot="command-item"]')].filter((o) => o.offsetParent !== null || true);
const labels = () => options().map((o) => o.querySelector("span.flex-1")!.textContent);
const type = async (value: string) => {
  input().value = value;
  input().dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("command-palette (Blade example)", () => {
  it("the search trigger opens the palette and the groups are ranked in section order", async () => {
    await mount("command-palette");
    expect(dialog().style.display).toBe("none");
    document.querySelector<HTMLElement>('[data-slot="search-trigger"]')!.click();
    await tick();
    expect(dialog().style.display).not.toBe("none");
    expect(labels()).toEqual(["Change status", "New issue", "Go to inbox", "Delete workspace"]);
    expect(options()[0]!.getAttribute("aria-selected")).toBe("true");
    expect(input().getAttribute("aria-activedescendant")).toBe("nq-cp-opt-0");
  });

  it("filters (keywords count), moves with the arrows and fires nq-command on Enter", async () => {
    await mount("command-palette");
    window.dispatchEvent(new CustomEvent("nq-command-palette-open"));
    await tick();
    await type("add");
    expect(labels()).toEqual(["New issue"]);
    await type("");
    let id = "";
    document.addEventListener("nq-command", (e) => {
      id = (e as CustomEvent).detail.id;
      e.preventDefault();
    });
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    expect(options()[1]!.getAttribute("aria-selected")).toBe("true");
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick();
    expect(id).toBe("new");
    expect(dialog().style.display).toBe("none");
  });

  it("a command with children opens a nested page; Backspace goes back; disabled items are skipped", async () => {
    await mount("command-palette");
    window.dispatchEvent(new CustomEvent("nq-command-palette-open"));
    await tick();
    options()[0]!.click();
    await tick();
    expect(labels()).toEqual(["Todo", "Done"]);
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));
    await tick();
    expect(labels()).toContain("New issue");
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await tick();
    expect(options()[3]!.getAttribute("aria-selected")).toBe("false");
    expect(options()[2]!.getAttribute("aria-selected")).toBe("true");
  });

  it("Ctrl+K toggles it and Escape closes it", async () => {
    await mount("command-palette");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", ctrlKey: true, bubbles: true, cancelable: true }));
    await tick();
    expect(dialog().style.display).not.toBe("none");
    dialog().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await tick();
    expect(dialog().style.display).toBe("none");
  });
});
