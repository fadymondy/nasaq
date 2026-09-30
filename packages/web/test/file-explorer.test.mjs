import assert from "node:assert/strict";
import { test } from "node:test";
import { checkName, extension, fileKind, findNode, findPath, folderSize, sortNodes } from "../src/components/file-explorer/file-format.ts";

const tree = [
  { id: "docs", name: "Docs", kind: "folder", children: [{ id: "a", name: "a.pdf", kind: "file", size: 10 }, { id: "sub", name: "Sub", kind: "folder", children: [{ id: "deep", name: "deep.txt", kind: "file", size: 1 }] }] },
  { id: "z", name: "z.png", kind: "file", size: 5 },
];

test("extension", () => {
  assert.equal(extension("Photo.JPG"), "jpg");
  assert.equal(extension(".gitignore"), "");
  assert.equal(extension("noext"), "");
  assert.equal(extension("trailing."), "");
});

test("fileKind prefers MIME then extension", () => {
  assert.equal(fileKind({ name: "x", kind: "folder" }), "folder");
  assert.equal(fileKind({ name: "x.bin", kind: "file", mime: "image/png" }), "image");
  assert.equal(fileKind({ name: "x.pdf", kind: "file" }), "pdf");
  assert.equal(fileKind({ name: "x.ts", kind: "file" }), "code");
  assert.equal(fileKind({ name: "x.zip", kind: "file" }), "archive");
  assert.equal(fileKind({ name: "x.weird", kind: "file" }), "other");
});

test("findPath and findNode", () => {
  assert.deepEqual(findPath(tree, "deep").map((n) => n.id), ["docs", "sub", "deep"]);
  assert.equal(findPath(tree, "nope"), null);
  assert.equal(findNode(tree, "z").name, "z.png");
  assert.equal(findNode(tree, "nope"), null);
});

test("sortNodes puts folders first", () => {
  const nodes = [
    { id: "1", name: "b.txt", kind: "file", size: 5 },
    { id: "2", name: "a.txt", kind: "file" },
    { id: "3", name: "Zed", kind: "folder" },
    { id: "4", name: "c.txt", kind: "file", size: 1 },
  ];
  assert.deepEqual(sortNodes(nodes, "name").map((n) => n.id), ["3", "2", "1", "4"]);
  assert.deepEqual(sortNodes(nodes, "name", "desc").map((n) => n.id), ["3", "4", "1", "2"]);
  assert.deepEqual(sortNodes(nodes, "size").map((n) => n.id), ["3", "4", "1", "2"]);
  assert.deepEqual(sortNodes(nodes, "size", "desc").map((n) => n.id), ["3", "1", "4", "2"]);
});

test("sortNodes is numeric aware", () => {
  const nodes = [{ id: "a", name: "f10", kind: "file" }, { id: "b", name: "f2", kind: "file" }];
  assert.deepEqual(sortNodes(nodes).map((n) => n.id), ["b", "a"]);
});

test("checkName", () => {
  assert.equal(checkName("  ", []), "empty");
  assert.equal(checkName("..", []), "reserved");
  assert.equal(checkName("a/b", []), "invalid");
  assert.equal(checkName("a\\b", []), "invalid");
  assert.equal(checkName("What?", []), "invalid");
  assert.equal(checkName("Docs", ["docs"]), "duplicate");
  assert.equal(checkName("New", ["docs"]), null);
});

test("folderSize sums direct files only", () => {
  assert.equal(folderSize(tree[0]), 10);
  assert.equal(folderSize({ id: "e", name: "e", kind: "folder" }), 0);
});
