// The Blade semantic-search example (packages/php/examples/rendered/semantic-search.html) under real Alpine.
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
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(listener?: (e: CustomEvent) => void) {
  const host = document.createElement("div");
  host.innerHTML = rendered("semantic-search");
  document.body.append(host);
  if (listener) host.addEventListener("nq-semantic-search", listener as EventListener);
  Alpine.initTree(host);
  await tick();
  return host;
}

const items = (h: HTMLElement) => [...h.querySelectorAll("ol > li")];
const btn = (h: HTMLElement, text: string) => [...h.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;

describe("semantic-search (Blade example)", () => {
  it("renders the hits with marked words, scores and the count", async () => {
    const h = await mount();
    expect(items(h)).toHaveLength(2);
    expect(items(h)[0]!.querySelector("mark")!.textContent!.toLowerCase()).toBe("refunds");
    expect(items(h)[0]!.textContent).toContain("0.91");
    expect(items(h)[0]!.textContent).toContain("Strong");
    expect(items(h)[1]!.textContent).toContain("via Shipping");
    expect(h.querySelector('[role="status"].text-caption')!.textContent).toBe("2 results");
  });

  it("narrows by facet and by importance and clears", async () => {
    const h = await mount();
    btn(h, "faq").click();
    await tick();
    expect(items(h)).toHaveLength(1);
    expect(btn(h, "faq").getAttribute("aria-pressed")).toBe("true");
    expect(h.textContent).toContain("1 of 2 results");
    btn(h, "Clear filters").click();
    await tick();
    expect(items(h)).toHaveLength(2);
    btn(h, "High importance").click();
    await tick();
    expect(items(h)).toHaveLength(1);
  });

  it("dispatches a search with mode and limit and takes the hits from the promise", async () => {
    let seen: unknown;
    const h = await mount((e) => {
      seen = e.detail;
      e.detail.promise = Promise.resolve([{ id: "9", content: "A new hit", score: 0.4 }]);
    });
    btn(h, "Keyword").click();
    btn(h, "20").click();
    await tick();
    h.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick();
    expect(seen).toMatchObject({ query: "refunds", mode: "keyword", limit: 20 });
    expect(items(h)).toHaveLength(1);
    expect(items(h)[0]!.textContent).toContain("Weak");
  });

  it("shows an error from the handler", async () => {
    const h = await mount((e) => {
      e.detail.promise = Promise.resolve({ error: "Boom" });
    });
    h.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick();
    const alert = h.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent).toContain("Boom");
  });
});
