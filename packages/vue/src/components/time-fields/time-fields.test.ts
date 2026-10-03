import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { defineComponent, h } from "vue";
import { NqTimeField, NqTimeSpanField, NqTimeZoneClock, NqTimeZoneField, convertWallTime, formatTimeSpan, parseTimeInput, stepTimeValue, timeZoneOffsetMinutes } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const NOW = new Date("2026-09-29T09:00:00Z");

describe("time maths", () => {
  it("reads typed times", () => {
    expect(parseTimeInput("930")).toBe("09:30");
    expect(parseTimeInput("9.30")).toBe("09:30");
    expect(parseTimeInput("9:30 pm")).toBe("21:30");
    expect(parseTimeInput("٠٩٣٠")).toBe("09:30");
    expect(parseTimeInput("2460")).toBeNull();
    expect(parseTimeInput("24:00", { allowEndOfDay: true })).toBe("24:00");
    expect(stepTimeValue("09:32", 5)).toBe("09:35");
    expect(formatTimeSpan(510, "en")).toBe("8h 30m");
    expect(timeZoneOffsetMinutes(NOW, "Asia/Riyadh")).toBe(180);
    expect(convertWallTime("2026-09-30", "09:30", "Asia/Riyadh", "UTC")).toEqual({ day: "2026-09-30", time: "06:30" });
  });
});

describe("NqTimeField", () => {
  it("renders the input, the slot and the clock icon", () => {
    const w = mount(NqTimeField, { props: { modelValue: "09:00" } });
    expect(w.attributes("data-slot")).toBe("time-field");
    expect(w.classes()).toContain("flex-col");
    const input = w.find("input");
    expect(input.attributes("data-slot")).toBe("input");
    expect(input.attributes("dir")).toBe("ltr");
    expect(input.attributes("aria-label")).toBe("Time");
    expect(input.attributes("placeholder")).toBe("HH:mm");
    expect((input.element as HTMLInputElement).value).toBe("09:00");
    expect(input.classes()).toContain("tabular-nums");
  });

  it("previews while typing and accepts on blur", async () => {
    const w = mount(NqTimeField, { props: { modelValue: null } });
    const input = w.find("input");
    await input.setValue("930");
    expect(w.find("p").text()).toBe("Will be 09:30");
    expect(input.attributes("aria-describedby")).toBe(w.find("p").attributes("id"));
    await input.trigger("blur");
    expect(w.emitted("update:modelValue")![0]).toEqual(["09:30"]);
    expect(w.emitted("valueChange")![0]).toEqual(["09:30"]);
    expect((input.element as HTMLInputElement).value).toBe("09:30");
  });

  it("refuses text that is not a time and a time out of range", async () => {
    const w = mount(NqTimeField, { props: { modelValue: null, min: "08:00", max: "18:00" } });
    const input = w.find("input");
    await input.setValue("abc");
    await input.trigger("keydown", { key: "Enter" });
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(w.find("p").text()).toBe("Enter a time such as 930 or 09:30.");
    await input.setValue("2000");
    await input.trigger("blur");
    expect(w.find("p").text()).toBe("Choose a time between 08:00 and 18:00.");
    expect(w.emitted("update:modelValue")).toBeUndefined();
  });

  it("steps with arrows and pages, and Escape restores", async () => {
    const w = mount(NqTimeField, { props: { modelValue: "09:00" } });
    const input = w.find("input");
    await input.trigger("keydown", { key: "ArrowUp" });
    expect(w.emitted("update:modelValue")![0]).toEqual(["09:05"]);
    await w.setProps({ modelValue: "09:05" });
    await input.trigger("keydown", { key: "PageDown" });
    expect(w.emitted("update:modelValue")![1]).toEqual(["09:00"]);
    await input.setValue("12");
    await input.trigger("keydown", { key: "Escape" });
    expect((input.element as HTMLInputElement).value).toBe("09:05");
  });

  it("carries the value in a hidden input and shows an outside error", () => {
    const w = mount(NqTimeField, { props: { modelValue: "07:15", name: "opens", error: "Bad" } });
    expect(w.find('input[type="hidden"]').attributes("name")).toBe("opens");
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).value).toBe("07:15");
    expect(w.find("p").text()).toBe("Bad");
    expect(w.find("input").attributes("aria-invalid")).toBe("true");
  });

  it("speaks Arabic in an Arabic provider", () => {
    const Host = defineComponent({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqTimeField)) });
    const w = mount(Host);
    expect(w.find("input").attributes("aria-label")).toBe("الوقت");
    expect(w.find("input").attributes("placeholder")).toBe("س:د");
  });
});

describe("NqTimeSpanField", () => {
  it("shows the duration and flags an end before the start", async () => {
    const w = mount(NqTimeSpanField, { props: { modelValue: { start: "09:00", end: "17:30" } } });
    expect(w.attributes("data-slot")).toBe("time-span-field");
    expect(w.attributes("role")).toBe("group");
    expect(w.text()).toContain("Duration: 8h 30m");
    await w.setProps({ modelValue: { start: "22:00", end: "06:00" } });
    expect(w.text()).toContain("The end must be after the start.");
    expect(w.text()).not.toContain("Duration");
  });

  it("allows the next day with allowOvernight and emits edits", async () => {
    const w = mount(NqTimeSpanField, { props: { defaultValue: { start: "22:00", end: "06:00" }, allowOvernight: true } });
    expect(w.find('[data-slot="badge"]').text()).toBe("Next day");
    expect(w.text()).toContain("8h");
    const inputs = w.findAll("input");
    await inputs[1]!.setValue("0700");
    await inputs[1]!.trigger("blur");
    expect(w.emitted("update:modelValue")![0]).toEqual([{ start: "22:00", end: "07:00" }]);
  });
});

describe("NqTimeZoneClock", () => {
  it("shows the city, time, date, offset and the gap from a reference", () => {
    const w = mount(NqTimeZoneClock, { props: { timeZone: "Asia/Kolkata", reference: "Asia/Riyadh", now: NOW } });
    expect(w.attributes("data-slot")).toBe("time-zone-clock");
    expect(w.text()).toContain("Kolkata");
    expect(w.text()).toContain("UTC+05:30");
    expect(w.find("time").text()).toBe("2:30 PM");
    expect(w.find("time").attributes("datetime")).toBe("2026-09-29T09:00:00.000Z");
    expect(w.text()).toContain("+2h 30m from Riyadh");
  });

  it("marks another day and honours label, hour cycle and an unknown zone", () => {
    const w = mount(NqTimeZoneClock, { props: { timeZone: "Pacific/Auckland", reference: "UTC", now: new Date("2026-09-29T15:00:00Z"), label: "Head office", hourCycle: 24 } });
    expect(w.text()).toContain("Head office");
    expect(w.text()).toContain("Tomorrow");
    expect(w.find("time").text()).toBe("04:00");
    const bad = mount(NqTimeZoneClock, { props: { timeZone: "Mars/Olympus" } });
    expect(bad.text()).toContain("Unknown time zone");
  });
});

describe("NqTimeZoneField", () => {
  it("renders the picker, the detect button and the clock of the chosen zone", async () => {
    const w = mount(NqTimeZoneField, { props: { modelValue: "Asia/Riyadh", now: NOW, zones: ["UTC", "Asia/Riyadh", "Europe/London"] }, attachTo: document.body });
    await flushPromises();
    expect(w.attributes("data-slot")).toBe("time-zone-field");
    expect(w.find('[data-slot="combobox-input"]').attributes("aria-label")).toBe("Time zone");
    expect((w.find('[data-slot="combobox-input"]').element as HTMLInputElement).value).toBe("Riyadh, Asia");
    expect(w.find('[data-slot="time-zone-clock"]').text()).toContain("UTC+03:00");
    expect(w.find('[data-slot="button"]').text()).toContain("Use my time zone");
    w.unmount();
  });

  it("emits when the detect button picks the reader's zone and hides the clock on request", async () => {
    const w = mount(NqTimeZoneField, { props: { defaultValue: "UTC", now: NOW, showClock: false, zones: ["UTC", "Asia/Riyadh"] } });
    expect(w.find('[data-slot="time-zone-clock"]').exists()).toBe(false);
    const detected = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected !== "UTC") {
      await w.find('[data-slot="button"]').trigger("click");
      expect(w.emitted("update:modelValue")![0]).toEqual([detected]);
    }
  });

  it("carries the zone in a hidden input", () => {
    const w = mount(NqTimeZoneField, { props: { modelValue: "Europe/London", name: "tz", now: NOW, showDetect: false } });
    expect(w.find('input[type="hidden"]').attributes("name")).toBe("tz");
    expect((w.find('input[type="hidden"]').element as HTMLInputElement).value).toBe("Europe/London");
    expect(w.find('[data-slot="button"]').exists()).toBe(false);
  });
});
