// The Blade database-explorer example (packages/php/examples/rendered/database-explorer.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { buildSelectSql, cellKind, formatCell, isReadOnlySql, pushHistory, quoteIdent, resultToCsv, sortRows } from "../src/alpine/database-explorer-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

type Outcome = { error: string } | { columns: string[]; rows: unknown[][]; durationMs?: number; affectedRows?: number; truncated?: boolean };
const ok: Outcome = { columns: ["id", "name"], rows: [[2, "Omar"], [1, "Layla"], [3, null]], durationMs: 7 };

async function mount(answer: (sql: string) => Promise<Outcome> = async () => ok) {
  const host = document.createElement("div");
  host.innerHTML = rendered("database-explorer");
  const seen: string[] = [];
  host.addEventListener("nq-database-query", (e) => {
    const detail = (e as CustomEvent).detail;
    seen.push(detail.sql);
    detail.waitUntil(answer(detail.sql));
  });
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return { host, root: host.querySelector<HTMLElement>('[data-slot="database-explorer"]')!, seen };
}

const editor = (root: HTMLElement) => root.querySelector<HTMLTextAreaElement>("textarea")!;
const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;
const type = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const items = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const names = (root: HTMLElement) => items(root).map((n) => n.textContent!.replace(/\s+/g, " ").trim());
const tabs = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
const summary = (root: HTMLElement) => root.querySelector('[data-slot="database-explorer-summary"]')!.textContent;
const dialog = () => document.body.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]');
const run = async (root: HTMLElement, sql: string) => {
  await type(editor(root), sql);
  button(root, "Run").click();
  await tick(80);
};

describe("database-explorer helpers", () => {
  it("quotes, builds SQL, formats, exports and sorts", () => {
    expect(quoteIdent('my "t"')).toBe('"my ""t"""');
    expect(buildSelectSql("users", "public", 50)).toBe('SELECT * FROM "public"."users" LIMIT 50;');
    expect(cellKind(null)).toBe("null");
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
    expect(isReadOnlySql("  -- x\n select 1")).toBe(true);
    expect(isReadOnlySql("delete from t")).toBe(false);
    expect(pushHistory(["a", "b"], "b")).toEqual(["b", "a"]);
    expect(resultToCsv(["a"], [["=1+1"], ["x,y"]])).toBe("a\r\n'=1+1\r\n\"x,y\"");
    const rows = [[2], [null], [1]];
    expect(sortRows(rows, 0, "asc", (r, i) => r[i]).map((r) => r[0])).toEqual([1, 2, null]);
    expect(sortRows(rows, 0, "desc", (r, i) => r[i]).map((r) => r[0])).toEqual([2, 1, null]);
  });
});

describe("database-explorer (Blade example)", () => {
  it("renders the section, the tree with row counts and the empty results", async () => {
    const { root } = await mount();
    expect(root.getAttribute("aria-label")).toBe("Database explorer");
    expect(root.className).toContain("lg:grid-cols-[16rem_minmax(0,1fr)]");
    expect(names(root)).toEqual(["public", "users 1,280", "orders 5,421", "active_users"]);
    expect(root.textContent).toContain("Run a query to see rows here");
    expect(button(root, "Run").disabled).toBe(true);
  });

  it("collapses a schema and filters the tree", async () => {
    const { root } = await mount();
    items(root)[0]!.click();
    await tick();
    expect(names(root)).toEqual(["public"]);
    items(root)[0]!.click();
    await tick();
    expect(items(root)).toHaveLength(4);
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    await type(search, "ord");
    expect(names(root)).toEqual(["public", "orders 5,421"]);
    await type(search, "zzz");
    expect(root.textContent).toContain("No tables match.");
  });

  it("moves through the tree with the keyboard", async () => {
    const { root } = await mount();
    items(root)[0]!.focus();
    items(root)[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await tick();
    expect(document.activeElement).toBe(items(root)[1]);
    items(root)[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await tick();
    expect(document.activeElement).toBe(items(root)[0]);
  });

  it("runs a statement, shows rows and a NULL chip, and records history", async () => {
    const { root, seen } = await mount();
    await run(root, "select * from users");
    expect(seen).toEqual(["select * from users"]);
    expect(summary(root)).toBe("3 rows · 7 ms");
    expect(root.textContent).toContain("Layla");
    expect(root.textContent).toContain("NULL");
    expect(tabs(root)[2]!.textContent).toContain("1");
  });

  it("sorts by a column, nulls last, and cycles back", async () => {
    const { root } = await mount();
    await run(root, "select 1");
    const firstCells = () => [...root.querySelectorAll('[data-slot="table-body"] [role="row"]')].map((r) => r.querySelector('[role="cell"]')!.textContent!.trim());
    expect(firstCells()).toEqual(["2", "1", "3"]);
    const head = root.querySelector<HTMLElement>('[role="columnheader"][data-slot="table-head"]')!;
    head.querySelector("button")!.click();
    await tick();
    expect(head.getAttribute("aria-sort")).toBe("ascending");
    expect(firstCells()).toEqual(["1", "2", "3"]);
    head.querySelector("button")!.click();
    await tick();
    expect(firstCells()).toEqual(["3", "2", "1"]);
    head.querySelector("button")!.click();
    await tick();
    expect(head.getAttribute("aria-sort")).toBe("none");
  });

  it("runs with Ctrl+Enter", async () => {
    const { root, seen } = await mount();
    await type(editor(root), "select 1");
    editor(root).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await tick();
    expect(seen).toEqual(["select 1"]);
  });

  it("asks before a write and runs it only after confirming", async () => {
    const { root, seen } = await mount();
    await type(editor(root), "delete from users");
    expect(root.textContent).toContain("Changes data");
    button(root, "Run").click();
    await tick();
    expect(seen).toEqual([]);
    expect(dialog()!.textContent).toContain("Run a query that changes data?");
    expect(dialog()!.textContent).toContain("delete from users");
    button(dialog()!, "Run query").click();
    await tick(80);
    expect(seen).toEqual(["delete from users"]);
  });

  it("does not run when the dialog is cancelled", async () => {
    const { root, seen } = await mount();
    await type(editor(root), "update t set a = 1");
    button(root, "Run").click();
    await tick();
    document.body.querySelector<HTMLElement>('[data-slot="alert-dialog-cancel"]')!.click();
    await tick(80);
    expect(seen).toEqual([]);
    expect(dialog()?.hasAttribute("data-open") ?? false).toBe(false);
  });

  it("shows a database error in an alert and a generic one on rejection", async () => {
    const failing = await mount(async () => ({ error: "relation missing" }));
    await run(failing.root, "select 1");
    const alert = failing.root.querySelector<HTMLElement>('[data-slot="alert"][role="alert"]')!;
    expect(alert.textContent).toContain("relation missing");
    expect((alert.parentElement as HTMLElement).style.display).not.toBe("none");
    failing.host.remove();
    const rejecting = await mount(() => Promise.reject(new Error("x")));
    await run(rejecting.root, "select 1");
    expect(rejecting.root.textContent).toContain("Something went wrong. Try again.");
  });

  it("picks a table: fills the editor, runs it and shows the structure", async () => {
    const { root, seen } = await mount();
    items(root)[1]!.click();
    await tick(80);
    expect(seen).toEqual(['SELECT * FROM "public"."users" LIMIT 100;']);
    expect(editor(root).value).toBe('SELECT * FROM "public"."users" LIMIT 100;');
    expect(items(root)[1]!.getAttribute("aria-selected")).toBe("true");
    tabs(root)[1]!.click();
    await tick();
    const structure = root.querySelector<HTMLElement>('[role="table"][aria-label="users"]')!;
    expect(structure.textContent).toContain("uuid");
    expect(structure.textContent).toContain("Primary key");
    items(root)[2]!.click();
    await tick(80);
    expect(root.querySelector('[role="table"][aria-label="orders"]')!.textContent).toContain("users.id");
  });

  it("reuses a history entry and clears the history", async () => {
    const { root } = await mount();
    await run(root, "select 1");
    tabs(root)[2]!.click();
    await tick();
    await type(editor(root), "");
    root.querySelector<HTMLElement>('button[title="Load into the editor"]')!.click();
    await tick();
    expect(editor(root).value).toBe("select 1");
    button(root, "Clear history").click();
    await tick();
    expect(root.textContent).toContain("Queries you run appear here");
  });

  it("fires nq-database-export from Download CSV", async () => {
    const { host, root } = await mount();
    const onExport = vi.fn((e: Event) => e.preventDefault());
    host.addEventListener("nq-database-export", onExport);
    await run(root, "select 1");
    button(root, "Download CSV").click();
    await tick();
    expect(onExport).toHaveBeenCalledTimes(1);
    expect((onExport.mock.calls[0]![0] as CustomEvent).detail.result).toMatchObject({ columns: ["id", "name"] });
  });
});
