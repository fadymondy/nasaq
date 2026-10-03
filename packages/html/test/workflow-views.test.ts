// The Blade workflow-views example (packages/php/examples/rendered/workflow-views.html) under real Alpine.
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
  localStorage.clear();
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("workflow-views");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = () => document.querySelector<HTMLElement>('[data-slot="workflow-views"]')!;
const panel = (v: string) => document.querySelector<HTMLElement>(`[data-view-panel="${v}"]`)!;
const toggle = (v: string) => document.querySelector<HTMLButtonElement>(`[data-slot="toggle"][data-view="${v}"]`)!;
const hidden = (el: HTMLElement) => el.style.display === "none";

describe("workflow-views (Blade example)", () => {
  it("renders the numbered outline with branches and a kind badge", async () => {
    await mount();
    expect(root().getAttribute("data-view")).toBe("steps");
    expect(document.querySelectorAll('[data-slot="workflow-step"]')).toHaveLength(7);
    expect(document.querySelectorAll('[data-slot="workflow-branch"]')).toHaveLength(2);
    expect(root().textContent).toContain("2.a.1");
    expect(root().textContent).toContain("3.2");
    expect(document.querySelector('[data-step="check"]')!.getAttribute("data-kind")).toBe("decision");
    expect(document.querySelector('[data-step="check"] > button')!.getAttribute("aria-current")).toBe("step");
    expect(hidden(panel("steps"))).toBe(false);
    expect(hidden(panel("pipeline"))).toBe(true);
  });

  it("switches to the pipeline, remembers it and fires nq-view-change", async () => {
    await mount();
    const seen: string[] = [];
    root().addEventListener("nq-view-change", (e) => seen.push((e as CustomEvent).detail.view));
    toggle("pipeline").click();
    await tick();
    expect(root().getAttribute("data-view")).toBe("pipeline");
    expect(hidden(panel("pipeline"))).toBe(false);
    expect(hidden(panel("steps"))).toBe(true);
    expect(toggle("pipeline").getAttribute("aria-pressed")).toBe("true");
    expect(panel("pipeline").querySelector('[data-slot="workflow-network"]')).not.toBeNull();
    expect(seen).toEqual(["pipeline"]);
    expect(localStorage.getItem("workflow:view")).toBe("pipeline");
  });

  it("pressing the current view again keeps it", async () => {
    await mount();
    toggle("steps").click();
    await tick();
    expect(root().getAttribute("data-view")).toBe("steps");
    expect(toggle("steps").getAttribute("aria-pressed")).toBe("true");
  });

  it("reads the remembered view at init", async () => {
    localStorage.setItem("workflow:view", "pipeline");
    await mount();
    expect(root().getAttribute("data-view")).toBe("pipeline");
    expect(toggle("pipeline").getAttribute("aria-pressed")).toBe("true");
  });

  it("step clicks fire nq-step-click with the id", async () => {
    await mount();
    const ids: string[] = [];
    root().addEventListener("nq-step-click", (e) => ids.push((e as CustomEvent).detail.id));
    document.querySelector<HTMLButtonElement>('[data-step="ledger"] > button')!.click();
    expect(ids).toEqual(["ledger"]);
  });
});
