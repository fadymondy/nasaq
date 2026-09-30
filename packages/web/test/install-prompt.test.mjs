import assert from "node:assert/strict";
import { test } from "node:test";
import { detectInstallPlatform, nextAskAt, shouldAsk } from "../src/components/install-prompt/install-prompt-platform.ts";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

test("detectInstallPlatform", () => {
  assert.equal(detectInstallPlatform(IPHONE, false), "ios");
  assert.equal(detectInstallPlatform(CHROME, false), "unsupported");
  assert.equal(detectInstallPlatform(CHROME, false, true), "prompt");
  assert.equal(detectInstallPlatform(IPHONE, true), "installed");
});

test("snooze", () => {
  const now = 1_000_000;
  const next = nextAskAt(now, 14);
  assert.equal(next - now, 14 * 86_400_000);
  assert.equal(shouldAsk(now, next), false);
  assert.equal(shouldAsk(next, next), true);
  assert.equal(shouldAsk(now, null), true);
});
