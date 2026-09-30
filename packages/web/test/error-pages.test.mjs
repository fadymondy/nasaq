import assert from "node:assert/strict";
import { test } from "node:test";
import { statusCodeFor } from "../src/components/error-pages/error-pages-kinds.ts";

test("statusCodeFor gives codes only to HTTP-like kinds", () => {
  assert.equal(statusCodeFor("not-found"), "404");
  assert.equal(statusCodeFor("server-error"), "500");
  assert.equal(statusCodeFor("forbidden"), "403");
  assert.equal(statusCodeFor("maintenance"), "503");
  assert.equal(statusCodeFor("offline"), undefined);
  assert.equal(statusCodeFor("coming-soon"), undefined);
});
