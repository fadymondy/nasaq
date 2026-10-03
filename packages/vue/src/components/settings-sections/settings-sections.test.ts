import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import { NqSettingRow, NqSettingsSections, searchSettings } from ".";
import { normalizeForSearch } from "../commands";

const groups = [
  {
    id: "general",
    label: "General",
    pages: [
      { id: "profile", label: "Profile", entries: [{ id: "name", label: "Display name", keywords: ["اسم"] }] },
      { id: "notifications", label: "Notifications", entries: [{ id: "email", label: "Email digest" }] },
    ],
  },
  { id: "danger", label: "Danger", pages: [{ id: "delete", label: "Delete workspace", tone: "danger" as const }] },
];

const Demo = defineComponent({
  components: { NqSettingsSections, NqSettingRow },
  props: { dirty: { type: [Number, Boolean], default: 0 }, onSave: Function, onDiscard: Function },
  setup: () => ({ groups, page: ref("profile") }),
  template: `<NqSettingsSections :groups="groups" v-model="page" :dirty="dirty" :on-save="onSave" :on-discard="onDiscard">
    <template #profile><NqSettingRow id="name" label="Display name" description="Shown to others."><input /></NqSettingRow></template>
    <template #notifications><NqSettingRow id="email" label="Email digest" /></template>
    <template #delete><p>Danger zone</p></template>
  </NqSettingsSections>`,
});

describe("NqSettingsSections", () => {
  it("renders the grouped nav, marks the active page and mounts pages lazily", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(w.find('[data-slot="settings-sections"]').classes()).toContain("max-w-6xl");
    expect(w.find("h1").text()).toBe("Settings");
    const nav = w.find("nav");
    expect(nav.attributes("aria-label")).toBe("Settings sections");
    const [profile, notifications] = nav.findAll("button");
    expect(profile!.attributes("aria-current")).toBe("page");
    expect(profile!.attributes("data-active")).toBe("true");
    expect(notifications!.attributes("aria-current")).toBeUndefined();
    expect(w.find('[data-section="notifications"]').exists()).toBe(false);
    await notifications!.trigger("click");
    await flushPromises();
    expect(w.find('[data-section="notifications"]').isVisible()).toBe(true);
    expect(w.find('[data-section="profile"]').isVisible()).toBe(false);
    expect(notifications!.attributes("aria-current")).toBe("page");
    expect(w.find('[data-setting-id="email"]').attributes("data-slot")).toBe("setting-row");
    w.unmount();
  });

  it("tones a danger page", () => {
    const w = mount(Demo);
    const del = w.find("nav").findAll("button")[2]!;
    expect(del.classes()).toContain("text-nq-danger-text");
  });

  it("searches pages and single settings, folds Arabic, and jumps to a hit", async () => {
    const w = mount(Demo, { attachTo: document.body });
    expect(searchSettings(groups, normalizeForSearch("اسم")).map((h) => h.key)).toEqual(["profile:name"]);
    await w.find('input[type="search"]').setValue("email");
    const results = w.find('[data-slot="settings-sections-results"]');
    expect(results.find('[role="status"]').text()).toBe("1 result");
    expect(w.find("nav").exists()).toBe(false);
    await results.find("button").trigger("click");
    await flushPromises();
    expect((w.find('input[type="search"]').element as HTMLInputElement).value).toBe("");
    expect(w.find('[data-section="notifications"]').isVisible()).toBe(true);
    await w.find('input[type="search"]').setValue("zzz");
    expect(w.find('[data-slot="settings-sections-results"] [role="status"]').text()).toBe("No settings match");
    w.unmount();
  });

  it("shows the save bar with a count and saves", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(Demo, { props: { dirty: 2, onSave } });
    const bar = w.find('[data-slot="settings-save-bar"]');
    expect(bar.isVisible()).toBe(true);
    expect(bar.text()).toContain("2 unsaved changes");
    await bar.findAll("button")[1]!.trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalled();
    expect(bar.attributes("data-state")).toBe("saved");
    expect(bar.text()).toContain("All changes saved");
  });

  it("keeps the bar open with the error message, and discards", async () => {
    const onDiscard = vi.fn();
    const w = mount(Demo, { props: { dirty: true, onSave: async () => ({ error: "Server down." }), onDiscard } });
    const bar = w.find('[data-slot="settings-save-bar"]');
    expect(bar.text()).toContain("You have unsaved changes");
    await bar.findAll("button")[1]!.trigger("click");
    await flushPromises();
    expect(bar.attributes("data-state")).toBe("error");
    expect(bar.text()).toContain("Server down.");
    expect(bar.classes()).toContain("border-nq-danger/50");
    await bar.findAll("button")[0]!.trigger("click");
    await flushPromises();
    expect(onDiscard).toHaveBeenCalled();
    expect(bar.attributes("data-state")).toBe("idle");
  });

  it("hides the bar when nothing is unsaved", () => {
    const w = mount(Demo);
    expect((w.find('[data-slot="settings-save-bar"]').element as HTMLElement).style.display).toBe("none");
  });
});

describe("NqSettingRow", () => {
  it("renders label, hint and control", () => {
    const w = mount(NqSettingRow, { props: { id: "x", label: "Label", description: "Hint" }, slots: { default: "<button>Go</button>" } });
    expect(w.attributes("data-setting-id")).toBe("x");
    expect(w.text()).toContain("Label");
    expect(w.text()).toContain("Hint");
    expect(w.classes()).toContain("sm:flex-row");
    expect(w.find("button").exists()).toBe(true);
  });
});
