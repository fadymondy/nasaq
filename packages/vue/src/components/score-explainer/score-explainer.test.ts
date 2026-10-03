import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqScoreBadge, NqScoreExplainer, type ScoreDimension } from ".";

const dims: ScoreDimension[] = [
  { id: "a", label: "Size", points: 30, maxPoints: 40, reason: "51 to 200", matched: ["SaaS"], sources: [{ label: "LinkedIn", url: "https://example.com" }, { label: "CRM" }] },
  { id: "b", label: "Intent", points: 20, maxPoints: 60, reason: "Visited pricing", inferred: true },
];

describe("NqScoreExplainer", () => {
  it("renders band, dimensions, inferred mark and the remainder row", () => {
    const w = mount(NqScoreExplainer, { props: { score: 72, dimensions: dims, confidence: 0.8, aiGenerated: true } });
    const root = w.find('[data-slot="score-explainer"]');
    expect(root.attributes("data-band")).toBe("high");
    expect(w.findAll('[data-slot="score-dimension"]')).toHaveLength(3);
    expect(w.findAll('[data-slot="score-inferred"]')).toHaveLength(1);
    expect(w.text()).toContain("Other factors");
    expect(w.find('a[data-slot="score-source"]').attributes("href")).toBe("https://example.com");
  });

  it("hides matched words when compact and calls onSourceClick for url-less sources", async () => {
    const onSourceClick = vi.fn();
    const w = mount(NqScoreExplainer, { props: { score: 50, dimensions: dims, compact: true, onSourceClick } });
    expect(w.text()).not.toContain("SaaS");
    await w.find('button[data-slot="score-source"]').trigger("click");
    expect(onSourceClick).toHaveBeenCalledTimes(1);
  });
});

describe("NqScoreBadge", () => {
  it("shows the number and band, and opens the explainer", async () => {
    const w = mount(NqScoreBadge, { props: { score: 72, dimensions: dims }, attachTo: document.body });
    const badge = w.find('[data-slot="score-badge"]');
    expect(badge.attributes("data-band")).toBe("high");
    expect(badge.text()).toContain("≈");
    await badge.trigger("click");
    await flushPromises();
    expect(document.body.querySelector('[data-slot="score-explainer"]')).not.toBeNull();
    w.unmount();
  });
});
