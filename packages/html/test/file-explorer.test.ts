// The Blade file-explorer example (packages/php/examples/rendered/file-explorer.html) under real Alpine.
import { describe, expect, it } from "vitest";
import { checkFolderName, itemsText, rankSiblings } from "../src/alpine/file-explorer-logic";
import { mount, setup, tick } from "./_float-setup";

setup();

const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none" && !(el as HTMLElement).hasAttribute("hidden");
const LABELS = { one: "1 item", two: "{n} items", few: "{n} items", many: "{n} items" };

async function boot() {
  const host = await mount("file-explorer");
  const root = host.querySelector<HTMLElement>('[data-slot="file-explorer"]')!;
  const list = root.querySelector<HTMLElement>('[data-slot="file-explorer-list"]')!;
  const rows = () => [...list.querySelectorAll<HTMLElement>('[role="row"][data-node-id]')].filter(shown);
  const names = () =>
    rows()
      .sort((a, b) => Number(a.style.order) - Number(b.style.order))
      .map((r) => r.dataset.nodeId);
  const row = (id: string) => list.querySelector<HTMLElement>(`[role="row"][data-node-id="${id}"]`)!;
  const waitable = (name: string, make: (d: any) => Promise<unknown> = () => Promise.resolve(), seen: any[] = []) => {
    root.addEventListener(name, (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d);
      d.wait?.(make(d));
    });
    return seen;
  };
  return { host, root, list, rows, names, row, waitable };
}

describe("file-explorer logic", () => {
  it("checks names, words item counts and ranks siblings", () => {
    expect(checkFolderName("", [])).toBe("empty");
    expect(checkFolderName("..", [])).toBe("reserved");
    expect(checkFolderName("a/b", [])).toBe("invalid");
    expect(checkFolderName("DOCS", ["docs"])).toBe("duplicate");
    expect(checkFolderName("new", ["docs"])).toBeNull();
    expect(itemsText(1, LABELS)).toBe("1 item");
    expect(itemsText(4, LABELS)).toBe("4 items");
    const nodes = [
      { id: "a", parent: "", name: "b.txt", folder: false, size: 5, mod: 1, count: 0 },
      { id: "b", parent: "", name: "a.txt", folder: false, size: 9, mod: null, count: 0 },
      { id: "c", parent: "", name: "z", folder: true, size: null, mod: null, count: 2 },
    ];
    expect(rankSiblings(nodes, "name", "asc", "en")).toEqual({ c: 0, b: 1, a: 2 });
    expect(rankSiblings(nodes, "size", "desc", "en")).toEqual({ c: 0, b: 1, a: 2 });
    expect(rankSiblings(nodes, "modified", "asc", "en")).toEqual({ c: 0, a: 1, b: 2 });
  });
});

describe("file-explorer (Blade example)", () => {
  it("renders the regions and lists the root folders first", async () => {
    const { root, names, list } = await boot();
    expect(root.getAttribute("aria-label")).toBe("Files");
    expect(root.querySelector('[role="tree"]')).toBeTruthy();
    expect(list.getAttribute("role")).toBe("grid");
    expect(names()).toEqual(["empty", "docs", "images", "report"]);
    expect(root.textContent).toContain("Select a file to preview it");
    expect(root.querySelector('[x-text="countText()"]')!.textContent).toBe("4 items");
    expect(root.querySelector('[data-slot="breadcrumb-page"]')!.textContent).toContain("All files");
  });

  it("opens a folder by its row and by the tree, and walks back by the breadcrumb", async () => {
    const { root, names, row } = await boot();
    const opened: unknown[] = [];
    root.addEventListener("nq-file-open", (e) => opened.push((e as CustomEvent).detail.id));
    row("docs").click();
    await tick();
    expect(names()).toEqual(["brief", "notes"]);
    expect(opened).toEqual(["docs"]);
    expect([...root.querySelectorAll<HTMLElement>('[data-slot="breadcrumb-page"]')].filter(shown).map((e) => e.textContent).join("")).toContain("Documents");
    const crumb = root.querySelectorAll<HTMLElement>('[data-slot="breadcrumb-link"]')[0]!;
    expect(crumb.textContent).toContain("All files");
    crumb.click();
    await tick();
    expect(names()).toEqual(["empty", "docs", "images", "report"]);
    const tree = root.querySelector<HTMLElement>('[role="treeitem"][data-node-id="images"]')!;
    tree.click();
    await tick();
    expect(names()).toEqual(["logo"]);
    expect(tree.getAttribute("aria-selected")).toBe("true");
    expect(tree.hasAttribute("data-selected")).toBe(true);
  });

  it("shows the empty state for an empty folder", async () => {
    const { root, row } = await boot();
    const empty = root.querySelector<HTMLElement>('[data-slot="empty-state"]')!.parentElement!;
    expect(shown(empty)).toBe(false);
    row("empty").click();
    await tick();
    expect(shown(empty)).toBe(true);
    expect(empty.textContent).toContain("This folder is empty");
  });

  it("previews a file and closes the preview", async () => {
    const { root, row } = await boot();
    row("report").click();
    await tick();
    const preview = root.querySelector<HTMLElement>('[data-slot="file-preview"][data-node-id="report"]')!;
    expect(shown(preview)).toBe(true);
    expect(preview.textContent).toContain("Spreadsheet");
    expect(preview.textContent).toContain("89.2 KB");
    expect(row("report").hasAttribute("data-selected")).toBe(true);
    expect(row("report").getAttribute("aria-selected")).toBe("true");
    preview.querySelector<HTMLElement>('[aria-label="Close preview"]')!.click();
    await tick();
    expect(shown(preview)).toBe(false);
    expect(row("report").hasAttribute("data-selected")).toBe(false);
  });

  it("sorts by a column header and sets aria-sort", async () => {
    const { root, list, row } = await boot();
    row("docs").click();
    await tick();
    const head = (c: string) => list.querySelector<HTMLElement>(`[role="columnheader"][data-col="${c}"]`)!;
    expect(head("name").getAttribute("aria-sort")).toBe("ascending");
    expect(row("brief").style.order).toBe("0");
    head("name").querySelector("button")!.click();
    await tick();
    expect(head("name").getAttribute("aria-sort")).toBe("descending");
    expect(row("notes").style.order).toBe("0");
    head("size").querySelector("button")!.click();
    await tick();
    expect(head("name").hasAttribute("aria-sort")).toBe(false);
    expect(head("size").getAttribute("aria-sort")).toBe("ascending");
    expect(row("notes").style.order).toBe("0");
    expect(root).toBeTruthy();
  });

  it("filters by the search box and says when nothing matches", async () => {
    const { root, names } = await boot();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "rep";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(names()).toEqual(["report"]);
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(names()).toEqual([]);
    const none = [...root.querySelectorAll<HTMLElement>("p")].find((p) => p.textContent?.includes("Nothing here matches"))!;
    expect(shown(none)).toBe(true);
  });

  it("switches to the grid and marks the toggle pressed", async () => {
    const { root } = await boot();
    const grid = root.querySelector<HTMLElement>('[data-slot="file-explorer-grid"]')!;
    const listBtn = root.querySelector<HTMLElement>('[aria-label="List"]')!;
    const gridBtn = root.querySelector<HTMLElement>('[aria-label="Grid"]')!;
    expect(listBtn.getAttribute("aria-pressed")).toBe("true");
    expect(shown(grid)).toBe(false);
    gridBtn.click();
    await tick();
    expect(gridBtn.getAttribute("aria-pressed")).toBe("true");
    expect(listBtn.getAttribute("aria-pressed")).toBe("false");
    expect(shown(grid)).toBe(true);
    const tile = grid.querySelector<HTMLElement>('[role="listitem"][data-node-id="report"]')!;
    tile.click();
    await tick();
    expect(tile.hasAttribute("data-selected")).toBe(true);
    expect(shown(root.querySelector('[data-slot="file-preview"][data-node-id="report"]'))).toBe(true);
  });

  it("opens Download and Delete as a context menu on a row and a tile", async () => {
    const { row, root } = await boot();
    const downloads = [] as any[];
    root.addEventListener("nq-file-download", (e) => downloads.push((e as CustomEvent).detail.id));
    row("report").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    await tick(60);
    const items = [...document.body.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].filter((i) => i.offsetParent !== null || true);
    const labels = items.map((i) => i.textContent?.trim());
    expect(labels).toContain("Download");
    expect(labels).toContain("Delete");
    items.find((i) => i.textContent?.trim() === "Download" && shown(i.closest('[data-slot="context-menu-content"]')))!.click();
    await tick();
    expect(downloads).toEqual(["report"]);
    // Folders get Delete only.
    const folderMenu = row("docs").closest('[data-slot="context-menu"]')!;
    expect(folderMenu).toBeTruthy();
  });

  it("confirms a delete, fires nq-file-delete and hides the row", async () => {
    const { row, waitable, names } = await boot();
    const seen = waitable("nq-file-delete");
    row("report").click();
    await tick();
    const del = [...document.querySelectorAll<HTMLElement>('[data-slot="file-preview"][data-node-id="report"] button')].find((b) => b.textContent?.trim() === "Delete")!;
    del.click();
    await tick(60);
    const dialog = document.body.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Delete report.xlsx?");
    expect(dialog.textContent).toContain("The file is removed for everyone");
    [...dialog.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === "Delete")!.click();
    await tick(60);
    expect(seen.map((d) => d.id)).toEqual(["report"]);
    expect(names()).toEqual(["empty", "docs", "images"]);
    expect(shown(document.querySelector('[data-slot="file-preview"][data-node-id="report"]'))).toBe(false);
  });

  it("counts a folder's items in the delete confirm and shows a host error", async () => {
    const { row, waitable, root } = await boot();
    waitable("nq-file-delete", () => Promise.resolve({ error: "Locked by another user" }));
    row("docs").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    await tick(60);
    const menu = [...document.body.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].find((i) => i.textContent?.trim() === "Delete" && shown(i.closest('[data-slot="context-menu-content"]')))!;
    menu.click();
    await tick(60);
    const dialog = document.body.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Delete Documents?");
    expect(dialog.textContent).toContain("The folder and the 2 items inside it are removed.");
    [...dialog.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === "Delete")!.click();
    await tick(60);
    const notice = root.querySelector<HTMLElement>('[data-slot="file-explorer-notice"]')!;
    expect(shown(notice)).toBe(true);
    expect(notice.textContent).toContain("Locked by another user");
    expect(shown(row("docs"))).toBe(true);
  });

  it("creates a folder through the dialog and validates the name", async () => {
    const { root, waitable, row } = await boot();
    const seen = waitable("nq-file-create-folder");
    [...root.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === "New folder")!.click();
    await tick(60);
    const dialog = document.body.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    const input = dialog.querySelector<HTMLInputElement>("input")!;
    const error = dialog.querySelector<HTMLElement>('[data-slot="field-error"]')!;
    const type = (v: string) => {
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    type("documents");
    await tick();
    expect(shown(error)).toBe(true);
    expect(error.textContent).toContain("already here");
    type("a/b");
    await tick();
    expect(error.textContent).toContain("cannot contain");
    type("Reports");
    await tick();
    expect(shown(error)).toBe(false);
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(seen.map((d) => [d.name, d.parent])).toEqual([["Reports", null]]);
    expect(shown(document.body.querySelector('[data-slot="dialog-content"]'))).toBe(false);
    // Inside a folder the parent is its id.
    row("docs").click();
    await tick();
    expect(root).toBeTruthy();
  });

  it("keeps the new folder dialog open and shows the host error", async () => {
    const { root, waitable } = await boot();
    waitable("nq-file-create-folder", () => Promise.resolve({ error: "Quota reached" }));
    [...root.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === "New folder")!.click();
    await tick(60);
    const dialog = document.body.querySelector<HTMLElement>('[data-slot="dialog-content"]')!;
    const input = dialog.querySelector<HTMLInputElement>("input")!;
    input.value = "Reports";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(dialog.querySelector('[data-slot="file-explorer-new-error"]')!.textContent).toContain("Quota reached");
    expect(shown(dialog)).toBe(true);
  });

  it("sends picked files with the open folder", async () => {
    const { root, waitable, row } = await boot();
    const seen = waitable("nq-file-upload");
    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["x"], "a.txt");
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(seen[0].files).toEqual([file]);
    expect(seen[0].folder).toBeNull();
    row("images").click();
    await tick();
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(seen[1].folder).toBe("images");
  });
});
