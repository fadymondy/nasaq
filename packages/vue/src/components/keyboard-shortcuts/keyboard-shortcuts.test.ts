import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqShortcutKeys, NqShortcutsDialog, NqShortcutsReference, shortcutItemKeys, type ShortcutGroup } from ".";

const groups: ShortcutGroup[] = [
  {
    id: "nav",
    title: "Navigation",
    titleAr: "التنقل",
    items: [
      { id: "palette", label: "Open the command palette", labelAr: "فتح لوحة الأوامر", keys: "Mod+K" },
      { id: "inbox", label: "Go to inbox", labelAr: "الانتقال إلى الوارد", keys: "G I", apple: "G I" },
    ],
  },
  { id: "edit", title: "Editing", items: [{ id: "save", label: "Save", keys: ["Mod+S", "Ctrl+Alt+S"], apple: "Mod+Alt+S" }] },
];

afterEach(() => {
  document.body.innerHTML = "";
  delete document.documentElement.dataset.platform;
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("NqShortcutKeys", () => {
  it("draws Ctrl on Windows and Command glyphs on a Mac, with one spoken label", () => {
    const win = mount(NqShortcutKeys, { props: { shortcut: "Mod+Shift+K", platform: "windows" } });
    expect(win.attributes("data-slot")).toBe("shortcut-keys");
    expect(win.attributes("role")).toBe("img");
    expect(win.attributes("dir")).toBe("ltr");
    expect(win.attributes("aria-label")).toBe("Shift Ctrl K");
    expect(win.findAll('[data-slot="kbd"]').map((k) => k.text())).toEqual(["Shift", "Ctrl", "K"]);
    const mac = mount(NqShortcutKeys, { props: { shortcut: "Mod+Shift+K", platform: "mac" } });
    expect(mac.findAll('[data-slot="kbd"]').map((k) => k.text())).toEqual(["⇧", "⌘", "K"]);
    expect(mac.attributes("aria-label")).toBe("Shift Command K");
  });

  it("joins sequence steps with the then word, in Arabic too", () => {
    const w = mount(NqShortcutKeys, { props: { shortcut: "G I", platform: "windows" } });
    expect(w.attributes("aria-label")).toBe("G then I");
    const ar = mount(NasaqProvider, { props: { defaultLocale: "ar" }, slots: { default: () => h(NqShortcutKeys, { shortcut: "G I", platform: "windows" }) } });
    expect(ar.find('[data-slot="shortcut-keys"]').attributes("aria-label")).toBe("G ثم I");
  });

  it("falls back to plain text for a string that does not parse", () => {
    const w = mount(NqShortcutKeys, { props: { shortcut: "Mod+" } });
    expect(w.find('[data-slot="shortcut-keys"]').exists()).toBe(false);
    expect(w.text()).toBe("Mod+");
  });

  it("merges a user class last", () => {
    const w = mount(NqShortcutKeys, { props: { shortcut: "K", class: "gap-x-4" } });
    expect(w.classes()).toContain("gap-x-4");
    expect(w.classes()).not.toContain("gap-x-1.5");
  });
});

describe("shortcutItemKeys", () => {
  it("uses the apple keys only on a Mac", () => {
    const item = groups[1]!.items[0]!;
    expect(shortcutItemKeys(item, false)).toEqual(["Mod+S", "Ctrl+Alt+S"]);
    expect(shortcutItemKeys(item, true)).toEqual(["Mod+Alt+S"]);
  });
});

describe("NqShortcutsReference", () => {
  it("renders titled groups, the search box, the platform switch and a result count", () => {
    const w = mount(NqShortcutsReference, { props: { groups } });
    expect(w.attributes("data-slot")).toBe("shortcuts-reference");
    expect(w.find("h2").text()).toBe("Keyboard shortcuts");
    expect(w.findAll('[role="group"][data-group]').map((g) => g.attributes("data-group"))).toEqual(["nav", "edit"]);
    expect(w.find('input[type="search"]').attributes("aria-label")).toBe("Search shortcuts");
    expect(w.findAll('[data-slot="toggle"]').map((t) => t.text())).toEqual(["This device", "Mac", "Windows"]);
    expect(w.find('[role="status"]').text()).toBe("3 shortcuts");
    expect(w.attributes("aria-labelledby")).toBe(w.find("h2").attributes("id"));
  });

  it("hides the heading with title null and the controls when switched off", () => {
    const w = mount(NqShortcutsReference, { props: { groups, title: null, searchable: false, showPlatformSwitch: false } });
    expect(w.find("h2").exists()).toBe(false);
    expect(w.find("input").exists()).toBe(false);
    expect(w.find('[data-slot="toggle-group"]').exists()).toBe(false);
  });

  it("filters while typing and shows the empty state", async () => {
    const w = mount(NqShortcutsReference, { props: { groups } });
    await w.find("input").setValue("inbox");
    expect(w.findAll("li").map((l) => l.attributes("data-item"))).toEqual(["inbox"]);
    expect(w.find('[role="status"]').text()).toBe("1 shortcut");
    await w.find("input").setValue("zzz");
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(true);
    expect(w.text()).toContain("No shortcut matches");
  });

  it("draws Arabic text and finds words with letter variants folded", async () => {
    const w = mount(NasaqProvider, { props: { defaultLocale: "ar" }, slots: { default: () => h(NqShortcutsReference, { groups }) } });
    expect(w.find("h3").text()).toBe("التنقل");
    await w.find("input").setValue("الانتقال");
    expect(w.findAll("li").map((l) => l.attributes("data-item"))).toEqual(["inbox"]);
    await w.find("input").setValue("الاوامر"); // typed with a plain alef, stored as "الأوامر"
    expect(w.findAll("li").map((l) => l.attributes("data-item"))).toEqual(["palette"]);
  });

  it("switches the keys per platform and emits update:platform", async () => {
    const w = mount(NqShortcutsReference, { props: { groups }, attachTo: document.body });
    expect(w.find('[data-item="palette"]').text()).toContain("Ctrl");
    await w.findAll('[data-slot="toggle"]')[1]!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:platform")![0]).toEqual(["mac"]);
    expect(w.find('[data-item="palette"]').text()).toContain("⌘");
    expect(w.find('[data-item="save"]').text()).not.toContain("or");
    w.unmount();
  });

  it("draws alternatives with an or between them", () => {
    const w = mount(NqShortcutsReference, { props: { groups, platform: "windows" } });
    expect(w.find('[data-item="save"]').text()).toContain("or");
    expect(w.findAll('[data-item="save"] [data-slot="shortcut-keys"]')).toHaveLength(2);
  });
});

describe("NqShortcutsDialog", () => {
  it("opens with the question mark", async () => {
    const w = mount(NqShortcutsDialog, { props: { groups }, attachTo: document.body });
    expect(document.querySelector('[data-slot="shortcuts-dialog"]')).toBeNull();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", code: "Slash", shiftKey: true, bubbles: true, cancelable: true }));
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="shortcuts-dialog"]')!;
    expect(content).not.toBeNull();
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.className).toContain("max-w-none");
    expect(content.className).not.toMatch(/\bmax-w-lg\b/);
    expect(content.querySelector('[data-slot="shortcuts-reference"]')).not.toBeNull();
    expect(content.querySelector('[data-slot="dialog-title"]')!.textContent).toBe("Keyboard shortcuts");
    expect(w.emitted("update:open")![0]).toEqual([true]);
    w.unmount();
  });

  it("ignores the hotkey while a text field has focus and when hotkey is null", async () => {
    const w = mount(NqShortcutsDialog, { props: { groups }, attachTo: document.body });
    const input = document.createElement("input");
    document.body.append(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "?", code: "Slash", shiftKey: true, bubbles: true }));
    await flushPromises();
    expect(w.emitted("update:open")).toBeUndefined();
    await w.setProps({ hotkey: null });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", code: "Slash", shiftKey: true, bubbles: true }));
    expect(w.emitted("update:open")).toBeUndefined();
    w.unmount();
  });

  it("is controlled by open and labels the close button", async () => {
    const w = mount(NqShortcutsDialog, { props: { groups, open: true }, attachTo: document.body });
    await flushPromises();
    expect(document.querySelector('[data-slot="shortcuts-dialog"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dialog-close"][aria-label="Close"]')).not.toBeNull();
    w.unmount();
  });
});
