// The Blade code-block-variants example under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
const tabsOf = (el: Element) => [...el.querySelectorAll<HTMLElement>('[role="tab"]')];

describe("code-block-variants (Blade example)", () => {
  it("copies a command without its prompt", async () => {
    const host = await mount("code-block-variants");
    const snippet = host.querySelector<HTMLElement>('[data-slot="command-snippet"]')!;
    expect(snippet.querySelector("code")!.textContent).toBe("npm i @nasaq/web");
    snippet.querySelector<HTMLButtonElement>("button")!.click();
    await tick();
    expect(writeText).toHaveBeenLastCalledWith("npm i @nasaq/web");
  });

  it("switches tabs, copies the visible one and syncs blocks with the same key", async () => {
    const host = await mount("code-block-variants");
    const [a, b] = [...host.querySelectorAll<HTMLElement>('[data-slot="code-tabs"]')];
    expect(tabsOf(a!).map((t) => t.textContent!.trim())).toEqual(["pnpm", "npm", "yarn", "bun"]);
    tabsOf(a!)[1]!.click();
    await tick();
    await tick();
    expect(tabsOf(b!)[1]!.hasAttribute("data-active")).toBe(true);
    const visible = [...a!.querySelectorAll<HTMLElement>("span[x-show]")].find((s) => s.style.display !== "none")!;
    visible.querySelector<HTMLButtonElement>("button")!.click();
    await tick();
    expect(writeText).toHaveBeenLastCalledWith("npm install @nasaq/web");
  });

  it("copies code and Markdown from the AI copy menu", async () => {
    const host = await mount("code-block-variants");
    const events: string[] = [];
    const menu = host.querySelector<HTMLElement>('[data-slot="code-block"] [data-slot="code-copy-menu"]')!;
    document.addEventListener("nq-code-copy", (e) => events.push((e as CustomEvent).detail.kind));
    menu.querySelector<HTMLButtonElement>('button[aria-label="Copy code"]')!.click();
    await tick();
    expect(writeText).toHaveBeenLastCalledWith("export const greet = (name: string) => `Hello, ${name}`;");
    menu.querySelector<HTMLButtonElement>('[data-slot="code-copy-menu-trigger"]')!.click();
    await tick();
    await tick();
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) => i.textContent!.includes("Markdown") && i.closest<HTMLElement>('[data-slot="dropdown-menu-content"]')!.style.display !== "none")!;
    item.click();
    await tick();
    expect(String(writeText.mock.lastCall![0])).toContain("**greet.ts**");
    expect(events).toEqual(["code", "markdown"]);
  });
});
