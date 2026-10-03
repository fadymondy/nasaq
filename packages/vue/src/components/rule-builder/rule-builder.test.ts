import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { NqRuleBuilder, describeRule, emptyRule, evaluateConditions, validateRule, type RuleDefinition } from ".";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

const events = [{ id: "order.created", label: "an order is placed", description: "Fires for every new order." }];
const fields = [
  { id: "amount", label: "Amount", kind: "number" as const },
  { id: "country", label: "Country", kind: "select" as const, options: [{ value: "sa", label: "Saudi Arabia" }, { value: "eg", label: "Egypt" }] },
];
const actionTypes = [{ id: "email", label: "Send an email", fields: [{ name: "to", label: "To", kind: "text" as const, required: true }] }];

const filled = (): RuleDefinition => ({
  event: "order.created",
  conditions: { kind: "group", id: "g0", join: "and", children: [{ kind: "condition", id: "c1", field: "amount", op: "gt", value: "100" }] },
  actions: [{ id: "a1", type: "email", config: { to: "a@b.test" } }],
});

function make(initial?: RuleDefinition, locale = "en", extra: Record<string, unknown> = {}) {
  const rule = ref<RuleDefinition | undefined>(initial);
  const changes: Array<{ rule: RuleDefinition; issues: number }> = [];
  const Host = defineComponent({
    setup: () => () =>
      h(NasaqProvider, { locale }, () =>
        h(NqRuleBuilder, {
          modelValue: rule.value,
          "onUpdate:modelValue": (v: RuleDefinition) => (rule.value = v),
          onChange: (r: RuleDefinition, issues: unknown[]) => changes.push({ rule: r, issues: issues.length }),
          events,
          fields,
          actionTypes,
          ...extra,
        }),
      ),
  });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return { w, rule, changes };
}

describe("NqRuleBuilder", () => {
  it("renders the three sections and reads the rule back as a sentence", () => {
    const { w } = make(filled());
    expect(w.find('[data-slot="rule-builder"]').exists()).toBe(true);
    const summary = w.find('[data-slot="rule-summary"]');
    expect(summary.find("p").attributes("aria-live")).toBe("polite");
    expect(summary.text()).toBe("When an order is placed, if Amount is greater than 100, then Send an email");
    expect(w.findAll("h3").map((h) => h.text())).toEqual(["When", "If", "Then"]);
    expect(w.find('[role="group"]').attributes("aria-label")).toBe("Group: All of these");
    expect(w.findAll("[data-condition]")).toHaveLength(1);
  });

  it("lists what is missing for an empty rule", () => {
    const { w } = make(undefined);
    const alert = w.find('[role="alert"]');
    expect(alert.text()).toContain("2 to fix");
    expect(alert.text()).toContain("Choose the event that starts the rule");
    expect(alert.text()).toContain("Add at least one action");
  });

  it("adds a condition, a nested group and an action, emitting the rule with its issues", async () => {
    const { w, rule, changes } = make(filled());
    const click = async (label: string) => {
      await w.findAll("button").find((b) => b.text() === label)!.trigger("click");
      await flushPromises();
    };
    await click("Add condition");
    expect(rule.value!.conditions.children).toHaveLength(2);
    expect(changes.at(-1)!.issues).toBe(1);
    await click("Add group");
    expect(rule.value!.conditions.children[2]).toMatchObject({ kind: "group", join: "or" });
    await click("Add action");
    expect(rule.value!.actions).toHaveLength(2);
    expect(w.findAll('[role="group"]').length).toBe(4);
  });

  it("switches a group between all and any", async () => {
    const { w, rule } = make(filled());
    const any = w.findAll("button").find((b) => b.text() === "Any of these")!;
    await any.trigger("click");
    await flushPromises();
    expect(rule.value!.conditions.join).toBe("or");
    expect(w.find('[role="group"]').attributes("aria-label")).toBe("Group: Any of these");
  });

  it("removes a condition", async () => {
    const { w, rule } = make(filled());
    await w.find('button[aria-label="Remove condition"]').trigger("click");
    expect(rule.value!.conditions.children).toHaveLength(0);
    expect(w.text()).toContain("No conditions: the rule always continues.");
  });

  it("stops offering groups at maxDepth", () => {
    const { w } = make(filled(), "en", { maxDepth: 1 });
    expect(w.findAll("button").some((b) => b.text() === "Add group")).toBe(false);
  });

  it("is read only when disabled", () => {
    const { w } = make(filled(), "en", { disabled: true });
    expect(w.findAll("button").find((b) => b.text() === "Add condition")!.attributes("disabled")).toBeDefined();
  });

  it("reads in Arabic with a mirrored sentence direction", () => {
    const { w } = make(filled(), "ar");
    expect(w.find('[data-slot="rule-summary"] span[dir="auto"]').exists()).toBe(true);
    expect(w.text()).toContain("عندما an order is placed");
    expect(w.text()).toContain("أكبر من");
    expect(w.findAll("h3").map((h) => h.text())).toEqual(["عندما", "إذا", "إذن"]);
  });
});

describe("rule model helpers", () => {
  it("validates, describes and evaluates", () => {
    expect(validateRule(emptyRule(), fields, actionTypes).map((i) => i.code)).toEqual(["no-event", "no-actions"]);
    expect(validateRule(filled(), fields, actionTypes)).toEqual([]);
    const rule = filled();
    expect(evaluateConditions(rule.conditions, { amount: 150 }, fields)).toBe(true);
    expect(evaluateConditions(rule.conditions, { amount: 50 }, fields)).toBe(false);
    expect(describeRule(emptyRule(), fields, events, actionTypes, { when: (e) => `When ${e}`, ifWord: "if", then: "then", noConditions: "always", ops: {} as never, join: () => "and" })).toBe("When …, always, then …");
  });
});
