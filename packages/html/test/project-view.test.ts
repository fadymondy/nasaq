// The project view (Blade example, as rendered by Laravel) under real Alpine with the Nasaq runtime.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { projectListPatch, projectMemoryMatches, projectParseTags } from "../src/alpine/project-view-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

let shared: Awaited<ReturnType<typeof build>> | null = null;

afterAll(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

// The page is large, so it is mounted once and every test starts by resetting the state it touches.
async function build() {
  const host = document.createElement("div");
  host.innerHTML = rendered("project-view");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="project-view"]')!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (): any => (Alpine as any).$data(root);
  return { host, root, data };
}

async function mount() {
  shared ??= await build();
  return shared;
}

/** Answer every event of this name with the given outcome and collect the details. */
function answer(root: HTMLElement, name: string, outcome: unknown = undefined) {
  const seen: Record<string, unknown>[] = [];
  const handler = (e: Event) => {
    const d = (e as CustomEvent).detail;
    seen.push(d);
    d.wait?.(Promise.resolve(outcome));
  };
  root.addEventListener(name, handler);
  cleanups.push(() => root.removeEventListener(name, handler));
  return seen;
}
const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe("project-view logic", () => {
  it("parses tags", () => {
    expect(projectParseTags("API, #billing,, api\nرسوم، Pay")).toEqual(["api", "billing", "رسوم", "pay"]);
  });
  it("matches memories by kind, every tag and text", () => {
    const row = { kind: "fact", tags: ["a", "b"], haystack: "refunds per card" };
    expect(projectMemoryMatches(row, { query: "", tags: ["a", "b"], kind: "all" })).toBe(true);
    expect(projectMemoryMatches(row, { query: "", tags: ["a", "c"], kind: "all" })).toBe(false);
    expect(projectMemoryMatches(row, { query: " REFUNDS ", tags: [], kind: "fact" })).toBe(true);
    expect(projectMemoryMatches(row, { query: "", tags: [], kind: "decision" })).toBe(false);
  });
  it("maps list edits to patches", () => {
    expect(projectListPatch("assignee", "")).toEqual({ assigneeId: null });
    expect(projectListPatch("estimate", "6")).toEqual({ estimateHours: 6 });
    expect(projectListPatch("due", "2026-10-01")).toEqual({ dueDate: "2026-10-01" });
    expect(projectListPatch("nope", "x")).toBeNull();
  });
});

describe("project-view (Blade example)", { timeout: 120000 }, () => {
  it("renders every part with USD and the bilingual markup", async () => {
    const { host, root } = await mount();
    for (const slot of ["overview", "board", "issue-table", "files", "feed", "memory", "settings", "danger", "new-issue"]) {
      expect(host.querySelector(`[data-slot="project-${slot}"]`), slot).not.toBeNull();
    }
    expect(root.textContent).toMatch(/\$/);
    expect(root.textContent).not.toMatch(/₪|EGP/);
  });

  it("fires nq-project-tab when the tab changes", async () => {
    const { root, data } = await mount();
    let tab = "";
    root.addEventListener("nq-project-tab", (e) => (tab = (e as CustomEvent).detail.tab));
    data().tab = "overview";
    await tick();
    data().tab = "list";
    await tick();
    expect(tab).toBe("list");
  });

  it("filters the feed and updates the count", async () => {
    const { host, data } = await mount();
    data().clearFeed();
    await tick();
    const items = () => [...host.querySelectorAll<HTMLElement>("[data-feed-item]")];
    const total = items().length;
    data().feedKind = "comment";
    await tick();
    const shown = items().filter((i) => !i.hidden);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(total);
    expect(shown.every((i) => i.dataset.kind === "comment")).toBe(true);
    expect(host.querySelector("[data-feed-count]")!.textContent).toContain(String(shown.length));
    data().feedKind = "no-such-kind";
    await tick();
    expect(items().every((i) => i.hidden)).toBe(true);
    expect(host.querySelector<HTMLElement>("[data-feed-nomatch]")!.hidden).toBe(false);
    data().clearFeed();
    await tick();
    expect(items().every((i) => !i.hidden)).toBe(true);
  });

  it("searches and tag-filters the memory", async () => {
    const { host, data } = await mount();
    const items = () => [...host.querySelectorAll<HTMLElement>("[data-mem-item]")];
    const visible = () => items().filter((i) => !i.hidden).length;
    data().clearMemory();
    await tick();
    expect(visible()).toBe(3);
    data().memQuery = "vat";
    await tick();
    expect(visible()).toBe(1);
    data().clearMemory();
    data().toggleMemTag("payments");
    await tick();
    expect(visible()).toBe(2);
    data().memKind = "decision";
    await tick();
    expect(visible()).toBe(1);
    data().memQuery = "zzz";
    await tick();
    expect(visible()).toBe(0);
    expect(host.querySelector<HTMLElement>("[data-mem-nomatch]")!.hidden).toBe(false);
  });

  it("saves a memory through nq-project-memory-save", async () => {
    const { root, data } = await mount();
    const seen = answer(root, "nq-project-memory-save");
    data().openMemory(-1);
    data().memText = "Invoices go out monthly";
    data().memTagsText = "Billing, #ops";
    await data().saveMemory();
    expect(seen).toHaveLength(1);
    expect((seen[0] as { input: unknown }).input).toMatchObject({ kind: "fact", text: "Invoices go out monthly", tags: ["billing", "ops"] });
    expect(data().memOpen).toBe(false);
  });

  it("creates an issue, and asks for a title first", async () => {
    const { root, data } = await mount();
    const seen = answer(root, "nq-project-create-issue");
    data().newOpen = true;
    await data().submitNew();
    expect(seen).toHaveLength(0);
    expect(data().newError).not.toBe("");
    data().newTitle = "Fix the footer";
    await data().submitNew();
    expect(seen[0]).toMatchObject({ input: { title: "Fix the footer", type: "task", priority: "medium" } });
    expect(data().newOpen).toBe(false);
  });

  it("keeps the dialog open and shows the host error when creating fails", async () => {
    const { root, data } = await mount();
    answer(root, "nq-project-create-issue", { error: "Nope" });
    data().newOpen = true;
    data().newTitle = "x";
    await data().submitNew();
    expect(data().newError).toBe("Nope");
    expect(data().newOpen).toBe(true);
  });

  it("draws priority flags and assignee avatars in the List rows", async () => {
    const { root } = await mount();
    const table = root.querySelector('[data-slot="project-issue-table"]')!;
    const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
    const rows = [...table.querySelectorAll<HTMLElement>('[role="row"]')].filter((r) => r.querySelectorAll('[role="cell"]').length > 3);
    expect(rows.length).toBeGreaterThan(0);
    const shown = (r: Element, sel: string) => [...r.querySelectorAll(sel)].filter((e) => visible(e.parentElement!));
    for (const r of rows) {
      expect(shown(r, 'svg[style*="color"]').length).toBe(1);
    }
    const withAvatar = rows.filter((r) => shown(r, '[data-slot="avatar"]').length === 1);
    expect(withAvatar.length).toBeGreaterThan(0);
  });

  it("sends a list edit as an update patch and an open on row click", async () => {
    const { root, data } = await mount();
    const seen = answer(root, "nq-project-update-issue");
    const opened = answer(root, "nq-project-open-issue");
    const detail: Record<string, unknown> = { row: { id: "i1", key: "NSQ-1" }, column: "estimate", value: "6" };
    await data().onListEdit(new CustomEvent("nq-data-table-edit", { detail }));
    expect(seen[0]).toMatchObject({ id: "i1", patch: { estimateHours: 6 } });
    expect(await (detail.promise as Promise<unknown>)).toBeUndefined();
    data().onListRow(new CustomEvent("nq-data-table-row-click", { detail: { row: { id: "i2" } } }));
    expect(opened[0]).toMatchObject({ id: "i2" });
  });

  it("reports a failed list edit through the promise", async () => {
    const { root, data } = await mount();
    answer(root, "nq-project-update-issue", { error: "Locked" });
    const detail: Record<string, unknown> = { row: { id: "i1" }, column: "title", value: "New" };
    await data().onListEdit(new CustomEvent("nq-data-table-edit", { detail }));
    expect(await (detail.promise as Promise<unknown>)).toEqual({ error: "Locked" });
  });

  it("sends a board drop and uploads files", async () => {
    const { root, data } = await mount();
    const moves = answer(root, "nq-project-move-issue");
    await data().onMove(new CustomEvent("move", { detail: { cardId: "i2", toColumn: "doing", toIndex: 1 } }));
    expect(moves[0]).toMatchObject({ id: "i2", statusId: "doing", index: 1 });
    expect(data().moveError).toBe("");
    answer(root, "nq-project-move-issue", { error: "No" });
    await data().onMove(new CustomEvent("move", { detail: { cardId: "i2", toColumn: "done", toIndex: 0 } }));
    expect(data().moveError).toBe("No");

    const uploads = answer(root, "nq-project-upload");
    const input = root.querySelector<HTMLInputElement>("[data-pv-files]")!;
    const file = new File(["x"], "a.txt");
    Object.defineProperty(input, "files", { value: [file] });
    await data().pickFiles({ target: input } as unknown as Event);
    expect((uploads[0] as { files: File[] }).files[0]).toBe(file);
  });

  it("asks for the project key before deleting", async () => {
    const { root, data } = await mount();
    const seen = answer(root, "nq-project-delete");
    data().askDanger("delete");
    expect(data().isDelete()).toBe(true);
    expect(data().dangerReady()).toBe(false);
    await data().runDanger();
    expect(seen).toHaveLength(0);
    data().typed = "nsq-wrong";
    expect(data().dangerReady()).toBe(false);
    data().typed = "nsq";
    expect(data().dangerReady()).toBe(true);
    await data().runDanger();
    expect(seen).toHaveLength(1);
    expect(data().dangerOpen).toBe(false);
  });

  it("archives without typing, and saves the project settings", async () => {
    const { root, data } = await mount();
    const archive = answer(root, "nq-project-archive");
    data().askDanger("archive");
    await data().runDanger();
    expect(archive).toHaveLength(1);

    const save = answer(root, "nq-project-save");
    data().draft.name = "Checkout 2";
    data().draft.budget = "15000";
    await data().saveProject("Saved");
    expect(save[0]).toMatchObject({ patch: { name: "Checkout 2", budget: 15000 } });
    expect(data().settingsSaved).toBe("Saved");
    data().draft.name = " ";
    await data().saveProject("Saved");
    expect(data().settingsError).not.toBe("");
  });

  it("toggles an integration and reverts it when the host refuses", async () => {
    const { root, data } = await mount();
    const seen = answer(root, "nq-project-integration", { error: "Denied" });
    data().integ[1] = true;
    await tick(60);
    expect(seen[0]).toMatchObject({ id: "slack", connected: true });
    expect(data().integ[1]).toBe(false);
    expect(data().integError).toBe("Denied");
  });

  it("without a listener the change fails with a message", async () => {
    const { data } = await mount();
    data().newTitle = "x";
    await data().submitNew();
    expect(data().newError).not.toBe("");
  });

  it("draws board cards as issue cards with a due state, and none as the old kanban card", async () => {
    shared ??= await build();
    const host = shared.host;
    expect(host.querySelector('[data-slot="kanban-card"]')).toBeNull();
    const cards = host.querySelectorAll<HTMLElement>('[data-slot="issue-card"]');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]!.className).toContain("cursor-pointer");
    expect(host.querySelector('[data-slot="issue-card"] [data-due]')).not.toBeNull();
  });
});
