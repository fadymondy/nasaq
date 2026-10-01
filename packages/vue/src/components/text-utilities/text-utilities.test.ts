import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import {
  NqBookmarkButton,
  NqLinkify,
  NqProgressiveList,
  NqProgressiveReveal,
  NqScrollFade,
  NqTranslatableText,
  NqUserText,
  linkifyText,
  progressiveRemaining,
  scrollFadeMask,
  scrollFadeState,
} from ".";

describe("helpers", () => {
  it("linkifies http, www and email only, trimming punctuation", () => {
    const segs = linkifyText("See https://a.com/x), mail me@b.co or javascript:alert(1) www.c.org.");
    expect(segs.filter((s) => s.type !== "text").map((s) => (s as { href?: string }).href)).toEqual(["https://a.com/x", "mailto:me@b.co", "https://www.c.org"]);
    expect(linkifyText("plain example.com").every((s) => s.type === "text")).toBe(true);
  });

  it("works out fades and reveals", () => {
    expect(scrollFadeState({ scrollStart: 0, clientSize: 100, scrollSize: 300 })).toEqual({ start: false, end: true });
    expect(scrollFadeState({ scrollStart: 50, clientSize: 100, scrollSize: 100 })).toEqual({ start: false, end: false });
    expect(scrollFadeMask({ start: false, end: false }, 32, false)).toBeUndefined();
    expect(scrollFadeMask({ start: true, end: true }, 32, true)).toContain("to left");
    expect(progressiveRemaining(3, 10, 3)).toEqual({ next: 3, left: 7 });
  });
});

describe("NqLinkify", () => {
  it("renders safe links, isolated left to right", () => {
    const w = mount(NqLinkify, { props: { text: "Go to https://nasaq.dev now or mail a@b.co" } });
    expect(w.attributes("data-slot")).toBe("linkify");
    const links = w.findAll("a");
    expect(links.map((a) => a.attributes("href"))).toEqual(["https://nasaq.dev", "mailto:a@b.co"]);
    expect(links[0]!.attributes("rel")).toContain("noopener");
    expect(links[0]!.attributes("target")).toBe("_blank");
    expect(links[1]!.attributes("target")).toBeUndefined();
    expect(w.find("bdi").attributes("dir")).toBe("ltr");
  });
});

describe("NqUserText", () => {
  it("is auto direction, isolated, and clamps with a title", () => {
    const w = mount(NqUserText, { props: { block: true, lines: 2 }, slots: { default: "مرحبا Sara" } });
    expect(w.element.tagName).toBe("P");
    expect(w.attributes("dir")).toBe("auto");
    expect(w.attributes("title")).toBe("مرحبا Sara");
    expect(w.classes()).toContain("overflow-hidden");
    expect(w.classes()).toContain("[unicode-bidi:plaintext]");
  });

  it("can linkify", () => {
    const w = mount(NqUserText, { props: { linkify: true, text: "see www.a.com" } });
    expect(w.find("a").attributes("href")).toBe("https://www.a.com");
  });
});

describe("NqTranslatableText", () => {
  it("fetches once, toggles and keeps the translation", async () => {
    const onTranslate = vi.fn().mockResolvedValue("Hello");
    const w = mount(NqTranslatableText, { props: { original: "مرحبا", sourceLang: "ar", targetLang: "en", onTranslate } });
    expect(w.attributes("data-showing")).toBe("original");
    expect(w.find('[data-slot="user-text"]').attributes("lang")).toBe("ar");
    await w.find("button").trigger("click");
    await flushPromises();
    expect(onTranslate).toHaveBeenCalledWith("مرحبا", "en");
    expect(w.attributes("data-showing")).toBe("translation");
    expect(w.find('[data-slot="user-text"]').text()).toBe("Hello");
    expect(w.text()).toContain("Translated from Arabic");
    await w.find("button").trigger("click");
    await w.find("button").trigger("click");
    expect(onTranslate).toHaveBeenCalledTimes(1);
  });

  it("shows a failure with a retry", async () => {
    const onTranslate = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce("ok");
    const w = mount(NqTranslatableText, { props: { original: "a", sourceLang: "ar", targetLang: "en", onTranslate } });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain("Could not translate this text.");
    await w.find('[role="alert"] button').trigger("click");
    await flushPromises();
    expect(w.attributes("data-showing")).toBe("translation");
  });
});

describe("NqScrollFade", () => {
  it("is a named region with a content row", () => {
    const w = mount(NqScrollFade, { slots: { default: "<span>a</span>" } });
    expect(w.attributes("data-slot")).toBe("scroll-fade");
    expect(w.attributes("role")).toBe("region");
    expect(w.attributes("aria-label")).toBe("Scrollable content");
    expect(w.attributes("tabindex")).toBeUndefined();
  });
});

describe("NqBookmarkButton", () => {
  it("flips at once, announces, and reverts when the save fails", async () => {
    const onSavedChange = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("x"));
    const w = mount(NqBookmarkButton, { props: { onSavedChange } });
    const btn = w.find("button");
    expect(btn.attributes("aria-label")).toBe("Save");
    expect(btn.attributes("aria-pressed")).toBe("false");
    await btn.trigger("click");
    expect(btn.attributes("aria-pressed")).toBe("true");
    await flushPromises();
    expect(btn.attributes("data-saved")).toBeDefined();
    expect(w.find('[role="status"]').text()).toBe("Saved to your bookmarks");
    await btn.trigger("click");
    await flushPromises();
    expect(btn.attributes("aria-pressed")).toBe("true");
    expect(w.find('[role="status"]').text()).toBe("Could not update your bookmarks.");
  });
});

describe("NqProgressiveReveal", () => {
  it("is collapsed to a height", () => {
    const w = mount(NqProgressiveReveal, { props: { collapsedHeight: 40 }, slots: { default: "<p>long</p>" } });
    expect(w.attributes("data-slot")).toBe("progressive-reveal");
    expect(w.find(".overflow-hidden").attributes("style")).toContain("max-height: 40px");
  });

  it("with defaultExpanded shows a Show less button", async () => {
    const w = mount(NqProgressiveReveal, { props: { defaultExpanded: true }, slots: { default: "<p>x</p>" } });
    const btn = w.find("button");
    expect(btn.attributes("aria-expanded")).toBe("true");
    expect(btn.text()).toBe("Show less");
    await btn.trigger("click");
    expect(w.attributes("data-expanded")).toBeUndefined();
  });
});

describe("NqProgressiveList", () => {
  it("reveals step more per press with the count left", async () => {
    const w = mount(NqProgressiveList, { props: { items: ["a", "b", "c", "d", "e", "f", "g"], initial: 2, step: 3 } });
    expect(w.findAll("li")).toHaveLength(2);
    expect(w.find("button").text()).toContain("Show 3 more");
    expect(w.find("button").text()).toContain("5 left");
    await w.find("button").trigger("click");
    expect(w.findAll("li")).toHaveLength(5);
    expect(w.emitted("reveal")![0]).toEqual([5]);
    await w.find("button").trigger("click");
    expect(w.findAll("li")).toHaveLength(7);
    expect(w.find("button").exists()).toBe(false);
  });

  it("speaks Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqProgressiveList }, template: '<NasaqProvider locale="ar"><NqProgressiveList :items="[1,2,3,4]" :initial="1" /></NasaqProvider>' });
    expect(w.find("button").text()).toContain("عرض 3 أخرى");
  });
});
