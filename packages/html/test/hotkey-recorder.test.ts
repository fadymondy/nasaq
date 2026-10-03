// The Blade hotkey-recorder example (packages/php/examples/rendered/hotkey-recorder.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const root = () => document.querySelector<HTMLElement>('[data-slot="hotkey-recorder"]')!;
const button = () => root().querySelector<HTMLButtonElement>("button")!;
const caps = () => [...button().querySelectorAll('[data-slot="shortcut-keys"] kbd')].map((k) => k.textContent);
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const status = () => root().querySelector('[role="status"]')!.textContent;
const clearBtn = () => root().querySelector<HTMLButtonElement>('button[aria-label="Clear shortcut"]')!;
const resetBtn = () => root().querySelector<HTMLButtonElement>('button[aria-label="Reset to default"]')!;

async function key(init: KeyboardEventInit) {
  button().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  await tick();
}

describe("hotkey-recorder (Blade example)", () => {
  it("shows the saved shortcut as key caps with an accessible name", async () => {
    await mount("hotkey-recorder");
    expect(root().querySelector('[data-slot="shortcut-keys"] kbd')).not.toBeNull();
    expect(caps()).toEqual(["Ctrl", "K"]);
    expect(button().getAttribute("aria-label")).toBe("Command palette: Ctrl+K");
    expect(root().hasAttribute("data-recording")).toBe(false);
    expect(shown(clearBtn())).toBe(true);
    expect(shown(resetBtn())).toBe(false);
  });

  it("records a chord: Enter starts, the chord saves and bubbles nq-hotkey-change", async () => {
    await mount("hotkey-recorder");
    let detail: { value: string | null } | undefined;
    root().addEventListener("nq-hotkey-change", (e) => (detail = (e as CustomEvent).detail));
    await key({ key: "Enter" });
    expect(root().hasAttribute("data-recording")).toBe(true);
    expect(button().textContent).toContain("Press the keys");
    await key({ key: "Control", code: "ControlLeft", ctrlKey: true });
    expect(root().hasAttribute("data-recording")).toBe(true);
    await key({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
    expect(root().hasAttribute("data-recording")).toBe(false);
    expect(detail).toEqual({ value: "Mod+Shift+K" });
    expect(caps()).toEqual(["Shift", "Ctrl", "K"]);
    expect(status()).toBe("Shortcut set to Shift+Ctrl+K");
    expect(shown(resetBtn())).toBe(true);
  });

  it("refuses a bare key when a modifier is required, with an alert", async () => {
    await mount("hotkey-recorder");
    await key({ key: "Enter" });
    await key({ key: "j", code: "KeyJ" });
    const alert = root().querySelector<HTMLElement>('[role="alert"]')!;
    expect(shown(alert)).toBe(true);
    expect(alert.textContent).toContain("Add Ctrl, Alt or Command");
    expect(button().getAttribute("aria-invalid")).toBe("true");
    expect(button().getAttribute("aria-describedby")).toBeTruthy();
    expect(caps()).toEqual(["Ctrl", "K"]);
  });

  it("refuses a shortcut the browser keeps", async () => {
    await mount("hotkey-recorder");
    await key({ key: "Enter" });
    await key({ key: "w", code: "KeyW", ctrlKey: true });
    expect(root().querySelector('[role="alert"]')!.textContent).toContain("The browser keeps this shortcut");
    expect(caps()).toEqual(["Ctrl", "K"]);
  });

  it("Escape cancels, Backspace clears, and Reset restores the default", async () => {
    await mount("hotkey-recorder");
    await button().click();
    await tick();
    expect(root().hasAttribute("data-recording")).toBe(true);
    await key({ key: "Escape", code: "Escape" });
    expect(root().hasAttribute("data-recording")).toBe(false);
    expect(caps()).toEqual(["Ctrl", "K"]);
    await key({ key: " " });
    await key({ key: "Backspace", code: "Backspace" });
    expect(button().textContent).toContain("Not set");
    expect(button().getAttribute("aria-label")).toBe("Command palette: Not set");
    expect(status()).toBe("Shortcut cleared");
    expect(shown(resetBtn())).toBe(true);
    resetBtn().click();
    await tick();
    expect(caps()).toEqual(["Ctrl", "K"]);
  });

  it("the clear button clears", async () => {
    await mount("hotkey-recorder");
    clearBtn().click();
    await tick();
    expect(button().textContent).toContain("Not set");
  });
});
