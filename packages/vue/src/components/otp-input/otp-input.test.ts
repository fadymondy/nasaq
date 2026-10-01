import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqOtpInput } from ".";

const boxes = (w: ReturnType<typeof mount>) => w.findAll<HTMLInputElement>('[data-slot="otp-input-box"]');
const values = (w: ReturnType<typeof mount>) => boxes(w).map((b) => b.element.value).join("");

describe("NqOtpInput", () => {
  it("renders length boxes, left-to-right, labelled, with a hidden field", () => {
    const w = mount(NqOtpInput, { props: { name: "code", class: "w-fit" } });
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.classes()).toEqual(expect.arrayContaining(["inline-flex", "w-fit"]));
    expect(boxes(w)).toHaveLength(6);
    expect(boxes(w)[0]!.attributes("aria-label")).toBe("Digit 1 of 6");
    expect(boxes(w)[0]!.attributes("inputmode")).toBe("numeric");
    expect(boxes(w)[0]!.attributes("autocomplete")).toBe("one-time-code");
    expect(boxes(w)[0]!.classes()).toContain("size-control");
    expect(w.find('input[type="hidden"]').attributes("name")).toBe("code");
  });

  it("fills boxes as you type, rejects letters, and emits complete", async () => {
    const w = mount(NqOtpInput, { props: { length: 4 }, attachTo: document.body });
    const set = async (i: number, v: string) => {
      boxes(w)[i]!.element.value = v;
      await boxes(w)[i]!.trigger("input");
      await flushPromises();
    };
    await set(0, "1");
    expect(values(w)).toBe("1");
    expect(boxes(w)[0]!.attributes("data-filled")).toBe("");
    await set(1, "x");
    expect(values(w)).toBe("1");
    await set(1, "2");
    await set(2, "3");
    await set(3, "4");
    expect(values(w)).toBe("1234");
    expect(w.emitted("complete")![0]).toEqual(["1234"]);
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual(["1234"]);
    w.unmount();
  });

  it("pastes the whole code and Backspace steps back", async () => {
    const w = mount(NqOtpInput, { props: { length: 6 }, attachTo: document.body });
    const paste = new Event("paste", { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
    Object.defineProperty(paste, "clipboardData", { value: { getData: () => "12 34-56" } });
    boxes(w)[0]!.element.dispatchEvent(paste);
    await flushPromises();
    expect(values(w)).toBe("123456");
    expect(w.emitted("complete")![0]).toEqual(["123456"]);

    const w2 = mount(NqOtpInput, { props: { length: 4, modelValue: "12" }, attachTo: document.body });
    boxes(w2)[2]!.element.focus();
    await boxes(w2)[2]!.trigger("keydown", { key: "Backspace" });
    expect(w2.emitted("update:modelValue")!.at(-1)).toEqual(["1"]);
    w.unmount();
    w2.unmount();
  });

  it("marks boxes invalid and supports alphanumeric", () => {
    const w = mount(NqOtpInput, { props: { invalid: true, type: "alphanumeric", disabled: true } });
    expect(boxes(w)[0]!.attributes("aria-invalid")).toBe("true");
    expect(boxes(w)[0]!.attributes("data-invalid")).toBe("");
    expect(boxes(w)[0]!.attributes("inputmode")).toBe("text");
    expect(boxes(w)[0]!.attributes("disabled")).toBeDefined();
  });
});
