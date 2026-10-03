import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkFileName, fileKind, findFilePath, NqFileExplorer, sortFileNodes, type FileNode } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const nodes: FileNode[] = [
  {
    id: "docs",
    name: "Documents",
    kind: "folder",
    children: [
      { id: "brief", name: "brief.pdf", kind: "file", size: 2048, modifiedAt: "2026-09-20T10:00:00Z", mime: "application/pdf" },
      { id: "notes", name: "notes.md", kind: "file", size: 120, previewText: "# Hi" },
    ],
  },
  { id: "report", name: "report.xlsx", kind: "file", size: 91_300 },
];
const mountIt = (props: Record<string, unknown> = {}) => mount(NqFileExplorer, { props: { nodes, ...props }, attachTo: document.body });

describe("file helpers", () => {
  it("classifies, walks, sorts and checks names", () => {
    expect(fileKind({ name: "a.png", kind: "file" })).toBe("image");
    expect(fileKind({ name: "a", kind: "folder" })).toBe("folder");
    expect(findFilePath(nodes, "brief")?.map((n) => n.id)).toEqual(["docs", "brief"]);
    expect(sortFileNodes(nodes).map((n) => n.id)).toEqual(["docs", "report"]);
    expect(checkFileName("", [])).toBe("empty");
    expect(checkFileName("DOCUMENTS", ["Documents"])).toBe("duplicate");
    expect(checkFileName("a/b", [])).toBe("invalid");
  });
});

describe("NqFileExplorer", () => {
  it("renders the regions, tree, breadcrumb and list rows", () => {
    const w = mountIt({ class: "max-w-5xl" });
    expect(w.attributes("data-slot")).toBe("file-explorer");
    expect(w.attributes("aria-label")).toBe("Files");
    expect(w.classes()).toContain("max-w-5xl");
    expect(w.find('[data-slot="file-explorer-listing"]').exists()).toBe(true);
    expect(w.find('[role="tree"]').exists()).toBe(true);
    expect(w.text()).toContain("Documents");
    expect(w.text()).toContain("report.xlsx");
    expect(w.text()).toContain("Select a file to preview it");
  });

  it("opens a folder, previews a file and closes the preview", async () => {
    const onUpdate = vi.fn();
    const w = mountIt({ "onUpdate:folderId": onUpdate });
    await w.findAll("tr").find((r) => r.text().includes("Documents"))!.trigger("click");
    expect(onUpdate).toHaveBeenCalledWith("docs");
    expect(w.find('[data-slot="file-explorer-listing"]').text()).toContain("brief.pdf");
    expect(w.find('[data-slot="file-explorer-listing"]').text()).not.toContain("report.xlsx");
    await w.findAll("tr").find((r) => r.text().includes("brief.pdf"))!.trigger("click");
    expect(w.find('[data-slot="file-preview"]').text()).toContain("PDF document");
    await w.find('[aria-label="Close preview"]').trigger("click");
    expect(w.find('[data-slot="file-preview"]').exists()).toBe(false);
  });

  it("switches to the grid and marks the toggle pressed", async () => {
    const w = mountIt();
    expect(w.find('[aria-label="List"]').attributes("aria-pressed")).toBe("true");
    await w.find('[aria-label="Grid"]').trigger("click");
    expect(w.find('[aria-label="Grid"]').attributes("aria-pressed")).toBe("true");
    const tile = w.findAll("ul[aria-label] li button").find((b) => b.text().includes("report.xlsx"))!;
    await tile.trigger("click");
    expect(tile.attributes("data-selected")).toBe("");
    expect(w.find('[data-slot="file-preview"]').exists()).toBe(true);
  });

  it("filters by the search box and shows the no-match text", async () => {
    const w = mountIt();
    await w.find('input[type="search"]').setValue("zzz");
    expect(w.text()).toContain("Nothing here matches your search.");
  });

  it("shows Upload and New folder only with their callbacks and sends picked files", async () => {
    expect(mountIt().text()).not.toContain("Upload");
    const onUpload = vi.fn(async () => {});
    const w = mountIt({ onUpload, onCreateFolder: vi.fn(async () => {}) });
    expect(w.text()).toContain("Upload");
    expect(w.text()).toContain("New folder");
    const file = new File(["x"], "a.txt");
    const input = w.find('input[type="file"]');
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await flushPromises();
    expect(onUpload).toHaveBeenCalledWith([file], null);
  });

  it("creates a folder through the dialog and validates the name", async () => {
    const onCreateFolder = vi.fn(async () => {});
    const w = mountIt({ onCreateFolder });
    await w.findAll("button").find((b) => b.text() === "New folder")!.trigger("click");
    await flushPromises();
    const dialog = document.body.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    const input = dialog.querySelector("input") as HTMLInputElement;
    input.value = "documents";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("already here");
    input.value = "Archive";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onCreateFolder).toHaveBeenCalledWith("Archive", null);
  });

  it("offers a delete from the preview and confirms it", async () => {
    const onDelete = vi.fn(async () => {});
    const w = mountIt({ onDelete, onDownload: vi.fn() });
    await w.findAll("tr").find((r) => r.text().includes("report.xlsx"))!.trigger("click");
    const del = w.findAll('[data-slot="file-preview"] button').find((b) => b.text() === "Delete")!;
    await del.trigger("click");
    await flushPromises();
    const alert = document.body.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(alert.textContent).toContain("Delete report.xlsx?");
    const confirm = [...alert.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Delete")!;
    confirm.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "report" }));
  });

  it("opens the row actions as a context menu on a grid tile", async () => {
    const w = mountIt({ onDelete: vi.fn(async () => {}), defaultView: "grid" });
    const li = w.findAll("ul[aria-label] li").find((l) => l.text().includes("report.xlsx"))!;
    await li.trigger("contextmenu", { clientX: 10, clientY: 10 });
    await flushPromises();
    expect(document.body.querySelector('[role="menuitem"]')?.textContent).toContain("Delete");
  });

  it("takes its labels from the prop", () => {
    const w = mountIt({ title: "ملفاتي" });
    expect(w.attributes("aria-label")).toBe("ملفاتي");
  });
});
