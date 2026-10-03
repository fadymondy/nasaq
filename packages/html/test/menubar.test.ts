// The Blade menubar example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const triggers = () => [...document.querySelectorAll<HTMLElement>('[data-slot="menubar-trigger"]')];
const popups = () => [...document.querySelectorAll<HTMLElement>('[data-slot="menubar-content"]')];

describe("menubar (Blade example)", () => {
  it("opens a menu on click", async () => {
    await mount("menubar");
    expect(triggers().length).toBeGreaterThan(1);
    expect(popups().every((p) => p.style.display === "none")).toBe(true);
    triggers()[0]!.click();
    await tick();
    expect(triggers()[0]!.getAttribute("aria-expanded")).toBe("true");
    expect(popups()[0]!.style.display).not.toBe("none");
  });

  it("switches menus with ArrowRight while open", async () => {
    await mount("menubar");
    triggers()[0]!.click();
    await tick();
    triggers()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await tick();
    expect(triggers()[1]!.getAttribute("aria-expanded")).toBe("true");
  });
});
