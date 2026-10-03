import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqAccountSettings, NqDangerZone, NqSettingsSection } from ".";

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe("NqAccountSettings", () => {
  const make = (props: Record<string, unknown> = {}) =>
    mount(NqAccountSettings, {
      props,
      attachTo: document.body,
      slots: { default: `<template #default="{ id }"><p data-test="body">{{ id }}</p></template>`, danger: "<p data-test='danger'>danger body</p>" },
    });

  it("renders the title, the five default items and the first section's content", () => {
    const w = make();
    expect(w.find("h1").text()).toBe("Account settings");
    const buttons = w.findAll("nav button");
    expect(buttons.map((b) => b.text())).toEqual(["Profile", "Security", "Connected accounts", "Notifications", "Danger zone"]);
    expect(buttons[0]!.attributes("aria-current")).toBe("page");
    expect(buttons[0]!.attributes("data-active")).toBe("true");
    expect(buttons[1]!.attributes("data-active")).toBe("false");
    const region = w.find('[data-slot="account-settings-content"]');
    expect(region.attributes("role")).toBe("region");
    expect(region.attributes("aria-label")).toBe("Profile");
    expect(region.attributes("data-section")).toBe("profile");
    expect(region.find('[data-test="body"]').text()).toBe("profile");
    expect(buttons[0]!.attributes("aria-controls")).toBe(region.attributes("id"));
    expect(w.find("nav").attributes("aria-label")).toBe("Settings sections");
    w.unmount();
  });

  it("switches sections from the nav, with a named slot winning for its id, and emits v-model", async () => {
    const w = make();
    await w.findAll("nav button")[1]!.trigger("click");
    expect(w.find('[data-slot="account-settings-content"]').attributes("data-section")).toBe("security");
    expect(w.find('[data-test="body"]').text()).toBe("security");
    await w.findAll("nav button")[4]!.trigger("click");
    expect(w.find('[data-test="danger"]').exists()).toBe(true);
    expect(w.find('[data-test="body"]').exists()).toBe(false);
    expect(w.emitted("update:modelValue")!.map((e) => e[0])).toEqual(["security", "danger"]);
    expect(w.findAll("nav button")[4]!.classes()).toContain("text-nq-danger-text");
    w.unmount();
  });

  it("is controlled by modelValue and hides the description with null", async () => {
    const w = make({ modelValue: "security", description: null });
    expect(w.find("header p").exists()).toBe(false);
    expect(w.find('[data-slot="account-settings-content"]').attributes("data-section")).toBe("security");
    await w.findAll("nav button")[2]!.trigger("click");
    expect(w.find('[data-slot="account-settings-content"]').attributes("data-section")).toBe("security");
    await w.setProps({ modelValue: "connected" });
    expect(w.find('[data-slot="account-settings-content"]').attributes("data-section")).toBe("connected");
    w.unmount();
  });

  it("mirrors the nav into the mobile tab list", () => {
    const w = make({ defaultValue: "security" });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs).toHaveLength(5);
    expect(tabs[1]!.attributes("data-active")).toBeDefined();
    expect(w.find('[role="tablist"]').attributes("aria-label")).toBe("Settings sections");
    w.unmount();
  });
});

describe("NqSettingsSection", () => {
  it("is a labelled region with a heading, description, footer and actions", () => {
    const w = mount(NqSettingsSection, {
      props: { title: "Profile", description: "Your public details.", footer: "Saved today", headingLevel: 3 },
      slots: { default: "<input />", actions: "<button>Save</button>" },
    });
    const h = w.find("h3");
    expect(h.text()).toBe("Profile");
    expect(w.attributes("role")).toBe("region");
    expect(w.attributes("aria-labelledby")).toBe(h.attributes("id"));
    expect(w.attributes("data-slot")).toBe("settings-section");
    expect(w.attributes("data-tone")).toBe("default");
    expect(w.classes()).toContain("gap-5");
    expect(w.find('[data-slot="settings-section-footer"]').text()).toContain("Saved today");
    expect(w.find('[data-slot="settings-section-footer"] button').text()).toBe("Save");
  });

  it("omits the footer and tints the danger tone", () => {
    const w = mount(NqSettingsSection, { props: { title: "x", tone: "danger", class: "mt-2" }, slots: { default: "body" } });
    expect(w.find('[data-slot="settings-section-footer"]').exists()).toBe(false);
    expect(w.classes()).toEqual(expect.arrayContaining(["border-nq-danger/40", "mt-2"]));
  });
});

describe("NqDangerZone", () => {
  const open = async (onDelete: () => Promise<void>, props: Record<string, unknown> = {}) => {
    const w = mount(NqDangerZone, { props: { onDelete, ...props }, attachTo: document.body });
    await w.find('[data-slot="alert-dialog-trigger"]').trigger("click");
    await flushPromises();
    return w;
  };
  const input = () => document.querySelector<HTMLInputElement>('[data-slot="input"]')!;
  const confirm = () => document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const type = async (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
  };

  it("keeps the red button disabled until the phrase matches, then deletes and closes", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const w = await open(onDelete);
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(input().getAttribute("dir")).toBe("ltr");
    expect(confirm().disabled).toBe(true);
    await type("delet");
    expect(confirm().disabled).toBe(true);
    await type("DELETE");
    expect(confirm().disabled).toBe(false);
    confirm().closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(onDelete).toHaveBeenCalledTimes(1);
    await wait(300);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    w.unmount();
  });

  it("does not delete on an early submit", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const w = await open(onDelete);
    confirm().closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(onDelete).not.toHaveBeenCalled();
    w.unmount();
  });

  it("keeps the dialog open with the message when onDelete rejects, and accepts a custom phrase", async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error("Wrong session"));
    const w = await open(onDelete, { confirmText: "me@x.co" });
    await type("me@x.co");
    confirm().closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    const alert = document.querySelector('[data-slot="field-description"][role="alert"]')!;
    expect(alert.textContent).toBe("Wrong session");
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    w.unmount();
  });

  it("is a danger section", async () => {
    const w = mount(NqDangerZone, { props: { onDelete: async () => {} } });
    expect(w.attributes("data-slot")).toBe("danger-zone");
    expect(w.attributes("data-tone")).toBe("danger");
    expect(w.find("h2").text()).toBe("Danger zone");
    expect(w.text()).toContain("Delete account");
  });
});
