// The Blade limits-editor example (packages/php/examples/rendered/limits-editor.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="limits-editor-row"]')];
const modeBtn = (row: HTMLElement, label: string) => [...row.querySelectorAll<HTMLButtonElement>('[data-slot="toggle"]')].find((b) => b.textContent?.trim() === label)!;
const numberInput = (row: HTMLElement) => row.querySelector<HTMLInputElement>('input[type="number"]')!;
const status = () => document.querySelector<HTMLElement>('[role="status"]')!;
const saveBtn = () => [...document.querySelectorAll<HTMLButtonElement>('[data-slot="button"]')].find((b) => b.textContent?.includes("Save limits"))!;
const form = () => document.querySelector<HTMLFormElement>('[data-slot="limits-editor"]')!;

describe("limits-editor (Blade example)", () => {
  it("renders a row per resource with its mode and inherited text", async () => {
    await mount("limits-editor");
    const [seats, storage] = rows() as [HTMLElement, HTMLElement];
    expect(rows()).toHaveLength(2);
    expect(seats.dataset.mode).toBe("limit");
    expect(numberInput(seats).value).toBe("25");
    expect(modeBtn(seats, "Limit").getAttribute("aria-pressed")).toBe("true");
    expect(storage.dataset.mode).toBe("inherit");
    expect(storage.textContent).toContain("Inherits 100 GB");
  });

  it("switches mode, counts unsaved changes and shows Unlimited", async () => {
    await mount("limits-editor");
    const seats = rows()[0]!;
    expect(status().textContent).toBe("");
    modeBtn(seats, "Unlimited").click();
    await tick();
    expect(seats.dataset.mode).toBe("unlimited");
    expect(seats.hasAttribute("data-changed")).toBe(true);
    expect(modeBtn(seats, "Unlimited").getAttribute("aria-pressed")).toBe("true");
    expect(status().textContent).toBe("1 unsaved change");
  });

  it("blocks saving until a limit is valid", async () => {
    await mount("limits-editor");
    const seats = rows()[0]!;
    const input = numberInput(seats);
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    let saved = 0;
    form().addEventListener("limits-save", () => saved++);
    form().dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(saved).toBe(0);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(seats.querySelector('[data-slot="field-error"]')!.textContent).toContain("Enter a limit");
  });

  it("saves through limits-save and reports Saved", async () => {
    await mount("limits-editor");
    const seats = rows()[0]!;
    const input = numberInput(seats);
    input.value = "40";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    let detail: { rules: Record<string, { value?: number }> } | null = null;
    form().addEventListener("limits-save", (e) => {
      detail = (e as CustomEvent).detail;
    });
    form().dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(detail!.rules.seats!.value).toBe(40);
    expect(status().textContent).toBe("Saved");
    expect(saveBtn().disabled).toBe(true);
  });
});
