import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { hotkeyFormat, hotkeyParse, NqHotkeyBindings, NqHotkeyRecorder, type HotkeyBindingItem } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const button = (w: ReturnType<typeof mount>) => w.find<HTMLButtonElement>('[data-slot="hotkey-recorder"] button');
const key = (w: ReturnType<typeof mount>, init: KeyboardEventInit & { code?: string }) => button(w).trigger("keydown", init);

describe("hotkey logic", () => {
  it("round-trips a shortcut", () => {
    expect(hotkeyFormat(hotkeyParse("shift+mod+k")!)).toBe("Mod+Shift+K");
    expect(hotkeyParse("nonsense+")).toBeNull();
  });
});

describe("NqHotkeyRecorder", () => {
  it("renders the keys and an accessible name", () => {
    const w = mount(NqHotkeyRecorder, { props: { modelValue: "Mod+K", platform: "windows", label: "Command palette", class: "max-w-sm" } });
    expect(w.attributes("data-slot")).toBe("hotkey-recorder");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "flex-col", "max-w-sm"]));
    expect(button(w).attributes("aria-label")).toBe("Command palette: Ctrl+K");
    expect(w.find('[data-slot="shortcut-keys"]').exists()).toBe(true);
    expect(w.find('button[aria-label="Clear shortcut"]').exists()).toBe(true);
  });

  it("shows Not set and a record label when empty", () => {
    const w = mount(NqHotkeyRecorder, { props: { platform: "windows" } });
    expect(w.text()).toContain("Not set");
    expect(button(w).attributes("aria-label")).toBe("Record a shortcut");
    expect(w.find('button[aria-label="Clear shortcut"]').exists()).toBe(false);
  });

  it("records a chord on Enter, then keys, and emits v-model", async () => {
    const w = mount(NqHotkeyRecorder, { props: { platform: "windows" }, attachTo: document.body });
    await key(w, { key: "Enter" });
    expect(w.attributes("data-recording")).toBeDefined();
    expect(w.text()).toContain("Press the keys");
    await key(w, { key: "Control", code: "ControlLeft", ctrlKey: true });
    expect(w.attributes("data-recording")).toBeDefined();
    await key(w, { key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
    expect(w.attributes("data-recording")).toBeUndefined();
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual(["Mod+Shift+K"]);
    expect(button(w).attributes("aria-label")).toBe("Change shortcut");
    expect(w.find('[role="status"]').text()).toBe("Shortcut set to Shift+Ctrl+K");
  });

  it("Escape cancels and Backspace clears", async () => {
    const w = mount(NqHotkeyRecorder, { props: { defaultValue: "Mod+K", platform: "windows" } });
    await button(w).trigger("click");
    await key(w, { key: "Escape", code: "Escape" });
    expect(w.emitted("update:modelValue")).toBeUndefined();
    expect(w.attributes("data-recording")).toBeUndefined();
    await button(w).trigger("click");
    await key(w, { key: "Backspace", code: "Backspace" });
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual([null]);
    expect(w.text()).toContain("Not set");
  });

  it("refuses a bare key when a modifier is required", async () => {
    const w = mount(NqHotkeyRecorder, { props: { requireModifier: true, platform: "windows" } });
    await button(w).trigger("click");
    await key(w, { key: "k", code: "KeyK" });
    expect(w.emitted("update:modelValue")).toBeUndefined();
    expect(w.find('[role="alert"]').text()).toContain("Add Ctrl, Alt or Command");
    expect(button(w).attributes("aria-invalid")).toBe("true");
    expect(button(w).attributes("data-invalid")).toBeDefined();
  });

  it("refuses shortcuts the browser keeps unless allowed", async () => {
    const w = mount(NqHotkeyRecorder, { props: { platform: "windows" } });
    await button(w).trigger("click");
    await key(w, { key: "w", code: "KeyW", ctrlKey: true });
    expect(w.emitted("update:modelValue")).toBeUndefined();
    expect(w.find('[role="alert"]').text()).toContain("The browser keeps this shortcut");
    const ok = mount(NqHotkeyRecorder, { props: { platform: "windows", allowReserved: true } });
    await button(ok).trigger("click");
    await key(ok, { key: "w", code: "KeyW", ctrlKey: true });
    expect(ok.emitted("update:modelValue")!.at(-1)).toEqual(["Mod+W"]);
  });

  it("records a sequence until Enter", async () => {
    const w = mount(NqHotkeyRecorder, { props: { sequence: true, platform: "windows" } });
    await button(w).trigger("click");
    expect(w.text()).toContain("Press the keys, then Enter");
    await key(w, { key: "g", code: "KeyG" });
    await key(w, { key: "i", code: "KeyI" });
    expect(w.emitted("update:modelValue")).toBeUndefined();
    await key(w, { key: "Enter", code: "Enter" });
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual(["G I"]);
  });

  it("warns about a clash with another binding", () => {
    const w = mount(NqHotkeyRecorder, {
      props: {
        modelValue: "Mod+K",
        platform: "windows",
        bindingId: "palette",
        bindings: [
          { id: "palette", shortcut: "Mod+K", label: "Palette" },
          { id: "search", shortcut: "Ctrl+K", label: "Search" },
        ],
      },
    });
    const li = w.find('[data-conflict="duplicate"]');
    expect(li.text()).toBe("Already used by Search.");
    expect(button(w).attributes("aria-describedby")).toBe(w.find("ul").attributes("id"));
  });

  it("resets to the default", async () => {
    const w = mount(NqHotkeyRecorder, { props: { modelValue: "Mod+J", resetTo: "Mod+K", platform: "windows" } });
    await w.find('button[aria-label="Reset to default"]').trigger("click");
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual(["Mod+K"]);
  });

  it("does not record when disabled", async () => {
    const w = mount(NqHotkeyRecorder, { props: { disabled: true, modelValue: "Mod+K", platform: "windows" } });
    expect(button(w).attributes("disabled")).toBeDefined();
    await button(w).trigger("click");
    expect(w.attributes("data-recording")).toBeUndefined();
    expect(w.find('button[aria-label="Clear shortcut"]').exists()).toBe(false);
  });

  it("speaks Arabic", async () => {
    document.documentElement.lang = "ar";
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqHotkeyRecorder, { platform: "windows" })) });
    await flushPromises();
    expect(w.text()).toContain("غير محدد");
    expect(w.find("button").attributes("aria-label")).toBe("سجّل اختصارًا");
  });
});

describe("NqHotkeyBindings", () => {
  const items: HotkeyBindingItem[] = [
    { id: "palette", label: "Command palette", group: "General", shortcut: "Mod+K", defaultShortcut: "Mod+K" },
    { id: "save", label: "Save", labelAr: "حفظ", group: "General", shortcut: "Mod+S", defaultShortcut: "Mod+Alt+S" },
    { id: "close", label: "Close dialog", group: "Dialogs", shortcut: "Escape", locked: true },
  ];

  it("groups the list, locks a row and offers Reset all when something differs", async () => {
    const changes: [string, string | null][] = [];
    const w = mount(NqHotkeyBindings, { props: { bindings: items, platform: "windows", onChange: (id: string, s: string | null) => void changes.push([id, s]) } });
    expect(w.attributes("data-slot")).toBe("hotkey-bindings");
    expect(w.findAll("section h3").map((h) => h.text())).toEqual(["General", "Dialogs"]);
    expect(w.findAll("li[data-binding]")).toHaveLength(3);
    expect(w.find('[data-binding="close"] button').attributes("disabled")).toBeDefined();
    const reset = w.findAll("button").find((b) => b.text() === "Reset all")!;
    await reset.trigger("click");
    expect(changes).toEqual([["save", "Mod+Alt+S"]]);
  });

  it("shows the error an onChange resolves", async () => {
    const w = mount(NqHotkeyBindings, { props: { bindings: items, platform: "windows", onChange: async () => ({ error: "Taken" }) } });
    const row = w.find('[data-binding="palette"] button');
    await row.trigger("click");
    await row.trigger("keydown", { key: "j", code: "KeyJ", ctrlKey: true });
    await flushPromises();
    expect(w.find('p[role="alert"]').text()).toBe("Taken");
  });
});
