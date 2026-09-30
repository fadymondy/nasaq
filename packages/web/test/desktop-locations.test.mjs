import assert from "node:assert/strict";
import { test } from "node:test";
import { baseName, checkLocationPath, isAbsolutePath, normalizePath, pathContains, pathStyle, samePath, shortenPath } from "../src/components/desktop-locations/location-path.ts";

test("isAbsolutePath", () => {
  assert.equal(isAbsolutePath("C:\\Users\\me"), true);
  assert.equal(isAbsolutePath("C:/Users/me"), true);
  assert.equal(isAbsolutePath("\\\\server\\share"), true);
  assert.equal(isAbsolutePath("/home/me"), true);
  assert.equal(isAbsolutePath("~/code"), true);
  assert.equal(isAbsolutePath("code/app"), false);
  assert.equal(isAbsolutePath("..\\x"), false);
  assert.equal(isAbsolutePath("  "), false);
});

test("pathStyle", () => {
  assert.equal(pathStyle("D:\\x"), "windows");
  assert.equal(pathStyle("\\\\srv\\s"), "windows");
  assert.equal(pathStyle("/x"), "posix");
});

test("normalizePath", () => {
  assert.equal(normalizePath("  C:/Sites//nasaq\\ "), "C:\\Sites\\nasaq");
  assert.equal(normalizePath("c:\\"), "C:\\");
  assert.equal(normalizePath("/a//b/"), "/a/b");
  assert.equal(normalizePath("/"), "/");
});

test("samePath is case-insensitive on Windows only", () => {
  assert.equal(samePath("C:\\Sites\\Nasaq", "c:/sites/nasaq/"), true);
  assert.equal(samePath("/a/B", "/a/b"), false);
});

test("pathContains respects segment boundaries", () => {
  assert.equal(pathContains("C:\\Sites", "C:\\Sites\\nasaq"), true);
  assert.equal(pathContains("C:\\Sites", "C:\\SitesX"), false);
  assert.equal(pathContains("/a/b", "/a/b"), true);
  assert.equal(pathContains("/a/b", "/a/bc"), false);
});

test("baseName", () => {
  assert.equal(baseName("D:\\Sites\\nasaq"), "nasaq");
  assert.equal(baseName("/home/me/app/"), "app");
  assert.equal(baseName("C:\\"), "C:");
});

test("checkLocationPath", () => {
  const have = ["C:\\Sites", "D:\\Data\\deep\\x"];
  assert.deepEqual(checkLocationPath("", have), { problem: "empty", warning: null });
  assert.equal(checkLocationPath("src", have).problem, "relative");
  assert.equal(checkLocationPath("c:/sites", have).problem, "duplicate");
  assert.equal(checkLocationPath("C:\\Sites\\nasaq", have).warning, "inside");
  assert.equal(checkLocationPath("D:\\Data", have).warning, "contains");
  assert.deepEqual(checkLocationPath("E:\\New", have), { problem: null, warning: null });
});

test("shortenPath keeps the root and the last two segments", () => {
  assert.equal(shortenPath("C:\\a"), "C:\\a");
  const long = "C:\\Users\\someone\\Documents\\projects\\client\\app";
  const out = shortenPath(long, 30);
  assert.ok(out.startsWith("C:"));
  assert.ok(out.endsWith("client\\app"));
  assert.ok(out.includes("\u2026"));
});
