import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampWallpaperDim,
  DEFAULT_READING_PREFERENCES,
  groupWallpapers,
  isDefaultReading,
  isImageWallpaper,
  isReadingPreferences,
  parseReadingPreferences,
  readingFontPercent,
  readingStyleVars,
  stepReadingFontSize,
  themePreviewColors,
  wallpaperCss,
} from "../src/components/appearance-pickers/appearance-model.ts";

test("reading style variables", () => {
  assert.deepEqual(readingStyleVars(DEFAULT_READING_PREFERENCES), { "--reading-scale": "1", "--reading-max-width": "68ch", "--reading-line-height": "1.6" });
  assert.deepEqual(readingStyleVars({ fontSize: "xl", width: "full", spacing: "relaxed" }), { "--reading-scale": "1.25", "--reading-max-width": "none", "--reading-line-height": "1.85" });
  assert.equal(readingStyleVars({ fontSize: "sm", width: "narrow", spacing: "compact" })["--reading-max-width"], "52ch");
});

test("font percent and stepping stop at the ends", () => {
  assert.equal(readingFontPercent("sm"), 88);
  assert.equal(readingFontPercent("lg"), 113);
  assert.equal(stepReadingFontSize("md", 1), "lg");
  assert.equal(stepReadingFontSize("md", -1), "sm");
  assert.equal(stepReadingFontSize("xl", 1), "xl");
  assert.equal(stepReadingFontSize("sm", -5), "sm");
});

test("saved preferences are validated and merged with defaults", () => {
  assert.equal(isReadingPreferences({ fontSize: "lg", width: "wide", spacing: "relaxed" }), true);
  assert.equal(isReadingPreferences({ fontSize: "huge", width: "wide", spacing: "relaxed" }), false);
  assert.equal(isReadingPreferences(null), false);
  assert.deepEqual(parseReadingPreferences('{"fontSize":"lg"}'), { fontSize: "lg", width: "normal", spacing: "normal" });
  assert.deepEqual(parseReadingPreferences('{"fontSize":"huge","width":"wide"}'), { fontSize: "md", width: "wide", spacing: "normal" });
  assert.deepEqual(parseReadingPreferences("not json"), DEFAULT_READING_PREFERENCES);
  assert.deepEqual(parseReadingPreferences(null), DEFAULT_READING_PREFERENCES);
  assert.deepEqual(parseReadingPreferences({ spacing: "compact" }), { fontSize: "md", width: "normal", spacing: "compact" });
  assert.equal(isDefaultReading(DEFAULT_READING_PREFERENCES), true);
  assert.equal(isDefaultReading({ ...DEFAULT_READING_PREFERENCES, width: "wide" }), false);
});

test("wallpaper css", () => {
  assert.equal(isImageWallpaper("https://x.test/a.jpg"), true);
  assert.equal(isImageWallpaper("/img/a.jpg"), true);
  assert.equal(isImageWallpaper("data:image/png;base64,AAA"), true);
  assert.equal(isImageWallpaper("linear-gradient(red, blue)"), false);
  assert.equal(isImageWallpaper("var(--nq-bg)"), false);
  assert.equal(wallpaperCss("linear-gradient(red, blue)"), "linear-gradient(red, blue)");
  assert.equal(wallpaperCss("/img/a.jpg"), 'center / cover no-repeat url("/img/a.jpg")');
  assert.equal(wallpaperCss('/img/a"b.jpg'), 'center / cover no-repeat url("/img/a%22b.jpg")');
});

test("wallpapers group in order of appearance", () => {
  const list = [
    { id: "a", label: "A", background: "red", group: "Gradients" },
    { id: "b", label: "B", background: "blue" },
    { id: "c", label: "C", background: "green", group: "Gradients" },
    { id: "d", label: "D", background: "/d.jpg", group: "Photos" },
  ];
  const groups = groupWallpapers(list);
  assert.deepEqual(groups.map((g) => [g.group, g.items.map((i) => i.id)]), [["Gradients", ["a", "c"]], ["", ["b"]], ["Photos", ["d"]]]);
});

test("dimming is clamped", () => {
  assert.equal(clampWallpaperDim(-5), 0);
  assert.equal(clampWallpaperDim(33.4), 33);
  assert.equal(clampWallpaperDim(99), 60);
  assert.equal(clampWallpaperDim(99, 100), 99);
  assert.equal(clampWallpaperDim(Number.NaN), 0);
});

test("theme previews always give four colours", () => {
  assert.deepEqual(themePreviewColors({ id: "x", label: "X", swatches: ["a", "b"] }), ["a", "b", "b", "b"]);
  assert.deepEqual(themePreviewColors({ id: "x", label: "X", swatches: ["a", "b", "c", "d", "e"] }), ["a", "b", "c", "d"]);
  assert.deepEqual(themePreviewColors({ id: "x", label: "X", swatches: [] }), ["transparent", "transparent", "transparent", "transparent"]);
});
