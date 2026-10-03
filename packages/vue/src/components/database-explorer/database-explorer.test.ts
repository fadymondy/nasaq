import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqDatabaseExplorer, buildSelectSql, cellKind, formatCell, isReadOnlySql, pushHistory, quoteIdent, resultToCsv, type DatabaseSchema, type QueryOutcome } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const schemas: DatabaseSchema[] = [
  {
    name: "public",
    tables: [
      { name: "users", rowCount: 1280, columns: [{ name: "id", type: "uuid", primaryKey: true }, { name: "org_id", type: "uuid", nullable: true, references: "orgs.id" }] },
      { name: "orders", columns: [{ name: "id", type: "uuid" }] },
      { name: "active", kind: "view", columns: [] },
    ],
  },
];
const ok: QueryOutcome = { columns: ["id", "name"], rows: [[1, "Layla"], [2, null]], durationMs: 7 };

function setup(onRunQuery = vi.fn(async (_sql: string): Promise<QueryOutcome> => ok), extra: Record<string, unknown> = {}) {
  const w = mount(NqDatabaseExplorer, { props: { schemas, onRunQuery, ...extra }, attachTo: document.body });
  return { w, onRunQuery };
}
type W = ReturnType<typeof setup>["w"];
const editor = (w: W) => w.get("textarea");
const runButton = (w: W) => w.findAll("button").find((b) => b.text() === "Run")!;

describe("helpers", () => {
  it("quotes, builds SQL, formats and exports", () => {
    expect(quoteIdent('my "t"')).toBe('"my ""t"""');
    expect(buildSelectSql("users", "public", 50)).toBe('SELECT * FROM "public"."users" LIMIT 50;');
    expect(cellKind(null)).toBe("null");
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
    expect(isReadOnlySql("  -- x\n select 1")).toBe(true);
    expect(isReadOnlySql("delete from t")).toBe(false);
    expect(pushHistory(["a", "b"], "b")).toEqual(["b", "a"]);
    expect(resultToCsv(["a"], [["=1+1"], ["x,y"]])).toBe("a\r\n'=1+1\r\n\"x,y\"");
  });
});

describe("NqDatabaseExplorer", () => {
  it("renders the section, the tree with row counts and the empty results", () => {
    const { w } = setup();
    const root = w.get('[data-slot="database-explorer"]');
    expect(root.attributes("aria-label")).toBe("Database explorer");
    expect(root.classes()).toContain("lg:grid-cols-[16rem_minmax(0,1fr)]");
    expect(w.findAll('[role="treeitem"]').map((n) => n.text())).toEqual(["public", "users1,280", "orders", "active"]);
    expect(w.text()).toContain("Run a query to see rows here");
    expect(runButton(w).attributes("disabled")).toBeDefined();
  });

  it("filters the tree", async () => {
    const { w } = setup();
    await w.get('input[type="search"]').setValue("ord");
    expect(w.findAll('[role="treeitem"]').map((n) => n.text())).toEqual(["public", "orders"]);
    await w.get('input[type="search"]').setValue("zzz");
    expect(w.text()).toContain("No tables match.");
  });

  it("runs a statement, shows rows and a NULL chip, and records history", async () => {
    const { w, onRunQuery } = setup();
    await editor(w).setValue("select * from users");
    await runButton(w).trigger("click");
    await flushPromises();
    expect(onRunQuery).toHaveBeenCalledWith("select * from users");
    expect(w.get('[role="status"]').text()).toContain("2 rows · 7 ms");
    expect(w.text()).toContain("Layla");
    expect(w.text()).toContain("NULL");
    expect(w.findAll('[role="tab"]')[2]!.text()).toContain("1");
  });

  it("runs with Ctrl+Enter", async () => {
    const { w, onRunQuery } = setup();
    await editor(w).setValue("select 1");
    await editor(w).trigger("keydown", { key: "Enter", ctrlKey: true });
    await flushPromises();
    expect(onRunQuery).toHaveBeenCalledTimes(1);
  });

  it("asks before a write and runs it only after confirming", async () => {
    const { w, onRunQuery } = setup();
    await editor(w).setValue("delete from users");
    expect(w.text()).toContain("Changes data");
    await runButton(w).trigger("click");
    await flushPromises();
    expect(onRunQuery).not.toHaveBeenCalled();
    const dialog = document.body.querySelector('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Run a query that changes data?");
    expect(dialog.textContent).toContain("delete from users");
    const confirm = [...dialog.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Run query")!;
    confirm.click();
    await flushPromises();
    expect(onRunQuery).toHaveBeenCalledWith("delete from users");
  });

  it("does not run when the dialog is cancelled", async () => {
    const { w, onRunQuery } = setup();
    await editor(w).setValue("update t set a = 1");
    await runButton(w).trigger("click");
    await flushPromises();
    (document.body.querySelector('[data-slot="alert-dialog-cancel"]') as HTMLElement).click();
    await flushPromises();
    expect(onRunQuery).not.toHaveBeenCalled();
  });

  it("skips the dialog when confirmWrites is false", async () => {
    const { w, onRunQuery } = setup(undefined, { confirmWrites: false });
    await editor(w).setValue("delete from users");
    await runButton(w).trigger("click");
    await flushPromises();
    expect(onRunQuery).toHaveBeenCalledOnce();
  });

  it("shows a database error in an alert and a generic one on rejection", async () => {
    const { w } = setup(vi.fn(async () => ({ error: "relation missing" })));
    await editor(w).setValue("select 1");
    await runButton(w).trigger("click");
    await flushPromises();
    expect(w.get('[data-slot="alert"]').attributes("role")).toBe("alert");
    expect(w.text()).toContain("relation missing");
    const bad = setup(vi.fn(async () => Promise.reject(new Error("x"))));
    await editor(bad.w).setValue("select 1");
    await runButton(bad.w).trigger("click");
    await flushPromises();
    expect(bad.w.text()).toContain("Something went wrong. Try again.");
  });

  it("picks a table: fills the editor, runs it and shows the structure", async () => {
    const { w, onRunQuery } = setup();
    await w.findAll('[role="treeitem"]')[1]!.trigger("click");
    await flushPromises();
    expect(onRunQuery).toHaveBeenCalledWith('SELECT * FROM "public"."users" LIMIT 100;');
    expect((editor(w).element as HTMLTextAreaElement).value).toBe('SELECT * FROM "public"."users" LIMIT 100;');
    await w.findAll('[role="tab"]')[1]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    const structure = w.get('table[aria-label="users"]');
    expect(structure.text()).toContain("uuid");
    expect(structure.text()).toContain("Primary key");
    expect(structure.text()).toContain("orgs.id");
  });

  it("shows the default table's structure without running", async () => {
    const { w, onRunQuery } = setup(undefined, { defaultTable: { schema: "public", table: "users" } });
    await w.findAll('[role="tab"]')[1]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    expect(w.find('table[aria-label="users"]').exists()).toBe(true);
    expect(onRunQuery).not.toHaveBeenCalled();
  });

  it("reuses a history entry and clears the history", async () => {
    const { w } = setup();
    await editor(w).setValue("select 1");
    await runButton(w).trigger("click");
    await flushPromises();
    await w.findAll('[role="tab"]')[2]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    await editor(w).setValue("");
    await w.get('button[title="Load into the editor"]').trigger("click");
    expect((editor(w).element as HTMLTextAreaElement).value).toBe("select 1");
    await w.findAll("button").find((b) => b.text() === "Clear history")!.trigger("click");
    expect(w.text()).toContain("Queries you run appear here");
  });

  it("calls onExport from Download CSV", async () => {
    const onExport = vi.fn();
    const { w } = setup(undefined, { onExport });
    await editor(w).setValue("select 1");
    await runButton(w).trigger("click");
    await flushPromises();
    await w.findAll("button").find((b) => b.text() === "Download CSV")!.trigger("click");
    expect(onExport).toHaveBeenCalledWith(ok);
  });

  it("uses Arabic strings", () => {
    document.documentElement.lang = "ar";
    const { w } = setup();
    expect(w.get('[data-slot="database-explorer"]').attributes("aria-label")).toBe("مستكشف قاعدة البيانات");
    expect(w.text()).toContain("نفّذ استعلامًا لعرض الصفوف هنا");
    document.documentElement.lang = "";
  });
});
