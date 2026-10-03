import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqContactForm, NqPublicForm, contactFormDefinition, type FormDefinition } from ".";

const form: FormDefinition = {
  ...contactFormDefinition(),
  fields: [
    { id: "name", kind: "text", label: "Name", required: true },
    { id: "plan", kind: "checkbox", label: "Business account" },
    { id: "company", kind: "text", label: "Company" },
  ],
  rules: [],
};

describe("NqPublicForm", () => {
  it("renders the fields, the honeypot and the send button", () => {
    const w = mount(NqContactForm, { props: { onSubmit: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("public-form");
    expect(w.attributes("data-kind")).toBe("contact");
    expect(w.findAll('[data-slot="field"]').map((f) => f.attributes("data-field"))).toEqual(["name", "email", "topic", "message"]);
    expect(w.find('input[name="website_url"]').attributes("tabindex")).toBe("-1");
    expect(w.find('button[type="submit"]').text()).toBe("Send");
  });

  it("shows validation errors and does not submit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqContactForm, { props: { onSubmit } });
    await w.trigger("submit");
    expect(w.findAll('[data-slot="field-error"]')[0]!.text()).toBe("This field is required.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the answers and shows the thank-you, then resets", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqPublicForm, { props: { form, onSubmit } });
    await w.find("input[type=text]").setValue(" Ada ");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada" }));
    expect(w.attributes("data-state")).toBe("done");
    await w.find("button").trigger("click");
    expect(w.attributes("data-state")).toBeUndefined();
  });

  it("keeps the form and shows the server error", async () => {
    const w = mount(NqPublicForm, { props: { form, onSubmit: async () => ({ error: "Nope" }) } });
    await w.find("input[type=text]").setValue("Ada");
    await w.trigger("submit");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Nope");
  });

  it("treats a filled honeypot as done without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqPublicForm, { props: { form, onSubmit } });
    await w.find("input[type=text]").setValue("Ada");
    await w.find('input[name="website_url"]').setValue("bot");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.attributes("data-state")).toBe("done");
  });

  it("shows a closed notice and Arabic text", () => {
    expect(mount(NqPublicForm, { props: { form: { ...form, enabled: false } } }).attributes("data-state")).toBe("closed");
    const ar = mount(NqPublicForm, { props: { form, locale: "ar" } });
    expect(ar.find('button[type="submit"]').text()).toBe("إرسال");
  });
});
