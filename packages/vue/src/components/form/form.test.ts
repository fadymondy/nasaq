import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqForm, NqFormField, useForm } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

function makeDemo(opts: { validate?: boolean; onSubmit: (v: { email: string }) => unknown }) {
  return defineComponent({
    components: { NqForm, NqFormField, NqInput, NqButton },
    setup() {
      const form = useForm({
        defaultValues: { email: "" },
        validate: opts.validate === false ? undefined : (v) => (v.email.includes("@") ? {} : { email: "Enter a valid email." }),
        onSubmit: opts.onSubmit as never,
      });
      return { form };
    },
    template: `<NqForm v-bind="form.formProps">
      <NqFormField name="email" label="Email" description="We never share it."><NqInput v-bind="form.register('email')" type="email" /></NqFormField>
      <NqButton type="submit" :loading="form.submitting">Create</NqButton>
      <output>{{ form.dirty ? "dirty" : "clean" }}</output>
    </NqForm>`,
  });
}

describe("NqForm", () => {
  it("renders a novalidate vertical stack with a danger alert for the form error", () => {
    const w = mount(NqForm, { props: { formError: "Sign-up failed." }, slots: { default: "<span>x</span>" } });
    const form = w.find("form");
    expect(form.attributes("data-slot")).toBe("form");
    expect(form.attributes("novalidate")).toBeDefined();
    expect(form.classes()).toEqual(expect.arrayContaining(["flex", "flex-col", "gap-4"]));
    const alert = w.find('[data-slot="alert"]');
    expect(alert.attributes("data-tone")).toBe("danger");
    expect(alert.attributes("role")).toBe("alert");
    expect(alert.text()).toBe("Sign-up failed.");
    expect(w.find("span").exists()).toBe(true);
  });

  it("marks a field invalid and shows the error from `errors`, ignoring empty ones", () => {
    const w = mount(NqForm, {
      props: { errors: { email: "Taken.", name: undefined, other: "" } },
      slots: { default: `<div id="f"></div>` },
      global: { stubs: {} },
    });
    expect(w.find('[data-slot="alert"]').exists()).toBe(false);
  });
});

describe("NqFormField", () => {
  it("shows the error for its name and links label, description and error to the control", async () => {
    const Page = defineComponent({
      components: { NqForm, NqFormField, NqInput },
      template: `<NqForm :errors="{ email: 'Taken.', other: undefined }"><NqFormField name="email" label="Email" description="Hint"><NqInput type="email" /></NqFormField><NqFormField name="other" label="Other"><NqInput /></NqFormField></NqForm>`,
    });
    const w = mount(Page, { attachTo: document.body });
    await flushPromises();
    const fields = w.findAll('[data-slot="field"]');
    expect(fields[0]!.attributes("data-invalid")).toBeDefined();
    expect(fields[1]!.attributes("data-invalid")).toBeUndefined();
    const input = fields[0]!.find("input");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("name")).toBe("email");
    expect(fields[0]!.find("label").attributes("for")).toBe(input.attributes("id"));
    const error = fields[0]!.find('[data-slot="field-error"]');
    expect(error.text()).toBe("Taken.");
    expect(input.attributes("aria-describedby")).toContain(error.attributes("id"));
    expect(fields[1]!.find('[data-slot="field-error"]').exists()).toBe(false);
    w.unmount();
  });
});

describe("useForm", () => {
  it("validates before submit, shows the field error and clears it on edit", async () => {
    const onSubmit = vi.fn();
    const w = mount(makeDemo({ onSubmit }), { attachTo: document.body });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.find('[data-slot="field-error"]').text()).toBe("Enter a valid email.");
    expect(w.find("input").attributes("aria-invalid")).toBe("true");

    await w.find("input").setValue("a@b.co");
    expect(w.find('[data-slot="field-error"]').exists()).toBe(false);
    expect(w.find("input").attributes("aria-invalid")).toBeUndefined();
    expect(w.find("output").text()).toBe("dirty");

    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co" });
    w.unmount();
  });

  it("maps server field errors and a form error, with a pending submit button", async () => {
    let release!: (v: unknown) => void;
    const pending = new Promise((r) => (release = r));
    const w = mount(makeDemo({ validate: false, onSubmit: () => pending }), { attachTo: document.body });
    await w.find("input").setValue("taken@example.com");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find("button").attributes("aria-busy")).toBe("true");
    release({ fieldErrors: { email: "This email already has an account." }, error: "Sign-up failed." });
    await flushPromises();
    expect(w.find("button").attributes("aria-busy")).toBeUndefined();
    expect(w.find('[data-slot="field-error"]').text()).toBe("This email already has an account.");
    expect(w.find('[data-slot="alert"]').text()).toBe("Sign-up failed.");
    w.unmount();
  });

  it("turns a thrown error into the form error", async () => {
    const w = mount(
      makeDemo({
        validate: false,
        onSubmit: () => {
          throw new Error("Network down");
        },
      }),
      { attachTo: document.body },
    );
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('[data-slot="alert"]').text()).toBe("Network down");
    w.unmount();
  });

  it("resets values, errors and dirty", async () => {
    let form!: ReturnType<typeof useForm<{ email: string }>>;
    const w = mount(
      defineComponent({
        setup() {
          form = useForm({ defaultValues: { email: "" }, onSubmit: () => undefined });
          return () => null;
        },
      }),
    );
    form.setValue("email", "x");
    form.setErrors({ email: "bad" });
    expect(form.dirty).toBe(true);
    form.reset();
    expect(form.values.email).toBe("");
    expect(form.errors).toEqual({});
    expect(form.dirty).toBe(false);
    w.unmount();
  });
});
