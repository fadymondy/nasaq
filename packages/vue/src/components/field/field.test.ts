import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from ".";

const Demo = defineComponent({
  components: { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea },
  props: { invalid: Boolean, area: Boolean },
  template: `<NqField name="project" :invalid="invalid">
    <NqFieldLabel>Project name</NqFieldLabel>
    <NqTextarea v-if="area" /><NqInput v-else placeholder="Nasaq" />
    <NqFieldDescription>Shown in the sidebar.</NqFieldDescription>
    <NqFieldError>Required</NqFieldError>
  </NqField>`,
});

describe("NqField", () => {
  it("wires label, control and description", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const input = w.find("input");
    const label = w.find('[data-slot="field-label"]');
    expect(w.find('[data-slot="field"]').classes()).toEqual(expect.arrayContaining(["flex", "flex-col", "gap-1.5"]));
    expect(input.attributes("data-slot")).toBe("input");
    expect(input.attributes("name")).toBe("project");
    expect(input.attributes("id")).toBeTruthy();
    expect(label.attributes("for")).toBe(input.attributes("id"));
    const desc = w.find('[data-slot="field-description"]');
    expect(input.attributes("aria-describedby")).toBe(desc.attributes("id"));
    expect(input.classes()).toEqual(expect.arrayContaining(["h-control", "rounded-control", "pointer-coarse:text-[16px]"]));
    expect(w.find('[data-slot="field-error"]').exists()).toBe(false);
    w.unmount();
  });

  it("invalid shows the error, marks the control and links it", async () => {
    const w = mount(Demo, { props: { invalid: true }, attachTo: document.body });
    await flushPromises();
    const input = w.find("input");
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("data-invalid")).toBe("");
    const error = w.find('[data-slot="field-error"]');
    expect(error.text()).toBe("Required");
    expect(input.attributes("aria-describedby")).toContain(error.attributes("id")!);
    w.unmount();
  });

  it("textarea is a control too, and ltr forces direction", async () => {
    const w = mount(Demo, { props: { area: true }, attachTo: document.body });
    await flushPromises();
    expect(w.find("textarea").attributes("data-slot")).toBe("textarea");
    expect(w.find("textarea").classes()).toContain("min-h-20");
    w.unmount();
    const i = mount(NqInput, { props: { ltr: true } });
    expect(i.attributes("dir")).toBe("ltr");
    expect(i.classes()).toContain("text-start");
  });

  it("works standalone with v-model", async () => {
    const w = mount(NqInput, { props: { modelValue: "a" } });
    await w.setValue("hello");
    expect(w.emitted("update:modelValue")![0]).toEqual(["hello"]);
  });
});
