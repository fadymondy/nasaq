import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqAgentConfirm, NqAgentDiff, NqAgentSteps, type AgentChange, type AgentStep } from ".";

const steps: AgentStep[] = [
  { id: "a", label: "Read tags", tool: "tags.list", status: "done", durationMs: 1500, args: { token: "secret-1", limit: 5 }, result: '{"n":1}' },
  { id: "b", label: "Update tags", status: "awaiting" },
  { id: "c", label: "Send mail", status: "error", error: "SMTP down" },
];
const changes: AgentChange[] = [
  { id: "c1", title: "Rename", before: "a\nb", after: "a\nc" },
  { id: "c2", title: "Drop", before: "x", risk: "high" },
];

describe("NqAgentSteps", () => {
  it("renders the run state, statuses and masks redacted args", async () => {
    const w = mount(NqAgentSteps, { props: { steps, redactKeys: ["token"], defaultOpenIds: ["a"] }, attachTo: document.body });
    await flushPromises();
    const root = w.find('[data-slot="agent-steps"]');
    expect(root.attributes("data-state")).toBe("error");
    expect(w.findAll('[data-slot="agent-step"]').map((s) => s.attributes("data-status"))).toEqual(["done", "awaiting", "error"]);
    expect(w.text()).toContain("A step failed");
    expect(w.text()).not.toContain("secret-1");
    expect(w.text()).toContain("tags.list");
    w.unmount();
  });

  it("shows Retry only with onRetry and calls it", async () => {
    const none = mount(NqAgentSteps, { props: { steps } });
    expect(none.text()).not.toContain("Retry");
    const onRetry = vi.fn();
    const w = mount(NqAgentSteps, { props: { steps, onRetry } });
    await w.findAll("button").find((b) => b.text() === "Retry")!.trigger("click");
    expect(onRetry).toHaveBeenCalledWith("c");
  });

  it("renders the confirm slot under the awaiting step only", () => {
    const w = mount(NqAgentSteps, { props: { steps }, slots: { confirm: '<p data-testid="c">confirm</p>' } });
    expect(w.findAll('[data-testid="c"]')).toHaveLength(1);
    expect(w.findAll('[data-slot="agent-step"]')[1]!.find('[data-testid="c"]').exists()).toBe(true);
  });
});

describe("NqAgentDiff", () => {
  it("marks added and removed lines and reports no differences", () => {
    const w = mount(NqAgentDiff, { props: { before: "a\nb", after: "a\nc" } });
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.findAll('[data-diff="add"]')).toHaveLength(1);
    expect(w.findAll('[data-diff="del"]')).toHaveLength(1);
    expect(mount(NqAgentDiff, { props: { before: "a", after: "a" } }).text()).toBe("No differences.");
  });
});

describe("NqAgentConfirm", () => {
  it("applies the ticked ids and shows the result", async () => {
    const onApply = vi.fn(async () => {});
    const onDecided = vi.fn();
    const w = mount(NqAgentConfirm, { props: { changes: [changes[0]!], onApply, onReject: vi.fn(), onDecided } });
    await w.findAll("button").find((b) => b.text() === "Apply all")!.trigger("click");
    await flushPromises();
    expect(onApply).toHaveBeenCalledWith(["c1"]);
    expect(w.find('[data-slot="agent-confirm"]').attributes("data-decision")).toBe("applied");
    expect(w.text()).toContain("1 change was applied.");
  });

  it("blocks Apply on high risk until acknowledged and lets a change be left out", async () => {
    const onApply = vi.fn(async () => {});
    const w = mount(NqAgentConfirm, { props: { changes, onApply, onReject: vi.fn() }, attachTo: document.body });
    const applyBtn = () => w.findAll("button").find((b) => b.text().startsWith("Apply"))!;
    expect(applyBtn().attributes("disabled")).toBeDefined();
    await w.find('[data-slot="checkbox"][aria-label="Apply Drop"]').trigger("click");
    await flushPromises();
    expect(applyBtn().text()).toBe("Apply 1");
    expect(applyBtn().attributes("disabled")).toBeUndefined();
    await applyBtn().trigger("click");
    await flushPromises();
    expect(onApply).toHaveBeenCalledWith(["c1"]);
    w.unmount();
  });

  it("keeps the choice open and shows the error when apply fails", async () => {
    const w = mount(NqAgentConfirm, { props: { changes: [changes[0]!], onApply: async () => ({ error: "Nope" }), onReject: vi.fn() } });
    await w.findAll("button").find((b) => b.text() === "Apply all")!.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Nope");
    expect(w.find('[data-slot="agent-confirm"]').attributes("data-decision")).toBeUndefined();
  });
});
