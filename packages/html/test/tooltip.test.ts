// The Blade tooltip example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const tip = () => document.querySelector<HTMLElement>('[data-slot="tooltip-content"]')!;
const triggerOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="tooltip-trigger"]')!.firstElementChild as HTMLElement;

describe("tooltip (Blade example)", () => {
  it("shows on hover after the delay, describes the trigger and hides on leave", async () => {
    const host = await mount("tooltip");
    const trigger = triggerOf(host);
    expect(tip().style.display).toBe("none");

    trigger.dispatchEvent(new Event("pointerenter"));
    await tick(300);
    expect(tip().style.display).toBe("none");
    await tick(500);
    expect(tip().style.display).not.toBe("none");
    expect(tip().getAttribute("role")).toBe("tooltip");
    expect(tip().textContent).toBe("Settings");
    expect(trigger.getAttribute("aria-describedby")).toBe(tip().id);

    trigger.dispatchEvent(new Event("pointerleave"));
    await tick(300);
    expect(tip().style.display).toBe("none");
    expect(trigger.hasAttribute("aria-describedby")).toBe(false);
  });

  it("opens at once on focus and closes on Escape", async () => {
    const host = await mount("tooltip");
    const trigger = triggerOf(host);
    trigger.focus();
    await tick();
    expect(tip().style.display).not.toBe("none");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(300);
    expect(tip().style.display).toBe("none");
  });
});
