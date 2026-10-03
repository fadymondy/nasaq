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

describe("oauth-buttons (Blade example)", () => {
  it("renders the React markup with the official logos", async () => {
    const host = await mount(rendered("oauth-buttons"));
    const group = host.querySelector<HTMLElement>('[data-slot="oauth-buttons"]')!;
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Sign in with a provider");
    const buttons = [...group.querySelectorAll<HTMLButtonElement>('[data-slot="oauth-button"]')];
    expect(buttons.map((b) => b.dataset.provider)).toEqual(["google", "github", "apple"]);
    expect(buttons[0]!.textContent).toContain("Continue with Google");
    expect(buttons[0]!.querySelector("bdi")?.textContent).toBe("Google");
    expect([...buttons[0]!.querySelectorAll("svg:not([data-slot]) path")].map((p) => p.getAttribute("fill"))).toEqual(["#4285F4", "#34A853", "#FBBC04", "#E94235"]);
    expect(buttons[2]!.className).toContain("bg-black");
  });

  it("a promise passed to wait() shows that provider's spinner and disables the others until it settles", async () => {
    const host = await mount(rendered("oauth-buttons"));
    const group = host.querySelector<HTMLElement>('[data-slot="oauth-buttons"]')!;
    const [google, github] = [...group.querySelectorAll<HTMLButtonElement>('[data-slot="oauth-button"]')];
    let done!: () => void;
    let id = "";
    group.addEventListener("nq-oauth-select", (e) => {
      const d = (e as CustomEvent).detail;
      id = d.id;
      d.wait(new Promise<void>((r) => (done = r)));
    });
    const spinnerShown = (b: HTMLElement) => (b.querySelector<HTMLElement>('[data-slot="spinner"]')!.parentElement as HTMLElement).style.display !== "none";
    expect(spinnerShown(google!)).toBe(false);
    google!.click();
    await tick();
    expect(id).toBe("google");
    expect(google!.getAttribute("aria-busy")).toBe("true");
    expect(google!.hasAttribute("data-disabled")).toBe(true);
    expect(spinnerShown(google!)).toBe(true);
    expect(github!.disabled).toBe(true);
    // A second click while busy does nothing.
    google!.click();
    done();
    await tick();
    expect(google!.hasAttribute("aria-busy")).toBe(false);
    expect(spinnerShown(google!)).toBe(false);
    expect(github!.disabled).toBe(false);
  });

  it("without a promise nothing loads", async () => {
    const host = await mount(rendered("oauth-buttons"));
    const github = host.querySelector<HTMLButtonElement>('[data-provider="github"]')!;
    let fired = 0;
    host.addEventListener("nq-oauth-select", () => fired++);
    github.click();
    await tick();
    expect(fired).toBe(1);
    expect(github.hasAttribute("aria-busy")).toBe(false);
  });
});
