import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { NasaqProvider } from "../../provider";
import { NqField, NqFieldLabel } from "../field";
import { colorToCss, isHexColor, normalizeHexColor, NqColorPicker, tagSwatches } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');
const swatches = () => [...document.querySelectorAll<HTMLElement>('[data-slot="color-picker-swatch"]')];
const hex = () => document.querySelector<HTMLInputElement>('[data-slot="color-picker-hex"]')!;

async function open(w: ReturnType<typeof mount>) {
  await w.find('[data-slot="color-picker-trigger"]').trigger("click");
  await flushPromises();
}

describe("colour helpers", () => {
  it("validates, normalises and converts to CSS", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("abc")).toBe(false);
    expect(normalizeHexColor("ABC")).toBe("#aabbcc");
    expect(normalizeHexColor(" #1A73E8 ")).toBe("#1a73e8");
    expect(normalizeHexColor("12")).toBeNull();
    expect(colorToCss("--nq-tag-red")).toBe("var(--nq-tag-red)");
    expect(colorToCss("#fff")).toBe("#fff");
    expect(tagSwatches("ar")[1]).toEqual({ value: "--nq-tag-red", label: "أحمر" });
  });
});

describe("NqColorPicker", () => {
  it("shows the chosen colour on a labelled trigger and opens the swatch grid", async () => {
    const w = mount(NqColorPicker, { props: { modelValue: "--nq-tag-teal", ariaLabel: "Label colour" }, attachTo: document.body });
    const trigger = w.find('[data-slot="color-picker-trigger"]');
    expect(trigger.attributes("aria-label")).toBe("Label colour: Teal");
    expect(trigger.text()).toBe("Teal");
    expect(trigger.classes()).toContain("h-control");
    expect(w.find('[data-slot="color-picker-chip"]').attributes("style")).toContain("var(--nq-tag-teal)");
    expect(popup()).toBeNull();

    await open(w);
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.attributes("data-popup-open")).toBeDefined();
    expect(popup()!.getAttribute("aria-label")).toBe("Choose colour");
    const grid = document.querySelector('[data-slot="color-picker-swatches"]')!;
    expect(grid.getAttribute("role")).toBe("radiogroup");
    expect(grid.getAttribute("style")).toContain("repeat(5");
    expect(swatches().length).toBe(9);
    const checked = swatches().filter((s) => s.hasAttribute("data-checked"));
    expect(checked.map((s) => s.getAttribute("aria-label"))).toEqual(["Teal"]);
    expect(checked[0]!.getAttribute("role")).toBe("radio");
    expect(hex().value).toBe("");
    w.unmount();
  });

  it("emits the swatch value on click", async () => {
    const w = mount(NqColorPicker, { attachTo: document.body });
    expect(w.find('[data-slot="color-picker-trigger"]').text()).toBe("No colour");
    await open(w);
    swatches()[1]!.click();
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual(["--nq-tag-red"]);
    expect(w.find('[data-slot="color-picker-trigger"]').text()).toBe("Red");
    w.unmount();
  });

  it("applies a full hex as you type, expands shorthand on Enter and reports a bad value", async () => {
    const w = mount(NqColorPicker, { props: { mode: "hex" }, attachTo: document.body });
    await open(w);
    expect(swatches().length).toBe(0);
    const input = hex();
    expect(input.getAttribute("dir")).toBe("ltr");
    input.value = "#1A73E8";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual(["#1a73e8"]);

    input.value = "abc";
    input.dispatchEvent(new Event("input"));
    await flushPromises();
    expect(w.emitted("update:modelValue")!.length).toBe(1);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await flushPromises();
    expect(w.emitted("update:modelValue")![1]).toEqual(["#aabbcc"]);
    expect(input.value).toBe("#aabbcc");

    input.value = "zz";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("blur"));
    await flushPromises();
    const err = document.querySelector('[data-slot="color-picker-error"]')!;
    expect(err.getAttribute("role")).toBe("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(err.id);
    w.unmount();
  });

  it("hides the hex field and the Custom button on request", async () => {
    const w = mount(NqColorPicker, { props: { allowHex: false, allowNative: false, columns: 3 }, attachTo: document.body });
    await open(w);
    expect(hex()).toBeNull();
    expect(document.querySelector('[data-slot="color-picker-custom"]')).toBeNull();
    expect(document.querySelector('[data-slot="color-picker-swatches"]')!.getAttribute("style")).toContain("repeat(3");
    w.unmount();
  });

  it("carries the value in a hidden input and joins a NqField", async () => {
    const Demo = defineComponent({
      setup() {
        const color = ref<string | null>("#ff0000");
        return () =>
          h(NqField, { name: "color", invalid: true }, () => [h(NqFieldLabel, null, () => "Colour"), h(NqColorPicker, { modelValue: color.value, "onUpdate:modelValue": (v: string) => (color.value = v) })]);
      },
    });
    const w = mount(Demo, { attachTo: document.body });
    const trigger = w.find('[data-slot="color-picker-trigger"]');
    expect(w.find("label").attributes("for")).toBe(trigger.attributes("id"));
    expect(trigger.attributes("aria-invalid")).toBe("true");
    expect(trigger.attributes("data-invalid")).toBeDefined();
    expect(trigger.text()).toBe("#ff0000");
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).name).toBe("color");
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).value).toBe("#ff0000");
    w.unmount();
  });

  it("is disabled and uses Arabic strings in an Arabic provider", async () => {
    const dis = mount(NqColorPicker, { props: { disabled: true } });
    expect(dis.find('[data-slot="color-picker-trigger"]').attributes("disabled")).toBeDefined();
    const w = mount(
      defineComponent({ render: () => h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqColorPicker, { defaultValue: "--nq-tag-red" })) }),
      { attachTo: document.body },
    );
    await flushPromises();
    const trigger = w.find('[data-slot="color-picker-trigger"]');
    expect(trigger.attributes("aria-label")).toBe("اختيار اللون: أحمر");
    await trigger.trigger("click");
    await flushPromises();
    expect(popup()!.getAttribute("dir")).toBe("rtl");
    expect(document.querySelector('[data-slot="color-picker-custom"]')!.textContent).toContain("مخصص");
    w.unmount();
  });
});
