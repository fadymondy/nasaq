import { flushPromises, enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqCopilotDock } from ".";

enableAutoUnmount(afterEach);
afterEach(() => {
  document.documentElement.lang = "";
  document.documentElement.removeAttribute("dir");
  window.localStorage.clear();
});

const messages = [{ id: "u1", role: "user" as const, text: "Hi" }];
const base = { messages: [], onSend: vi.fn() };

describe("NqCopilotDock", () => {
  it("starts closed with a launcher and a hidden panel", () => {
    const w = mount(NqCopilotDock, { props: base, attachTo: document.body });
    const launcher = w.find("[data-slot=copilot-dock-launcher]");
    expect(launcher.exists()).toBe(true);
    expect(launcher.attributes("aria-expanded")).toBe("false");
    const panel = w.find("[data-slot=copilot-dock]");
    expect(panel.attributes("hidden")).toBeDefined();
    expect(panel.attributes("data-side")).toBe("end");
    expect(panel.attributes("role")).toBe("complementary");
    expect(w.find("[data-slot=copilot-chat]").exists()).toBe(false);
  });

  it("opens from the launcher and shows the chat in panel mode", async () => {
    const w = mount(NqCopilotDock, { props: base, attachTo: document.body });
    await w.find("[data-slot=copilot-dock-launcher]").trigger("click");
    const panel = w.find("[data-slot=copilot-dock]");
    expect(panel.attributes("hidden")).toBeUndefined();
    expect(panel.attributes("data-open")).toBeDefined();
    expect(w.find("[data-slot=copilot-chat]").attributes("data-mode")).toBe("panel");
    expect(w.find("[data-slot=copilot-dock-launcher]").exists()).toBe(false);
  });

  it("toggles with Ctrl+J and closes on Escape", async () => {
    const w = mount(NqCopilotDock, { props: base, attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await flushPromises();
    expect(w.find("[data-slot=copilot-dock]").attributes("data-open")).toBeDefined();
    await w.find("[data-slot=copilot-dock]").trigger("keydown", { key: "Escape" });
    expect(w.find("[data-slot=copilot-dock]").attributes("data-open")).toBeUndefined();
  });

  it("hotkey false turns the shortcut off", async () => {
    const w = mount(NqCopilotDock, { props: { ...base, hotkey: false }, attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await flushPromises();
    expect(w.find("[data-slot=copilot-dock]").attributes("data-open")).toBeUndefined();
  });

  it("expands to the page and back", async () => {
    const w = mount(NqCopilotDock, { props: { ...base, defaultOpen: true }, attachTo: document.body });
    const expand = w.find("[data-slot=copilot-dock-expand]");
    expect(expand.attributes("aria-pressed")).toBe("false");
    await expand.trigger("click");
    const panel = w.find("[data-slot=copilot-dock]");
    expect(panel.attributes("data-expanded")).toBeDefined();
    expect(panel.classes()).toContain("inset-0");
    expect(w.find("[data-slot=copilot-chat]").attributes("data-mode")).toBe("page");
    await panel.trigger("keydown", { key: "Escape" });
    expect(w.find("[data-slot=copilot-dock]").attributes("data-expanded")).toBeUndefined();
    expect(w.find("[data-slot=copilot-dock]").attributes("data-open")).toBeDefined();
  });

  it("is controlled through v-model:open and side", async () => {
    const w = mount(NqCopilotDock, { props: { ...base, open: true, side: "bottom" }, attachTo: document.body });
    expect(w.find("[data-slot=copilot-dock]").attributes("data-side")).toBe("bottom");
    expect(w.find("[data-slot=copilot-dock]").classes()).toContain("inset-x-0");
    await w.find("[data-slot=copilot-chat] button[aria-label='Close assistant']").exists();
    const close = w.findAll("[data-slot=copilot-chat] header button").at(-1)!;
    await close.trigger("click");
    expect(w.emitted("update:open")?.at(-1)).toEqual([false]);
  });

  it("remembers the side under persistKey", async () => {
    window.localStorage.setItem("dock", "start");
    const w = mount(NqCopilotDock, { props: { ...base, persistKey: "dock" }, attachTo: document.body });
    await flushPromises();
    expect(w.find("[data-slot=copilot-dock]").attributes("data-side")).toBe("start");
  });

  it("collapsedBar sends the typed text and opens", async () => {
    const onSend = vi.fn();
    const w = mount(NqCopilotDock, { props: { messages, onSend, collapsedBar: true }, attachTo: document.body });
    expect(w.find("[data-slot=copilot-dock-launcher]").exists()).toBe(false);
    const bar = w.find("[data-slot=copilot-dock-bar]");
    await bar.find("input").setValue("Summarise");
    await bar.trigger("submit");
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]![0]).toBe("Summarise");
    expect(w.find("[data-slot=copilot-dock]").attributes("data-open")).toBeDefined();
  });

  it("speaks Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqCopilotDock }, template: `<NasaqProvider locale="ar"><NqCopilotDock :messages="[]" :on-send="() => {}" /></NasaqProvider>` }, { attachTo: document.body });
    expect(w.find("[data-slot=copilot-dock-launcher]").attributes("aria-label")).toBe("افتح المساعد");
  });
});
