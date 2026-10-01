import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqRelationPicker, type RelationOption } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const people: RelationOption[] = [
  { value: "1", label: "Layla", labelAr: "ليلى", description: "layla@x.test" },
  { value: "2", label: "Omar", labelAr: "عمر" },
  { value: "3", label: "Sara", labelAr: "سارة" },
];

const input = () => document.body.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const rows = () => [...document.body.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')];
const rowText = () => rows().map((r) => r.textContent?.trim());
async function type(text: string) {
  input().value = text;
  input().dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
}
async function openList() {
  document.body.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
  await flushPromises();
}

describe("NqRelationPicker", () => {
  it("shows the name of a stored id and the relation-picker slot", async () => {
    const w = mount(NqRelationPicker, { props: { options: people, modelValue: "2", ariaLabel: "Owner" }, attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="relation-picker"]').exists()).toBe(true);
    expect(input().value).toBe("Omar");
    expect(input().getAttribute("aria-label")).toBe("Owner");
    w.unmount();
  });

  it("resolves a saved id it has not seen", async () => {
    const resolve = vi.fn(async (ids: readonly string[]) => people.filter((p) => ids.includes(p.value)));
    const w = mount(NqRelationPicker, { props: { modelValue: "3", resolve }, attachTo: document.body });
    await flushPromises();
    expect(resolve).toHaveBeenCalledWith(["3"]);
    expect(input().value).toBe("Sara");
    w.unmount();
  });

  it("filters fixed options on the client, with Arabic names in Arabic", async () => {
    const w = mount(NqRelationPicker, { props: { options: people, locale: "ar" }, attachTo: document.body });
    await openList();
    expect(rowText()).toEqual(["ليلىlayla@x.test", "عمر", "سارة"]);
    await type("عم");
    expect(rowText()).toEqual(["عمر"]);
    await type("zzz");
    expect(document.body.querySelector('[data-slot="combobox-empty"]')?.textContent).toContain("لا توجد نتائج");
    w.unmount();
  });

  it("picks a record and emits its id and the record", async () => {
    const w = mount(NqRelationPicker, { props: { options: people, name: "owner" }, attachTo: document.body });
    await openList();
    rows()[2]!.click();
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual(["3"]);
    expect(w.emitted("change")![0]).toEqual(["3", people[2]]);
    expect(w.find('input[type="hidden"][name="owner"]').attributes("value")).toBe("3");
    w.unmount();
  });

  it("searches with the query after the debounce and aborts older calls", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const signals: AbortSignal[] = [];
    const search = vi.fn(async (q: string, signal: AbortSignal) => {
      signals.push(signal);
      return people.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()));
    });
    const w = mount(NqRelationPicker, { props: { search, debounce: 100 }, attachTo: document.body });
    await openList();
    await vi.advanceTimersByTimeAsync(10);
    expect(search).toHaveBeenLastCalledWith("", expect.any(AbortSignal));
    await type("sa");
    await type("sar");
    await vi.advanceTimersByTimeAsync(150);
    await flushPromises();
    expect(search).toHaveBeenLastCalledWith("sar", expect.any(AbortSignal));
    expect(search.mock.calls.map((c) => c[0])).not.toContain("sa");
    expect(rowText()).toEqual(["Sara"]);
    expect(w.find('[data-slot="relation-picker"]').attributes("data-busy")).toBeUndefined();
    w.unmount();
  });

  it("shows an error with a retry button", async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(people);
    const w = mount(NqRelationPicker, { props: { search }, attachTo: document.body });
    await openList();
    await flushPromises();
    const empty = document.body.querySelector('[data-slot="combobox-empty"]')!;
    expect(empty.textContent).toContain("Could not load results.");
    empty.querySelector<HTMLButtonElement>("button")!.click();
    await flushPromises();
    expect(rowText().length).toBe(3);
    w.unmount();
  });

  it("offers Create for typed text and selects the new record", async () => {
    const onCreate = vi.fn(async (name: string) => ({ value: "new", label: name }));
    const w = mount(NqRelationPicker, { props: { options: people, onCreate }, attachTo: document.body });
    await openList();
    await type("Zed");
    expect(rowText()).toEqual(["Create “Zed”"]);
    rows()[0]!.click();
    await flushPromises();
    expect(onCreate).toHaveBeenCalledWith("Zed");
    expect(w.emitted("update:modelValue")![0]).toEqual(["new"]);
    w.unmount();
  });

  it("reports a failed create", async () => {
    const onCreate = vi.fn(async () => ({ error: "nope" }));
    const w = mount(NqRelationPicker, { props: { options: people, onCreate }, attachTo: document.body });
    await openList();
    await type("Zed");
    rows()[0]!.click();
    await flushPromises();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("Could not create it.");
    expect(w.emitted("update:modelValue")).toBeUndefined();
    w.unmount();
  });

  it("multiple mode shows chips and removes one", async () => {
    const w = mount(NqRelationPicker, { props: { options: people, multiple: true, modelValue: ["1", "2"], name: "team" }, attachTo: document.body });
    await flushPromises();
    const chips = () => [...document.body.querySelectorAll('[data-slot="combobox-chip"]')].map((c) => c.textContent?.trim());
    expect(chips()).toEqual(["Layla", "Omar"]);
    expect(w.findAll('input[type="hidden"][name="team"]').map((i) => i.attributes("value"))).toEqual(["1", "2"]);
    document.body.querySelector<HTMLElement>('[data-slot="combobox-chip-remove"]')!.click();
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual([["2"]]);
    w.unmount();
  });
});
