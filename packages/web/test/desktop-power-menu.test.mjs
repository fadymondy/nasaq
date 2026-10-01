import assert from "node:assert/strict";
import { test } from "node:test";
import { desktopPowerConfirm, desktopPowerLabels, desktopPowerMenu } from "../src/components/desktop-os-shell/desktop-power-menu.ts";

const noop = () => undefined;

test("desktopPowerMenu keeps only handled actions, in order, with separators between groups", () => {
  const menu = desktopPowerMenu({ onLogOut: noop, onSleep: noop, onAbout: noop, onShutDown: noop, appName: "ToGO" });
  assert.equal(menu.id, "system");
  assert.equal(menu.label, "System");
  assert.deepEqual(menu.items.map((i) => i.id), ["about", "sleep", "shutDown", "logOut"]);
  assert.equal(menu.items[0].label, "About ToGO");
  assert.deepEqual(menu.items.map((i) => Boolean(i.separated)), [false, true, false, true]);
  assert.deepEqual(menu.items.map((i) => Boolean(i.danger)), [false, false, false, true]);
  assert.equal(desktopPowerMenu({ onSleep: noop }).items[0].separated, undefined);
});

test("desktopPowerMenu localises and takes overrides", () => {
  const menu = desktopPowerMenu({ onAbout: noop, onRestart: noop, locale: "ar-SA", labels: { restart: "أعد" }, label: "قائمة" });
  assert.equal(menu.label, "قائمة");
  assert.deepEqual(menu.items.map((i) => i.label), ["حول", "أعد"]);
  assert.equal(desktopPowerLabels().sleep, "Sleep");
});

test("confirm guards restart, shut down and log out but not sleep", async () => {
  const calls = [];
  const asked = [];
  const answer = { restart: false, logOut: true };
  const menu = desktopPowerMenu({
    onSleep: () => calls.push("sleep"),
    onRestart: () => calls.push("restart"),
    onLogOut: () => calls.push("logOut"),
    confirm: async (p) => (asked.push(p.action), answer[p.action]),
  });
  for (const item of menu.items) item.onSelect();
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(asked, ["restart", "logOut"]);
  assert.deepEqual(calls, ["sleep", "logOut"]);
  assert.equal(desktopPowerConfirm("sleep", desktopPowerLabels()), null);
  assert.equal(desktopPowerConfirm("shutDown", desktopPowerLabels()).danger, true);
});
