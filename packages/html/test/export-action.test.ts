import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}


describe("nqExportAction", () => {
  it("renders the trigger, the formats, the scopes and the columns", async () => {
    const host = await mount(rendered("export-action"));
    const btn = host.querySelector<HTMLElement>('[data-slot="export-button"]')!;
    expect(btn.textContent).toContain("Export");
    expect(btn.hasAttribute("disabled")).toBe(false);
    btn.click();
    await tick();
    const dialog = document.querySelector<HTMLElement>('[data-slot="export-dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelectorAll('[data-slot="radio-card"]')).toHaveLength(3);
    expect(dialog.textContent).toContain("2 rows");
    expect(dialog.textContent).toContain("3 rows");
    expect(dialog.querySelectorAll('[data-slot="checkbox"]').length).toBeGreaterThanOrEqual(3);
  });

  it("builds a CSV and fires download and complete", async () => {
    const host = await mount(rendered("export-action"));
    const files: { filename: string; blob: Blob }[] = [];
    let completed = 0;
    host.addEventListener("download", (e) => {
      e.preventDefault();
      files.push((e as CustomEvent).detail.file);
    });
    host.addEventListener("complete", () => completed++);
    host.querySelector<HTMLElement>('[data-slot="export-button"]')!.click();
    await tick();
    const dialog = document.querySelector<HTMLElement>('[data-slot="export-dialog"]')!;
    const run = [...dialog.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === "Export")!;
    run.click();
    await tick(120);
    expect(files).toHaveLength(1);
    expect(files[0]!.filename).toBe("contacts.csv");
    expect(files[0]!.blob.size).toBeGreaterThan(10);
    expect(completed).toBe(1);
    expect(dialog.querySelector<HTMLElement>('[data-slot="export-done"]')!.style.display).not.toBe("none");
    expect(dialog.querySelector('[data-slot="export-done"]')!.textContent).toContain("contacts.csv");
  });

  it("leaves out unticked columns", async () => {
    const host = await mount(rendered("export-action"));
    let text = "";
    host.addEventListener("download", async (e) => {
      e.preventDefault();
      text = await ((e as CustomEvent).detail.file.blob as Blob).text();
    });
    host.querySelector<HTMLElement>('[data-slot="export-button"]')!.click();
    await tick();
    const dialog = document.querySelector<HTMLElement>('[data-slot="export-dialog"]')!;
    const boxes = [...dialog.querySelectorAll<HTMLElement>('[data-slot="checkbox"]')];
    boxes[boxes.length - 1]!.click(); // Email
    await tick();
    [...dialog.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === "Export")!.click();
    await tick(120);
    expect(text).toContain("Name");
    expect(text).not.toContain("Email");
  });
});
