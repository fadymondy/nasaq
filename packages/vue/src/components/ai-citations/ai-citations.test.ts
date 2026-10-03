import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  NqAiCitedAnswer,
  NqAiCitedText,
  NqAiEvidenceCard,
  NqAiProvenance,
  NqAiSourceChips,
  aiCitationCoverage,
  aiCitedNumbers,
  aiLinkCitations,
  aiMarkerNumbers,
  aiSplitHighlight,
  type AiCitationSource,
} from ".";

const sources: AiCitationSource[] = [
  { id: "s1", title: "Q3 report", url: "https://www.example.com/q3", quote: "Revenue grew 12% year on year.", locator: "p. 4", score: 0.9, highlight: "12%" },
  { id: "s2", title: "Board notes", quote: "Churn fell to 2.1%." },
  { id: "s3", title: "Unused", url: "javascript:alert(1)" },
];

describe("citation logic", () => {
  it("links markers, skips code and unknown numbers", () => {
    expect(aiLinkCitations("A [1] and [2-3] `[1]` [9]", 3)).toBe("A [1](#nq-cite-1) and [2](#nq-cite-2)[3](#nq-cite-3) `[1]` [9]");
    expect(aiMarkerNumbers("1, 3, 7", 5)).toEqual([1, 3]);
    expect(aiCitedNumbers("x [2] y [1] [2]", 3)).toEqual([2, 1]);
    expect(aiCitationCoverage("Cited [1].\n\nNot cited.", 2)).toEqual({ cited: 1, total: 2 });
    expect(aiSplitHighlight("Churn fell", "fell").map((p) => p.hit)).toEqual([false, true]);
  });
});

describe("NqAiEvidenceCard", () => {
  it("marks the highlight and only links safe urls", () => {
    const w = mount(NqAiEvidenceCard, { props: { source: sources[0]!, index: 1 } });
    expect(w.find("mark").text()).toBe("12%");
    expect(w.find("a").attributes("href")).toBe("https://www.example.com/q3");
    expect(w.text()).toContain("example.com");
    const bad = mount(NqAiEvidenceCard, { props: { source: sources[2]! } });
    expect(bad.find("a").exists()).toBe(false);
    expect(bad.text()).toContain("No excerpt");
  });
});

describe("NqAiCitedText", () => {
  it("turns markers into buttons and keeps unknown numbers as text", () => {
    const w = mount(NqAiCitedText, { props: { text: "Revenue grew [1] while churn fell [2] and [9].", sources } });
    const markers = w.findAll('[data-slot="ai-citation-marker"]');
    expect(markers).toHaveLength(2);
    expect(markers[0]!.attributes("aria-label")).toBe("Source 1: Q3 report");
    expect(w.text()).toContain("[9]");
  });

  it("opens the evidence in a popover and reports the active source", async () => {
    const onActiveChange = vi.fn();
    const w = mount(NqAiCitedText, { props: { text: "Revenue grew [1].", sources, onActiveChange }, attachTo: document.body });
    await w.find('[data-slot="ai-citation-marker"]').trigger("click");
    await flushPromises();
    expect(onActiveChange).toHaveBeenCalledWith("s1");
    expect(document.body.querySelector('[data-slot="ai-evidence-card"]')).not.toBeNull();
    w.unmount();
  });
});

describe("NqAiSourceChips", () => {
  it("dims uncited sources and calls onSelect", async () => {
    const onSelect = vi.fn();
    const w = mount(NqAiSourceChips, { props: { sources, citedIds: ["s1"], onSelect } });
    expect(w.text()).toContain("Not cited");
    await w.findAll("button")[1]!.trigger("click");
    expect(onSelect).toHaveBeenCalledWith(sources[1], 1);
  });

  it("renders links for safe urls and spans otherwise", () => {
    const w = mount(NqAiSourceChips, { props: { sources } });
    expect(w.findAll("a")).toHaveLength(1);
    expect(w.findAll("li span.flex.max-w-56")).toHaveLength(2);
  });
});

describe("NqAiProvenance", () => {
  it("shows the summary line and opens to the rows", async () => {
    const w = mount(NqAiProvenance, { props: { model: "claude-sonnet", latencyMs: 1240, grounded: true, sourceCount: 2, tokens: { input: 10, output: 5 }, confidence: 0.86 }, attachTo: document.body });
    expect(w.text()).toContain("Grounded in 2 sources");
    expect(w.text()).toContain("claude-sonnet");
    await w.find('[data-slot="collapsible-trigger"]').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Response time");
    expect(w.text()).toContain("Confidence");
    w.unmount();
  });
});

describe("NqAiCitedAnswer", () => {
  it("renders label, markers, coverage note, chips and opens evidence from a chip", async () => {
    const onSourceOpen = vi.fn();
    const w = mount(NqAiCitedAnswer, {
      props: { text: "Revenue grew [1].\n\nNo source here.", sources, provenance: { model: "claude", grounded: true }, onFeedback: () => {}, onSourceOpen },
      attachTo: document.body,
    });
    expect(w.find('[data-slot="ai-generated-label"]').text()).toContain("claude");
    expect(w.find('[role="note"]').text()).toContain("1 of 2 paragraphs");
    expect(w.find('[data-slot="ai-provenance"]').exists()).toBe(true);
    await w.find('[data-slot="ai-source-chips"] button').trigger("click");
    await flushPromises();
    expect(onSourceOpen).toHaveBeenCalledWith(sources[0]);
    expect(w.find('ul[aria-label="Evidence"]').exists()).toBe(true);
    expect(w.find('[data-slot="ai-evidence-card"][data-active]').exists()).toBe(true);
    w.unmount();
  });
});
