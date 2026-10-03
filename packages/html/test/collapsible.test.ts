// The Blade collapsible example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

describe("collapsible (Blade example)", () => {
  it("starts closed, opens from the trigger and closes again", async () => {
    const host = await mount("collapsible");
    const root = host.querySelector<HTMLElement>('[data-slot="collapsible"]')!;
    const trigger = host.querySelector<HTMLElement>('[data-slot="collapsible-trigger"]')!;
    const panel = host.querySelector<HTMLElement>('[data-slot="collapsible-panel"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.style.display).toBe("none");
    expect(root.hasAttribute("data-closed")).toBe(true);

    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.hasAttribute("data-panel-open")).toBe(true);
    expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.style.display).not.toBe("none");
    expect(panel.hasAttribute("data-open")).toBe(true);
    expect(root.hasAttribute("data-open")).toBe(true);

    trigger.click();
    await tick(300);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("data-closed")).toBe(true);
    expect(panel.style.display).toBe("none");
  });
});
