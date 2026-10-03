// The Blade plan-catalog-editor example (packages/php/examples/rendered/plan-catalog-editor.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const root = () => document.querySelector<HTMLElement>('[data-slot="plan-catalog-editor"]')!;
const status = () => root().querySelector<HTMLElement>('[data-slot="plan-catalog-toolbar"] [role="status"]')!;
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('[data-slot="button"]')];
const button = (text: string) => buttons().find((b) => b.textContent?.trim().includes(text))!;
const tab = (text: string) => [...document.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]')].find((t) => t.textContent?.includes(text))!;
const settle = async () => {
  await tick();
  await tick();
};

describe("plan-catalog-editor (Blade example)", () => {
  it("renders the toolbar, the tabs and the plan cards", async () => {
    await mount("plan-catalog-editor");
    expect(root()).toBeTruthy();
    expect(status().textContent).toContain("The catalog matches what is live.");
    expect(button("Review and apply").disabled).toBe(true);
    expect(["Plans", "Features", "Apps", "Pay as you go", "Bundles"].every((t) => !!tab(t))).toBe(true);
    const cards = [...document.querySelectorAll<HTMLElement>('[data-slot="plan-card"]')];
    expect(cards).toHaveLength(2);
    expect(cards[1]!.textContent).toContain("Team");
    expect(cards[1]!.textContent).toContain("$29");
    expect(cards[0]!.textContent).toContain("Free");
  });

  it("shows an unpublished count after an edit and discards it", async () => {
    await mount("plan-catalog-editor");
    tab("Apps").click();
    await settle();
    const input = [...document.querySelectorAll<HTMLInputElement>('input')].find((i) => i.value === "CRM")!;
    input.value = "CRM Pro";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(status().textContent).toContain("1 unpublished change");
    expect(button("Review and apply").disabled).toBe(false);
    button("Discard changes").click();
    await settle();
    expect(status().textContent).toContain("matches what is live");
  });

  it("previews the changes, then applies them through the host", async () => {
    await mount("plan-catalog-editor");
    tab("Apps").click();
    await settle();
    const input = [...document.querySelectorAll<HTMLInputElement>('input')].find((i) => i.value === "CRM")!;
    input.value = "CRM Pro";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    let applied: unknown = null;
    root().addEventListener("catalog-apply", (e) => {
      const d = (e as CustomEvent).detail;
      applied = d.draft;
      d.wait(Promise.resolve());
    });
    button("Review and apply").click();
    await settle();
    await settle();
    const dialog = document.querySelector<HTMLElement>('[data-slot="plan-catalog-preview"]')!;
    expect(dialog.textContent).toContain("1 updated");
    expect(dialog.querySelector('li[data-kind="updated"]')).toBeTruthy();
    const apply = button("Apply 1 change");
    expect(apply.disabled).toBe(false);
    apply.click();
    await settle();
    await settle();
    expect(applied).toBeTruthy();
    expect(root().textContent).toContain("Catalog applied");
  });
});
