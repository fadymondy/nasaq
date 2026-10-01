// The Blade hover-card example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const card = () => document.querySelector<HTMLElement>('[data-slot="hover-card-content"]')!;

describe("hover-card (Blade example)", () => {
  it("opens after the delay on hover, stays open over the card, then closes", async () => {
    const host = await mount("hover-card");
    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]')!;
    expect(card().style.display).toBe("none");

    trigger.dispatchEvent(new Event("pointerenter"));
    await tick(200);
    expect(card().style.display).toBe("none");
    await tick(700);
    expect(card().style.display).not.toBe("none");
    expect(trigger.hasAttribute("data-popup-open")).toBe(true);

    trigger.dispatchEvent(new Event("pointerleave"));
    await tick(100);
    card().dispatchEvent(new Event("pointerenter"));
    await tick(400);
    expect(card().hasAttribute("data-open")).toBe(true);

    card().dispatchEvent(new Event("pointerleave"));
    await tick(700);
    expect(card().style.display).toBe("none");
  });

  it("ignores touch, opens on focus and closes on Escape", async () => {
    const host = await mount("hover-card");
    const trigger = host.querySelector<HTMLElement>('[data-slot="hover-card-trigger"]')!;
    const touch = new Event("pointerenter");
    Object.defineProperty(touch, "pointerType", { value: "touch" });
    trigger.dispatchEvent(touch);
    await tick(800);
    expect(card().style.display).toBe("none");

    trigger.dispatchEvent(new Event("focus"));
    await tick(800);
    expect(card().style.display).not.toBe("none");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(300);
    expect(card().style.display).toBe("none");
  });
});
