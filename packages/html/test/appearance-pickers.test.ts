// The Blade appearance-pickers example under real Alpine: theme gallery, reading settings and wallpaper picker.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const q = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel)!;
const qa = <T extends HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
const listen = (name: string) => {
  const seen: unknown[] = [];
  document.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
};

describe("theme-gallery (Blade example)", () => {
  it("is a labelled radio group; a click or an arrow key selects", async () => {
    const host = await mount("appearance-pickers");
    const gallery = q(host, '[data-slot="theme-gallery"]');
    const group = q(gallery, '[role="radiogroup"]');
    expect(group.getAttribute("aria-labelledby")).toBe(q(gallery, ".text-label").id);
    const [paper, ink] = qa(gallery, '[data-slot="theme-card"]');
    expect(paper!.hasAttribute("data-checked")).toBe(true);
    expect(paper!.getAttribute("tabindex")).toBe("0");
    expect(ink!.getAttribute("tabindex")).toBe("-1");
    ink!.click();
    await tick(80);
    expect(ink!.getAttribute("aria-checked")).toBe("true");
    expect(ink!.hasAttribute("data-checked")).toBe(true);
    expect(paper!.hasAttribute("data-unchecked")).toBe(true);
    expect(q(ink!, '[data-slot="radio-indicator"]').style.display).not.toBe("none");
    expect(q(paper!, '[data-slot="radio-indicator"]').style.display).toBe("none");
    ink!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await tick(80);
    expect(paper!.getAttribute("aria-checked")).toBe("true");
  });
});

describe("reading-settings (Blade example)", () => {
  it("steps the size, updates the live preview and resets", async () => {
    const host = await mount("appearance-pickers");
    const root = q(host, '[data-slot="reading-settings"]');
    const changes = listen("nq-change");
    const preview = q(root, '[data-slot="reading-preview"]');
    const reset = qa<HTMLButtonElement>(root, "button").find((b) => b.textContent?.trim() === "Reset")!;
    expect(preview.outerHTML).toContain("--reading-scale: 1;");
    q(root, '[aria-label="Larger text"]').click();
    await tick(80);
    expect(preview.outerHTML).toContain("--reading-scale: 1.125");
    expect(reset.getAttributeNames()).not.toContain("disabled");
    const size = qa(root, '[data-slot="toggle-group"]')[0]!;
    expect(q(size, '[aria-label="Large"]').hasAttribute("data-pressed")).toBe(true);
    expect(q(size, '[aria-label="Medium"]').hasAttribute("data-pressed")).toBe(false);
    expect(changes.at(-1)).toEqual({ fontSize: "lg", width: "normal", spacing: "normal" });
    // happy-dom keeps a stale disabled flag and swallows the click, so call what the button calls.
    (window as unknown as { Alpine: { $data(el: Element): { reset(): void } } }).Alpine.$data(root).reset();
    await tick(80);
    expect(preview.outerHTML).toContain("--reading-scale: 1;");
    expect(reset.hasAttribute("data-disabled")).toBe(true);
    expect(q(size, '[aria-label="Medium"]').hasAttribute("data-pressed")).toBe(true);
  });

  it("segments set width and spacing, and pressing the pressed one keeps the choice", async () => {
    const host = await mount("appearance-pickers");
    const root = q(host, '[data-slot="reading-settings"]');
    const [, width, spacing] = qa(root, '[data-slot="toggle-group"]');
    const wide = qa(width!, '[data-slot="toggle"]').find((t) => t.textContent?.trim() === "Wide")!;
    wide.click();
    await tick(80);
    expect(q(root, '[data-slot="reading-preview"]').outerHTML).toContain("--reading-max-width: 88ch");
    wide.click();
    await tick(80);
    expect(wide.hasAttribute("data-pressed")).toBe(true);
    qa(spacing!, '[data-slot="toggle"]').find((t) => t.textContent?.trim() === "Relaxed")!.click();
    await tick(80);
    expect(q(root, '[data-slot="reading-preview"]').outerHTML).toContain("--reading-line-height: 1.85");
  });
});

describe("wallpaper-picker (Blade example)", () => {
  it("selects a tile or none, reports it, and disables the dim slider with none", async () => {
    const host = await mount("appearance-pickers");
    const root = q(host, '[data-slot="wallpaper-picker"]');
    const changes = listen("nq-change");
    const tiles = qa(root, '[data-slot="wallpaper-tile"]');
    expect(tiles).toHaveLength(3);
    expect(tiles[0]!.hasAttribute("data-checked")).toBe(true);
    const none = q(root, '[data-slot="wallpaper-none"]');
    const dim = q(root, '[data-slot="wallpaper-dim"]');
    expect(dim.className).not.toContain("pointer-events-none");
    tiles[1]!.click();
    await tick(80);
    expect(changes.at(-1)).toEqual({ value: "sea" });
    none.click();
    await tick(80);
    expect(none.hasAttribute("data-checked")).toBe(true);
    expect(changes.at(-1)).toEqual({ value: null });
    expect(dim.className).toContain("pointer-events-none");
  });

  it("shows the dim as a percent and reports an uploaded file", async () => {
    const host = await mount("appearance-pickers");
    const root = q(host, '[data-slot="wallpaper-picker"]');
    expect(q(root, '[data-slot="slider-value"]').textContent?.trim()).toBe("20%");
    const uploads = listen("nq-upload");
    const input = q<HTMLInputElement>(root, 'input[type="file"]');
    expect(input.accept).toBe("image/*");
    const file = new File(["x"], "a.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await tick(80);
    expect(uploads).toEqual([{ file }]);
  });
});
