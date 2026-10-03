import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { NqSchemaRepeater, type SchemaField, type SchemaRow, validateRows } from ".";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

const fields: SchemaField[] = [
  { key: "name", type: "text", label: "Name", required: true, maxLength: 5 },
  { key: "qty", type: "number", label: "Quantity", integer: true, min: 1, unit: "pcs" },
  { key: "active", type: "switch", label: "Active" },
];

function make(extra: Record<string, unknown> = {}, initial: SchemaRow[] = [{ name: "Sara", qty: 2, active: true }], locale = "en") {
  const rows = ref<SchemaRow[]>(initial);
  const results: number[] = [];
  const Host = defineComponent({
    setup: () => () =>
      h(NasaqProvider, { locale }, () =>
        h(NqSchemaRepeater, { modelValue: rows.value, "onUpdate:modelValue": (v: SchemaRow[]) => (rows.value = v), fields, label: "Contacts", titleKey: "name", onValidate: (r: { count: number }) => results.push(r.count), ...extra }),
      ),
  });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return { rows, w, results };
}

describe("NqSchemaRepeater", () => {
  it("generates a row from the schema and titles it from titleKey", () => {
    const { w } = make();
    expect(w.find('[data-slot="schema-repeater"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="repeater-row"]')).toHaveLength(1);
    expect(w.find('[data-slot="repeater-row-header"]').text()).toContain("Sara");
    expect(w.findAll('[data-slot="input"]')).toHaveLength(2);
    expect(w.find('[data-slot="switch"]').exists()).toBe(true);
    expect(w.text()).toContain("pcs");
  });

  it("adds a row with the field defaults", async () => {
    const { w, rows } = make();
    const add = w.findAll("button").find((b) => b.text() === "Add item")!;
    await add.trigger("click");
    await flushPromises();
    expect(rows.value).toHaveLength(2);
    expect(rows.value[1]).toEqual({ name: "", qty: null, active: false });
  });

  it("shows an error once a field is edited, and reports the issue count", async () => {
    const { w, results } = make({}, [{ name: "", qty: 2, active: false }]);
    expect(w.find('[data-slot="field-error"]').exists()).toBe(false);
    expect(results.at(-1)).toBe(1);
    const input = w.find('input[type="text"]');
    await input.setValue("toolongname");
    await flushPromises();
    expect(w.find('[data-slot="field-error"]').text()).toContain("at most 5");
    expect(results.at(-1)).toBe(1);
  });

  it("reveals every error with show-errors and Arabic messages by locale", async () => {
    const { w } = make({ showErrors: true }, [{ name: "", qty: 0, active: false }], "ar");
    const errors = w.findAll('[data-slot="field-error"]').map((e) => e.text());
    expect(errors.some((e) => e.includes("مطلوب"))).toBe(true);
    expect(w.find('[data-slot="schema-repeater-issues"]').exists()).toBe(true);
  });

  it("validates rows and counts", () => {
    const r = validateRows(fields, [{ name: "", qty: 0, active: false }], { min: 2, label: "Rows" });
    expect(r.valid).toBe(false);
    expect(r.count).toBe(3);
    expect(r.message).toBe("Add at least 2 in Rows.");
  });
});
