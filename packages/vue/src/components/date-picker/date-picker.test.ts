import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqField, NqFieldLabel } from "../field";
import { NqDatePicker, NqDateRangePicker, NqTimePicker } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');
const day = (key: string) => document.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)!;
const trigger = (w: ReturnType<typeof mount>) => w.find('[data-slot="date-picker-trigger"]');
const settle = async () => {
  await flushPromises();
  await new Promise((r) => setTimeout(r, 100));
  await flushPromises();
};

describe("NqDatePicker", () => {
  it("shows a placeholder, then the formatted date, and opens a calendar", async () => {
    const w = mount(NqDatePicker, { props: { locale: "en-US", ariaLabel: "Start" }, attachTo: document.body });
    const t = trigger(w);
    expect(t.text()).toBe("Select a date");
    expect(t.find("span").attributes("data-placeholder")).toBeDefined();
    expect(t.attributes("aria-label")).toBe("Start");
    expect(t.classes()).toContain("h-control");
    await w.setProps({ modelValue: new Date(2026, 8, 15) });
    expect(t.text()).toBe("Sep 15, 2026");
    expect(t.find("span").attributes("data-placeholder")).toBeUndefined();

    await t.trigger("click");
    await flushPromises();
    expect(popup()!.getAttribute("aria-label")).toBe("Choose date");
    expect(popup()!.className).toContain("w-auto");
    expect(document.querySelector('[data-slot="calendar"]')).not.toBeNull();
    expect(day("2026-09-15").hasAttribute("data-selected")).toBe(true);
    w.unmount();
  });

  it("emits the picked day and closes", async () => {
    const w = mount(NqDatePicker, { props: { modelValue: new Date(2026, 8, 15), locale: "en" }, attachTo: document.body });
    await trigger(w).trigger("click");
    await flushPromises();
    day("2026-09-10").click();
    await settle();
    const [picked] = w.emitted("update:modelValue")![0] as [Date];
    expect(picked.getFullYear()).toBe(2026);
    expect(picked.getMonth()).toBe(8);
    expect(picked.getDate()).toBe(10);
    expect(popup()).toBeNull();
    w.unmount();
  });

  it("carries the ISO date in a hidden input and honours min", async () => {
    const w = mount(NqDatePicker, { props: { modelValue: new Date(2026, 8, 5), name: "start", min: new Date(2026, 8, 3), locale: "en" }, attachTo: document.body });
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).name).toBe("start");
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).value).toBe("2026-09-05");
    await trigger(w).trigger("click");
    await flushPromises();
    expect(day("2026-09-02").hasAttribute("data-disabled")).toBe(true);
    w.unmount();
  });

  it("joins a NqField and shows Arabic text in an Arabic provider", async () => {
    const w = mount(
      defineComponent({
        render: () =>
          h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqField, { invalid: true }, () => [h(NqFieldLabel, null, () => "التاريخ"), h(NqDatePicker, { modelValue: new Date(2026, 8, 15) })])),
      }),
      { attachTo: document.body },
    );
    await flushPromises();
    const t = trigger(w);
    expect(w.find("label").attributes("for")).toBe(t.attributes("id"));
    expect(t.attributes("aria-invalid")).toBe("true");
    expect(t.attributes("data-invalid")).toBeDefined();
    expect(t.text()).not.toBe("");
    await t.trigger("click");
    await flushPromises();
    expect(popup()!.getAttribute("aria-label")).toBe("اختيار التاريخ");
    expect(popup()!.getAttribute("dir")).toBe("rtl");
    w.unmount();
  });
});

describe("NqDateRangePicker", () => {
  it("picks two days, emits the range and closes once both are chosen", async () => {
    const w = mount(NqDateRangePicker, {
      props: {
        modelValue: { from: null, to: null },
        locale: "en-US",
        numberOfMonths: 1 as const,
        name: "period",
        "onUpdate:modelValue": (v: unknown) => w.setProps({ modelValue: v as never }),
      },
      attachTo: document.body,
    });
    const t = trigger(w);
    expect(t.text()).toBe("Select dates");
    await t.trigger("click");
    await flushPromises();
    const today = new Date();
    const key = (d: number) => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    day(key(10)).click();
    await flushPromises();
    expect(popup()).not.toBeNull();
    day(key(12)).click();
    await settle();
    const calls = w.emitted("update:modelValue")!;
    const last = calls[calls.length - 1]![0] as { from: Date; to: Date };
    expect(last.from.getDate()).toBe(10);
    expect(last.to.getDate()).toBe(12);
    expect(popup()).toBeNull();
    expect(t.text()).toContain("10");
    const hidden = w.findAll('input[type="hidden"]');
    expect((hidden[0]!.element as HTMLInputElement).name).toBe("period-from");
    expect((hidden[1]!.element as HTMLInputElement).value).toBe(key(12));
    w.unmount();
  });

  it("shows two months when forced", async () => {
    const w = mount(NqDateRangePicker, { props: { numberOfMonths: 2, locale: "en" }, attachTo: document.body });
    await trigger(w).trigger("click");
    await flushPromises();
    expect(document.querySelectorAll('[data-slot="calendar-month"]').length).toBe(2);
    w.unmount();
  });
});

describe("NqTimePicker", () => {
  const sel = (w: ReturnType<typeof mount>, slot: string) => w.find<HTMLSelectElement>(`[data-slot="time-picker-${slot}"]`);

  it("renders hour, minute and AM/PM selects for a 12-hour locale", () => {
    const w = mount(NqTimePicker, { props: { modelValue: "14:30", locale: "en-US", ariaLabel: "Meeting time" } });
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Meeting time");
    expect(sel(w, "hour").attributes("aria-label")).toBe("Hour");
    expect(sel(w, "hour").element.value).toBe("2");
    expect(sel(w, "minute").element.value).toBe("30");
    expect(sel(w, "period").element.value).toBe("pm");
    expect(sel(w, "hour").findAll("option").length).toBe(13);
  });

  it("has no period select in 24-hour form and steps minutes", () => {
    const w = mount(NqTimePicker, { props: { modelValue: "14:30", hourCycle: 24, minuteStep: 15, locale: "en" } });
    expect(sel(w, "period").exists()).toBe(false);
    expect(sel(w, "hour").element.value).toBe("14");
    expect(sel(w, "minute").findAll("option").length).toBe(5);
  });

  it("emits HH:mm, keeping the missing segment at 00", async () => {
    const w = mount(NqTimePicker, { props: { locale: "en-US" } });
    await sel(w, "hour").setValue("3");
    expect(w.emitted("update:modelValue")![0]).toEqual(["03:00"]);
    await sel(w, "period").setValue("pm");
    expect(w.emitted("update:modelValue")![1]).toEqual(["15:00"]);
    await sel(w, "minute").setValue("45");
    expect(w.emitted("update:modelValue")![2]).toEqual(["15:45"]);
    expect(sel(w, "period").element.value).toBe("pm");
  });

  it("is the NqField control, carries a hidden input and uses Arabic labels", async () => {
    const w = mount(
      defineComponent({
        render: () =>
          h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqField, { name: "t" }, () => [h(NqFieldLabel, null, () => "الوقت"), h(NqTimePicker, { modelValue: "14:30", name: "when" })])),
      }),
    );
    await flushPromises();
    const hour = sel(w, "hour");
    expect(w.find("label").attributes("for")).toBe(hour.attributes("id"));
    expect(hour.attributes("aria-label")).toBe("الساعة");
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).value).toBe("14:30");
    expect(w.find('[data-slot="time-picker"]').attributes("dir")).toBe("rtl");
  });
});
