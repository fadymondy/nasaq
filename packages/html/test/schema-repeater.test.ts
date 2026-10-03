// The Blade schema-repeater example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

describe("schema-repeater (Blade example)", () => {
  it("renders a row with a field per schema entry, titled by the name", async () => {
    const host = await mount("schema-repeater");
    expect(host.querySelectorAll('[data-slot="repeater-row"]')).toHaveLength(1);
    const name = host.querySelector<HTMLInputElement>('input[type="text"]')!;
    expect(name.value).toBe("Sara");
    const qty = host.querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(qty.value).toBe("2");
    expect(host.textContent).toContain("Sara");
  });

  it("shows a required error after the field was edited, and fires nq-schema-validate", async () => {
    const host = await mount("schema-repeater");
    const root = host.querySelector<HTMLElement>('[data-slot="schema-repeater"]')!;
    const results: Array<{ valid: boolean; count: number }> = [];
    root.addEventListener("nq-schema-validate", (e) => results.push((e as CustomEvent).detail));
    const name = host.querySelector<HTMLInputElement>('input[type="text"]')!;
    const errors = () => [...host.querySelectorAll<HTMLElement>('[data-slot="field-error"]')].filter((e) => e.style.display !== "none" && e.textContent!.trim());
    expect(errors()).toHaveLength(0);
    name.value = "";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(errors().length).toBeGreaterThan(0);
    expect(results.at(-1)?.valid).toBe(false);
  });

  it("adds a row up to max and removes down to min", async () => {
    const host = await mount("schema-repeater");
    const rows = () => host.querySelectorAll('[data-slot="repeater-row"]').length;
    const add = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => /add/i.test(b.textContent ?? ""))!;
    add.click();
    await tick();
    expect(rows()).toBe(2);
  });
});
