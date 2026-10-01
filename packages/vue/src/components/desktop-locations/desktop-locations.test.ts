import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqDesktopLocationPicker, NqDesktopLocations, baseName, checkLocationPath, normalizePath, shortenPath, type DesktopLocation } from ".";
import { NasaqProvider } from "../../provider";

const ready: DesktopLocation = {
  id: "a",
  path: "C:\\Users\\sara\\projects\\app\\",
  status: "ready",
  permissions: { read: true, write: false, index: true },
  primary: true,
  fileCount: 12,
};
const missing: DesktopLocation = { id: "b", path: "/srv/gone", label: "Gone", status: "missing", permissions: { read: true, write: false, index: false } };

describe("path helpers", () => {
  it("normalises, names and checks paths", () => {
    expect(normalizePath("C:/a//b/")).toBe("C:\\a\\b");
    expect(baseName("D:\\Sites\\nasaq")).toBe("nasaq");
    expect(checkLocationPath("rel/x", []).problem).toBe("relative");
    expect(checkLocationPath("c:\\A", ["C:\\a"]).problem).toBe("duplicate");
    expect(checkLocationPath("/a/b", ["/a"]).warning).toBe("inside");
    expect(shortenPath("/a/b/c/d/e/f/g/h/i/j/k", 12)).toContain("\u2026");
  });
});

describe("NqDesktopLocations", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("dir");
    document.documentElement.lang = "en";
  });

  it("renders rows with status and state attributes", () => {
    const w = mount(NqDesktopLocations, { props: { locations: [ready, missing] } });
    expect(w.find('[data-slot="desktop-locations"]').exists()).toBe(true);
    const rows = w.findAll('[data-slot="desktop-location"]');
    expect(rows.map((r) => r.attributes("data-status"))).toEqual(["ready", "missing"]);
    expect(rows[0]!.text()).toContain("app");
    expect(rows[0]!.text()).toContain("Default");
    expect(rows[1]!.text()).toContain("Folder not found");
    expect(w.text()).toContain("2 folders");
  });

  it("shows the empty and loading states", () => {
    expect(mount(NqDesktopLocations, { props: { locations: [] } }).find('[data-slot="empty-state"]').exists()).toBe(true);
    expect(mount(NqDesktopLocations, { props: { locations: [], loading: true } }).find('[data-slot="loading-state"]').exists()).toBe(true);
  });

  it("renders Arabic strings", () => {
    const Host = { components: { NasaqProvider, NqDesktopLocations }, props: ["l"], template: `<NasaqProvider locale="ar"><NqDesktopLocations :locations="l" /></NasaqProvider>` };
    const h = mount(Host, { props: { l: [ready] } });
    expect(h.text()).toContain("المواقع على هذا الجهاز");
    h.unmount();
    localStorage.clear();
  });

  it("turning read off also turns off write and index, and an error shows", async () => {
    const onPermissionsChange = vi.fn(async () => ({ error: "Denied" }));
    const w = mount(NqDesktopLocations, { props: { locations: [{ ...ready, permissions: { read: true, write: true, index: true } }], onPermissionsChange }, attachTo: document.body });
    await w.findAll('[role="switch"]')[0]!.trigger("click");
    await flushPromises();
    expect(onPermissionsChange).toHaveBeenCalledWith("a", { read: false, write: false, index: false });
    expect(w.find('[role="alert"]').text()).toContain("Denied");
    w.unmount();
  });

  it("adds a folder through the dialog and keeps it open on an error", async () => {
    const onAdd = vi.fn(async () => ({ error: "No room" }));
    const w = mount(NqDesktopLocations, { props: { locations: [ready], onAdd }, attachTo: document.body });
    await w.find("header button").trigger("click");
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('input[dir="ltr"]')!;
    expect(input).toBeTruthy();
    input.value = "relative/path";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("blur"));
    await flushPromises();
    expect(document.body.textContent).toContain("Use a full path");
    input.value = "C:/work/new/";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    document.body.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onAdd).toHaveBeenCalledWith("C:\\work\\new", { read: true, write: false, index: true });
    expect(document.body.textContent).toContain("No room");
    w.unmount();
  });

  it("confirms before removing", async () => {
    const onRemove = vi.fn(async () => undefined);
    const w = mount(NqDesktopLocations, { props: { locations: [ready], onRemove }, attachTo: document.body });
    await w.find('button[aria-label="Remove app"]').trigger("click");
    await flushPromises();
    expect(onRemove).not.toHaveBeenCalled();
    const confirm = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Remove")!;
    confirm.click();
    await flushPromises();
    expect(onRemove).toHaveBeenCalledWith("a");
    w.unmount();
  });
});

describe("NqDesktopLocationPicker", () => {
  afterEach(() => localStorage.clear());

  it("renders a trigger and disables when nothing is usable", () => {
    const w = mount(NqDesktopLocationPicker, { props: { locations: [missing] } });
    expect(w.find('[role="combobox"]').attributes("aria-label")).toBe("Choose a location");
    expect(w.text()).toContain("No usable locations");
  });
});
