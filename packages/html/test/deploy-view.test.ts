// The Blade deploy-view example (packages/php/examples/rendered/deploy-view.html) under real Alpine.
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
  host.innerHTML = rendered("deploy-view");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="deploy-view"]')!;
}

const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;

describe("deploy-view (Blade example)", () => {
  it("renders the derived status, the progress and the steps in order", async () => {
    const root = await mount();
    expect(root.getAttribute("data-status")).toBe("failed");
    expect(root.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("33.333333333333");
    const steps = [...root.querySelectorAll<HTMLElement>('[data-slot="deploy-step"]')];
    expect(steps.map((s) => s.getAttribute("data-status"))).toEqual(["success", "failed", "pending"]);
    expect(steps[0]!.textContent).toContain("8.4s");
    expect(root.textContent).toContain("main · 4f2a91c");
  });

  it("opens the failed step by default and shows its log without ANSI codes", async () => {
    const root = await mount();
    const panels = [...root.querySelectorAll<HTMLElement>('[data-slot="collapsible-panel"]')];
    expect(panels.map((p) => p.hasAttribute("data-open"))).toEqual([false, true, false]);
    const log = panels[1]!.querySelector('[role="log"]')!;
    expect(log.textContent).toContain("compiled 214 modules");
    expect(log.textContent).not.toContain("[31m");
    expect(panels[1]!.textContent).toContain("The build exited with code 1.");
  });

  it("toggles a step from its trigger", async () => {
    const root = await mount();
    const trigger = root.querySelectorAll<HTMLElement>('[data-slot="collapsible-trigger"]')[0]!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("retries a failed step and shows the returned error", async () => {
    const root = await mount();
    let stepId = "";
    root.addEventListener("retry", (e) => {
      const d = (e as CustomEvent).detail;
      stepId = d.stepId;
      d.wait(Promise.resolve({ error: "Runner offline" }));
    });
    button(root, "Retry step").click();
    await tick();
    expect(stepId).toBe("build");
    expect(root.textContent).toContain("Runner offline");
  });

  it("shows a generic error when the handler rejects", async () => {
    const root = await mount();
    root.addEventListener("retry", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    button(root, "Retry step").click();
    await tick();
    expect(root.textContent).toContain("Could not retry. Try again.");
  });

  it("has no cancel button while not running", async () => {
    const root = await mount();
    expect(button(root, "Cancel deploy")).toBeUndefined();
  });
});
