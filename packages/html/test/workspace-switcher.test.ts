// The Blade workspace-switcher example under real Alpine: it reuses nqDropdownMenu (no module of its own).
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const trigger = () => document.querySelector<HTMLElement>('[data-slot="workspace-switcher"]')!;
const popup = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')!;
const items = () => [...popup().querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
const visible = (el: HTMLElement) => el.style.display !== "none";

describe("workspace-switcher (Blade example)", () => {
  it("shows the active workspace with its description", async () => {
    await mount("workspace-switcher");
    const shown = [...trigger().querySelectorAll<HTMLElement>("[data-workspace]")].filter(visible);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.textContent).toContain("3x1");
    expect(shown[0]!.textContent).toContain("Pro · 12 members");
  });

  it("lists the workspaces, marks the current one and switches on click", async () => {
    const host = await mount("workspace-switcher");
    trigger().click();
    await tick();
    expect(items().map((i) => i.dataset.workspace)).toEqual(["3x1", "personal", undefined]);
    expect(items()[0]!.getAttribute("aria-current")).toBe("true");
    expect(items()[1]!.hasAttribute("aria-current")).toBe(false);
    items()[1]!.click();
    await tick();
    const outer = Alpine.$data(host.querySelector("[x-data]")!) as { workspace: string };
    expect(outer.workspace).toBe("personal");
    const shown = [...trigger().querySelectorAll<HTMLElement>("[data-workspace]")].filter(visible);
    expect(shown[0]!.dataset.workspace).toBe("personal");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("has an Add workspace item that dispatches nq-workspace-create", async () => {
    await mount("workspace-switcher");
    let fired = 0;
    window.addEventListener("nq-workspace-create", () => fired++, { once: true });
    trigger().click();
    await tick();
    const add = items().find((i) => i.textContent?.includes("Add workspace"))!;
    expect(add).toBeTruthy();
    add.click();
    expect(fired).toBe(1);
  });
});
