// The Blade example (php/examples/error-pages.blade.php) mounted under real Alpine: the retry button's pending state and events.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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
});

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("error-pages (Blade example)", () => {
  it("renders the pages with kind, code, heading and the asked-for buttons", async () => {
    const host = await mountHtml(rendered("error-pages"));
    const pages = [...host.querySelectorAll<HTMLElement>('[data-slot="error-page"]')];
    expect(pages.map((p) => p.dataset.kind)).toEqual(["not-found", "server-error"]);
    expect(pages[0]!.querySelector('[data-slot="error-page-code"]')!.textContent).toBe("404");
    expect(pages[0]!.querySelector("h1")!.textContent).toBe("We could not find that page");
    expect(pages[0]!.classList.contains("min-h-dvh")).toBe(false);
    expect(pages[0]!.querySelector('a[href="/"]')).not.toBeNull();
    expect(pages[1]!.querySelector('[role="alert"]')).not.toBeNull();
    expect(pages[1]!.textContent).toContain("err_9f2a41");
    expect(pages[1]!.querySelector('[data-slot="copy-button"]')).not.toBeNull();
  });

  it("retry is busy until the listener's promise settles", async () => {
    const host = await mountHtml(rendered("error-pages"));
    const page = host.querySelector<HTMLElement>('[data-kind="server-error"]')!;
    let release!: () => void;
    page.addEventListener("nq-error-retry", (e) => {
      (e as CustomEvent).detail.wait(new Promise<void>((r) => (release = r)));
    });
    const retry = [...page.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Try again"))!;
    expect(retry.getAttribute("aria-busy")).toBeNull();
    retry.click();
    await tick();
    expect(retry.getAttribute("aria-busy")).toBe("true");
    expect(retry.hasAttribute("data-disabled")).toBe(true);
    release();
    await tick();
    expect(retry.getAttribute("aria-busy")).toBeNull();
    expect(retry.hasAttribute("data-disabled")).toBe(false);
  });
});
