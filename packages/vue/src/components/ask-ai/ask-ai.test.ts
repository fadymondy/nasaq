import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqAiInsightCard, NqAskAiSelection, askAiDeltaTone, askAiNormalizeSelection, askAiReadOutcome, askAiShortenMiddle } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ask-ai logic", () => {
  it("normalizes, shortens and reads outcomes", () => {
    expect(askAiNormalizeSelection("  ab  ")).toEqual({ text: "", truncated: false });
    expect(askAiNormalizeSelection("hello   world").text).toBe("hello world");
    expect(askAiNormalizeSelection("abcdef", 3, 4)).toEqual({ text: "abcd", truncated: true });
    expect(askAiShortenMiddle("The quick brown fox jumps over the lazy dog", 20)).toContain("… ");
    expect(askAiReadOutcome("ok")).toEqual({ text: "ok" });
    expect(askAiReadOutcome({ error: "no" })).toEqual({ error: "no" });
    expect(askAiReadOutcome()).toEqual({ error: "" });
    expect(askAiDeltaTone(-0.1)).toBe("negative");
    expect(askAiDeltaTone(-0.1, true)).toBe("positive");
    expect(askAiDeltaTone(0)).toBe("neutral");
  });
});

describe("NqAiInsightCard", () => {
  it("renders the finding, metric, tone and actions", async () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    const w = mount(NqAiInsightCard, {
      props: { title: "Signups fell", tone: "warning", metric: { label: "Mobile", value: 1240, delta: -0.18 }, body: "Because **forms**.", confidence: 0.78, actions: [{ id: "open", label: "Open" }], onAction, onDismiss },
      attachTo: document.body,
    });
    expect(w.attributes("data-slot")).toBe("ai-insight-card");
    expect(w.attributes("data-tone")).toBe("warning");
    expect(w.classes()).toContain("border-s-nq-warning");
    expect(w.text()).toContain("Worth a look");
    expect(w.text()).toContain("1,240");
    expect(w.text()).toContain("Because");
    const open = w.findAll("button").find((b) => b.text() === "Open")!;
    await open.trigger("click");
    expect(onAction).toHaveBeenCalledWith("open");
    await w.find('button[aria-label="Dismiss insight"]').trigger("click");
    expect(onDismiss).toHaveBeenCalled();
  });

  it("shows a shimmer while loading and supports the inline variant", () => {
    const w = mount(NqAiInsightCard, { props: { title: "x", loading: true, variant: "inline", actions: [{ id: "a", label: "Zed" }] } });
    expect(w.element.tagName).toBe("SECTION");
    expect(w.attributes("data-variant")).toBe("inline");
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.text()).not.toContain("Zed");
  });
});

describe("NqAskAiSelection", () => {
  it("renders its children in a wrapper and stays closed without a selection", () => {
    const w = mount(NqAskAiSelection, { props: { onAsk: async () => "x" }, slots: { default: "<p>Some readable text</p>" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("ask-ai-selection");
    expect(w.text()).toContain("Some readable text");
    expect(document.body.querySelector('[data-slot="ask-ai-popup"]')).toBeNull();
  });

  it("offers the pill for a selection, opens the panel and shows the answer", async () => {
    vi.useFakeTimers();
    const onAsk = vi.fn(async () => "The **answer**");
    const w = mount(NqAskAiSelection, { props: { onAsk }, slots: { default: '<p id="p">Refunds arrive within five days</p>' }, attachTo: document.body });
    const p = document.getElementById("p")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    const pill = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes("Ask AI"));
    expect(pill).toBeTruthy();
    pill!.click();
    await flushPromises();
    expect(document.body.querySelector('[data-slot="ask-ai-panel"]')).not.toBeNull();
    const explain = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Explain")!;
    explain.click();
    await vi.advanceTimersByTimeAsync(10);
    await flushPromises();
    expect(onAsk).toHaveBeenCalledWith({ prompt: "Explain", selection: "Refunds arrive within five days", actionId: "explain" });
    expect(document.body.textContent).toContain("AI generated");
    vi.useRealTimers();
    w.unmount();
  });
});
