// The Blade text-utilities example (packages/php/examples/rendered/text-utilities.html) under real Alpine.
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("text-utilities");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const slot = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
const shownButton = (root: HTMLElement) => [...root.querySelectorAll("button")].find((b) => b.style.display !== "none");

describe("text-utilities (Blade example)", () => {
  it("linkify makes safe links, left to right, and keeps trailing punctuation out", async () => {
    const host = await mount();
    const links = [...slot(host, "linkify").querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://nasaq-ui.fadymondy.com", "mailto:hello@example.com"]);
    expect(links[0]!.getAttribute("rel")).toContain("noopener");
    expect(links[1]!.getAttribute("target")).toBeNull();
    expect(links[0]!.parentElement!.getAttribute("dir")).toBe("ltr");
    expect(slot(host, "linkify").textContent).toContain("hello@example.com.");
  });

  it("user-text isolates direction and clamps lines", async () => {
    const host = await mount();
    const text = slot(host, "user-text");
    expect(text.getAttribute("dir")).toBe("auto");
    expect(text.className).toContain("overflow-hidden");
    expect(text.querySelector("a")!.getAttribute("href")).toBe("https://www.example.com");
  });

  it("translatable-text fetches once through the translate event, toggles, and shows failures", async () => {
    const host = await mount();
    const root = slot(host, "translatable-text");
    let calls = 0;
    root.addEventListener("translate", (e) => {
      calls++;
      (e as CustomEvent).detail.wait(Promise.resolve("Welcome to the team"));
    });
    const body = root.querySelector('[data-slot="user-text"]') as HTMLElement;
    expect(body.getAttribute("lang")).toBe("ar");
    expect(root.getAttribute("data-showing")).toBe("original");
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(body.textContent).toBe("Welcome to the team");
    expect(body.getAttribute("lang")).toBe("en");
    expect(root.getAttribute("data-showing")).toBe("translation");
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(body.textContent).toBe("مرحبًا بك في الفريق");
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(calls).toBe(1);
    expect(body.textContent).toBe("Welcome to the team");
  });

  it("translatable-text shows the error with a retry when the translation fails", async () => {
    const host = await mount();
    const root = slot(host, "translatable-text");
    root.addEventListener("translate", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    const alert = root.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent).toContain("Could not translate");
  });

  it("scroll-fade is a labelled region", async () => {
    const host = await mount();
    const fade = slot(host, "scroll-fade");
    expect(fade.getAttribute("role")).toBe("region");
    expect(fade.getAttribute("aria-label")).toBe("Scrollable content");
    expect(fade.querySelectorAll("span").length).toBe(12);
  });

  it("bookmark-button flips at once, reverts with a message when the save fails", async () => {
    const host = await mount();
    const button = slot(host, "bookmark-button") as HTMLButtonElement;
    const root = button.parentElement!;
    expect(button.getAttribute("aria-pressed")).toBe("false");
    let seen: boolean | undefined;
    root.addEventListener("saved-change", (e) => {
      seen = (e as CustomEvent).detail.saved;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    button.click();
    await tick();
    expect(seen).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.hasAttribute("data-saved")).toBe(true);
    expect(root.querySelector('[role="status"]')!.textContent).toBe("Saved to your bookmarks");

    const again = await mount();
    const b2 = slot(again, "bookmark-button") as HTMLButtonElement;
    b2.parentElement!.addEventListener("saved-change", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "no" })));
    b2.click();
    await tick();
    expect(b2.getAttribute("aria-pressed")).toBe("false");
    expect(b2.parentElement!.querySelector('[role="status"]')!.textContent).toContain("Could not update");
  });

  it("progressive-reveal has a collapsed body and the expand button wired to it", async () => {
    const host = await mount();
    const root = slot(host, "progressive-reveal");
    const body = root.querySelector("div") as HTMLElement;
    expect(body.style.maxHeight).toBe("48px");
    expect(body.id).toMatch(/progressive-reveal/);
    // happy-dom has no layout, so nothing overflows and the button stays hidden until the content is taller.
    const button = root.querySelector("button") as HTMLElement;
    expect(button.style.display).toBe("none");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("progressive-list reveals a step at a time and hides the button at the end", async () => {
    const host = await mount();
    const root = slot(host, "progressive-list");
    const items = () => [...root.querySelectorAll("li")].filter((li) => !li.hidden).map((li) => li.textContent);
    expect(items()).toEqual(["One", "Two", "Three"]);
    expect(root.querySelector("button")!.textContent).toContain("Show 3 more");
    expect(root.querySelector("button")!.textContent).toContain("4 left");
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(items()).toHaveLength(6);
    expect(root.querySelector("button")!.textContent).toContain("Show 1 more");
    (root.querySelector("button") as HTMLElement).click();
    await tick();
    expect(items()).toHaveLength(7);
    expect(shownButton(root)).toBeUndefined();
  });
});
