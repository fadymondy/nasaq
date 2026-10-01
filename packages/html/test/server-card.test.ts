// The Blade server-card example (packages/php/examples/rendered/server-card.html) under real Alpine.
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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  // The example answers every event itself; tests wire their own listeners, so strip those handlers.
  host.innerHTML = rendered("server-card").replace(/x-on:nq-(power|take-snapshot|rollback|delete-snapshot|save-limits)="[^"]*"/g, "");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="server-card"]')!;
  return { host, root };
}

const shown = (el: Element | null | undefined) => !!el && (el as HTMLElement).style.display !== "none";
const power = (root: HTMLElement, action: string) => root.querySelector<HTMLButtonElement>(`[data-power="${action}"]`)!;
const answer = (root: HTMLElement, event: string, result?: unknown, seen?: (detail: Record<string, unknown>) => void) =>
  root.addEventListener(event, (e) => {
    const d = (e as CustomEvent).detail;
    seen?.(d);
    d.wait(Promise.resolve(result));
  });
const confirmButton = () => document.querySelector<HTMLButtonElement>('[data-slot="confirm-button-action"]')!;
const confirmTitle = () => document.querySelector('[data-slot="alert-dialog-title"]')!.textContent;
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const buttonNamed = (scope: ParentNode, text: string) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim() === text)!;

describe("server-card (Blade example)", () => {
  it("renders the server, hardware, meters, deploy and the power controls for its state", async () => {
    const { root } = await mount();
    expect(root.dataset.status).toBe("running");
    expect(root.querySelector("h3")!.textContent).toBe("web-01");
    expect([...root.querySelectorAll('[data-slot="status"]')].filter(shown).map((s) => s.textContent?.trim())).toEqual(["Running"]);
    expect(root.textContent).toContain("203.0.113.24");
    const hardware = root.querySelector('ul[aria-label="Hardware"]')!.textContent!;
    expect(hardware).toContain("4 vCPU");
    expect(hardware).toContain("8 GB");
    expect(hardware).toContain("160 GB");
    const meters = [...root.querySelectorAll('[data-slot="meter"]')];
    expect(meters.map((m) => m.getAttribute("aria-valuenow"))).toEqual(["42", "71", "38"]);
    expect(meters.map((m) => m.getAttribute("data-tone"))).toEqual(["default", "default", "default"]);
    expect(root.textContent).toContain("a1b2c3d");
    expect(root.textContent).toContain("by Layla");
    expect(["start", "restart", "stop", "force-stop"].filter((a) => shown(power(root, a)))).toEqual(["restart", "stop", "force-stop"]);
    expect(root.querySelectorAll('[data-slot="server-snapshot"]')).toHaveLength(1);
    expect(root.textContent).toContain("Before upgrade");
    expect(root.textContent).toContain("18.4 GB");
  });

  it("restarts without asking", async () => {
    const { root } = await mount();
    const seen: unknown[] = [];
    answer(root, "nq-power", undefined, (d) => seen.push(d.action));
    power(root, "restart").click();
    await tick(80);
    expect(seen).toEqual(["restart"]);
    expect(root.dataset.status).toBe("running");
  });

  it("asks before stopping, then fires nq-power and moves to stopped", async () => {
    const { root } = await mount();
    const seen: unknown[] = [];
    answer(root, "nq-power", undefined, (d) => seen.push(d.action));
    power(root, "stop").click();
    await tick(80);
    expect(seen).toEqual([]);
    expect(confirmTitle()).toBe("Stop web-01?");
    expect(document.querySelector('[data-slot="alert-dialog-description"]')!.textContent).toContain("shuts down cleanly");
    confirmButton().click();
    await tick(80);
    expect(seen).toEqual(["stop"]);
    expect(root.dataset.status).toBe("stopped");
    expect([...root.querySelectorAll('[data-slot="status"]')].filter(shown).map((s) => s.textContent?.trim())).toEqual(["Stopped"]);
    expect(["start", "restart", "stop", "force-stop"].filter((a) => shown(power(root, a)))).toEqual(["start"]);
    const noMetrics = [...root.querySelectorAll("p")].find((p) => p.textContent === "Live usage is not available while the server is off.");
    expect(shown(noMetrics)).toBe(true);
  });

  it("names the force stop in the confirm", async () => {
    const { root } = await mount();
    power(root, "force-stop").click();
    await tick(80);
    expect(confirmTitle()).toBe("Force stop web-01?");
  });

  it("does nothing when nobody answers the event", async () => {
    const { root } = await mount();
    power(root, "stop").click();
    await tick(80);
    confirmButton().click();
    await tick(80);
    expect(root.dataset.status).toBe("running");
  });

  it("shows an error from nq-power and keeps the state", async () => {
    const { root } = await mount();
    answer(root, "nq-power", { error: "Provider is down" });
    power(root, "restart").click();
    await tick(80);
    const alert = [...root.querySelectorAll<HTMLElement>('[data-slot="alert"]')].find((a) => shown(a))!;
    expect(alert.textContent).toContain("Provider is down");
    expect(root.dataset.status).toBe("running");
  });

  it("takes a snapshot with the typed name and adds it to the list", async () => {
    const { root } = await mount();
    let name: unknown;
    answer(root, "nq-take-snapshot", undefined, (d) => (name = d.name));
    buttonNamed(root, "Take snapshot").click();
    await tick(80);
    const form = document.querySelector<HTMLFormElement>('form[data-slot="server-snapshot-dialog"]')!;
    type(form.querySelector("input")!, "  Nightly  ");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(120);
    expect(name).toBe("Nightly");
    const rows = [...root.querySelectorAll('[data-slot="server-snapshot"]')];
    expect(rows).toHaveLength(2);
    expect(rows[1]!.textContent).toContain("Nightly");
    expect(rows[1]!.textContent).toContain("Just now");
  });

  it("confirms, then deletes a snapshot from its menu", async () => {
    const { root } = await mount();
    const ids: unknown[] = [];
    answer(root, "nq-delete-snapshot", undefined, (d) => ids.push(d.snapshotId));
    root.querySelector<HTMLButtonElement>('[data-slot="server-snapshot"] [data-slot="dropdown-menu-trigger"]')!.click();
    await tick(80);
    const del = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')].find((i) => i.textContent?.includes("Delete"))!;
    del.click();
    await tick(80);
    expect(confirmTitle()).toBe("Delete Before upgrade?");
    expect(ids).toEqual([]);
    confirmButton().click();
    await tick(80);
    expect(ids).toEqual(["s1"]);
    expect(root.querySelectorAll('[data-slot="server-snapshot"]')).toHaveLength(0);
    expect(shown([...root.querySelectorAll("p")].find((p) => p.textContent === "No snapshots yet."))).toBe(true);
  });

  it("validates the limits, then fires nq-save-limits and updates the hardware badges", async () => {
    const { root } = await mount();
    let limits: unknown;
    answer(root, "nq-save-limits", undefined, (d) => (limits = d.limits));
    buttonNamed(root, "Resource limits").click();
    await tick(80);
    const form = document.querySelector<HTMLFormElement>('form[data-slot="server-limits"]')!;
    const inputs = [...form.querySelectorAll("input")];
    expect(inputs.map((i) => i.value)).toEqual(["4", "8192", "160"]);
    type(inputs[0]!, "0");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(limits).toBeUndefined();
    const errors = [...form.querySelectorAll<HTMLElement>('[data-slot="field-error"]')].filter(shown).map((e) => e.textContent);
    expect(errors).toEqual(["Enter a number from 1 to 64."]);
    expect(inputs[0]!.getAttribute("aria-invalid")).toBe("true");
    type(inputs[0]!, "8");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(120);
    expect(limits).toEqual({ cpuCores: 8, memoryMb: 8192, diskGb: 160 });
    expect(root.querySelector('ul[aria-label="Hardware"]')!.textContent).toContain("8 vCPU");
  });
});
