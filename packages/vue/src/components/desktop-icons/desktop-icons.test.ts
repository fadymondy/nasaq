import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { DESKTOP_ICON_CELL, NqDesktopIconGrid, desktopIconSlot } from ".";

const items = [
  { id: "a", title: "Files", icon: h("i") },
  { id: "b", title: "Notes", icon: h("i") },
];

describe("desktopIconSlot", () => {
  it("fills columns top to bottom from the inline start", () => {
    const { w, h: ch, gap } = DESKTOP_ICON_CELL;
    expect(desktopIconSlot(0, 400)).toEqual({ x: gap, y: gap });
    expect(desktopIconSlot(1, 400)).toEqual({ x: gap, y: gap + ch });
    expect(desktopIconSlot(3, 400)).toEqual({ x: gap + w, y: gap });
  });
});

describe("NqDesktopIconGrid", () => {
  it("renders an auto grid of icons and selects on click", async () => {
    const w = mount(NqDesktopIconGrid, { props: { items } });
    expect(w.attributes("data-slot")).toBe("desktop-icon-grid");
    expect(w.attributes("data-free")).toBeUndefined();
    const icons = w.findAll('[data-slot="desktop-icon"]');
    expect(icons).toHaveLength(2);
    await icons[0]!.trigger("click");
    expect(w.find('[data-slot="desktop-icon"]').attributes("data-selected")).toBe("");
  });

  it("opens on double-click and on Enter", async () => {
    const w = mount(NqDesktopIconGrid, { props: { items } });
    const first = w.find('[data-slot="desktop-icon"]');
    await first.trigger("dblclick");
    await first.trigger("keydown", { key: "Enter" });
    expect(w.emitted("open")).toHaveLength(2);
  });

  it("goes free when @move is listened to and positions icons by inline-start", () => {
    const w = mount(NqDesktopIconGrid, { props: { items, onMove: () => {} } });
    expect(w.attributes("data-free")).toBe("");
    const pos = w.findAll('[data-slot="desktop-icon-position"]');
    expect(pos).toHaveLength(2);
    expect(pos[0]!.attributes("style")).toContain("inset-inline-start: 8px");
  });

  it("hides hiddenIds", () => {
    const w = mount(NqDesktopIconGrid, { props: { items, hiddenIds: ["a"] } });
    expect(w.findAll('[data-slot="desktop-icon"]')).toHaveLength(1);
  });
});
