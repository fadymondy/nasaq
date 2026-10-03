import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqSchemaForm, schemaFormMapErrors, schemaFormTree, schemaFormTreeInitial, schemaFormTreeValidate, type SchemaFormJson, type SchemaFormSubmitResult } from ".";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
  document.body.innerHTML = "";
});

const schema: SchemaFormJson = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", title: "Name", "x-title-ar": "الاسم" },
    status: { type: "string", enum: ["draft", "live"] },
    address: { type: "object", title: "Address", properties: { city: { type: "string", title: "City" } } },
    contacts: {
      type: "array",
      title: "Contacts",
      "x-title": "name",
      items: { type: "object", title: "Contact", required: ["name"], properties: { name: { type: "string", title: "Name" }, phone: { type: "string", title: "Phone" } } },
    },
    tags: { type: "array", title: "Tags", items: { type: "string" } },
  },
};

function make(props: Record<string, unknown> = {}, locale = "en") {
  const Host = defineComponent({ setup: () => () => h(NasaqProvider, { locale }, () => h(NqSchemaForm, { schema, ...props })) });
  const w = mount(Host, { attachTo: document.body });
  mounted.push(w);
  return w;
}
const input = (w: ReturnType<typeof make>, label: string) => w.findAll("input").find((i) => i.element.closest('[data-slot="field"]')?.textContent?.includes(label));

describe("NqSchemaForm", () => {
  it("draws fields, a nested object and an empty list of groups", () => {
    const w = make();
    expect(w.find('[data-slot="schema-form"]').exists()).toBe(true);
    expect(w.find('[data-slot="schema-form-section"]').text()).toContain("Address");
    expect(w.find('[data-slot="schema-form-list"]').text()).toContain("No Contacts yet.");
    expect(w.text()).toContain("Save");
  });

  it("shows required errors after a failed submit, with a summary, and does not call onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = make({ onSubmit });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.find('[data-slot="schema-form-summary"]').text()).toContain("Fix 1 field");
    expect(w.text()).toContain("Name is required.");
  });

  it("submits the output shape: nested, empty text as null", async () => {
    const onSubmit = vi.fn();
    const w = make({ onSubmit });
    await input(w, "Name")!.setValue("Sara");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Sara", address: { city: null }, contacts: [], tags: [] }));
    expect(w.text()).toContain("Saved.");
  });

  it("puts server field errors on the field", async () => {
    const onSubmit = vi.fn(async (): Promise<SchemaFormSubmitResult> => ({ fieldErrors: { name: "Taken." }, error: "Nope." }));
    const w = make({ onSubmit });
    await input(w, "Name")!.setValue("Sara");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Taken.");
    expect(w.text()).toContain("Nope.");
  });

  it("adds, titles, moves and removes groups", async () => {
    const w = make({ defaultValue: { contacts: [{ name: "Layla" }, { name: "Omar" }] } });
    const titles = () => w.findAll('[data-slot="schema-form-group"]').map((g) => g.find("button[aria-expanded]").text());
    expect(titles()).toEqual(["Layla", "Omar"]);
    await w.findAll('[data-action="down"]')[0]!.trigger("click");
    await flushPromises();
    expect(titles()).toEqual(["Omar", "Layla"]);
    await w.find('[data-slot="schema-form-add"]').trigger("click");
    await flushPromises();
    expect(w.findAll('[data-slot="schema-form-group"]')).toHaveLength(3);
    await w.findAll('[data-action="remove"]')[2]!.trigger("click");
    await flushPromises();
    expect(titles()).toEqual(["Omar", "Layla"]);
  });

  it("asks before removing a group that has data", async () => {
    const w = make({ defaultValue: { contacts: [{ name: "Layla" }] } });
    await w.find('[data-action="remove"]').trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Remove Layla?");
    expect(w.findAll('[data-slot="schema-form-group"]')).toHaveLength(1);
  });

  it("collapses a group", async () => {
    const w = make({ defaultValue: { contacts: [{ name: "Layla" }] } });
    await w.find('[data-slot="schema-form-group-header"] button[aria-expanded]').trigger("click");
    expect(w.find('[data-slot="schema-form-group"]').attributes("data-collapsed")).toBeDefined();
  });

  it("hides a field with a rule", async () => {
    const rules = [{ event: "change", conditions: { kind: "group", id: "g", join: "and", children: [{ kind: "condition", id: "c", field: "status", op: "is", value: "live" }] }, actions: [{ id: "a", type: "show", config: { target: "address.city" } }] }];
    const w = make({ rules: rules as never });
    expect(w.text()).not.toContain("Address");
  });

  it("speaks Arabic", () => {
    const w = make({}, "ar");
    expect(w.text()).toContain("الاسم");
    expect(w.text()).toContain("حفظ");
  });
});

describe("schema form tree helpers", () => {
  const { root } = schemaFormTree(schema);
  it("validates lists and maps server paths onto the deepest field", () => {
    const values = schemaFormTreeInitial(root, { name: "x", contacts: [{ name: "" }] });
    expect(schemaFormTreeValidate(root, values)["contacts[0].name"]).toBe("Name is required.");
    const mapped = schemaFormMapErrors(root, values, { "contacts.0.phone": "Bad.", "nope.x": "Where?", "/address/city": "Far." });
    expect(mapped.fields).toEqual({ "contacts[0].phone": "Bad.", "address.city": "Far." });
    expect(mapped.unmatched).toEqual([{ path: "nope.x", message: "Where?" }]);
  });
});
