import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NqDesktopAppIcon, NqDesktopShell } from ".";
import { cascadeRect, openWindow, snapZone, toggleMaximise } from "./desktop-math";

const apps = [
  { id: "files", title: "Files", icon: h(NqDesktopAppIcon), content: h("p", "Files body"), single: true },
  { id: "notes", title: "Notes", icon: h(NqDesktopAppIcon), content: h("p", "Notes body") },
];

describe("desktop math", () => {
  it("opens a single-instance app once and cascades others", () => {
    const b = { w: 1000, h: 600 };
    const one = openWindow([], b, { appId: "files", single: true });
    expect(openWindow(one, b, { appId: "files", single: true })).toHaveLength(1);
    expect(openWindow(one, b, { appId: "notes" })).toHaveLength(2);
    expect(cascadeRect(0, { w: 640, h: 420 }, b).w).toBe(640);
  });
  it("maximises and restores; snaps by zone", () => {
    const b = { w: 1000, h: 600 };
    const [w] = openWindow([], b, { appId: "files" });
    const max = toggleMaximise([w!], w!.id, b);
    expect(max[0]!.maximised).toBe(true);
    expect(toggleMaximise(max, w!.id, b)[0]!.maximised).toBe(false);
    expect(snapZone({ x: 500, y: 2 }, b)).toBe("top");
    expect(snapZone({ x: 2, y: 300 }, b)).toBe("start");
  });
});

describe("NqDesktopShell", () => {
  it("renders the menu bar, dock and desktop region, and opens an app from the dock", async () => {
    const w = mount(NqDesktopShell, { props: { apps }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("desktop-shell");
    expect(w.find('[data-slot="desktop-menu-bar"]').exists()).toBe(true);
    expect(w.find('[data-slot="desktop-dock"]').exists()).toBe(true);
    expect(w.find('[data-slot="desktop-window"]').exists()).toBe(false);
    await w.find('[data-slot="desktop-dock"] button[aria-label="Files"]').trigger("click");
    const win = w.find('[data-slot="desktop-window"]');
    expect(win.exists()).toBe(true);
    expect(win.attributes("aria-label")).toBe("Files");
    expect(win.text()).toContain("Files body");
    expect(w.find('button[aria-label="Files"]').attributes("data-running")).toBe("");
    w.unmount();
  });

  it("closes a window with its close button and emits update:windows", async () => {
    const w = mount(NqDesktopShell, { props: { apps }, attachTo: document.body });
    await w.find('button[aria-label="Notes"]').trigger("click");
    await w.find('[data-slot="desktop-window-title"] button[aria-label="Close"]').trigger("click");
    expect(w.find('[data-slot="desktop-window"]').exists()).toBe(false);
    expect(w.emitted("update:windows")!.length).toBeGreaterThanOrEqual(2);
    w.unmount();
  });

  it("the default slot gets open()", async () => {
    const w = mount(NqDesktopShell, {
      props: { apps },
      slots: { default: (api: { open: (id: string) => void }) => h("button", { id: "go", onClick: () => api.open("notes") }, "go") },
      attachTo: document.body,
    });
    await w.find("#go").trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="desktop-window"]').attributes("aria-label")).toBe("Notes");
    w.unmount();
  });

  it("the launchpad button opens a searchable grid", async () => {
    const w = mount(NqDesktopShell, { props: { apps }, attachTo: document.body });
    await w.find('button[aria-label="Launchpad"]').trigger("click");
    expect(w.find('[data-slot="desktop-launchpad"]').exists()).toBe(true);
    await w.find('[data-slot="desktop-launchpad"] input').setValue("zzz");
    expect(w.find('[data-slot="desktop-launchpad"]').text()).toContain("No apps match");
    w.unmount();
  });
});
