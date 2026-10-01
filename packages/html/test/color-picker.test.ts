// The Blade color-picker example under real Alpine.
import { describe, expect, it } from "vitest";
import { normalizeHexColor } from "../src/alpine/color-picker";
import { mount, setup, tick } from "./_float-setup";

setup();
const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')!;
const swatches = () => [...document.querySelectorAll<HTMLElement>('[data-slot="color-picker-swatch"]')];
const hex = () => document.querySelector<HTMLInputElement>('[data-slot="color-picker-hex"]')!;
const type = (el: HTMLInputElement, text: string) => {
  el.value = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

async function open() {
  const host = await mount("color-picker");
  const trigger = host.querySelector<HTMLElement>('[data-slot="color-picker-trigger"]')!;
  trigger.click();
  await tick();
  return { host, trigger };
}

describe("normalizeHexColor", () => {
  it("expands shorthand, lower-cases and rejects non-hex text", () => {
    expect(normalizeHexColor("1A73E8")).toBe("#1a73e8");
    expect(normalizeHexColor("#abc")).toBe("#aabbcc");
    expect(normalizeHexColor("#abcd")).toBeNull();
    expect(normalizeHexColor("blue")).toBeNull();
  });
});

describe("color-picker (Blade example)", () => {
  it("shows the chosen swatch's name and labels the trigger", async () => {
    const host = await mount("color-picker");
    const trigger = host.querySelector<HTMLElement>('[data-slot="color-picker-trigger"]')!;
    expect(trigger.textContent).toContain("Teal");
    expect(trigger.getAttribute("aria-label")).toBe("Label colour: Teal");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    const chip = trigger.querySelector<HTMLElement>('[data-slot="color-picker-chip"]')!;
    expect(chip.style.backgroundColor).toBe("var(--nq-tag-teal)");
  });

  it("opens a radio group with the chosen swatch checked and a roving tab stop", async () => {
    const { trigger } = await open();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(popup().getAttribute("role")).toBe("dialog");
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(swatches()).toHaveLength(9);
    const teal = swatches().find((s) => s.dataset.value === "--nq-tag-teal")!;
    expect(teal.getAttribute("aria-checked")).toBe("true");
    expect(teal.hasAttribute("data-checked")).toBe(true);
    expect(teal.tabIndex).toBe(0);
    const red = swatches().find((s) => s.dataset.value === "--nq-tag-red")!;
    expect(red.getAttribute("aria-checked")).toBe("false");
    expect(red.hasAttribute("data-unchecked")).toBe(true);
    expect(red.tabIndex).toBe(-1);
    expect(hex().value).toBe("");
  });

  it("picks a swatch and updates the trigger", async () => {
    const { trigger } = await open();
    swatches().find((s) => s.dataset.value === "--nq-tag-red")!.click();
    await tick();
    expect(trigger.textContent).toContain("Red");
    expect(trigger.getAttribute("aria-label")).toBe("Label colour: Red");
    expect(swatches().find((s) => s.dataset.value === "--nq-tag-red")!.getAttribute("aria-checked")).toBe("true");
    expect(swatches().find((s) => s.dataset.value === "--nq-tag-teal")!.getAttribute("aria-checked")).toBe("false");
  });

  it("moves the choice with the arrow keys (physical, in a radio group)", async () => {
    const { trigger } = await open();
    const teal = swatches().find((s) => s.dataset.value === "--nq-tag-teal")!;
    teal.focus();
    teal.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick();
    expect(trigger.textContent).toContain("Blue");
    expect(document.activeElement).toBe(swatches().find((s) => s.dataset.value === "--nq-tag-blue"));
  });

  it("applies a complete hex as you type, shorthand on Enter, and flags bad input on blur", async () => {
    const { trigger } = await open();
    type(hex(), "#1a73e8");
    await tick();
    expect(trigger.textContent).toContain("#1a73e8");
    expect(trigger.querySelector<HTMLElement>('[data-slot="color-picker-chip"]')!.style.backgroundColor).not.toBe("");

    type(hex(), "#f00");
    await tick();
    expect(trigger.textContent).toContain("#1a73e8");
    hex().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(trigger.textContent).toContain("#ff0000");
    expect(hex().value).toBe("#ff0000");

    type(hex(), "zzz");
    hex().dispatchEvent(new FocusEvent("blur"));
    await tick();
    const error = document.querySelector<HTMLElement>('[data-slot="color-picker-error"]')!;
    expect(error.style.display).not.toBe("none");
    expect(error.getAttribute("role")).toBe("alert");
    expect(hex().getAttribute("aria-invalid")).toBe("true");
    expect(trigger.textContent).toContain("#ff0000");
  });

  it("closes on Escape", async () => {
    const { trigger } = await open();
    trigger.focus();
    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(300);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(popup().style.display).toBe("none");
  });
});
