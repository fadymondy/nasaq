// The Blade placement-settings example (packages/php/examples/rendered/placement-settings.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const root = () => document.querySelector<HTMLElement>('[data-slot="placement-settings"]')!;
const card = (mode: string) => document.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)!;
const orderInput = () => document.querySelector<HTMLInputElement>('input[type="number"]')!;
const state = () => {
  const el = document.querySelector<HTMLElement>('[data-slot="placement-state"]')!;
  return { textContent: [...el.children].filter((c) => (c as HTMLElement).style.display !== "none").map((c) => c.textContent?.trim()).join(" ") };
};
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('[data-slot="button"]')].find((b) => b.textContent?.includes(label))!;
const startSwitch = () => document.querySelector<HTMLButtonElement>('[data-slot="placement-default-page"] [role="switch"]')!;
const type = async (value: string) => {
  const input = orderInput();
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("placement-settings (Blade example)", () => {
  it("renders five mode cards with the saved one checked and overlays disabled", async () => {
    await mount("placement-settings");
    expect(document.querySelectorAll('[data-slot="radio-card"]')).toHaveLength(5);
    expect(document.querySelectorAll('[data-slot="placement-diagram"]')).toHaveLength(5);
    expect(card("sidebar").getAttribute("aria-checked")).toBe("true");
    expect(card("fixed").disabled).toBe(false);
    expect(orderInput().value).toBe("3");
    expect(root().hasAttribute("data-dirty")).toBe(false);
    expect(state().textContent?.trim()).toBe("All changes saved");
    expect(button("Save changes").disabled).toBe(true);
  });

  it("marks unsaved on a mode pick and saves only the changed fields", async () => {
    await mount("placement-settings");
    const saves: unknown[] = [];
    root().addEventListener("placement-save", (e) => saves.push((e as CustomEvent).detail.changes));
    card("header").click();
    await tick();
    expect(card("header").getAttribute("aria-checked")).toBe("true");
    expect(root().dataset.dirty).toBe("true");
    expect(state().textContent).toContain("Unsaved changes");
    button("Save changes").click();
    await tick();
    expect(saves).toEqual([{ mode: "header" }]);
    expect(root().hasAttribute("data-dirty")).toBe(false);
    expect(state().textContent?.trim()).toBe("All changes saved");
  });

  it("validates the order and discards back to the saved value", async () => {
    await mount("placement-settings");
    await type("abc");
    expect(orderInput().getAttribute("aria-invalid")).toBe("true");
    expect(document.body.textContent).toContain("Enter a whole number");
    expect(button("Save changes").disabled).toBe(true);
    button("Discard").click();
    await tick();
    expect(orderInput().value).toBe("3");
    expect(orderInput().hasAttribute("aria-invalid")).toBe(false);
    await type("9");
    expect(root().dataset.dirty).toBe("true");
  });

  it("turns the start page off and disables its switch for a mode without a page", async () => {
    await mount("placement-settings");
    startSwitch().click();
    await tick();
    expect(startSwitch().getAttribute("aria-checked")).toBe("true");
    card("hidden").click();
    await tick();
    expect(startSwitch().getAttribute("aria-checked")).toBe("false");
    expect(startSwitch().disabled).toBe(true);
    expect(document.body.textContent).toContain("Only items in the sidebar or header");
  });

  it("shows the failure when the save is answered with a message", async () => {
    await mount("placement-settings");
    root().addEventListener("placement-save", (e) => {
      e.preventDefault();
      (e as CustomEvent).detail.done("Server said no");
    });
    await type("5");
    button("Save changes").click();
    await tick();
    const alert = document.querySelector<HTMLElement>('[data-slot="alert"]')!;
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent).toContain("Server said no");
    expect(root().dataset.dirty).toBe("true");
  });
});
