import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { activeHeadingId, readingProgress } from "../src/alpine/blog-post";

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
  host.innerHTML = rendered("blog-post");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const tops = (root: HTMLElement, at: Record<string, number>) => {
  for (const [id, top] of Object.entries(at)) {
    const el = root.querySelector(`[id="${id}"]`) as HTMLElement;
    el.getBoundingClientRect = () => ({ top, bottom: top + 20, left: 0, right: 0, width: 0, height: 20, x: 0, y: top, toJSON() {} }) as DOMRect;
  }
};

describe("blog-post helpers", () => {
  it("picks the last heading that passed the offset", () => {
    const list = [
      { id: "a", top: -200 },
      { id: "b", top: 50 },
      { id: "c", top: 400 },
    ];
    expect(activeHeadingId(list, 96)).toBe("b");
    expect(activeHeadingId([{ id: "c", top: 400 }], 96)).toBeNull();
  });

  it("measures reading progress from 0 to 1", () => {
    expect(readingProgress(0, 3000, 1000)).toBe(0);
    expect(readingProgress(-1000, 3000, 1000)).toBe(0.5);
    expect(readingProgress(-5000, 3000, 1000)).toBe(1);
  });
});

describe("blog-post (Blade example)", () => {
  it("renders the anchored body, a callout and the table of contents", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-post"]')!;
    expect(root.querySelector("h1")!.textContent).toBe("Calm interfaces");
    expect(root.querySelector('[data-slot="post-body"] h2#why-calm')).not.toBeNull();
    expect(root.querySelector('[data-slot="post-body"] h3#check-the-result')).not.toBeNull();
    const callout = root.querySelector('[data-slot="callout"]')!;
    expect(callout.getAttribute("data-kind")).toBe("tip");
    expect(callout.textContent).toContain("Remove one thing before you add one.");
    expect(callout.textContent).not.toContain("[!TIP]");
    const links = [...root.querySelectorAll('aside [data-slot="table-of-contents"] a')].map((a) => a.getAttribute("href"));
    expect(links).toEqual(["#why-calm", "#how-to-start", "#check-the-result"]);
    expect(root.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("0");
    expect(root.querySelectorAll('[data-slot="post-adjacent"]')).toHaveLength(1);
  });

  it("marks the heading in view as current in the table of contents", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-post"]')!;
    tops(root, { "why-calm": -300, "how-to-start": 40, "check-the-result": 600 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    data.update();
    await tick();
    expect(data.active).toBe("how-to-start");
    const current = [...root.querySelectorAll('aside [data-slot="table-of-contents"] a[aria-current="location"]')];
    expect(current.map((a) => a.getAttribute("href"))).toEqual(["#how-to-start"]);
  });

  it("jumps to a heading from the table of contents and closes the narrow list", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-post"]')!;
    const target = root.querySelector<HTMLElement>("#check-the-result")!;
    let scrolled = 0;
    target.scrollIntoView = () => {
      scrolled++;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    data.tocOpen = true;
    const link = root.querySelector<HTMLElement>('aside a[href="#check-the-result"]')!;
    link.click();
    await tick();
    expect(scrolled).toBe(1);
    expect(data.tocOpen).toBe(false);
    expect(data.active).toBe("check-the-result");
    expect(window.location.hash).toBe("#check-the-result");
  });
});
