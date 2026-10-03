import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import {
  NqCombobox,
  NqComboboxChips,
  NqComboboxContent,
  NqComboboxEmpty,
  NqComboboxInput,
  NqComboboxItem,
  NqComboboxList,
  comboboxFilter,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const COUNTRIES = [
  { value: "sa", label: "Saudi Arabia" },
  { value: "eg", label: "Egypt" },
  { value: "jo", label: "Jordan" },
];

function make(multiple = false) {
  const model = ref<unknown>(multiple ? [] : undefined);
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          NqCombobox,
          {
            items: COUNTRIES,
            multiple,
            modelValue: model.value as never,
            "onUpdate:modelValue": (v: unknown) => (model.value = v),
          },
          () => [
            multiple ? h(NqComboboxChips, { placeholder: "Pick" }) : h(NqComboboxInput, { placeholder: "Search" }),
            h(NqComboboxContent, null, () => [
              h(NqComboboxEmpty, null, () => "No results"),
              h(NqComboboxList, null, {
                default: ({ items }: { items: typeof COUNTRIES }) =>
                  items.map((c) => h(NqComboboxItem, { key: c.value, value: c }, () => c.label)),
              }),
            ]),
          ],
        );
    },
  });
  const w = mount(Host, { attachTo: document.body });
  return { w, model };
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const options = () => [...document.body.querySelectorAll('[data-slot="combobox-item"]')].map((o) => o.textContent?.trim());

describe("comboboxFilter", () => {
  it("matches case-insensitively and keeps everything for an empty query", () => {
    expect(comboboxFilter(COUNTRIES[0], "SAUDI", (i: any) => i.label)).toBe(true);
    expect(comboboxFilter(COUNTRIES[1], "sau", (i: any) => i.label)).toBe(false);
    expect(comboboxFilter(COUNTRIES[1], "", (i: any) => i.label)).toBe(true);
  });
});

describe("NqCombobox", () => {
  it("renders the input group, clear (hidden) and trigger buttons", () => {
    const { w } = make();
    expect(document.body.querySelector('[data-slot="combobox-input-group"]')).not.toBeNull();
    expect(input().getAttribute("placeholder")).toBe("Search");
    expect(document.body.querySelector('[data-slot="combobox-clear"]')?.hasAttribute("data-hidden")).toBe(true);
    expect(document.body.querySelector('[data-slot="combobox-trigger"]')).not.toBeNull();
    w.unmount();
  });

  it("opens, filters by the typed text and picks an item", async () => {
    const { w, model } = make();
    document.body.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
    await flushPromises();
    expect(options()).toEqual(["Saudi Arabia", "Egypt", "Jordan"]);
    input().value = "jor";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(options()).toEqual(["Jordan"]);
    document.body.querySelector<HTMLElement>('[data-slot="combobox-item"]')!.click();
    await flushPromises();
    expect(model.value).toEqual(COUNTRIES[2]);
    w.unmount();
  });

  it("shows the empty message when nothing matches", async () => {
    const { w } = make();
    document.body.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
    await flushPromises();
    input().value = "zzz";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(options()).toEqual([]);
    expect(document.body.querySelector('[data-slot="combobox-empty"]')?.textContent).toContain("No results");
    w.unmount();
  });

  it("multiple mode renders chips and removes one", async () => {
    const { w, model } = make(true);
    model.value = [COUNTRIES[0], COUNTRIES[1]];
    await flushPromises();
    const chips = () => [...document.body.querySelectorAll('[data-slot="combobox-chip"]')].map((c) => c.textContent?.trim());
    expect(chips()).toEqual(["Saudi Arabia", "Egypt"]);
    expect(input().getAttribute("placeholder")).toBeNull();
    document.body.querySelector<HTMLElement>('[data-slot="combobox-chip-remove"]')!.click();
    await flushPromises();
    expect(model.value).toEqual([COUNTRIES[1]]);
    w.unmount();
  });
});
