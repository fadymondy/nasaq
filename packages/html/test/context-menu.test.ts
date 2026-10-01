// The Blade context-menu example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const trigger = () => document.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]')!;
const popup = () => document.querySelector<HTMLElement>('[data-slot="context-menu-content"]');
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("context-menu (Blade example)", () => {
  it("is closed to start and opens on the contextmenu event", async () => {
    await mount("context-menu");
    expect(popup()!.style.display).toBe("none");
    trigger().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
    await tick();
    expect(popup()!.style.display).not.toBe("none");
    expect(popup()!.getAttribute("role")).toBe("menu");
  });

  it("moves with the arrows and closes on Escape", async () => {
    await mount("context-menu");
    trigger().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
    await tick();
    key(popup()!, "ArrowDown");
    const rows = [...popup()!.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    expect(document.activeElement).toBe(rows[0]);
    key(popup()!, "Escape");
    await tick();
    await new Promise((r) => setTimeout(r, 300));
    expect(popup()!.style.display).toBe("none");
  });
});
