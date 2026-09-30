import assert from "node:assert/strict";
import { test } from "node:test";
import { clampPercent, formatDisk, formatMemory, isTransitional, powerActionsFor, validateLimits } from "../src/components/server-card/server-format.ts";

test("powerActionsFor depends on state", () => {
  assert.deepEqual(powerActionsFor("running"), ["restart", "stop", "force-stop"]);
  assert.deepEqual(powerActionsFor("stopped"), ["start"]);
  assert.deepEqual(powerActionsFor("error"), ["start", "restart", "force-stop"]);
  assert.deepEqual(powerActionsFor("restarting"), ["force-stop"]);
  assert.deepEqual(powerActionsFor("provisioning"), []);
});

test("isTransitional", () => {
  assert.equal(isTransitional("starting"), true);
  assert.equal(isTransitional("running"), false);
});

test("validateLimits accepts in range and flags the rest", () => {
  const ok = validateLimits({ cpuCores: "4", memoryMb: "8192", diskGb: "100" });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.value, { cpuCores: 4, memoryMb: 8192, diskGb: 100 });
  const bad = validateLimits({ cpuCores: "0", memoryMb: "12.5", diskGb: "abc" });
  assert.equal(bad.value, null);
  assert.equal(bad.errors.cpuCores, "range");
  assert.equal(bad.errors.memoryMb, "integer");
  assert.equal(bad.errors.diskGb, "integer");
});

test("formatting", () => {
  assert.equal(formatDisk(512), "512 GB");
  assert.equal(formatDisk(2048), "2 TB");
  assert.equal(formatMemory(512), "512 MB");
  assert.equal(formatMemory(8192), "8 GB");
  assert.equal(clampPercent(140), 100);
  assert.equal(clampPercent(-3), 0);
  assert.equal(clampPercent(Number.NaN), 0);
});
