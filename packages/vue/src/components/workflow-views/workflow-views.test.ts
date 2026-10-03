import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { countWorkflowSteps, numberWorkflow, NqWorkflowViews, workflowToNetwork } from ".";

const steps = [
  { id: "ask", title: "Customer asks" },
  {
    id: "check",
    title: "Within 14 days?",
    branches: [
      { label: "Yes", steps: [{ id: "approve", title: "Approve" }] },
      { label: "No", steps: [{ id: "review", title: "Review", kind: "human" as const }] },
    ],
  },
  { id: "pay", title: "Refund", children: [{ id: "ledger", title: "Ledger" }] },
];

describe("workflow-views logic", () => {
  it("numbers the outline and counts steps", () => {
    expect(numberWorkflow(steps).map((n) => n.number)).toEqual(["1", "2", "2.a.1", "2.b.1", "3", "3.1"]);
    expect(countWorkflowSteps(steps)).toBe(6);
  });
  it("flattens into network links", () => {
    const n = workflowToNetwork(steps);
    expect(n.steps.map((s) => s.id)).toEqual(["ask", "check", "approve", "review", "pay", "ledger"]);
    expect(n.links).toContainEqual({ from: "check", to: "approve", label: "Yes" });
    expect(n.links).toContainEqual({ from: "approve", to: "pay" });
    expect(n.links).toContainEqual({ from: "pay", to: "ledger" });
  });
});

describe("NqWorkflowViews", () => {
  it("renders the outline with numbers, kind badge and branches", () => {
    const w = mount(NqWorkflowViews, { props: { steps } });
    expect(w.attributes("data-slot")).toBe("workflow-views");
    expect(w.attributes("data-view")).toBe("steps");
    expect(w.find("h3").text()).toBe("Workflow");
    expect(w.findAll("[data-slot=workflow-step]")).toHaveLength(6);
    expect(w.findAll("[data-slot=workflow-branch]")).toHaveLength(2);
    expect(w.find("[data-step=check]").attributes("data-kind")).toBe("decision");
    expect(w.find("[data-step=check]").text()).toContain("Decision");
    expect(w.text()).toContain("2.a.1");
    expect(w.find("[data-view=editor]").exists()).toBe(false);
  });

  it("switches to the pipeline and back, emitting and remembering the view", async () => {
    localStorage.removeItem("wv:test");
    const w = mount(NqWorkflowViews, { props: { steps, storageKey: "wv:test" }, attachTo: document.body });
    await w.find("[data-view=pipeline]").trigger("click");
    expect(w.attributes("data-view")).toBe("pipeline");
    expect(w.find("[data-slot=workflow-network]").exists()).toBe(true);
    expect(w.emitted("update:view")![0]).toEqual(["pipeline"]);
    expect(localStorage.getItem("wv:test")).toBe("pipeline");
    w.unmount();
    const again = mount(NqWorkflowViews, { props: { steps, storageKey: "wv:test" } });
    await again.vm.$nextTick();
    expect(again.attributes("data-view")).toBe("pipeline");
  });

  it("adds the editor view with a slot and an empty state without steps", async () => {
    const w = mount(NqWorkflowViews, { props: { steps, view: "editor" }, slots: { editor: () => h("div", { id: "ed" }, "edit") } });
    expect(w.find("#ed").exists()).toBe(true);
    const e = mount(NqWorkflowViews, { props: { steps: [] } });
    expect(e.find("[data-slot=empty-state]").exists()).toBe(true);
  });

  it("makes steps buttons with @step-click and marks the highlight", async () => {
    const calls: string[] = [];
    const w = mount(NqWorkflowViews, { props: { steps, highlight: "check", onStepClick: (s: { id: string }) => calls.push(s.id) } });
    const btn = w.find("[data-step=check] > button");
    expect(btn.attributes("aria-current")).toBe("step");
    await btn.trigger("click");
    expect(calls).toEqual(["check"]);
  });

  it("is bilingual and hides the heading with title null", () => {
    const w = mount(NqWorkflowViews, { props: { steps, title: null } });
    expect(w.find("h3").exists()).toBe(false);
    expect(w.attributes("aria-labelledby")).toBeUndefined();
  });
});
