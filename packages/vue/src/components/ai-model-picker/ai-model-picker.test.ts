import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NqAiModelPicker, NqAiModelSelect, NqPersonaPicker, resolveEffort, selectionReady, type AiModel } from ".";

const models: AiModel[] = [
  { id: "opus", label: "Opus 5.5", tier: "flagship", provider: "Anthropic", efforts: ["low", "medium", "high", "max"], contextWindow: 1_000_000, price: { input: 5, output: 25 } },
  { id: "sonnet", label: "Sonnet 5.5", tier: "balanced", efforts: ["low", "medium", "high"] },
  { id: "haiku", label: "Haiku 4.5", tier: "fast" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("math", () => {
  it("keeps a supported effort, else medium, else the first", () => {
    expect(resolveEffort(models[0], "high")).toBe("high");
    expect(resolveEffort(models[0], "xhigh")).toBe("medium");
    expect(resolveEffort({ efforts: ["fast", "slow"] }, undefined)).toBe("fast");
    expect(resolveEffort(models[2], "high")).toBeUndefined();
    expect(selectionReady({ model: "a" }, true)).toBe(false);
    expect(selectionReady({ model: "a", agent: "b" }, true)).toBe(true);
  });
});

describe("NqAiModelPicker", () => {
  it("renders model cards with tier, context window and USD price", () => {
    const w = mount(NqAiModelPicker, { props: { models }, attachTo: document.body });
    expect(w.find('[data-slot="ai-model-picker"]').attributes("data-variant")).toBe("cards");
    const cards = w.findAll('[data-slot="radio-card"]');
    expect(cards).toHaveLength(3);
    expect(cards[0]!.attributes("data-checked")).toBe("");
    expect(cards[0]!.text()).toContain("Most capable");
    expect(cards[0]!.text()).toContain("1M context");
    expect(cards[0]!.text()).toContain("$5 in, $25 out per 1M tokens");
    w.unmount();
  });

  it("shows the efforts of the chosen model, keeps one across models and hides them when unsupported", async () => {
    const w = mount(NqAiModelPicker, { props: { models, defaultValue: { model: "opus", effort: "high" } }, attachTo: document.body });
    const toggles = () => w.findAll('[data-slot="toggle"]');
    expect(toggles().map((t) => t.text())).toEqual(["Low", "Medium", "High", "Max"]);
    expect(toggles()[2]!.attributes("data-pressed")).toBe("");
    // Opus -> Sonnet keeps "high"; Sonnet has no max.
    await w.findAll('[data-slot="radio-card"]')[1]!.trigger("click");
    await flushPromises();
    expect(toggles().map((t) => t.text())).toEqual(["Low", "Medium", "High"]);
    expect(toggles()[2]!.attributes("data-pressed")).toBe("");
    expect((w.emitted("update:modelValue")!.at(-1)![0] as { effort: string }).effort).toBe("high");
    // Haiku has none.
    await w.findAll('[data-slot="radio-card"]')[2]!.trigger("click");
    await flushPromises();
    expect(toggles()).toHaveLength(0);
    w.unmount();
  });

  it("picks an effort and emits the selection", async () => {
    const w = mount(NqAiModelPicker, { props: { models }, attachTo: document.body });
    await w.findAll('[data-slot="toggle"]')[0]!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")!.at(-1)![0]).toEqual({ model: "opus", effort: "low", agent: undefined });
    w.unmount();
  });

  it("formats prices in SAR for an Arabic locale provider-less document", () => {
    const w = mount(NqAiModelPicker, { props: { models, currency: "SAR" }, attachTo: document.body });
    expect(w.text()).toMatch(/SAR/);
    expect(w.text()).not.toMatch(/₪|EGP/);
    w.unmount();
  });

  it("agent field is required and has the ai-agent-select slot", () => {
    const w = mount(NqAiModelPicker, { props: { models, agents: [{ id: "r", label: "Reviewer", description: "Reads diffs" }], agentRequired: true }, attachTo: document.body });
    const trigger = w.find('[data-slot="ai-agent-select"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes("aria-label")).toBe("Agent");
    expect(w.text()).toContain("(Required)");
    w.unmount();
  });

  it("compact variant is one row with the model select", () => {
    const w = mount(NqAiModelPicker, { props: { models, variant: "compact" }, attachTo: document.body });
    expect(w.find('[data-slot="ai-model-picker"]').attributes("data-variant")).toBe("compact");
    expect(w.find('[data-slot="ai-model-select"]').attributes("aria-label")).toBe("Model");
    expect(w.findAll('[data-slot="radio-card"]')).toHaveLength(0);
    expect(w.find('[data-slot="ai-model-picker"]').classes()).toContain("flex-wrap");
    w.unmount();
  });

  it("merges class on the root", () => {
    const w = mount(NqAiModelPicker, { props: { models, class: "max-w-lg" } });
    expect(w.find('[data-slot="ai-model-picker"]').classes()).toContain("max-w-lg");
  });
});

describe("NqAiModelSelect", () => {
  it("shows the chosen model on a labelled trigger", async () => {
    const w = mount(NqAiModelSelect, { props: { models, modelValue: "sonnet", label: "Pick" }, attachTo: document.body });
    await flushPromises();
    const trigger = w.find('[data-slot="ai-model-select"]');
    expect(trigger.attributes("aria-label")).toBe("Pick");
    expect(trigger.text()).toContain("Sonnet 5.5");
    w.unmount();
  });
});

describe("NqPersonaPicker", () => {
  const personas = [
    { id: "a", name: "Analyst", description: "Numbers", starters: ["Summarise sales", "Find outliers"] },
    { id: "b", name: "Writer" },
  ];
  it("lists starters of the selected persona and emits starter", async () => {
    const w = mount(NqPersonaPicker, { props: { personas }, attachTo: document.body });
    expect(w.findAll('[data-slot="radio-card"]')).toHaveLength(2);
    const buttons = w.findAll('[data-slot="persona-starters"] button');
    expect(buttons.map((b) => b.text())).toEqual(["Summarise sales", "Find outliers"]);
    await buttons[1]!.trigger("click");
    expect(w.emitted("starter")![0]).toEqual(["Find outliers", personas[0]]);
    await w.findAll('[data-slot="radio-card"]')[1]!.trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="persona-starters"]').exists()).toBe(false);
    expect(w.emitted("update:modelValue")![0]).toEqual(["b"]);
    w.unmount();
  });
});
