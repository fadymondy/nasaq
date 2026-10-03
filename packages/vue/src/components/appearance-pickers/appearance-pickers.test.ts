import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqReadingSettings, NqThemeGallery, NqWallpaperPicker, parseReadingPreferences, readingStyleVars, wallpaperCss } from ".";

const themes = [
  { id: "paper", label: "Paper", description: "Warm", mode: "light" as const, swatches: ["#fff", "#eee", "#111", "#06c"] },
  { id: "ink", label: "Ink", mode: "dark" as const, swatches: ["#000", "#222", "#eee", "#6cf"] },
];

describe("helpers", () => {
  it("builds reading CSS variables and parses saved preferences", () => {
    expect(readingStyleVars({ fontSize: "lg", width: "full", spacing: "compact" })).toEqual({ "--reading-scale": "1.125", "--reading-max-width": "none", "--reading-line-height": "1.4" });
    expect(parseReadingPreferences('{"fontSize":"xl","width":"bogus"}')).toEqual({ fontSize: "xl", width: "normal", spacing: "normal" });
    expect(wallpaperCss("/a.jpg")).toBe('center / cover no-repeat url("/a.jpg")');
    expect(wallpaperCss("linear-gradient(red, blue)")).toBe("linear-gradient(red, blue)");
  });
});

describe("NqThemeGallery", () => {
  it("renders a labelled radio group of theme cards and selects with a click", async () => {
    const w = mount(NqThemeGallery, { props: { themes, defaultValue: "paper" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("theme-gallery");
    const group = w.find('[role="radiogroup"]');
    expect(group.attributes("aria-labelledby")).toBe(w.find("div.text-label").attributes("id"));
    expect(w.find("div.text-label").text()).toBe("Theme");
    expect(group.classes()).toEqual(expect.arrayContaining(["grid", "gap-3", "sm:grid-cols-4"]));
    const cards = w.findAll('[data-slot="theme-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0]!.attributes("role")).toBe("radio");
    expect(cards[0]!.attributes("data-checked")).toBe("");
    expect(cards[1]!.attributes("data-unchecked")).toBe("");
    expect(cards[0]!.classes()).toEqual(expect.arrayContaining(["rounded-card", "data-checked:border-primary"]));
    expect(w.text()).toContain("Warm");
    await cards[1]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["ink"]);
    expect(cards[1]!.attributes("data-checked")).toBe("");
    expect(cards[0]!.attributes("data-unchecked")).toBe("");
    w.unmount();
  });

  it("hides the heading when label is false and names the group", () => {
    const w = mount(NqThemeGallery, { props: { themes, label: false, ariaLabel: "Colour theme" } });
    expect(w.find("div.text-label").exists()).toBe(false);
    expect(w.find('[role="radiogroup"]').attributes("aria-label")).toBe("Colour theme");
  });

  it("uses Arabic words in an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqThemeGallery }, props: ["themes"], template: `<NasaqProvider locale="ar" target="scope"><NqThemeGallery :themes="themes" /></NasaqProvider>` }, { props: { themes } });
    expect(w.text()).toContain("المظهر");
  });
});

describe("NqReadingSettings", () => {
  it("shows the three controls, a reset and a live preview", async () => {
    const w = mount(NqReadingSettings, { attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("reading-settings");
    expect(w.findAll('[data-slot="toggle-group"]')).toHaveLength(3);
    expect(w.findAll('[data-slot="toggle"]')).toHaveLength(11);
    expect(w.find('[aria-label="Smaller text"]').exists()).toBe(true);
    const preview = w.find('[data-slot="reading-preview"]');
    expect(preview.attributes("style")).toContain("--reading-scale: 1");
    expect(preview.text()).toContain("A quiet place to read");
    const reset = w.findAll("button").find((b) => b.text() === "Reset")!;
    expect(reset.attributes("disabled")).toBeDefined();

    await w.find('[aria-label="Larger text"]').trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual([{ fontSize: "lg", width: "normal", spacing: "normal" }]);
    expect(w.find('[data-slot="reading-preview"]').attributes("style")).toContain("--reading-scale: 1.125");
    expect(reset.attributes("disabled")).toBeUndefined();
    await reset.trigger("click");
    expect(w.emitted("update:modelValue")![1]).toEqual([{ fontSize: "md", width: "normal", spacing: "normal" }]);
    w.unmount();
  });

  it("supports v-model, a chosen subset of controls and no preview", async () => {
    const w = mount(NqReadingSettings, { props: { modelValue: { fontSize: "md", width: "wide", spacing: "relaxed" }, controls: ["width"], showPreview: false }, attachTo: document.body });
    expect(w.findAll('[data-slot="toggle-group"]')).toHaveLength(1);
    expect(w.find('[data-slot="reading-preview"]').exists()).toBe(false);
    const toggles = w.findAll('[data-slot="toggle"]');
    expect(toggles.find((x) => x.text() === "Wide")!.attributes("data-pressed")).toBe("");
    await toggles.find((x) => x.text() === "Narrow")!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual([{ fontSize: "md", width: "narrow", spacing: "relaxed" }]);
    w.unmount();
  });
});

describe("NqWallpaperPicker", () => {
  const wallpapers = [
    { id: "dawn", label: "Dawn", background: "linear-gradient(red, orange)", group: "Gradients" },
    { id: "sea", label: "Sea", background: "linear-gradient(blue, teal)", group: "Gradients" },
    { id: "city", label: "City", background: "/city.jpg", group: "Photos" },
  ];

  it("groups tiles, offers None first and reports the choice", async () => {
    const w = mount(NqWallpaperPicker, { props: { wallpapers }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("wallpaper-picker");
    expect(w.findAll(".text-caption.text-muted-foreground").map((e) => e.text())).toEqual(expect.arrayContaining(["Gradients", "Photos"]));
    const none = w.find('[data-slot="wallpaper-none"]');
    expect(none.attributes("aria-label")).toBe("None");
    expect(none.attributes("data-checked")).toBe("");
    const tiles = w.findAll('[data-slot="wallpaper-tile"]');
    expect(tiles).toHaveLength(3);
    expect(tiles[2]!.find("span").attributes("style")).toContain("/city.jpg");
    await tiles[1]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["sea"]);
    await none.trigger("click");
    expect(w.emitted("update:modelValue")![1]).toEqual([null]);
    expect(w.find('[data-slot="slider"]').exists()).toBe(false);
    w.unmount();
  });

  it("shows the dim slider and an upload tile that awaits the handler", async () => {
    const onUpload = vi.fn(async () => {});
    const w = mount(NqWallpaperPicker, { props: { wallpapers, defaultValue: "dawn", dim: 20, onUpload }, attachTo: document.body });
    expect(w.find('[data-slot="slider"]').exists()).toBe(true);
    expect(w.find('[data-slot="slider-value"]').text()).toBe("20%");
    const input = w.find('input[type="file"]');
    expect(input.attributes("accept")).toBe("image/*");
    expect(w.text()).toContain("Upload a picture");
    const file = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(input.element, "files", { value: [file], configurable: true });
    await input.trigger("change");
    await flushPromises();
    expect(onUpload).toHaveBeenCalledWith(file);
    w.unmount();
  });
});
