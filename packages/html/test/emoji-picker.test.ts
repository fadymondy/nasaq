// The Blade emoji-picker example under real Alpine, with the emoji data stubbed (no network).
import { describe, expect, it } from "vitest";
import { buildEmojiData, emojiForTone, filterEmojis, resolveEmojiLocale } from "../src/alpine/emoji-picker";
import { mount, setup, tick } from "./_float-setup";

setup();

const compact = [
  { emoji: "😀", label: "grinning face", group: 0, order: 1, tags: ["smile"] },
  { emoji: "😂", label: "face with tears of joy", group: 0, order: 2, tags: ["laugh"] },
  { emoji: "👋", label: "waving hand", group: 1, order: 3, tags: ["hello"], skins: [{ emoji: "👋🏻" }, { emoji: "👋🏼" }, { emoji: "👋🏽" }, { emoji: "👋🏾" }, { emoji: "👋🏿" }] },
  { emoji: "🏻", label: "light skin tone", group: 2, order: 4 },
];
const messages = { groups: [{ order: 0, message: "Smileys" }, { order: 1, message: "People" }, { order: 2, message: "Components" }] };

describe("emoji-picker helpers", () => {
  it("builds data, filters, tones and resolves locales", () => {
    const data = buildEmojiData(compact, messages);
    expect(data.emojis).toHaveLength(3);
    expect(data.categories.map((c) => c.label)).toEqual(["Smileys", "People"]);
    expect(filterEmojis(data.emojis, "face joy")).toHaveLength(1);
    expect(emojiForTone(data.emojis[2]!, "dark")).toBe("👋🏿");
    expect(resolveEmojiLocale("ar")).toBe("en");
    expect(resolveEmojiLocale("fr-CA")).toBe("fr");
  });
});

describe("emoji-picker (Blade example)", () => {
  it("opens, lists emoji, filters, changes tone and inserts the choice", async () => {
    (window as unknown as { nqEmojiData: () => Promise<unknown> }).nqEmojiData = async () => buildEmojiData(compact, messages);
    await mount("emoji-picker");
    document.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!.click();
    await tick(60);
    const cells = () => [...document.querySelectorAll<HTMLElement>('[data-slot="emoji-picker-emoji"]')];
    expect(cells()).toHaveLength(3);
    const search = document.querySelector<HTMLInputElement>('[data-slot="emoji-picker-search"]')!;
    search.value = "wav";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(cells()).toHaveLength(1);
    document.querySelector<HTMLElement>('[data-slot="emoji-picker-skin-tone"]')!.click();
    await tick();
    expect(cells()[0]!.textContent).toBe("👋🏻");
    cells()[0]!.click();
    await tick(60);
    expect(document.querySelector<HTMLInputElement>('input[aria-label="Message"]')!.value).toBe("👋🏻");
  });
});
