import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqFormBuilder } from ".";
import { contactFormDefinition, type FormDefinition } from "../public-form/form-model";

const base = (): FormDefinition => ({
  ...contactFormDefinition(),
  name: "Contact",
  fields: [
    { id: "name", kind: "text", label: "Name", required: true },
    { id: "plan", kind: "checkbox", label: "Business" },
    { id: "company", kind: "text", label: "Company" },
  ],
  rules: [{ event: "change", conditions: { kind: "group", id: "g1", join: "and", children: [{ kind: "condition", id: "c1", field: "plan", op: "is", value: "yes" }] }, actions: [{ id: "a1", type: "show", config: { target: "company" } }] }],
  allowedOrigins: [],
});

const rows = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="form-builder-field"]');

describe("NqFormBuilder", () => {
  it("lists the fields, marks the selected one and previews the form", () => {
    const w = mount(NqFormBuilder, { props: { defaultValue: base() }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("form-builder");
    expect(rows(w).map((r) => r.attributes("data-id"))).toEqual(["name", "plan", "company"]);
    expect(rows(w)[0]!.find("[data-field-select]").attributes("aria-current")).toBe("true");
    expect(w.find('aside[aria-label="Live preview"]').exists()).toBe(true);
    w.unmount();
  });

  it("moves and removes fields, and removes rules that pointed at a removed field", async () => {
    const w = mount(NqFormBuilder, { props: { defaultValue: base() }, attachTo: document.body });
    await rows(w)[0]!.find('button[aria-label="Move down"]').trigger("click");
    expect(rows(w).map((r) => r.attributes("data-id"))).toEqual(["plan", "name", "company"]);
    expect((w.emitted("update:modelValue")!.at(-1)![0] as FormDefinition).fields.map((f) => f.id)).toEqual(["plan", "name", "company"]);
    await rows(w)[2]!.find('button[aria-label="Remove field"]').trigger("click");
    const last = w.emitted("update:modelValue")!.at(-1)![0] as FormDefinition;
    expect(last.fields.map((f) => f.id)).toEqual(["plan", "name"]);
    expect(last.rules).toEqual([]);
    w.unmount();
  });

  it("edits the selected field and the form name", async () => {
    const w = mount(NqFormBuilder, { props: { defaultValue: base() }, attachTo: document.body });
    const label = w.findAll("input").find((i) => (i.element as HTMLInputElement).value === "Name")!;
    await label.setValue("Full name");
    expect((w.emitted("update:modelValue")!.at(-1)![0] as FormDefinition).fields[0]!.label).toBe("Full name");
    await w.findAll("input")[0]!.setValue("Inquiry");
    expect((w.emitted("update:modelValue")!.at(-1)![0] as FormDefinition).name).toBe("Inquiry");
    w.unmount();
  });

  it("shows a Save button that passes the form", async () => {
    const onSave = vi.fn();
    const w = mount(NqFormBuilder, { props: { defaultValue: base(), onSave }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Save form")!.trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Contact" }));
    w.unmount();
  });

  it("is closed until a site is added and builds the embed link", async () => {
    const w = mount(NqFormBuilder, { props: { defaultValue: base(), formKey: "pk_1", embedBaseUrl: "https://f.test/" }, attachTo: document.body });
    await w.findAll('[role="tab"]').find((t) => t.text() === "Embed")!.trigger("mousedown");
    await flushPromises();
    expect(w.text()).toContain("This form is closed");
    expect(w.text()).toContain("https://f.test/f/pk_1");
    w.unmount();
  });

  it("speaks Arabic", () => {
    const w = mount(NqFormBuilder, { props: { defaultValue: base(), locale: "ar" }, attachTo: document.body });
    expect(w.text()).toContain("اسم النموذج");
    expect(w.text()).toContain("الحقول");
    w.unmount();
  });
});
