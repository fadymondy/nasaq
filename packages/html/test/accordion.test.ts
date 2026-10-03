// The Blade accordion example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

describe("accordion (Blade example)", () => {
  it("renders the server state, then toggles one panel at a time", async () => {
    const host = await mount("accordion");
    const items = [...host.querySelectorAll<HTMLElement>('[data-slot="accordion-item"]')];
    const triggers = [...host.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')];
    const panels = [...host.querySelectorAll<HTMLElement>('[data-slot="accordion-panel"]')];
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("true");
    expect(triggers[0]!.hasAttribute("data-panel-open")).toBe(true);
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("false");
    expect(triggers[0]!.getAttribute("aria-controls")).toBe(panels[0]!.id);
    expect(panels[0]!.getAttribute("aria-labelledby")).toBe(triggers[0]!.id);
    expect(panels[0]!.getAttribute("role")).toBe("region");
    expect(panels[1]!.style.display).toBe("none");
    expect(items[0]!.hasAttribute("data-open")).toBe(true);
    expect(items[1]!.hasAttribute("data-closed")).toBe(true);

    triggers[1]!.click();
    await tick(300);
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("true");
    expect(panels[1]!.style.display).not.toBe("none");
    expect(panels[1]!.hasAttribute("data-open")).toBe(true);
    // single mode: the first closed
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(panels[0]!.style.display).toBe("none");
    expect(items[0]!.hasAttribute("data-closed")).toBe(true);

    // collapsible: clicking the open one closes it
    triggers[1]!.click();
    await tick(300);
    expect(triggers[1]!.getAttribute("aria-expanded")).toBe("false");
    expect(panels[1]!.style.display).toBe("none");
  });

  it("moves focus between triggers with the arrow keys and Home/End", async () => {
    const host = await mount("accordion");
    const triggers = [...host.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]')];
    triggers[0]!.focus();
    triggers[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(triggers[1]);
    triggers[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(triggers[0]);
    triggers[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(document.activeElement).toBe(triggers[1]);
    triggers[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.activeElement).toBe(triggers[0]);
  });
});
