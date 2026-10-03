import { flushPromises, mount } from "@vue/test-utils";
import { Globe } from "lucide-vue-next";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { isServerAddress, NqExtensionConnect, NqExtensionMiniCard, NqExtensionOptionRow, NqExtensionOptionsPage, NqExtensionPopup, NqExtensionQuickActions } from ".";

describe("isServerAddress", () => {
  it("accepts http(s) URLs with a host only", () => {
    expect(isServerAddress("https://app.example.com")).toBe(true);
    expect(isServerAddress(" http://localhost:3000 ")).toBe(true);
    expect(isServerAddress("app.example.com")).toBe(false);
    expect(isServerAddress("ftp://x.test")).toBe(false);
  });
});

describe("NqExtensionPopup", () => {
  it("frames the brand, status badge and body", () => {
    const w = mount(NqExtensionPopup, { props: { status: "error" }, slots: { brand: "Nasaq", default: "<p>Hello</p>" } });
    const root = w.find('[data-slot="extension-popup"]');
    expect(root.attributes("data-state")).toBe("error");
    expect(w.find('[data-slot="badge"]').text()).toBe("Problem");
    expect(w.find('[data-slot="extension-popup-body"]').text()).toBe("Hello");
    expect(w.find("footer").exists()).toBe(false);
    expect(w.find('[data-slot="switch"]').exists()).toBe(false);
  });

  it("shows the pause switch, turns paused into the state and reports changes", async () => {
    const onPausedChange = vi.fn();
    const w = mount(NqExtensionPopup, { props: { paused: false, onPausedChange }, slots: { default: "x" } });
    expect(w.find('[data-slot="extension-popup"]').attributes("data-state")).toBe("connected");
    await w.find('[data-slot="switch"]').trigger("click");
    expect(onPausedChange).toHaveBeenCalledWith(true);
    await w.setProps({ paused: true });
    expect(w.find('[data-slot="extension-popup"]').attributes("data-state")).toBe("paused");
    expect(w.find('[data-slot="badge"]').text()).toBe("Paused");
  });

  it("renders the options button and footer", async () => {
    const onOpenOptions = vi.fn();
    const w = mount(NqExtensionPopup, { props: { onOpenOptions }, slots: { default: "x", footer: "v1.0" } });
    expect(w.find("footer").text()).toContain("v1.0");
    await w.find("footer button").trigger("click");
    expect(onOpenOptions).toHaveBeenCalled();
    expect(w.find("footer button").text()).toBe("Options");
  });
});

describe("NqExtensionConnect", () => {
  it("rejects a bad address with an alert and does not call onConnect", async () => {
    const onConnect = vi.fn(async () => undefined);
    const w = mount(NqExtensionConnect, { props: { onConnect } });
    await w.find("input").setValue("nope");
    await w.find("form").trigger("submit");
    expect(w.find('[role="alert"]').text()).toBe("Enter a full address, starting with https://");
    expect(onConnect).not.toHaveBeenCalled();
    expect(w.find("input").attributes("dir")).toBe("ltr");
  });

  it("submits a valid address and shows a returned error", async () => {
    const onConnect = vi.fn(async () => ({ error: "Server said no" }));
    const w = mount(NqExtensionConnect, { props: { onConnect, defaultServer: "https://a.test" } });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onConnect).toHaveBeenCalledWith({ server: "https://a.test", code: "" });
    expect(w.find('[role="alert"]').text()).toBe("Server said no");
  });

  it("pair mode upper-cases the code and needs six characters", async () => {
    const onConnect = vi.fn(async () => undefined);
    const w = mount(NqExtensionConnect, { props: { onConnect, mode: "pair" } });
    await w.find("input").setValue("ab12");
    await w.find("form").trigger("submit");
    expect(w.find('[role="alert"]').text()).toBe("The code has 6 characters");
    await w.find("input").setValue("ab12cd");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onConnect).toHaveBeenCalledWith({ server: "", code: "AB12CD" });
    expect(w.find('[role="alert"]').exists()).toBe(false);
  });
});

describe("NqExtensionMiniCard / NqExtensionQuickActions / NqExtensionOptionRow", () => {
  it("renders the card parts", () => {
    const w = mount(NqExtensionMiniCard, { props: { title: "Sync", icon: Globe, status: { label: "Live", tone: "success" }, value: 42, hint: "pages" }, slots: { default: "<b>extra</b>" } });
    expect(w.find("h3").text()).toBe("Sync");
    expect(w.find('[data-slot="badge"]').text()).toBe("Live");
    expect(w.text()).toContain("42");
    expect(w.text()).toContain("extra");
  });

  it("runs an action and respects columns and disabled", async () => {
    const open = vi.fn();
    const w = mount(NqExtensionQuickActions, {
      props: {
        columns: 3,
        actions: [
          { id: "a", label: "Open", icon: Globe, onSelect: open, external: true },
          { id: "b", label: "Copy", icon: Globe, onSelect: vi.fn(), disabled: true },
        ],
      },
    });
    const root = w.find('[data-slot="extension-quick-actions"]');
    expect(root.attributes("role")).toBe("group");
    expect(root.classes()).toContain("grid-cols-3");
    const buttons = w.findAll("button");
    await buttons[0]!.trigger("click");
    expect(open).toHaveBeenCalled();
    expect(buttons[1]!.attributes("disabled")).toBeDefined();
  });

  it("puts the control at the end of an option row", () => {
    const w = mount(NqExtensionOptionRow, { props: { label: "Badge", description: "Show it" }, slots: { control: () => h("button", "Go") } });
    expect(w.text()).toContain("Badge");
    expect(w.find('[data-slot="extension-option-row"] button').text()).toBe("Go");
  });
});

describe("NqExtensionOptionsPage", () => {
  const sections = [{ id: "general", title: "General", description: "Basics" }];
  it("renders sections from slots and the save status", async () => {
    const onSave = vi.fn(async () => undefined);
    const w = mount(NqExtensionOptionsPage, { props: { title: "Options", sections, onSave, dirty: false }, slots: { general: "<p>body</p>", brand: "Nasaq" } });
    expect(w.find("h1").text()).toBe("Options");
    expect(w.find("section h2").text()).toBe("General");
    expect(w.find("section").attributes("aria-labelledby")).toBe("general-title");
    expect(w.find("section").text()).toContain("body");
    expect(w.find('[role="status"]').text()).toBe("Saved");
    expect(w.find("button").attributes("disabled")).toBeDefined();
    await w.setProps({ dirty: true });
    expect(w.find('[role="status"]').text()).toBe("Unsaved changes");
    await w.find("button").trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalled();
  });

  it("shows a save error", async () => {
    const onSave = vi.fn(async () => ({ error: "Disk full" }));
    const w = mount(NqExtensionOptionsPage, { props: { title: "Options", sections, onSave, dirty: true } });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(w.find('[role="status"]').text()).toBe("Disk full");
  });
});
