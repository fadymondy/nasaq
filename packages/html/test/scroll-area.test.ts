// The Blade scroll-area example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

describe("scroll-area (Blade example)", () => {
  it("is a focusable named region and sizes the thumb from the scroll metrics", async () => {
    const host = await mount("scroll-area");
    const viewport = host.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!;
    const bar = host.querySelector<HTMLElement>('[data-slot="scroll-area-scrollbar"]')!;
    const thumb = host.querySelector<HTMLElement>('[data-slot="scroll-area-thumb"]')!;
    expect(viewport.getAttribute("role")).toBe("region");
    expect(viewport.getAttribute("aria-label")).toBe("Notes");
    expect(viewport.tabIndex).toBe(0);

    // jsdom has no layout: fake the metrics, then scroll.
    Object.defineProperty(viewport, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(viewport, "scrollHeight", { value: 400, configurable: true });
    Object.defineProperty(bar, "clientHeight", { value: 100, configurable: true });
    viewport.scrollTop = 150;
    viewport.dispatchEvent(new Event("scroll"));
    await tick();
    expect(bar.hidden).toBe(false);
    expect(thumb.style.height).toBe("25px");
    expect(thumb.style.transform).toBe("translateY(37.5px)");
    expect(bar.hasAttribute("data-scrolling")).toBe(true);
  });

  it("marks the scrollbars hovering while the pointer is over the area", async () => {
    const host = await mount("scroll-area");
    const root = host.querySelector<HTMLElement>('[data-slot="scroll-area"]')!;
    const bar = host.querySelector<HTMLElement>('[data-slot="scroll-area-scrollbar"]')!;
    root.dispatchEvent(new Event("pointerenter"));
    await tick();
    expect(bar.hasAttribute("data-hovering")).toBe(true);
    root.dispatchEvent(new Event("pointerleave"));
    await tick();
    expect(bar.hasAttribute("data-hovering")).toBe(false);
  });
});
