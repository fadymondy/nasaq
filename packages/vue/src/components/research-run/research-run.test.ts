import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqResearchRun, researchCitedNumbers, researchEvidenceNumbers, researchStageProgress, researchUncitedEvidence, type ResearchRunData } from ".";

const done: ResearchRunData = {
  id: "r1",
  question: "Q",
  status: "done",
  confidence: 0.8,
  answer: [
    { id: "a1", text: "First.", cites: ["e2", "e1", "e2", "nope"] },
    { id: "a2", text: "Second." },
  ],
  evidence: [
    { id: "e1", sourceId: "s1", quote: "Quote one", relevance: 0.9 },
    { id: "e2", sourceId: "s1", quote: "Quote two" },
    { id: "e3", sourceId: "s1", quote: "Quote three" },
  ],
  sources: [{ id: "s1", title: "Report", url: "https://www.example.com/r" }],
};

describe("research-run logic", () => {
  it("numbers evidence, dedupes citations, tracks stages and finds uncited evidence", () => {
    const numbers = researchEvidenceNumbers(done.evidence!);
    expect(researchCitedNumbers(["e2", "e1", "e2", "nope"], numbers)).toEqual([
      { id: "e1", n: 1 },
      { id: "e2", n: 2 },
    ]);
    expect(researchUncitedEvidence(done.evidence!, done.answer!).map((e) => e.id)).toEqual(["e3"]);
    expect(
      researchStageProgress([
        { id: "a", state: "done" },
        { id: "b", state: "running" },
        { id: "c", state: "pending" },
      ]),
    ).toEqual({ done: 1, total: 3, current: 1 });
  });
});

describe("NqResearchRun", () => {
  it("shows the answer with citation buttons that highlight the evidence", async () => {
    const w = mount(NqResearchRun, { props: { run: done, onAsk: () => {} }, attachTo: document.body });
    expect(w.find('[data-slot="research-answer"]').exists()).toBe(true);
    const cites = w.findAll('button[aria-label^="Show evidence"]');
    expect(cites.map((c) => c.attributes("aria-label"))).toEqual(["Show evidence 1", "Show evidence 2"]);
    await cites[1]!.trigger("click");
    expect(w.find('[data-evidence-id="e2"]').attributes("data-active")).toBeDefined();
    expect(w.find('[data-evidence-id="e1"]').attributes("data-active")).toBeUndefined();
    expect(w.findAll("ol").map((o) => o.attributes("aria-label"))).toContain("Also found");
    w.unmount();
  });

  it("asks with Ctrl+Enter, trims, and shows the error that comes back", async () => {
    const onAsk = vi.fn(async () => ({ error: "Quota reached" }));
    const w = mount(NqResearchRun, { props: { run: null, onAsk } });
    await w.find("textarea").setValue("  What changed?  ");
    await w.find("textarea").trigger("keydown", { key: "Enter", ctrlKey: true });
    await flushPromises();
    expect(onAsk).toHaveBeenCalledWith("What changed?");
    expect(w.find('[role="alert"]').text()).toBe("Quota reached");
  });

  it("shows stages while running with a stop button, and retry after a failure", async () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    const running: ResearchRunData = { id: "r", question: "Q", status: "running", stages: [{ id: "s", label: "Searching", state: "running" }], sourcesChecked: 4 };
    const w = mount(NqResearchRun, { props: { run: running, onAsk: () => {}, onCancel, onRetry } });
    expect(w.find('[data-slot="research-progress"]').text()).toContain("4 sources checked");
    expect(w.find("li[aria-current='step']").exists()).toBe(true);
    await w.findAll("button").find((b) => b.text() === "Stop research")!.trigger("click");
    expect(onCancel).toHaveBeenCalledWith(running);
    await w.setProps({ run: { ...running, status: "failed", error: "Boom" } });
    expect(w.text()).toContain("Boom");
    await w.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });
});
