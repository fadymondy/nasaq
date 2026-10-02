import { flushPromises, enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import {
  NqAiActionMenu,
  NqAiConfidenceMeter,
  NqAiFeedback,
  NqAiGeneratedLabel,
  NqAiShimmer,
  NqAiSparkleButton,
  NqAiSplitButton,
  NqAiStreamControls,
  NqAiStreamingText,
  NqAiSuggestionChips,
  NqAiSummary,
  NqAiThinking,
  aiShortcutKeys,
  confidenceLevel,
  groupAiActions,
  safePartialMarkdown,
} from ".";

enableAutoUnmount(afterEach);
afterEach(() => {
  document.documentElement.lang = "";
  document.documentElement.removeAttribute("dir");
  vi.useRealTimers();
});

const actions = [
  { id: "sum", label: "Summarize", recommended: true },
  { id: "tr", label: "Translate" },
];

describe("ai-states helpers", () => {
  it("levels, grouping, partial markdown, shortcut keys", () => {
    expect(confidenceLevel(0.9)).toBe("high");
    expect(groupAiActions(actions).recommended.map((a) => a.id)).toEqual(["sum"]);
    expect(safePartialMarkdown("**bold")).toBe("**bold**");
    expect(aiShortcutKeys("Mod Shift S", false)).toEqual(["Ctrl", "Shift", "S"]);
    expect(aiShortcutKeys("Mod J", true)).toEqual(["⌘", "J"]);
  });
});

describe("NqAiSparkleButton", () => {
  it("shows the label, the spinner while generating and the shortcut hint", () => {
    const w = mount(NqAiSparkleButton, { props: { showShortcut: true } });
    expect(w.attributes("data-slot")).toBe("ai-sparkle-button");
    expect(w.text()).toContain("Ask AI");
    expect(w.findAll("kbd").length).toBe(2);
    const busy = mount(NqAiSparkleButton, { props: { generating: true } });
    expect(busy.attributes("aria-busy")).toBe("true");
    expect(busy.text()).toContain("Generating");
  });

  it("speaks Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqAiSparkleButton }, template: `<NasaqProvider locale="ar"><NqAiSparkleButton /></NasaqProvider>` });
    expect(w.text()).toContain("اسأل الذكاء الاصطناعي");
  });
});

describe("NqAiSplitButton", () => {
  it("renders a group with the main and the menu button, and runs the main action", async () => {
    const onRun = vi.fn();
    const w = mount(NqAiSplitButton, { props: { actions, onAction: vi.fn(), onRun, label: "Summarize" } });
    expect(w.attributes("data-slot")).toBe("ai-split-button");
    expect(w.attributes("role")).toBe("group");
    expect(w.find('[aria-label="More AI actions"]').exists()).toBe(true);
    await w.find('[data-slot="ai-sparkle-button"]').trigger("click");
    expect(onRun).toHaveBeenCalled();
  });
});

describe("NqAiSuggestionChips", () => {
  it("picks and dismisses", async () => {
    const onPick = vi.fn();
    const onDismiss = vi.fn();
    const w = mount(NqAiSuggestionChips, { props: { suggestions: [{ id: "a", label: "Shorten" }], onPick, onDismiss } });
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("AI suggestions");
    await w.findAll("button")[0]!.trigger("click");
    expect(onPick).toHaveBeenCalledWith("a");
    const x = w.find('[aria-label="Dismiss Shorten"]');
    await x.trigger("click");
    expect(onDismiss).toHaveBeenCalledWith("a");
  });

  it("renders nothing without suggestions", () => {
    expect(mount(NqAiSuggestionChips, { props: { suggestions: [] } }).find('[data-slot="ai-suggestion-chips"]').exists()).toBe(false);
  });
});

describe("NqAiActionMenu", () => {
  it("opens with Ctrl+J, filters, runs the action and closes", async () => {
    const onAction = vi.fn();
    mount(NqAiActionMenu, { props: { actions, onAction }, attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await flushPromises();
    const menu = document.querySelector('[data-slot="ai-action-menu"]');
    expect(menu).not.toBeNull();
    expect(document.body.textContent).toContain("Recommended");
    const input = document.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    input.value = "trans";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    const options = document.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushPromises();
    expect(onAction).toHaveBeenCalledWith("tr");
  });

  it("does not listen when hotkey is off", async () => {
    mount(NqAiActionMenu, { props: { actions, hotkey: false }, attachTo: document.body });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true }));
    await flushPromises();
    expect(document.querySelector('[data-slot="ai-action-menu"]')).toBeNull();
  });
});

describe("NqAiThinking", () => {
  it("lists the steps with their state and follows current", () => {
    const w = mount(NqAiThinking, { props: { steps: ["Read", "Find", "Write"], current: 1 } });
    expect(w.attributes("role")).toBe("status");
    expect(w.findAll("li").map((l) => l.attributes("data-state"))).toEqual(["done", "active", "pending"]);
  });

  it("compact shows only the running step", () => {
    const w = mount(NqAiThinking, { props: { steps: ["Read", "Find"], current: 1, compact: true } });
    expect(w.find("ol").exists()).toBe(false);
    expect(w.text()).toContain("Find");
  });

  it("rotates on its own", async () => {
    vi.useFakeTimers();
    const w = mount(NqAiThinking, { props: { steps: ["A", "B"], interval: 100 } });
    expect(w.findAll("li")[0]!.attributes("data-state")).toBe("active");
    vi.advanceTimersByTime(110);
    await w.vm.$nextTick();
    expect(w.findAll("li")[1]!.attributes("data-state")).toBe("active");
  });
});

describe("NqAiShimmer", () => {
  it("is a busy status with the right number of lines", () => {
    const w = mount(NqAiShimmer, { props: { lines: 4 } });
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.findAll("span.block")).toHaveLength(4);
    expect(w.text()).toBe("Thinking");
  });
});

describe("NqAiStreamingText", () => {
  it("shows the text at once without reveal, with a caret while streaming", () => {
    const w = mount(NqAiStreamingText, { props: { text: "Hello **wor", streaming: true, reveal: false, markdown: false } });
    expect(w.attributes("data-slot")).toBe("ai-streaming-text");
    expect(w.attributes("data-streaming")).toBeDefined();
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.find("[data-slot=ai-plain]").text()).toBe("Hello **wor");
    expect(w.find("[data-slot=ai-plain]").classes().join(" ")).toContain("after:bg-nq-accent");
  });

  it("announces once finished and fires onRevealed once", async () => {
    const onRevealed = vi.fn();
    const w = mount(NqAiStreamingText, { props: { text: "Done.", reveal: false, onRevealed } });
    expect(w.attributes("aria-busy")).toBe("false");
    expect(w.find("[role=status]").text()).toBe("Response ready");
    expect(onRevealed).toHaveBeenCalledTimes(1);
    await w.setProps({ text: "Done. More." });
    expect(onRevealed).toHaveBeenCalledTimes(1);
  });

  it("renders markdown and closes a half-written bold", () => {
    const w = mount(NqAiStreamingText, { props: { text: "A **b", streaming: true, reveal: false } });
    expect(w.find("[data-slot=markdown]").html()).toContain("<strong");
  });
});

describe("NqAiStreamControls", () => {
  it("offers Stop while streaming and Regenerate afterwards", async () => {
    const onStop = vi.fn();
    const onRegenerate = vi.fn();
    const w = mount(NqAiStreamControls, { props: { state: "streaming", onStop, onRegenerate } });
    expect(w.text()).toContain("Stop");
    expect(w.text()).toContain("Writing");
    await w.find("button").trigger("click");
    expect(onStop).toHaveBeenCalled();
    await w.setProps({ state: "error" });
    expect(w.attributes("data-state")).toBe("error");
    expect(w.text()).toContain("Regenerate");
    expect(w.text()).toContain("Something went wrong");
    await w.find("button").trigger("click");
    expect(onRegenerate).toHaveBeenCalled();
    await w.setProps({ state: "idle" });
    expect(w.find("button").exists()).toBe(false);
  });
});

describe("NqAiGeneratedLabel, NqAiConfidenceMeter, NqAiFeedback", () => {
  it("label shows the model left to right", () => {
    const w = mount(NqAiGeneratedLabel, { props: { model: "Claude" } });
    expect(w.attributes("data-slot")).toBe("ai-generated-label");
    expect(w.text()).toContain("AI generated");
    expect(w.find("bdi").attributes("dir")).toBe("ltr");
  });

  it("meter names the level and the percentage", () => {
    const w = mount(NqAiConfidenceMeter, { props: { value: 0.9 } });
    expect(w.attributes("data-level")).toBe("high");
    expect(w.text()).toContain("High");
    expect(w.text()).toContain("90%");
    expect(mount(NqAiConfidenceMeter, { props: { value: 0.2 } }).attributes("data-level")).toBe("low");
  });

  it("feedback presses one and thanks", async () => {
    const onChange = vi.fn();
    const w = mount(NqAiFeedback, { props: { value: "up", onChange } });
    const [up, down] = w.findAll("button");
    expect(up!.attributes("aria-pressed")).toBe("true");
    expect(down!.attributes("aria-pressed")).toBe("false");
    expect(w.find("[role=status]").text()).toBe("Thanks for the feedback");
    await down!.trigger("click");
    expect(onChange).toHaveBeenCalledWith("down");
  });
});

describe("NqAiSummary", () => {
  const base = { tldr: "Two tasks are overdue.", points: ["Ship the fix"], full: "## Long\n\nMore text.", confidence: 0.8, model: "Claude" };

  it("labels the region, shows TL;DR, points, confidence and the disclaimer", () => {
    const w = mount(NqAiSummary, { props: base });
    expect(w.attributes("role")).toBe("region");
    expect(w.attributes("aria-labelledby")).toBeTruthy();
    expect(w.text()).toContain("TL;DR");
    expect(w.text()).toContain("Ship the fix");
    expect(w.find("[data-slot=ai-confidence]").exists()).toBe(true);
    expect(w.text()).toContain("AI can make mistakes");
    expect(w.text()).toContain("Show full summary");
  });

  it("expands the full version", async () => {
    const w = mount(NqAiSummary, { props: base, attachTo: document.body });
    await w.find("[data-slot=collapsible-trigger]").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Hide full summary");
    expect(w.text()).toContain("More text.");
  });

  it("loading shows the shimmer and no footer", () => {
    const w = mount(NqAiSummary, { props: { tldr: "", loading: true } });
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.find("[data-slot=ai-shimmer]").exists()).toBe(true);
    expect(w.text()).not.toContain("AI can make mistakes");
  });

  it("calls the feedback and regenerate callbacks", async () => {
    const onFeedback = vi.fn();
    const onRegenerate = vi.fn();
    const w = mount(NqAiSummary, { props: { ...base, onFeedback, onRegenerate } });
    await w.find('[aria-label="Good summary"]').trigger("click");
    expect(onFeedback).toHaveBeenCalledWith("up");
    await w.find('[aria-label="Regenerate"]').trigger("click");
    expect(onRegenerate).toHaveBeenCalled();
  });
});
