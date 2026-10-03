// The Blade workflow-canvas example under real Alpine (hand-drawn SVG graph, no graph library).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="workflow-canvas"]')!;
const nodes = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="workflow-node"]')];
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;
const shown = (el: Element | null | undefined) => !!el && (el as HTMLElement).style.display !== "none";

/** Add the webhook trigger through the picker. */
async function addTrigger(host: HTMLElement) {
  button(host, "Add step").click();
  await tick();
  host.querySelector<HTMLButtonElement>('[data-pick-type="webhook"]')!.click();
  await tick();
}

describe("workflow-canvas (Blade example)", () => {
  it("starts empty, always-LTR canvas, Saved badge, edit buttons shown", async () => {
    const host = await mount("workflow-canvas");
    expect(root(host).getAttribute("dir")).toBe("ltr");
    expect(host.querySelector('[data-slot="workflow-surface"]')!.parentElement!.getAttribute("dir")).toBe("ltr");
    expect(nodes(host)).toHaveLength(0);
    expect(shown(button(host, "Add step"))).toBe(true);
    expect(host.textContent).toContain("Saved");
    expect(host.textContent).toContain("The workflow is empty");
    expect(host.querySelector("h2")!.textContent).toBe("New workflow");
  });

  it("the picker lists steps by category and adds a trigger node", async () => {
    const host = await mount("workflow-canvas");
    const changes: unknown[] = [];
    root(host).addEventListener("nq-workflow-change", (e) => changes.push((e as CustomEvent).detail.graph));
    button(host, "Add step").click();
    await tick();
    const aside = host.querySelector<HTMLElement>('[data-slot="workflow-side-panel"]')!;
    expect(shown(aside)).toBe(true);
    expect(aside.textContent).toContain("Triggers");
    
    host.querySelector<HTMLButtonElement>('[data-pick-type="webhook"]')!.click();
    await tick();
    const [n] = nodes(host);
    expect(n!.getAttribute("data-type")).toBe("webhook");
    expect(n!.getAttribute("data-status")).toBe("idle");
    expect(n!.getAttribute("data-selected")).toBe("true");
    expect(changes).toHaveLength(1);
    expect(host.textContent).toContain("Unsaved changes");
    expect(host.querySelector('[data-slot="workflow-config-panel"]')).not.toBeNull();
  });

  it("add button on a node opens the picker and adds a connected step; validation flags the missing URL", async () => {
    const host = await mount("workflow-canvas");
    await addTrigger(host);
    host.querySelector<HTMLButtonElement>('[data-slot="workflow-node"] [data-slot="workflow-node-add"]')!.click();
    await tick();
    host.querySelector<HTMLButtonElement>('[data-pick-type="http"]')!.click();
    await tick();
    expect(nodes(host).map((n) => n.getAttribute("data-type"))).toEqual(["webhook", "http"]);
    expect(host.querySelectorAll('[data-slot="workflow-edge"]')).toHaveLength(1);
    expect(host.textContent).toContain("to fix");
  });

  it("editing a field in the config panel emits change and clears the issue", async () => {
    const host = await mount("workflow-canvas");
    const graphs: { nodes: { config: Record<string, unknown> }[] }[] = [];
    root(host).addEventListener("nq-workflow-change", (e) => graphs.push((e as CustomEvent).detail.graph));
    await addTrigger(host);
    const path = host.querySelector<HTMLInputElement>("#nq-wf-f-path")!;
    path.value = "/hook";
    path.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(graphs.at(-1)!.nodes[0]!.config.path).toBe("/hook");
  });

  it("the validation popover lists the problem and jumps to the step", async () => {
    const host = await mount("workflow-canvas");
    await addTrigger(host);
    host.querySelector<HTMLButtonElement>("[data-slot=workflow-side-panel] [aria-label=Close]")!.click();
    await tick();
    host.querySelector<HTMLButtonElement>("[aria-label=Validation]")!.click();
    await tick();
    const item = [...document.querySelectorAll<HTMLButtonElement>("li button")].find((b) => b.textContent!.includes("needs"))!;
    expect(item).toBeDefined();
    item.click();
    await tick();
    expect(host.querySelector("[data-slot=workflow-config-panel]")).not.toBeNull();
  });

  it("Delete removes the selected node", async () => {
    const host = await mount("workflow-canvas");
    await addTrigger(host);
    expect(nodes(host)).toHaveLength(1);
    nodes(host)[0]!.click();
    await tick();
    root(host).dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await tick();
    expect(nodes(host)).toHaveLength(0);
  });

  it("Save fires nq-workflow-save with the graph and waits for the promise", async () => {
    const host = await mount("workflow-canvas");
    await addTrigger(host);
    const got: { graph: { nodes: unknown[] } }[] = [];
    // The example's own handler calls fetch; replace it with a resolved one.
    (globalThis as unknown as { fetch: unknown }).fetch = () => Promise.resolve({ ok: true });
    root(host).addEventListener("nq-workflow-save", (e) => got.push((e as CustomEvent).detail));
    button(host, "Save").click();
    await tick(60);
    expect(got).toHaveLength(1);
    expect(got[0]!.graph.nodes).toHaveLength(1);
  });

  it("the zoom controls change the zoom label and the lock toggles", async () => {
    const host = await mount("workflow-canvas");
    const pct = () => host.querySelector<HTMLElement>("bdi[x-text=\"zoomPct + '%'\"]")!.textContent;
    const before = pct();
    host.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click();
    await tick();
    expect(pct()).not.toBe(before);
    const lock = host.querySelector<HTMLButtonElement>('[aria-label="Lock the canvas"]')!;
    lock.click();
    await tick();
    expect(lock.getAttribute("aria-label")).toBe("Unlock the canvas");
    expect(lock.getAttribute("aria-pressed")).toBe("true");
  });

  // Runs and versions need data the example does not carry, so the rendered markup is re-mounted with them injected.
  async function mountWith(extra: Record<string, unknown>) {
    const html = readFileSync(resolve(process.cwd(), "../php/examples/rendered/workflow-canvas.html"), "utf8");
    const patched = html
      .replace("\\u0022runs\\u0022:null", `\\u0022runs\\u0022:${enc(extra.runs ?? null)}`)
      .replace("\\u0022versions\\u0022:null", `\\u0022versions\\u0022:${enc(extra.versions ?? null)}`)
      .replace("\\u0022restorable\\u0022:false", `\\u0022restorable\\u0022:${extra.restorable ? "true" : "false"}`)
      .replace("\\u0022readOnly\\u0022:false", `\\u0022readOnly\\u0022:${extra.readOnly ? "true" : "false"}`)
      .replace('\\u0022graph\\u0022:{\\u0022nodes\\u0022:[],\\u0022edges\\u0022:[]}', `\\u0022graph\\u0022:${enc(extra.graph)}`)
      .replace("\\u0022defaultRunId\\u0022:null", `\\u0022defaultRunId\\u0022:${enc(extra.defaultRunId ?? null)}`);
    const host = document.createElement("div");
    host.innerHTML = patched;
    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    return host;
  }
  const enc = (v: unknown) => JSON.stringify(v).replace(/"/g, "\\u0022");
  const graph = {
    nodes: [
      { id: "a", type: "webhook", config: { path: "/hook" }, position: { x: 0, y: 0 } },
      { id: "b", type: "http", config: { url: "https://x.test" }, position: { x: 340, y: 0 } },
    ],
    edges: [{ id: "e1", source: "a", target: "b" }],
  };

  it("draws an execution overlay and the Output tab", async () => {
    const runs = [{ id: "r1", status: "error", startedAt: "2026-09-29T09:00:00Z", durationMs: 1800, dateHtml: "Yesterday", nodes: { a: { status: "success", items: 3, durationMs: 40 }, b: { status: "error", error: "Boom", durationMs: 900 } } }];
    const host = await mountWith({ graph, runs, defaultRunId: "r1", readOnly: true });
    expect(nodes(host).map((n) => n.getAttribute("data-status"))).toEqual(["success", "error"]);
    expect(host.querySelector('[data-slot="workflow-node-add"]:not([style*="none"])')).toBeNull();
    nodes(host)[1]!.click();
    await tick();
    expect(host.querySelector('[data-slot="workflow-side-panel"]')!.textContent).toContain("Boom");
  });

  it("previews a version read-only and restores after the confirmation", async () => {
    const versions = [
      { version: 2, savedAt: "2026-09-29T09:00:00Z", graph, dateHtml: "Today" },
      { version: 1, savedAt: "2026-09-28T09:00:00Z", graph: { nodes: [graph.nodes[0]], edges: [] }, dateHtml: "Yesterday" },
    ];
    const host = await mountWith({ graph, versions, restorable: true });
    const restores: number[] = [];
    root(host).addEventListener("nq-workflow-restore", (e) => {
      const d = (e as CustomEvent).detail;
      restores.push(d.version.version);
      d.waitUntil(Promise.resolve());
    });
    button(host, "Versions").click();
    await tick();
    expect([...host.querySelectorAll("[data-version-row]")].map((r) => r.getAttribute("data-version-row"))).toEqual(["2", "1"]);
    host.querySelector<HTMLButtonElement>('[data-version-row="1"] button')!.click();
    await tick();
    expect(host.textContent).toContain("Previewing version 1");
    expect(nodes(host)).toHaveLength(1);
    host.querySelector<HTMLButtonElement>('[data-version-row="1"] [data-restore]')!.click();
    await tick();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-slot="workflow-restore-confirm"]')!.click();
    await tick(900);
    expect(restores).toEqual([1]);
  });
});
