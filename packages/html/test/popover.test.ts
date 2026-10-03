// The Blade popover example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')!;

describe("popover (Blade example)", () => {
  it("opens as a labelled dialog, closes on Escape and returns focus to the trigger", async () => {
    const host = await mount("popover");
    const trigger = host.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!;
    expect(popup().style.display).toBe("none");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(popup().getAttribute("role")).toBe("dialog");
    expect(popup().hasAttribute("data-open")).toBe(true);
    expect(popup().getAttribute("aria-labelledby")).toBe(document.querySelector('[data-slot="popover-title"]')!.id);
    expect(popup().getAttribute("aria-describedby")).toBe(document.querySelector('[data-slot="popover-description"]')!.id);
    expect(document.activeElement).toBe(popup());

    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(300);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(popup().style.display).toBe("none");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes from its close button and on an outside click", async () => {
    const host = await mount("popover");
    const trigger = host.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!;
    trigger.click();
    await tick();
    document.querySelector<HTMLElement>('[data-slot="popover-close"]')!.click();
    await tick(300);
    expect(popup().style.display).toBe("none");

    trigger.click();
    await tick();
    // Alpine ignores outside clicks for elements with no layout, and jsdom has none.
    Object.defineProperty(popup(), "offsetWidth", { value: 100, configurable: true });
    document.body.click();
    await tick(300);
    expect(popup().style.display).toBe("none");
  });
});
