import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { clampStep, missingSteps, setupProgress } from "../src/alpine/setup-wizard-logic";

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

const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("setup model", () => {
  it("computes the gate and the progress", () => {
    const steps = [{ id: "a" }, { id: "b", optional: true }, { id: "c" }];
    expect(missingSteps(steps, ["a"]).map((s) => s.id)).toEqual(["c"]);
    expect(missingSteps(steps)).toEqual([]);
    expect(setupProgress(1, 4)).toBe(25);
    expect(clampStep(5, 3)).toBe(2);
  });
});

describe("setup-wizard (Blade example)", () => {
  it("starts on the first step with the rail and the count", async () => {
    const host = await mount(rendered("setup-wizard"));
    const root = host.querySelector<HTMLElement>('[data-slot="setup-wizard"]')!;
    expect(root.getAttribute("data-step")).toBe("name");
    expect(root.hasAttribute("data-state")).toBe(false);
    expect(host.querySelector("h2")!.textContent).toBe("Name");
    expect([...host.querySelectorAll('[data-slot="stepper-item"]')].map((i) => i.getAttribute("data-status"))).toEqual(["current", "upcoming"]);
    expect(host.textContent).toContain("Step 1 of 2");
    expect(host.querySelector('[data-slot="progress"]')!.getAttribute("aria-valuenow")).toBe("50");
    expect(shown(host.querySelector('[data-step-id="name"]'))).toBe(true);
    expect(shown(host.querySelector('[data-step-id="agent"]'))).toBe(false);
    expect(button(host, "Continue").hasAttribute("disabled")).toBe(false);
  });

  it("waits on the save, moves on, and the rail goes back", async () => {
    const host = await mount(rendered("setup-wizard"));
    const root = host.querySelector<HTMLElement>('[data-slot="setup-wizard"]')!;
    const events: string[] = [];
    root.addEventListener("nq-step-change", (e) => events.push((e as CustomEvent).detail.stepId));
    button(host, "Continue").click();
    await tick(5);
    expect(button(host, "Continue").getAttribute("aria-busy")).toBe("true");
    await tick(300);
    expect(root.getAttribute("data-step")).toBe("agent");
    expect(events).toEqual(["agent"]);
    expect(shown(host.querySelector('[data-step-id="agent"]'))).toBe(true);
    expect(shown(button(host, "Finish setup"))).toBe(true);
    expect(shown(button(host, "Continue"))).toBe(false);
    const rail = host.querySelectorAll<HTMLButtonElement>('[data-slot="stepper-step"]');
    expect(rail[0]!.disabled).toBe(false);
    rail[0]!.click();
    await tick();
    expect(root.getAttribute("data-step")).toBe("name");
  });

  it("blocks Finish on the server verdict, then finishes to the done screen", async () => {
    const host = await mount(rendered("setup-wizard"));
    const root = host.querySelector<HTMLElement>('[data-slot="setup-wizard"]')!;
    button(host, "Continue").click();
    await tick(300);
    const gate = [...host.querySelectorAll<HTMLElement>('[data-slot="alert"][data-tone="warning"]')].find((a) => a.textContent?.includes("Connect an agent first."))!;
    expect(shown(gate)).toBe(true);
    expect(gate.textContent).toContain("Connect an agent first.");
    expect(button(host, "Finish setup").hasAttribute("disabled")).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Alpine.$data(root) as any).setCanFinish(true);
    await tick();
    expect(shown(gate)).toBe(false);
    button(host, "Finish setup").click();
    await tick(500);
    expect(root.getAttribute("data-state")).toBe("done");
    expect(root.hasAttribute("data-step")).toBe(false);
    expect(host.textContent).toContain("You are all set");
    expect(host.querySelector('a[href="/"]')!.textContent).toContain("Open the dashboard");
    expect(shown(host.querySelector('[data-slot="setup-wizard-body"]')!.closest(".contents"))).toBe(false);
  });

  it("shows an error from a listener and stays on the step", async () => {
    const host = await mount(rendered("setup-wizard"));
    const root = host.querySelector<HTMLElement>('[data-slot="setup-wizard"]')!;
    root.addEventListener("nq-step-complete", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Name is taken" })));
    button(host, "Continue").click();
    await tick(300);
    expect(root.getAttribute("data-step")).toBe("name");
    expect(host.textContent).toContain("Name is taken");
  });
});

describe("agent-enroll (Blade example)", () => {
  it("shows the waiting panel with the timer, then the agent once set", async () => {
    const host = await mount(rendered("setup-wizard"));
    const wait = host.querySelector<HTMLElement>('[data-slot="agent-enroll-wait"]')!;
    expect(wait.getAttribute("data-status")).toBe("waiting");
    expect(wait.querySelector<HTMLInputElement>("input[readonly]")!.value).toBe("curl -fsSL https://get.example.com | sh");
    expect(wait.textContent).toContain("Waiting 1:15");
    window.dispatchEvent(new CustomEvent("nq-agent-status", { detail: { status: "connected", agent: { name: "edge-1", host: "10.0.0.2", version: "1.2.3" } } }));
    await tick();
    expect(wait.getAttribute("data-status")).toBe("connected");
    const ok = wait.querySelector<HTMLElement>('[data-slot="alert"][data-tone="success"]')!;
    expect(shown(ok)).toBe(true);
    expect(ok.textContent).toContain("10.0.0.2");
    expect(ok.textContent).toContain("1.2.3");
    expect(wait.querySelector('[data-slot="agent-enroll-status"]')!.getAttribute("aria-live")).toBe("polite");
  });

  it("offers a retry on timeout that fires nq:retry", async () => {
    const host = await mount(rendered("setup-wizard"));
    const wait = host.querySelector<HTMLElement>('[data-slot="agent-enroll-wait"]')!;
    window.dispatchEvent(new CustomEvent("nq-agent-status", { detail: { status: "timeout" } }));
    await tick();
    expect(shown(wait.querySelector('[data-tone="warning"]'))).toBe(true);
    button(wait, "Check again").click();
    await tick();
    expect(wait.getAttribute("data-status")).toBe("waiting");
    expect(wait.textContent).toContain("Waiting 0:00");
  });
});
