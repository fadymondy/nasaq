import { flushPromises, mount } from "@vue/test-utils";
import { Globe, Mail, Webhook } from "lucide-vue-next";
import { describe, expect, it, vi } from "vitest";
import { NqWorkflowCanvas, addStep, validateWorkflow, type WorkflowGraph, type WorkflowRun, type WorkflowStepType, type WorkflowVersion } from ".";
import { typeMap } from "./workflow-model";

const types: WorkflowStepType[] = [
  { id: "webhook", label: "Webhook", category: "trigger", icon: Webhook, role: "trigger", fields: [{ name: "path", label: "Path", kind: "text", required: true }] },
  { id: "http", label: "HTTP request", category: "action", icon: Globe, fields: [{ name: "url", label: "URL", kind: "url", required: true }] },
  { id: "mail", label: "Send email", category: "action", icon: Mail },
];
const categories = [{ id: "trigger", label: "Triggers" }, { id: "action", label: "Actions" }];
const graph: WorkflowGraph = {
  nodes: [
    { id: "a", type: "webhook", config: { path: "/hook" }, position: { x: 0, y: 0 } },
    { id: "b", type: "http", config: {}, position: { x: 340, y: 0 } },
  ],
  edges: [{ id: "e1", source: "a", target: "b" }],
};
const runs: WorkflowRun[] = [
  { id: "r1", status: "error", startedAt: "2026-09-29T09:00:00Z", durationMs: 1800, nodes: { a: { status: "success", items: 3, durationMs: 40 }, b: { status: "error", error: "Boom", durationMs: 900 } } },
];
const versions: WorkflowVersion[] = [
  { version: 2, savedAt: "2026-09-29T09:00:00Z", graph },
  { version: 1, savedAt: "2026-09-28T09:00:00Z", graph: { nodes: [graph.nodes[0]!], edges: [] } },
];
const mountIt = (props: Record<string, unknown> = {}) => mount(NqWorkflowCanvas, { props: { value: graph, types, categories, ...props }, attachTo: document.body });

describe("NqWorkflowCanvas", () => {
  it("renders nodes with status and type attributes, and an always-LTR canvas", () => {
    const w = mountIt();
    expect(w.attributes("data-slot")).toBe("workflow-canvas");
    const nodes = w.findAll('[data-slot="workflow-node"]');
    expect(nodes.map((n) => n.attributes("data-type"))).toEqual(["webhook", "http"]);
    expect(nodes[0]!.attributes("data-status")).toBe("idle");
    expect(w.find('[data-slot="workflow-surface"]').element.parentElement!.getAttribute("dir")).toBe("ltr");
    expect(w.findAll('[data-slot="workflow-edge"]')).toHaveLength(1);
    w.unmount();
  });

  it("validates: the HTTP step is missing its URL, so Run is disabled", () => {
    const issues = validateWorkflow(graph, typeMap(types));
    expect(issues.some((i) => i.code === "missing-field" && i.field === "url")).toBe(true);
    const w = mountIt({ onRun: vi.fn() });
    const run = w.findAll("button").find((b) => b.text() === "Run")!;
    expect(run.attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("selecting a node opens the config panel; editing a field emits change", async () => {
    const w = mountIt();
    await w.findAll('[data-slot="workflow-node"]')[1]!.trigger("click");
    const panel = w.find('[data-slot="workflow-side-panel"]');
    expect(panel.exists()).toBe(true);
    expect(w.find('[data-slot="workflow-node"][data-selected="true"]').exists()).toBe(true);
    const url = panel.findAll("input").find((i) => i.attributes("inputmode") === "url")!;
    await url.setValue("https://x.test");
    const ev = w.emitted("change")!;
    expect((ev[ev.length - 1]![0] as WorkflowGraph).nodes[1]!.config.url).toBe("https://x.test");
    w.unmount();
  });

  it("the plus button opens the picker and picking adds a node", async () => {
    const w = mountIt();
    await w.find('[data-slot="workflow-node"][data-type="http"] [data-slot="workflow-node-add"]').trigger("click");
    const panel = w.find('[data-slot="workflow-side-panel"]');
    expect(panel.text()).toContain("Send email");
    await panel.findAll("button").find((b) => b.text().includes("Send email"))!.trigger("click");
    const next = w.emitted("change")!.at(-1)![0] as WorkflowGraph;
    expect(next.nodes).toHaveLength(3);
    expect(next.edges).toHaveLength(2);
    w.unmount();
  });

  it("Delete removes the selected node", async () => {
    const w = mountIt();
    await w.findAll('[data-slot="workflow-node"]')[1]!.trigger("click");
    await w.trigger("keydown", { key: "Delete" });
    const next = w.emitted("change")!.at(-1)![0] as WorkflowGraph;
    expect(next.nodes.map((n) => n.id)).toEqual(["a"]);
    w.unmount();
  });

  it("draws an execution overlay with status text and the Output tab", async () => {
    const w = mountIt({ runs, defaultRunId: "r1", readOnly: true });
    const nodes = w.findAll('[data-slot="workflow-node"]');
    expect(nodes.map((n) => n.attributes("data-status"))).toEqual(["success", "error"]);
    expect(w.text()).toContain("Failed");
    await nodes[1]!.trigger("click");
    expect(w.find('[data-slot="workflow-side-panel"]').text()).toContain("Boom");
    expect(w.find('[data-slot="workflow-node-add"]').exists()).toBe(false);
    w.unmount();
  });

  it("previews a version read-only and restores after a confirmation", async () => {
    const onRestoreVersion = vi.fn().mockResolvedValue(undefined);
    const w = mountIt({ versions, onRestoreVersion });
    await w.findAll("button").find((b) => b.text() === "Versions")!.trigger("click");
    const rows = w.findAll("[data-version-row]");
    expect(rows.map((r) => r.attributes("data-version-row"))).toEqual(["2", "1"]);
    await rows[1]!.find("button").trigger("click");
    expect(w.text()).toContain("Previewing version 1");
    expect(w.findAll('[data-slot="workflow-node"]')).toHaveLength(1);
    await w.find("[data-restore]").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-slot="workflow-restore-confirm"]')!.click();
    await flushPromises();
    expect(onRestoreVersion).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
    w.unmount();
  });

  it("is read-only: no toolbar edit actions", () => {
    const w = mountIt({ readOnly: true });
    expect(w.text()).toContain("Read only");
    expect(w.text()).not.toContain("Add step");
    w.unmount();
  });

  it("addStep builds the first node", () => {
    const res = addStep({ nodes: [], edges: [] }, typeMap(types), "webhook");
    expect(res.graph.nodes[0]!.type).toBe("webhook");
  });
});
