// The Blade github-activity example (packages/php/examples/rendered/github-activity.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("github-activity");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="github-activity"]')!;
}

const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
const rows = (root: HTMLElement, slot: string) => [...root.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)];
const rerunButtons = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.textContent?.includes("Re-run"));

describe("github-activity (Blade example)", () => {
  it("renders the card, the tabs and the feeds", async () => {
    const root = await mount();
    expect(root.querySelector('a[aria-label="Open on GitHub: acme/storefront"]')?.getAttribute("href")).toBe("https://github.com/acme/storefront");
    expect(rows(root, "github-commit")).toHaveLength(2);
    expect(rows(root, "github-run").map((r) => r.getAttribute("data-status"))).toEqual(["failure", "success"]);
    expect(rows(root, "github-run")[0]!.textContent).toContain("3m 04s");
    expect(root.querySelector("code")?.getAttribute("dir")).toBe("ltr");
  });

  it("filters the lists and shows the no-match state", async () => {
    const root = await mount();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "khaled";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(rows(root, "github-commit").map(visible)).toEqual([false, true]);
    input.value = "zzz-nothing";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(rows(root, "github-commit").every((r) => !visible(r))).toBe(true);
    input.value = "";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(rows(root, "github-commit").every(visible)).toBe(true);
  });

  it("drops the top rule of the first visible row after filtering", async () => {
    const root = await mount();
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    const commits = rows(root, "github-commit");
    expect(commits[1]!.classList.contains("border-t-0")).toBe(false);
    input.value = "khaled";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(rows(root, "github-commit").map(visible)).toEqual([false, true]);
    expect(commits[1]!.classList.contains("border-t-0")).toBe(true);
    input.value = "";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(commits[1]!.classList.contains("border-t-0")).toBe(false);
  });

  it("reports a typed filter, so an empty feed reads as no match", async () => {
    const root = await mount();
    const data = Alpine.$data(root) as { filtered(): boolean };
    expect(data.filtered()).toBe(false);
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = " x ";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(data.filtered()).toBe(true);
  });

  it("shows Re-run on every finished run and sends the run id", async () => {
    const root = await mount();
    expect(rerunButtons(root)).toHaveLength(2);
    let runId = "";
    root.addEventListener("rerun", (e) => {
      const d = (e as CustomEvent).detail;
      runId = d.runId;
      d.wait(Promise.resolve());
    });
    rerunButtons(root)[0]!.click();
    await tick();
    expect(runId).toBe("run-412");
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows the returned error in an alert and dismisses it", async () => {
    const root = await mount();
    root.addEventListener("rerun", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Workflow is disabled" })));
    rerunButtons(root)[0]!.click();
    await tick();
    const alert = root.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("Workflow is disabled");
    alert.querySelector("button")!.click();
    await tick();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it("falls back to a generic error when the host rejects", async () => {
    const root = await mount();
    root.addEventListener("rerun", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    rerunButtons(root)[0]!.click();
    await tick();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain("Something went wrong. Try again.");
  });
});
