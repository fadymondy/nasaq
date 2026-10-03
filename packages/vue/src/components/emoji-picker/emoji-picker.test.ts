import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { buildEmojiData, emojiForTone, NqEmojiPicker, NqEmojiPickerPanel, resolveEmojiLocale } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const data = buildEmojiData(
  [
    { emoji: "😀", label: "grinning face", group: 0, order: 1, tags: ["smile", "happy"] },
    { emoji: "😂", label: "face with tears of joy", group: 0, order: 2, tags: ["laugh"] },
    { emoji: "👍", label: "thumbs up", group: 1, order: 3, tags: ["like"], skins: [{ emoji: "👍🏻" }, { emoji: "👍🏼" }, { emoji: "👍🏽" }, { emoji: "👍🏾" }, { emoji: "👍🏿" }] },
    { emoji: "🏻", label: "light skin tone", group: 2, order: 4 },
  ],
  { groups: [{ order: 0, message: "smileys" }, { order: 1, message: "people" }, { order: 2, message: "components" }] },
);
const resolveEmojiData = async () => data;

describe("emoji data helpers", () => {
  it("falls back to English for Arabic and to the base language for regional locales", () => {
    expect(resolveEmojiLocale("ar")).toBe("en");
    expect(resolveEmojiLocale("fr-CA")).toBe("fr");
    expect(resolveEmojiLocale("de")).toBe("de");
  });
  it("drops the components group and applies skin tones", () => {
    expect(data.emojis).toHaveLength(3);
    expect(data.categories.map((c) => c.label)).toEqual(["smileys", "people"]);
    expect(emojiForTone(data.emojis[2]!, "medium")).toBe("👍🏽");
    expect(emojiForTone(data.emojis[0]!, "medium")).toBe("😀");
  });
});

describe("NqEmojiPickerPanel", () => {
  it("renders categories and emoji, filters by search and emits the choice", async () => {
    const w = mount(NqEmojiPickerPanel, { props: { resolveEmojiData } });
    expect(w.find('[data-slot="emoji-picker"]').exists()).toBe(true);
    await flushPromises();
    expect(w.findAll('[data-slot="emoji-picker-category"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="emoji-picker-emoji"]')).toHaveLength(3);
    await w.find('[data-slot="emoji-picker-search"]').setValue("laugh");
    expect(w.findAll('[data-slot="emoji-picker-emoji"]')).toHaveLength(1);
    await w.find('[data-slot="emoji-picker-emoji"]').trigger("click");
    expect(w.emitted("emojiSelect")![0]![0]).toEqual({ emoji: "😂", label: "face with tears of joy" });
    await w.find('[data-slot="emoji-picker-search"]').setValue("zzz");
    expect(w.text()).toContain("No emoji found for “zzz”.");
  });

  it("the skin tone button cycles tones", async () => {
    const w = mount(NqEmojiPickerPanel, { props: { resolveEmojiData } });
    await flushPromises();
    await w.find('[data-slot="emoji-picker-skin-tone"]').trigger("click");
    expect(w.findAll('[data-slot="emoji-picker-emoji"]')[2]!.text()).toBe("👍🏻");
  });

  it("arrow keys follow the reading direction", async () => {
    const mk = (locale: string) =>
      mount(defineComponent({ render: () => h(NasaqProvider, { target: "scope", defaultLocale: locale }, () => h(NqEmojiPickerPanel, { resolveEmojiData })) }), { attachTo: document.body });
    const ltr = mk("en");
    await flushPromises();
    await ltr.find('[data-index="0"]').trigger("keydown", { key: "ArrowRight" });
    await flushPromises();
    expect((document.activeElement as HTMLElement).dataset.index).toBe("1");
    ltr.unmount();
    const rtl = mk("ar");
    await flushPromises();
    expect(rtl.find("input").attributes("aria-label")).toBe("ابحث عن رمز تعبيري");
    await rtl.find('[data-index="1"]').trigger("keydown", { key: "ArrowLeft" });
    await flushPromises();
    expect((document.activeElement as HTMLElement).dataset.index).toBe("2");
    rtl.unmount();
  });
});

describe("NqEmojiPicker", () => {
  it("opens a popover and closes after choosing", async () => {
    const w = mount(NqEmojiPicker, { props: { resolveEmojiData }, attachTo: document.body });
    const trigger = w.find("button");
    expect(trigger.attributes("aria-label")).toBe("Choose emoji");
    await trigger.trigger("click");
    await flushPromises();
    const cell = document.querySelector('[data-slot="emoji-picker-emoji"]') as HTMLElement;
    expect(cell).not.toBeNull();
    cell.click();
    await flushPromises();
    expect(w.emitted("emojiSelect")![0]![0]).toEqual({ emoji: "😀", label: "grinning face" });
    w.unmount();
  });
});
