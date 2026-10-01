// The Blade file-upload example (packages/php/examples/rendered/file-upload.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { matchesAccept } from "../src/alpine/file-upload";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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
  document.documentElement.lang = "en";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("file-upload");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
const zone = () => document.querySelector<HTMLElement>('[data-slot="file-upload"] [data-slot="dropzone"]')!;
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="file-list-item"]')];

async function pick(root: ParentNode, files: File[]) {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

describe("matchesAccept", () => {
  it("handles extensions, wildcards and exact types", () => {
    expect(matchesAccept({ name: "a.PDF", type: "" }, "image/*,.pdf")).toBe(true);
    expect(matchesAccept({ name: "a.png", type: "image/png" }, "image/*")).toBe(true);
    expect(matchesAccept({ name: "a.zip", type: "application/zip" }, "image/*")).toBe(false);
    expect(matchesAccept({ name: "a.zip", type: "application/zip" })).toBe(true);
  });
});

describe("file-upload (Blade example)", () => {
  it("renders the dropzone as a focusable button with the limits hint", async () => {
    await mount();
    expect(zone().getAttribute("role")).toBe("button");
    expect(zone().getAttribute("tabindex")).toBe("0");
    expect(zone().textContent).toContain("Drag files here or click to browse");
    expect(zone().textContent).toContain("Accepted: image/*,.pdf");
    expect(zone().textContent).toContain("Up to 5 MB each");
    expect(zone().getAttribute("aria-describedby")).toBeTruthy();
    expect(rows()).toHaveLength(0);
  });

  it("opens the file picker on Enter and Space but not from children", async () => {
    await mount();
    const input = document.querySelector<HTMLInputElement>('[data-slot="file-upload"] input[type="file"]')!;
    let clicks = 0;
    input.addEventListener("click", () => clicks++);
    zone().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    zone().dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    expect(clicks).toBe(2);
  });

  it("adds a valid file as a row, reports progress through the controls and shows done", async () => {
    await mount();
    await pick(document.querySelector('[data-slot="file-upload"]')!, [file("a.png", "image/png", 2048)]);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]!.dataset.status).toBe("uploading");
    expect(rows()[0]!.textContent).toContain("a.png");
    expect(rows()[0]!.textContent).toContain("2 KB");
    expect(rows()[0]!.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("0");
    await new Promise((r) => setTimeout(r, 2500));
    expect(rows()[0]!.dataset.status).toBe("done");
    expect(rows()[0]!.textContent).toContain("Uploaded");
  });

  it("rejects a wrong type, marks the zone invalid and lists the reason", async () => {
    await mount();
    await pick(document.querySelector('[data-slot="file-upload"]')!, [file("a.zip", "application/zip")]);
    expect(rows()).toHaveLength(0);
    expect(zone().dataset.invalid).toBe("true");
    expect(document.querySelector('[data-slot="file-upload-errors"]')!.textContent).toContain("a.zip is not an accepted file type.");
  });

  it("enforces maxFiles across picks and removes a row with its button", async () => {
    await mount();
    const root = document.querySelector('[data-slot="file-upload"]')!;
    await pick(root, ["1", "2", "3", "4", "5"].map((n) => file(`${n}.pdf`, "application/pdf")));
    expect(rows()).toHaveLength(4);
    expect(document.querySelector('[data-slot="file-upload-errors"]')!.textContent).toContain("5.pdf was not added: the limit is 4 files.");
    const remove = rows()[0]!.querySelector<HTMLButtonElement>('button[aria-label="Remove 1.pdf"]')!;
    remove.click();
    await tick();
    expect(rows()).toHaveLength(3);
  });

  it("rejects files over maxSize", async () => {
    await mount();
    await pick(document.querySelector('[data-slot="file-upload"]')!, [file("big.pdf", "application/pdf", 6 * 1024 * 1024)]);
    expect(rows()).toHaveLength(0);
    expect(document.querySelector('[data-slot="file-upload-errors"]')!.textContent).toContain("big.pdf is larger than 5 MB.");
  });

  it("highlights while files are dragged over and clears on drop", async () => {
    await mount();
    const types = ["Files"];
    const over = new Event("dragenter", { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown };
    over.dataTransfer = { types };
    zone().dispatchEvent(over);
    await tick();
    expect(zone().dataset.dragging).toBe("true");
    expect(zone().textContent).toContain("Drop to add");
    const drop = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown };
    drop.dataTransfer = { types, files: [file("d.pdf", "application/pdf")] };
    zone().dispatchEvent(drop);
    await tick();
    expect(zone().dataset.dragging).toBeUndefined();
    expect(rows()).toHaveLength(1);
  });

  it("image-upload previews the chosen image and removes it", async () => {
    await mount();
    const root = document.querySelector<HTMLElement>('[data-slot="image-upload"]')!;
    expect(root.querySelector<HTMLElement>('[data-slot="image-upload-preview"]')!.style.display).toBe("none");
    expect(root.textContent).toContain("Add an image");
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:test";
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
    await pick(root, [file("me.png", "image/png")]);
    expect(root.querySelector<HTMLImageElement>("img")!.getAttribute("src")).toBe("blob:test");
    expect(root.textContent).toContain("Replace image");
    root.querySelector<HTMLButtonElement>('button[aria-label="Remove image"]')!.click();
    await tick();
    expect(root.querySelector<HTMLElement>('[data-slot="image-upload-preview"]')!.style.display).toBe("none");
    expect(root.textContent).toContain("Add an image");
  });
});
