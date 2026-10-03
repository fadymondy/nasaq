// The Blade schema-form example under real Alpine, plus the list logic on a tree built in the test.
import { describe, expect, it, vi } from "vitest";
import Alpine from "alpinejs";
import { mount, setup, tick } from "./_float-setup";
import { schemaFormTree } from "../src/alpine/schema-form-logic";

setup();
vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="schema-form"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement) => Alpine.$data(root(host)) as any;

const listSchema = {
  type: "object",
  properties: {
    contacts: {
      type: "array",
      title: "Contacts",
      minItems: 1,
      items: { type: "object", required: ["name"], properties: { name: { type: "string", title: "Name" }, phone: { type: "string", title: "Phone" } } },
    },
    note: { type: "string", title: "Note" },
  },
};

async function fresh(value?: unknown, rules?: unknown[]) {
  const host = document.createElement("div");
  const config = { tree: schemaFormTree(listSchema as never).root, value, rules };
  host.dataset.config = JSON.stringify(config);
  host.innerHTML = `<form data-slot="schema-form" x-data='nqSchemaForm(${JSON.stringify(config).replace(/'/g, "&#39;")})'></form>`;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("schema-form (Blade example)", () => {
  it("draws the fields of the schema", async () => {
    const host = await mount("schema-form");
    await tick(60);
    expect([...host.querySelectorAll("[data-schema-path]")].map((e) => e.getAttribute("data-schema-path"))).toEqual(["name", "status", "owner"]);
    expect(host.querySelector('[data-slot="schema-form-summary"]')).not.toBeNull();
  });

  it("reports a required field on save and lists it in the summary", async () => {
    const host = await mount("schema-form");
    await tick(60);
    let fired = false;
    root(host).addEventListener("nq-schema-form-submit", () => (fired = true));
    await data(host).submit();
    await tick(60);
    expect(fired).toBe(false);
    expect(data(host).msg("name")).not.toBe("");
    expect(data(host).summary()).toEqual(["name"]);
    expect(data(host).showSummary()).toBe(true);
  });

  it("submits the output and shows the server's field errors", async () => {
    const host = await mount("schema-form");
    await tick(60);
    data(host).write("name", "Atlas");
    data(host).write("status", "live");
    let got: unknown;
    root(host).addEventListener("nq-schema-form-submit", (e) => {
      const d = (e as CustomEvent).detail;
      got = d.value;
      d.waitUntil(Promise.resolve({ fieldErrors: { name: "Taken." } }));
    });
    await data(host).submit();
    await tick(60);
    expect(got).toEqual({ name: "Atlas", status: "live", owner: null });
    expect(data(host).msg("name")).toBe("Taken.");
    expect(data(host).status).toBe("failed");
    data(host).write("name", "Atlas 2");
    expect(data(host).msg("name")).toBe("");
  });

  it("saves when the promise resolves without errors", async () => {
    const host = await mount("schema-form");
    await tick(60);
    data(host).write("name", "Atlas");
    root(host).addEventListener("nq-schema-form-submit", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({})));
    await data(host).submit();
    expect(data(host).isSaved()).toBe(true);
    data(host).reset();
    expect(data(host).isSaved()).toBe(false);
    expect(data(host).output()).toEqual({ name: null, status: null, owner: null });
  });
});

describe("schema-form lists", () => {
  it("adds, titles, moves and removes groups in place", async () => {
    const host = await fresh();
    const d = data(host);
    expect(d.count("contacts")).toBe(0);
    d.add("contacts");
    expect(d.count("contacts")).toBe(1);
    d.write("contacts[0].name", "Layla");
    d.add("contacts");
    d.write("contacts[1].name", "Omar");
    expect(d.rows("contacts").map((r: { title: string }) => r.title)).toEqual(["Layla", "Omar"]);
    const key = d.rows("contacts")[0].key;
    d.move("contacts", 0, 1);
    expect(d.rows("contacts").map((r: { title: string }) => r.title)).toEqual(["Omar", "Layla"]);
    expect(d.rows("contacts")[1].key).toBe(key);
    d.ask("contacts", 1);
    expect(d.pendOpen).toBe(true);
    d.confirmRemove("contacts");
    expect(d.count("contacts")).toBe(1);
    expect(d.cannotRemove("contacts")).toBe(true);
  });

  it("collapses groups and reports the issues inside one", async () => {
    const host = await fresh({ contacts: [{}] });
    const d = data(host);
    const [row] = d.rows("contacts");
    d.toggleRow(row.key);
    expect(d.isCollapsed(row.key)).toBe(true);
    expect(d.allCollapsed("contacts")).toBe(true);
    await d.submit();
    expect(d.hasIssues("contacts[0]")).toBe(true);
    expect(d.isCollapsed(row.key)).toBe(false);
  });

  it("shows fields by rules and leaves them out of the output", async () => {
    const rules = [{ event: "change", conditions: { kind: "group", id: "g", join: "and", children: [{ kind: "condition", id: "c", field: "note", op: "is", value: "show" }] }, actions: [{ id: "a", type: "show", config: { target: "contacts" } }] }];
    const host = await fresh({ contacts: [{ name: "A" }] }, rules);
    const d = data(host);
    expect(d.visible("contacts")).toBe(false);
    expect(d.output()).toEqual({ note: null });
    d.write("note", "show");
    expect(d.visible("contacts")).toBe(true);
    expect(d.output()).toEqual({ note: "show", contacts: [{ name: "A", phone: null }] });
  });
});
