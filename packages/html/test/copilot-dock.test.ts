import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => Alpine.$data(el as HTMLElement) as Record<string, any>;
const panel = (host: ParentNode, id: string) => host.querySelector<HTMLElement>(`#${id}`)!;
// happy-dom keeps a stale copy of a bound attribute for hasAttribute and getAttribute, so read the serialized opening tag.
const openTag = (el: HTMLElement) => el.outerHTML.slice(0, el.outerHTML.indexOf(">") + 1);
const has = (el: HTMLElement, name: string) => new RegExp(`[ ]${name}(=|[ ]|>)`).test(openTag(el));
const attr = (el: HTMLElement, name: string) => new RegExp(`[ ]${name}="([^"]*)"`).exec(openTag(el))?.[1] ?? null;
const rootOf = (el: HTMLElement) => el.closest<HTMLElement>('[data-slot="copilot-dock-root"]')!;

describe("copilot-dock (rendered Blade under Alpine)", () => {
  it("renders the open panel with its state attributes and the chat inside", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-open");
    expect(p.getAttribute("role")).toBe("complementary");
    expect(has(p, "hidden")).toBe(false);
    expect(has(p, "data-open")).toBe(true);
    expect(attr(p, "data-side")).toBe("end");
    expect(has(p, "data-expanded")).toBe(false);
    expect(p.className).toContain("inset-y-0 end-0 border-s");
    expect(p.getAttribute("style")).toContain("min(100%, 26rem)");
    expect(p.querySelector('[data-slot="copilot-chat"]')).not.toBeNull();
    const launcher = rootOf(p).querySelector<HTMLElement>('[data-slot="copilot-dock-launcher"]')!;
    expect(launcher.style.display).toBe("none");
    expect(launcher.getAttribute("aria-controls")).toBe("dock-open");
  });

  it("opens from the launcher, closes with Escape and returns focus to the launcher", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-closed");
    const root = rootOf(p);
    const launcher = root.querySelector<HTMLElement>('[data-slot="copilot-dock-launcher"]')!;
    const opens: unknown[] = [];
    p.addEventListener("nq-dock-open", (e) => opens.push((e as CustomEvent).detail));
    expect(has(p, "hidden")).toBe(true);
    expect(launcher.title).toContain("Open assistant");
    launcher.click();
    await tick();
    expect(data(root).isOpen).toBe(true);
    expect(has(p, "hidden")).toBe(false);
    expect(has(p, "data-open")).toBe(true);
    expect(launcher.style.display).toBe("none");
    expect(opens).toEqual([{ open: true }]);
    p.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(60);
    expect(has(p, "hidden")).toBe(true);
    expect(launcher.style.display).not.toBe("none");
    expect(opens).toEqual([{ open: true }, { open: false }]);
  });

  it("toggles with Ctrl+J and ignores other modifiers", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-closed");
    const root = rootOf(p);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true, shiftKey: true }));
    await tick();
    expect(data(root).isOpen).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await tick();
    expect(data(root).isOpen).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await tick();
    expect(data(root).isOpen).toBe(false);
  });

  it("expands to the full page; Escape leaves the page first, then closes", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-open");
    const root = rootOf(p);
    const expand = p.querySelector<HTMLElement>('[data-slot="copilot-dock-expand"]')!;
    expect(expand.getAttribute("aria-pressed")).toBe("false");
    expect(expand.getAttribute("aria-label")).toBe("Expand to full page");
    expand.click();
    await tick();
    expect(has(p, "data-expanded")).toBe(true);
    expect(p.className).toContain("inset-0");
    expect(p.style.width).toBe("");
    expect(expand.getAttribute("aria-pressed")).toBe("true");
    expect(expand.getAttribute("aria-label")).toBe("Exit full page");
    p.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(data(root).isExpanded).toBe(false);
    expect(data(root).isOpen).toBe(true);
    p.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(data(root).isOpen).toBe(false);
  });

  it("moves to another side from the layout menu and remembers it", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-open");
    const root = rootOf(p);
    const sides: unknown[] = [];
    p.addEventListener("nq-dock-side", (e) => sides.push((e as CustomEvent).detail));
    p.querySelector<HTMLElement>('[data-slot="copilot-dock-layout"]')!.click();
    await tick();
    const items = [...document.querySelectorAll<HTMLElement>(`[data-slot="dropdown-menu-radio-item"]`)].filter((i) => /^(Dock|Floating)/.test(i.textContent!.trim()) && !i.closest<HTMLElement>("[x-show], [hidden]")?.hasAttribute("hidden") && i.closest<HTMLElement>("[style]")?.style.display !== "none");
    expect(items).toHaveLength(4);
    items.find((i) => i.textContent!.includes("Dock bottom"))!.click();
    await tick();
    expect(data(root).dockSide).toBe("bottom");
    expect(attr(p, "data-side")).toBe("bottom");
    expect(p.className).toContain("inset-x-0 bottom-0 border-t");
    expect(p.getAttribute("style")).toContain("min(100%, 50vh)");
    expect(window.localStorage.getItem("nq-dock-side")).toBe("bottom");
    expect(sides).toEqual([{ side: "bottom" }]);
  });

  it("restores the saved side on load", async () => {
    window.localStorage.setItem("nq-dock-side", "float");
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-open");
    expect(attr(p, "data-side")).toBe("float");
    expect(p.style.height).toBe("40rem");
  });

  it("the collapsed bar sends the text as nq-send and opens the panel", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-bar");
    const root = rootOf(p);
    const sent: Record<string, unknown>[] = [];
    p.addEventListener("nq-send", (e) => sent.push((e as CustomEvent).detail));
    const bar = root.querySelector<HTMLFormElement>('[data-slot="copilot-dock-bar"]')!;
    const input = bar.querySelector<HTMLInputElement>("input")!;
    expect(root.querySelector('[data-slot="copilot-dock-launcher"]')).toBeNull();
    const submit = bar.querySelector<HTMLElement>("button[type=submit]")!;
    expect(submit.getAttribute("aria-label")).toBe("Open assistant");
    input.value = " What is overdue? ";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(submit.getAttribute("aria-label")).toBe("Send");
    bar.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ text: "What is overdue?", attachments: [], commands: [] });
    expect(data(root).isOpen).toBe(true);
    expect(data(root).barText).toBe("");
  });

  it("closes from the chat close button", async () => {
    const host = await mount("copilot-dock");
    const p = panel(host, "dock-open");
    const root = rootOf(p);
    const close = [...p.querySelectorAll<HTMLElement>("button")].find((b) => b.getAttribute("aria-label") === "Close")!;
    close.click();
    await tick(60);
    expect(data(root).isOpen).toBe(false);
    expect(has(p, "hidden")).toBe(true);
  });
});
