// The Blade avatar-upload example (packages/php/examples/rendered/avatar-upload.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  URL.createObjectURL = () => "blob:nq-test";
  URL.revokeObjectURL = () => {};
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("avatar-upload");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
async function choose(h: HTMLElement, file: File) {
  const input = h.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

describe("avatar-upload (Blade example)", () => {
  it("starts idle with initials, an upload button and a hint", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="avatar-upload"]')!;
    expect(root.hasAttribute("data-editing")).toBe(false);
    expect(visible(h.querySelector('[data-slot="avatar-upload-idle"]'))).toBe(true);
    expect(visible(h.querySelector('[data-slot="avatar-upload-editor"]'))).toBe(false);
    expect(h.querySelector('[data-slot="avatar-fallback"]')!.textContent).toContain("SA");
    expect(h.textContent).toContain("Upload photo");
    expect(h.textContent).toContain("up to 5 MB");
  });

  it("rejects a wrong file type and an oversized file with an alert", async () => {
    const h = await mount();
    await choose(h, new File(["x"], "a.pdf", { type: "application/pdf" }));
    const err = h.querySelector('[data-slot="avatar-upload-error"]')!;
    expect(visible(err)).toBe(true);
    expect(err.textContent).toContain("not supported");
    await choose(h, new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" }));
    expect(err.textContent).toContain("larger than");
    expect(visible(h.querySelector('[data-slot="avatar-upload-editor"]'))).toBe(false);
  });

  it("opens the editor for a valid image and cancel returns to idle", async () => {
    const h = await mount();
    await choose(h, new File(["x"], "me.png", { type: "image/png" }));
    const root = h.querySelector<HTMLElement>('[data-slot="avatar-upload"]')!;
    expect(root.hasAttribute("data-editing")).toBe(true);
    expect(visible(h.querySelector('[data-slot="avatar-upload-editor"]'))).toBe(true);
    expect(visible(h.querySelector('[data-slot="avatar-upload-idle"]'))).toBe(false);
    const cancel = [...h.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Cancel")!;
    cancel.click();
    await tick();
    expect(root.hasAttribute("data-editing")).toBe(false);
    expect(visible(h.querySelector('[data-slot="avatar-upload-idle"]'))).toBe(true);
  });
});
