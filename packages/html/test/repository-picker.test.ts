// The Blade example (php/examples/repository-picker.blade.php) mounted under real Alpine: search, pick, branch default.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("repository-picker (Blade example)", () => {
  it("searches on open, picks a repository and selects its default branch", async () => {
    const host = await mountHtml(rendered("repository-picker"));
    const root = host.querySelector<HTMLElement>('[data-slot="repository-picker"]')!;
    const changes: { repo: { id: string } | null; branch: string | null }[] = [];
    root.addEventListener("nq-repo-change", (e) => changes.push((e as CustomEvent).detail));
    const [repoTrigger, branchTrigger] = [...host.querySelectorAll<HTMLElement>('[data-slot="popover-trigger"]')];
    expect(branchTrigger!.hasAttribute("disabled")).toBe(true);

    repoTrigger!.click();
    await tick(60);
    const options = document.querySelectorAll<HTMLElement>('[role="option"]');
    expect(options.length).toBe(3);
    expect(document.body.textContent).toContain("Private");
    options[0]!.click();
    await tick(60);

    expect(changes.at(-1)).toMatchObject({ repo: { id: "1" }, branch: "main" });
    expect(repoTrigger!.textContent).toContain("storefront");
    expect(branchTrigger!.hasAttribute("disabled")).toBe(false);
    expect(branchTrigger!.textContent).toContain("main");
  });
});
