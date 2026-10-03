// The Blade keyboard-shortcuts example (a dialog opened with "?") under real Alpine.
import { afterEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
afterEach(() => {
  delete document.documentElement.dataset.platform;
});

const press = (key: string, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, code: key === "?" ? "Slash" : `Key${key.toUpperCase()}`, shiftKey: key === "?", bubbles: true, cancelable: true }));
const dialog = () => document.querySelector<HTMLElement>('[data-slot="shortcuts-dialog"]');
const isOpen = () => dialog()?.hasAttribute("data-open") ?? false;
const items = () => [...document.querySelectorAll<HTMLElement>('[data-item]')].filter((li) => li.style.display !== "none").map((li) => li.dataset.item);
const search = () => document.querySelector<HTMLInputElement>('input[type="search"]')!;
const type = async (value: string) => {
  search().value = value;
  search().dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("keyboard-shortcuts (Blade example)", () => {
  it("renders closed: the dialog is hidden until ? is pressed", async () => {
    await mount("keyboard-shortcuts");
    expect(isOpen()).toBe(false);
  });

  it("opens with ? as a labelled modal holding the reference, and ? closes it again", async () => {
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    const content = dialog()!;
    expect(isOpen()).toBe(true);
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("aria-labelledby")).toBe(content.querySelector('[data-slot="dialog-title"]')!.id);
    expect(content.querySelector('[data-slot="dialog-title"]')!.textContent).toBe("Keyboard shortcuts");
    expect(content.querySelector('[data-slot="shortcuts-reference"]')).not.toBeNull();
    expect(content.querySelector('[data-slot="dialog-close"]')!.getAttribute("aria-label")).toBe("Close");
    press("?", content);
    await tick(400);
    expect(isOpen()).toBe(false);
  });

  it("ignores ? typed in a text field", async () => {
    await mount("keyboard-shortcuts");
    const input = document.createElement("input");
    document.body.append(input);
    press("?", input);
    await tick();
    expect(isOpen()).toBe(false);
  });

  it("closes with Escape and the close button", async () => {
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    dialog()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(400);
    expect(isOpen()).toBe(false);
    press("?");
    await tick();
    dialog()!.querySelector<HTMLElement>('[data-slot="dialog-close"]')!.click();
    await tick(400);
    expect(isOpen()).toBe(false);
  });

  it("lists the groups with both platforms' keys, the device's platform showing", async () => {
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    expect(items()).toEqual(["palette", "inbox"]);
    const palette = document.querySelector('[data-item="palette"]')!;
    const other = palette.querySelector<HTMLElement>('[data-keys="other"]')!;
    const mac = palette.querySelector<HTMLElement>('[data-keys="mac"]')!;
    expect(other.style.display).not.toBe("none");
    expect(mac.style.display).toBe("none");
    expect([...other.querySelectorAll('[data-slot="kbd"]')].map((k) => k.textContent)).toEqual(["Ctrl", "K"]);
    expect([...mac.querySelectorAll('[data-slot="kbd"]')].map((k) => k.textContent)).toEqual(["⌘", "K"]);
    expect(other.querySelector('[data-slot="shortcut-keys"]')!.getAttribute("aria-label")).toBe("Ctrl K");
    expect(mac.querySelector('[data-slot="shortcut-keys"]')!.getAttribute("aria-label")).toBe("Command K");
    const inbox = document.querySelector('[data-item="inbox"] [data-keys="other"] [data-slot="shortcut-keys"]')!;
    expect(inbox.getAttribute("aria-label")).toBe("G then I");
    expect(document.querySelector('[role="status"]')!.textContent).toBe("2 shortcuts");
  });

  it("filters while typing, announces the count and shows the empty state", async () => {
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    await type("inbox");
    expect(items()).toEqual(["inbox"]);
    expect(document.querySelector('[role="status"]')!.textContent).toBe("1 shortcut");
    await type("zzz");
    expect(items()).toEqual([]);
    const empty = document.querySelector<HTMLElement>('[data-slot="empty-state"]')!;
    expect(empty.style.display).not.toBe("none");
    expect(document.querySelector<HTMLElement>('[data-group="nav"]')!.style.display).toBe("none");
    await type("");
    expect(items()).toEqual(["palette", "inbox"]);
    expect(empty.style.display).toBe("none");
  });

  it("searches the raw keys and matches a whole group by its title", async () => {
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    await type("mod+k");
    expect(items()).toEqual(["palette"]);
    await type("navig");
    expect(items()).toEqual(["palette", "inbox"]);
  });

  it("switches to the Mac keys from the platform switch and keeps one pressed", async () => {
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    const toggles = [...document.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    expect(toggles.map((t) => t.textContent!.trim())).toEqual(["This device", "Mac", "Windows"]);
    expect(toggles[0]!.getAttribute("aria-pressed")).toBe("true");
    const seen: string[] = [];
    document.addEventListener("nq-platform-change", (e) => seen.push((e as CustomEvent).detail.platform), { once: true });
    toggles[1]!.click();
    await tick();
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(seen).toEqual(["mac"]);
    const palette = document.querySelector('[data-item="palette"]')!;
    expect(palette.querySelector<HTMLElement>('[data-keys="mac"]')!.style.display).not.toBe("none");
    expect(palette.querySelector<HTMLElement>('[data-keys="other"]')!.style.display).toBe("none");
    toggles[1]!.click();
    await tick();
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
    toggles[2]!.click();
    await tick();
    expect(palette.querySelector<HTMLElement>('[data-keys="other"]')!.style.display).not.toBe("none");
  });

  it("follows <html data-platform> for the device keys", async () => {
    document.documentElement.dataset.platform = "macos";
    await mount("keyboard-shortcuts");
    press("?");
    await tick();
    const palette = document.querySelector('[data-item="palette"]')!;
    expect(palette.querySelector<HTMLElement>('[data-keys="mac"]')!.style.display).not.toBe("none");
    expect(palette.querySelector<HTMLElement>('[data-keys="other"]')!.style.display).toBe("none");
  });
});
