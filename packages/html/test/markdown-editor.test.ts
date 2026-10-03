import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { applyMarkdownEditorFormat, markdownEditorHtml } from "../src/alpine/markdown-editor-logic";

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("markdown-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="markdown-editor"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: HTMLElement) => Alpine.$data(el) as Record<string, any>;
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("markdown-editor logic", () => {
  it("wraps, prefixes and fences", () => {
    expect(applyMarkdownEditorFormat("hi", 0, 2, "bold")).toEqual({ value: "**hi**", start: 2, end: 4 });
    expect(applyMarkdownEditorFormat("a\nb", 0, 3, "bullet").value).toBe("- a\n- b");
    expect(applyMarkdownEditorFormat("code", 0, 4, "codeBlock").value).toBe("```\ncode\n```\n");
  });

  it("renders safe HTML for the preview", () => {
    const html = markdownEditorHtml("## T\n\n**b** [x](javascript:alert(1)) <b>raw</b>\n\n- [x] done");
    expect(html).toContain('<h2 data-slot="text"');
    expect(html).toContain("<strong");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<b>raw");
    expect(html).toContain('type="checkbox" disabled checked');
  });
});

describe("markdown-editor", () => {
  it("renders the toolbar and starts in split view with the live preview", async () => {
    const host = await mount();
    expect(root(host).getAttribute("data-view")).toBe("split");
    expect(host.querySelectorAll('[role="toolbar"] button')).toHaveLength(11);
    expect(shown(host.querySelector("textarea"))).toBe(true);
    const preview = host.querySelector('[data-slot="markdown-editor-preview"]')!;
    expect(shown(preview)).toBe(true);
    expect(preview.querySelector("h2")?.textContent).toBe("Notes");
    expect(preview.querySelector("strong")?.textContent).toBe("here");
  });

  it("updates the preview as the text changes and shows the hint when empty", async () => {
    const host = await mount();
    data(root(host)).body = "# New";
    await tick();
    expect(host.querySelector('[data-slot="markdown-editor-preview"] h1')?.textContent).toBe("New");
    data(root(host)).body = "";
    await tick();
    expect(host.querySelector('[data-slot="markdown-editor-preview"]')?.textContent).toContain("Nothing to preview yet.");
  });

  it("applies a toolbar command to the selection", async () => {
    const host = await mount();
    const area = host.querySelector("textarea")!;
    area.value = "hello";
    area.dispatchEvent(new Event("input"));
    area.setSelectionRange(0, 5);
    host.querySelector<HTMLButtonElement>('button[aria-label="Bold"]')!.click();
    await tick();
    expect(data(root(host)).body).toBe("**hello**");
    expect(area.value).toBe("**hello**");
  });

  it("applies Ctrl+B and ignores other keys", async () => {
    const host = await mount();
    const area = host.querySelector("textarea")!;
    area.value = "ab";
    area.dispatchEvent(new Event("input"));
    area.setSelectionRange(0, 2);
    area.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    await tick();
    expect(data(root(host)).body).toBe("**ab**");
    area.dispatchEvent(new KeyboardEvent("keydown", { key: "x", ctrlKey: true, bubbles: true }));
    await tick();
    expect(data(root(host)).body).toBe("**ab**");
  });

  it("switches the view with the toggle group and announces it", async () => {
    const host = await mount();
    const seen: string[] = [];
    root(host).addEventListener("nq-view-change", (e) => seen.push((e as CustomEvent).detail.view));
    host.querySelector<HTMLButtonElement>('[data-slot="toggle-group"] button[data-value="preview"]')!.click();
    await tick();
    expect(root(host).getAttribute("data-view")).toBe("preview");
    expect(shown(host.querySelector("textarea"))).toBe(false);
    expect(host.querySelector<HTMLButtonElement>('button[aria-label="Bold"]')!.disabled).toBe(true);
    expect(seen).toEqual(["preview"]);
    // pressing the pressed item does not leave the editor without a view
    host.querySelector<HTMLButtonElement>('[data-slot="toggle-group"] button[data-value="preview"]')!.click();
    await tick();
    expect(root(host).getAttribute("data-view")).toBe("preview");
  });
});
