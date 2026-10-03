import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqTagInput } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const field = (w: ReturnType<typeof mount>) => w.find<HTMLInputElement>('[data-slot="tag-input-field"]');
const tagsOf = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="tag-input-tag"]').map((t) => t.find("bdi").text());

async function type(w: ReturnType<typeof mount>, value: string) {
  field(w).element.value = value;
  await field(w).trigger("input");
}

describe("NqTagInput", () => {
  it("renders the box, the tags as badges and the placeholder only while empty", async () => {
    const w = mount(NqTagInput, { props: { defaultValue: ["design"], class: "max-w-sm" } });
    expect(w.attributes("data-slot")).toBe("tag-input");
    expect(w.classes()).toEqual(expect.arrayContaining(["relative", "w-full", "max-w-sm"]));
    expect(w.find('[data-slot="tag-input-box"]').classes()).toEqual(expect.arrayContaining(["rounded-control", "flex-wrap"]));
    expect(tagsOf(w)).toEqual(["design"]);
    expect(w.find('[data-slot="tag-input-tag"]').classes()).toEqual(expect.arrayContaining(["h-6", "bg-secondary"]));
    expect(field(w).attributes("placeholder")).toBeUndefined();
    await w.find('button[aria-label="Remove design"]').trigger("click");
    expect(field(w).attributes("placeholder")).toBe("Type and press Enter");
  });

  it("adds on Enter and on comma, trims, ignores duplicates and emits v-model", async () => {
    const w = mount(NqTagInput, { attachTo: document.body });
    await type(w, " design ");
    await field(w).trigger("keydown", { key: "Enter" });
    expect(tagsOf(w)).toEqual(["design"]);
    expect(field(w).element.value).toBe("");
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual([["design"]]);
    await type(w, "DESIGN");
    await field(w).trigger("keydown", { key: "," });
    expect(tagsOf(w)).toEqual(["design"]);
    expect(w.find('[data-slot="tag-input-error"]').text()).toBe("DESIGN is already added.");
    expect(w.emitted("reject")![0]).toEqual(["DESIGN", "duplicate"]);
    expect(w.find('[data-slot="tag-input"]').attributes("data-invalid")).toBe("");
    w.unmount();
  });

  it("removes the last tag on Backspace in an empty input and announces it", async () => {
    const w = mount(NqTagInput, { props: { defaultValue: ["a", "b"] } });
    await field(w).trigger("keydown", { key: "Backspace" });
    expect(tagsOf(w)).toEqual(["a"]);
    expect(w.find('[role="status"]').text()).toBe("b removed");
  });

  it("enforces maxTags and validate (a string is the message)", async () => {
    const w = mount(NqTagInput, { props: { maxTags: 1, validate: (tag: string) => (tag.includes("@") ? true : "Not an email") } });
    await type(w, "nope");
    await field(w).trigger("keydown", { key: "Enter" });
    expect(w.find('[role="alert"]').text()).toBe("Not an email");
    await type(w, "a@b.co");
    await field(w).trigger("keydown", { key: "Enter" });
    expect(tagsOf(w)).toEqual(["a@b.co"]);
    await type(w, "c@d.co");
    await field(w).trigger("keydown", { key: "Enter" });
    expect(w.find('[role="alert"]').text()).toBe("You can add up to 1 tag.");
    expect(w.emitted("reject")!.map((r) => r[1])).toEqual(["invalid", "max"]);
  });

  it("splits pasted text on commas and new lines", async () => {
    const w = mount(NqTagInput);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.assign(event, { clipboardData: { getData: () => "a, b\nc،d" } });
    field(w).element.dispatchEvent(event);
    await flushPromises();
    expect(tagsOf(w)).toEqual(["a", "b", "c", "d"]);
  });

  it("adds the pending text on blur unless addOnBlur is false", async () => {
    const w = mount(NqTagInput);
    await type(w, "late");
    await field(w).trigger("blur");
    expect(tagsOf(w)).toEqual(["late"]);
    const off = mount(NqTagInput, { props: { addOnBlur: false } });
    await type(off, "late");
    await off.find('[data-slot="tag-input-field"]').trigger("blur");
    expect(tagsOf(off)).toEqual([]);
  });

  it("offers suggestions (case-folded), wires the combobox aria and picks with the keyboard", async () => {
    const w = mount(NqTagInput, { props: { suggestions: ["Alpha", "beta", "design"], defaultValue: ["design"] }, attachTo: document.body });
    await field(w).trigger("focus");
    await type(w, "ALP");
    const list = w.find('[data-slot="tag-input-suggestions"]');
    expect(list.attributes("role")).toBe("listbox");
    expect(list.findAll('[role="option"]').map((o) => o.text())).toEqual(["Alpha"]);
    expect(field(w).attributes("role")).toBe("combobox");
    expect(field(w).attributes("aria-expanded")).toBe("true");
    await field(w).trigger("keydown", { key: "ArrowDown" });
    expect(field(w).attributes("aria-activedescendant")).toBe(list.find('[role="option"]').attributes("id"));
    expect(list.find('[role="option"]').attributes("data-active")).toBe("");
    await field(w).trigger("keydown", { key: "Enter" });
    expect(tagsOf(w)).toEqual(["design", "Alpha"]);
    expect(w.find('[data-slot="tag-input-suggestions"]').exists()).toBe(false);
    w.unmount();
  });

  it("is controlled by v-model, renders a hidden input per tag and honours disabled", () => {
    const w = mount(NqTagInput, { props: { modelValue: ["x", "y"], name: "labels", disabled: true } });
    expect(w.findAll('input[type="hidden"]').map((i) => [i.attributes("name"), (i.element as HTMLInputElement).value])).toEqual([
      ["labels", "x"],
      ["labels", "y"],
    ]);
    expect(w.attributes("data-disabled")).toBe("");
    expect(field(w).attributes("disabled")).toBeDefined();
    expect(w.find('[data-slot="tag-input-box"]').classes()).toContain("opacity-50");
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqTagInput, { defaultValue: ["تصميم"] })) });
    expect(w.find('button[aria-label="إزالة تصميم"]').exists()).toBe(true);
    expect(w.find('[role="status"]').exists()).toBe(true);
  });
});
