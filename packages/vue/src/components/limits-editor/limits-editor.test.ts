import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { changedKeys, effectiveLimit, NqLimitsEditor, validateRules } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const resources = [
  { key: "seats", label: "Seats", unit: "seats" },
  { key: "api", label: "API calls" },
];

describe("limits maths", () => {
  it("validates, resolves and diffs", () => {
    expect(validateRules({ a: { mode: "limit" } }, ["a"])).toEqual({ a: { value: "required" } });
    expect(validateRules({ a: { mode: "limit", value: -1 } }, ["a"])).toEqual({ a: { value: "invalid" } });
    expect(effectiveLimit({ mode: "inherit" }, 5)).toBe(5);
    expect(effectiveLimit({ mode: "unlimited" }, 5)).toBeNull();
    expect(changedKeys({}, { a: { mode: "unlimited" } }, ["a", "b"])).toEqual(["a"]);
  });
});

describe("NqLimitsEditor", () => {
  it("renders a row per resource with the inherited value", () => {
    const w = mount(NqLimitsEditor, { props: { resources, inherited: { seats: 10, api: null } } });
    expect(w.attributes("data-slot")).toBe("limits-editor");
    const rows = w.findAll('[data-slot="limits-editor-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.attributes("data-mode")).toBe("inherit");
    expect(rows[0]!.text()).toContain("Inherits 10 seats");
    expect(rows[1]!.text()).toContain("Inherits unlimited");
    expect(w.find('[data-slot="limits-editor-footer"]').exists()).toBe(false);
  });

  it("switches a row to Limit and emits the rules", async () => {
    const w = mount(NqLimitsEditor, { props: { resources, modelValue: {} } });
    const first = w.findAll('[data-slot="limits-editor-row"]')[0]!;
    await first.findAll('[data-slot="toggle"]')[0]!.trigger("click");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([{ seats: { mode: "limit" } }]);
  });

  it("shows pricing and key limit fields with the currency", () => {
    const w = mount(NqLimitsEditor, { props: { resources, modelValue: { seats: { mode: "limit", value: 3 } }, showPricing: true, showKeyLimits: true } });
    const row = w.findAll('[data-slot="limits-editor-row"]')[0]!;
    expect(row.findAll('input[type="number"]')).toHaveLength(5);
    expect(row.text()).toContain("Price (USD)");
    expect(row.text()).toContain("Spend cap (USD)");
  });

  it("uses SAR in an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqLimitsEditor },
      setup: () => ({ resources }),
      template: '<NasaqProvider locale="ar"><NqLimitsEditor :resources="resources" :show-pricing="true" :model-value="{ seats: { mode: \'limit\', value: 1 } }" /></NasaqProvider>',
    });
    expect(w.text()).toContain("السعر (SAR)");
  });

  it("blocks saving with errors, then saves valid rules", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqLimitsEditor, { props: { resources, defaultValue: { seats: { mode: "limit", value: 3 } }, onSave } });
    const input = w.find<HTMLInputElement>('input[type="number"]');
    input.element.value = "";
    await input.trigger("input");
    await w.find("form").trigger("submit");
    expect(onSave).not.toHaveBeenCalled();
    expect(w.text()).toContain("Enter a limit, or choose Unlimited or Inherit.");
    expect(w.text()).toContain("Fix the highlighted fields to save.");
    input.element.value = "8";
    await input.trigger("input");
    expect(w.find('[role="status"]').text()).toBe("1 unsaved change");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith({ seats: { mode: "limit", value: 8 } });
    expect(w.find('[role="status"]').text()).toBe("Saved");
  });

  it("shows the failure from onSave", async () => {
    const onSave = vi.fn().mockResolvedValue({ error: "Quota service is down." });
    const w = mount(NqLimitsEditor, { props: { resources, defaultValue: { seats: { mode: "limit", value: 3 } }, onSave } });
    const input = w.find<HTMLInputElement>('input[type="number"]');
    input.element.value = "4";
    await input.trigger("input");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Quota service is down.");
  });
});
