import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hotkeyCaps,
  hotkeyConflicts,
  hotkeyFormat,
  hotkeyFromEvent,
  hotkeyKeys,
  hotkeyLabel,
  hotkeyMatches,
  hotkeyParse,
  hotkeyRecordKey,
  hotkeyReservedBy,
  hotkeyTextMatches,
  hotkeyValidate,
} from "../src/components/hotkey-recorder/hotkey-logic.ts";

const press = (code, key, mods = {}) => ({ code, key, ...mods });

test("parses chords and sequences to a canonical string", () => {
  assert.equal(hotkeyFormat(hotkeyParse("shift+mod+k")), "Mod+Shift+K");
  assert.equal(hotkeyFormat(hotkeyParse("cmd+option+up")), "Meta+Alt+ArrowUp");
  assert.equal(hotkeyFormat(hotkeyParse("g i")), "G I");
  assert.equal(hotkeyFormat(hotkeyParse("Ctrl+Plus")), "Ctrl+Plus");
  assert.equal(hotkeyFormat(hotkeyParse("esc")), "Escape");
});

test("refuses shortcuts that are not shortcuts", () => {
  assert.equal(hotkeyParse(""), null);
  assert.equal(hotkeyParse("Mod+"), null);
  assert.equal(hotkeyParse("Mod+Shift"), null);
  assert.equal(hotkeyParse("Mod+Mod+K"), null);
  assert.equal(hotkeyParse("K+J"), null);
  assert.equal(hotkeyParse("G I O P"), null);
});

test("draws the caps per platform", () => {
  assert.deepEqual(hotkeyKeys("Mod+Shift+K", true), [["⇧", "⌘", "K"]]);
  assert.deepEqual(hotkeyKeys("Mod+Shift+K", false), [["Shift", "Ctrl", "K"]]);
  assert.deepEqual(hotkeyKeys("G I", false), [["G"], ["I"]]);
  assert.deepEqual(hotkeyCaps(hotkeyParse("Alt+ArrowUp")[0], true), ["⌥", "↑"]);
  assert.equal(hotkeyLabel("Mod+K", false), "Ctrl+K");
  assert.equal(hotkeyLabel("Mod+K", true), "⌘K");
  assert.equal(hotkeyLabel("G I", false, "ثم"), "G ثم I");
  assert.equal(hotkeyKeys("nonsense+", false), null);
});

test("records the physical key, so an Arabic layout works", () => {
  // Arabic layout: KeyK types "ن" but the code stays KeyK.
  const step = hotkeyFromEvent(press("KeyK", "ن", { ctrlKey: true }), false);
  assert.equal(hotkeyFormat([step]), "Mod+K");
  assert.equal(hotkeyFormat([hotkeyFromEvent(press("KeyK", "k", { metaKey: true }), true)]), "Mod+K");
  assert.equal(hotkeyFormat([hotkeyFromEvent(press("KeyK", "k", { ctrlKey: true }), true)]), "Ctrl+K");
  assert.equal(hotkeyFormat([hotkeyFromEvent(press("KeyK", "k", { metaKey: true }), false)]), "Meta+K");
  assert.equal(hotkeyFromEvent(press("ShiftLeft", "Shift", { shiftKey: true }), false), null);
});

test("matches events against a step", () => {
  const step = hotkeyParse("Mod+K")[0];
  assert.equal(hotkeyMatches(step, press("KeyK", "k", { ctrlKey: true }), false), true);
  assert.equal(hotkeyMatches(step, press("KeyK", "k", { metaKey: true }), true), true);
  assert.equal(hotkeyMatches(step, press("KeyK", "k", { ctrlKey: true, shiftKey: true }), false), false);
  assert.equal(hotkeyMatches(step, press("KeyJ", "j", { ctrlKey: true }), false), false);
  // "?" is Shift+/ on a US layout, and a bare "?" step still matches it.
  assert.equal(hotkeyMatches(hotkeyParse("?")[0], press("Slash", "?", { shiftKey: true }), false), true);
});

test("recording commits one chord and ignores a lone modifier", () => {
  const opts = { apple: false };
  assert.equal(hotkeyRecordKey([], press("ControlLeft", "Control", { ctrlKey: true }), opts).status, "ignored");
  const done = hotkeyRecordKey([], press("KeyS", "s", { ctrlKey: true, shiftKey: true }), opts);
  assert.equal(done.status, "committed");
  assert.equal(hotkeyFormat(done.steps), "Mod+Shift+S");
  assert.equal(hotkeyRecordKey([], press("Escape", "Escape"), opts).status, "cancelled");
  assert.equal(hotkeyRecordKey([], press("Backspace", "Backspace"), opts).status, "cleared");
});

test("recording a sequence keeps adding steps until Enter, a chord or the limit", () => {
  const opts = { apple: false, sequence: true };
  let r = hotkeyRecordKey([], press("KeyG", "g"), opts);
  assert.equal(r.status, "recording");
  r = hotkeyRecordKey(r.steps, press("KeyI", "i"), opts);
  assert.equal(r.status, "recording");
  assert.equal(hotkeyFormat(r.steps), "G I");
  const back = hotkeyRecordKey(r.steps, press("Backspace", "Backspace"), opts);
  assert.equal(hotkeyFormat(back.steps), "G");
  assert.equal(back.status, "recording");
  const enter = hotkeyRecordKey(r.steps, press("Enter", "Enter"), opts);
  assert.equal(enter.status, "committed");
  assert.equal(hotkeyFormat(enter.steps), "G I");
  const third = hotkeyRecordKey(r.steps, press("KeyO", "o"), opts);
  assert.equal(third.status, "committed");
  assert.equal(hotkeyFormat(third.steps), "G I O");
  assert.equal(hotkeyRecordKey([], press("KeyK", "k", { ctrlKey: true }), opts).status, "committed");
});

test("validates against the field rules", () => {
  assert.equal(hotkeyValidate("", {}), "empty");
  assert.equal(hotkeyValidate("Mod+", {}), "invalid");
  assert.equal(hotkeyValidate("K", { requireModifier: true }), "modifier-required");
  assert.equal(hotkeyValidate("Shift+K", { requireModifier: true }), "modifier-required");
  assert.equal(hotkeyValidate("Mod+K", { requireModifier: true }), null);
  assert.equal(hotkeyValidate("G I", {}), "sequence-not-allowed");
  assert.equal(hotkeyValidate("G I", { sequence: true }), null);
});

test("finds duplicates, and sequences that shadow each other", () => {
  const bindings = [
    { id: "palette", shortcut: "Mod+K" },
    { id: "goto", shortcut: "G" },
    { id: "inbox", shortcut: "G I" },
  ];
  // Mod and Ctrl are the same key on Windows, not on a Mac.
  assert.deepEqual(hotkeyConflicts("Ctrl+K", bindings, { apple: false }).map((c) => [c.id, c.kind]), [["palette", "duplicate"]]);
  assert.deepEqual(hotkeyConflicts("Ctrl+K", bindings, { apple: true }), []);
  assert.deepEqual(hotkeyConflicts("g", bindings, { apple: false, ignoreId: "goto" }).map((c) => [c.id, c.kind]), [["inbox", "shadows"]]);
  assert.deepEqual(hotkeyConflicts("G I", bindings, { apple: false, ignoreId: "inbox" }).map((c) => [c.id, c.kind]), [["goto", "shadowed"]]);
  assert.deepEqual(hotkeyConflicts("Mod+J", bindings, { apple: false }), []);
  assert.deepEqual(hotkeyConflicts("nonsense+", bindings, { apple: false }), []);
});

test("knows what the browser and the OS keep", () => {
  assert.equal(hotkeyReservedBy("Mod+W", false), "browser");
  assert.equal(hotkeyReservedBy("Ctrl+W", false), "browser");
  assert.equal(hotkeyReservedBy("Mod+Q", true), "system");
  assert.equal(hotkeyReservedBy("Mod+Q", false), null);
  assert.equal(hotkeyReservedBy("Alt+F4", false), "system");
  assert.equal(hotkeyReservedBy("Alt+F4", true), null);
  assert.equal(hotkeyReservedBy("Mod+K", false), null);
});

test("search folds Arabic letter variants", () => {
  assert.equal(hotkeyTextMatches("إدارة المهام", "اداره"), true);
  assert.equal(hotkeyTextMatches("Open inbox", "INB"), true);
  assert.equal(hotkeyTextMatches("Open inbox", "zzz"), false);
  assert.equal(hotkeyTextMatches("anything", ""), true);
});
