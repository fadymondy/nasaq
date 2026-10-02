import { flushPromises, mount } from "@vue/test-utils";
import { Globe } from "lucide-vue-next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { NqStepEditor, countSteps, maskSecrets, resolvePlaceholders, stepPlaceholders, validateSteps, type StepNode, type StepParam, type StepTestResult } from ".";
import type { WorkflowStepType } from "../workflow-canvas/workflow-model";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

const types: WorkflowStepType[] = [
  { id: "http", label: "HTTP request", category: "data", icon: Globe, fields: [{ name: "url", label: "URL", kind: "url", required: true }] },
  { id: "loop", label: "Loop", category: "flow", icon: Globe },
];

function make(props: Record<string, unknown> = {}, locale = "en") {
  const steps = ref<StepNode[]>((props.initialSteps as StepNode[]) ?? []);
  const params = ref<StepParam[]>((props.initialParams as StepParam[]) ?? [{ id: "p1", name: "host", value: "api.example.com" }]);
  const Host = defineComponent({
    setup: () => () =>
      h(NasaqProvider, { locale }, () =>
        h(NqStepEditor, {
          types,
          steps: steps.value,
          "onUpdate:steps": (v: StepNode[]) => (steps.value = v),
          params: params.value,
          "onUpdate:params": (v: StepParam[]) => (params.value = v),
          ...props,
        }),
      ),
  });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return { w, steps, params };
}

describe("step model", () => {
  it("finds, resolves and masks placeholders", () => {
    expect(stepPlaceholders("{{a}} and {{ b }} and {{a}}")).toEqual(["a", "b"]);
    const params = [{ id: "1", name: "host", value: "x.io" }, { id: "2", name: "key", value: "s3cret", secret: true }];
    expect(resolvePlaceholders("https://{{host}}/{{nope}}", params)).toBe("https://x.io/{{nope}}");
    expect(maskSecrets("token s3cret ok", params)).toBe("token •••••• ok");
  });
  it("validates required fields, unknown placeholders and parameter names", () => {
    const steps: StepNode[] = [{ id: "s1", type: "http", config: { url: "" } }, { id: "s2", type: "http", config: { url: "{{ghost}}" } }, { id: "s3", type: "" , config: {} }];
    const codes = validateSteps(steps, [{ id: "p", name: "1bad", value: "" }], types).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["missing-field", "unknown-placeholder", "no-type", "bad-param-name"]));
    expect(validateSteps([{ id: "s", type: "http", config: { url: "{{trigger.body}}" } }], [], types, ["trigger.body"])).toEqual([]);
    expect(countSteps([{ id: "a", type: "loop", config: {}, children: [{ id: "b", type: "http", config: {} }] }])).toBe(2);
  });
});

describe("NqStepEditor", () => {
  it("renders the root slot, tabs and counts", () => {
    const { w } = make();
    expect(w.find('[data-slot="step-editor"]').exists()).toBe(true);
    const tabs = w.findAll('[role="tab"]').map((t) => t.text());
    expect(tabs).toEqual(["Steps 0", "Parameters 1"]);
    expect(w.text()).toContain("No steps yet.");
  });

  it("adds a step, opens the picker and picks a type", async () => {
    const { w, steps } = make();
    const add = w.findAll("button").find((b) => b.text() === "Add step")!;
    await add.trigger("click");
    await flushPromises();
    expect(steps.value).toHaveLength(1);
    expect(steps.value[0]!.type).toBe("");
    expect(w.find('[data-slot="workflow-node-picker"]').exists()).toBe(true);
    await w.find('[data-pick-type="http"]').trigger("click");
    await flushPromises();
    expect(steps.value[0]!.type).toBe("http");
    expect(w.text()).toContain("URL");
    expect(w.text()).toContain("HTTP request: \"URL\" is required");
  });

  it("lists problems and clears them when fixed", async () => {
    const { w, steps } = make({ initialSteps: [{ id: "a", type: "http", config: { url: "" } }] });
    expect(w.find('[data-slot="alert"]').text()).toContain("1 to fix before running");
    steps.value = [{ id: "a", type: "http", config: { url: "https://{{host}}" } }];
    await flushPromises();
    expect(w.find('[data-slot="alert"]').exists()).toBe(false);
  });

  it("nests steps inside a nestable type", async () => {
    const { w } = make({ nestableTypes: ["loop"], initialSteps: [{ id: "l", type: "loop", config: {}, children: [] }] });
    expect(w.text()).toContain("Add a step inside");
    expect(w.text()).toContain("Nothing inside yet.");
  });

  it("toggles continue-on-failure", async () => {
    const { w, steps } = make({ initialSteps: [{ id: "a", type: "http", config: { url: "https://x.io" } }] });
    const sw = w.find('button[role="switch"]');
    await sw.trigger("click");
    expect(steps.value[0]!.continueOnFailure).toBe(true);
  });

  it("masks secret parameters and reveals them with the button", async () => {
    const { w } = make({ initialParams: [{ id: "p", name: "key", value: "s3cret", secret: true }] });
    await w.findAll('[role="tab"]')[1]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    const input = () => w.find('input[autocomplete="off"]');
    expect(input().attributes("type")).toBe("password");
    await w.find("button[aria-pressed]").trigger("click");
    expect(input().attributes("type")).toBe("text");
  });

  it("runs a test and masks secrets in the output", async () => {
    const onTestRun = vi.fn(async (): Promise<StepTestResult[]> => [{ stepId: "a", status: "success", durationMs: 12, output: { token: "s3cret" } }]);
    const { w } = make({
      onTestRun,
      initialSteps: [{ id: "a", type: "http", config: { url: "https://x.io" } }],
      initialParams: [{ id: "p", name: "key", value: "s3cret", secret: true }],
    });
    await w.findAll('[role="tab"]')[2]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    await w.findAll("button").find((b) => b.text().includes("Run test"))!.trigger("click");
    await flushPromises();
    expect(onTestRun).toHaveBeenCalledTimes(1);
    expect(w.find('[data-result="a"]').text()).toContain("Succeeded");
    expect(w.find('[data-result="a"]').text()).toContain("••••••");
    expect(w.find('[data-result="a"]').text()).not.toContain("s3cret");
  });

  it("is Arabic and keeps the custom class", () => {
    const { w } = make({ class: "extra" }, "ar");
    expect(w.find('[data-slot="step-editor"]').classes()).toContain("extra");
    expect(w.text()).toContain("الخطوات");
    expect(w.text()).toContain("لا خطوات بعد.");
  });
});
