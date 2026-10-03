import assert from "node:assert/strict";
import { test } from "node:test";
import { boardSectionChanged, duplicateSectionSettingKeys, sectionSettingRows, sectionSettingsFromRows } from "../src/components/section-board/section-board-logic.ts";

test("settings round-trip through rows, trimming keys and dropping empty ones", () => {
  const rows = sectionSettingRows({ limit: "5", tone: "brief" });
  assert.deepEqual(rows, [
    { key: "limit", value: "5" },
    { key: "tone", value: "brief" },
  ]);
  assert.deepEqual(sectionSettingsFromRows([...rows, { key: "  lang ", value: "ar" }, { key: " ", value: "lost" }]), { limit: "5", tone: "brief", lang: "ar" });
  assert.deepEqual(sectionSettingRows(undefined), []);
});

test("duplicate keys are found after trimming", () => {
  const dupes = duplicateSectionSettingKeys([
    { key: "a", value: "1" },
    { key: " a", value: "2" },
    { key: "b", value: "3" },
    { key: "", value: "" },
    { key: "", value: "" },
  ]);
  assert.deepEqual([...dupes], ["a"]);
  assert.deepEqual(sectionSettingsFromRows([{ key: "a", value: "1" }, { key: "a", value: "2" }]), { a: "2" });
});

test("changes are detected on every editable part, and empty equals unset", () => {
  const base = { id: "s", title: "News", prompt: "Top stories", settings: { limit: "5" } };
  assert.equal(boardSectionChanged(base, { ...base }), false);
  assert.equal(boardSectionChanged(base, { ...base, badge: "" }), false);
  assert.equal(boardSectionChanged(base, { ...base, title: "Headlines" }), true);
  assert.equal(boardSectionChanged(base, { ...base, model: "fast" }), true);
  assert.equal(boardSectionChanged(base, { ...base, settings: { limit: "6" } }), true);
  assert.equal(boardSectionChanged(base, { ...base, settings: { limit: "5", lang: "ar" } }), true);
  assert.equal(boardSectionChanged(base, { ...base, settings: {} }), true);
});
