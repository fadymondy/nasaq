import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqNativeSelect } from ".";

const options = [
  { value: "eg", label: "Egypt" },
  { value: "sa", label: "Saudi Arabia", disabled: true },
];

describe("NqNativeSelect", () => {
  it("renders a styled select with a placeholder option and forwards attributes", () => {
    const w = mount(NqNativeSelect, { props: { options, placeholder: "Choose", required: true, class: "max-w-xs" }, attrs: { name: "country" } });
    expect(w.find('[data-slot="native-select"]').classes()).toEqual(expect.arrayContaining(["relative", "max-w-xs"]));
    const select = w.find("select");
    expect(select.attributes("name")).toBe("country");
    expect(select.classes()).toEqual(expect.arrayContaining(["appearance-none", "h-control"]));
    const opts = w.findAll("option");
    expect(opts.map((o) => o.text())).toEqual(["Choose", "Egypt", "Saudi Arabia"]);
    expect(opts[0]!.attributes("disabled")).toBeDefined();
    expect(opts[2]!.attributes("disabled")).toBeDefined();
    expect(w.find("svg").classes()).toContain("end-3");
  });

  it("supports v-model, the sm size and the invalid state", async () => {
    const w = mount(NqNativeSelect, { props: { options, modelValue: "eg", size: "sm", invalid: true } });
    const select = w.find("select");
    expect((select.element as HTMLSelectElement).value).toBe("eg");
    expect(select.classes()).toContain("h-control-sm");
    expect(select.attributes("aria-invalid")).toBe("true");
    expect(select.attributes("data-invalid")).toBe("");
    await select.setValue("sa");
    expect(w.emitted("update:modelValue")![0]).toEqual(["sa"]);
  });
});
