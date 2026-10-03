import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { formatE164, formatNational, isValidE164, NqPhoneInput, parsePhone, phoneExample, PHONE_COUNTRIES } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const digits = (w: ReturnType<typeof mount>) => w.find<HTMLInputElement>('[data-slot="input-group-input"]');
const sa = PHONE_COUNTRIES.find((c) => c.iso === "SA")!;

describe("phone data", () => {
  it("lists the countries and formats E.164", () => {
    expect(PHONE_COUNTRIES.length).toBeGreaterThan(230);
    expect(formatE164(sa, "0501234567")).toBe("+966501234567");
    expect(formatE164(sa, "")).toBe("");
    expect(formatNational(sa, "501234567")).toBe("50 123 4567");
    expect(phoneExample(sa)).toBe("51 234 5678");
  });
  it("parses shared codes by number range and validates", () => {
    expect(parsePhone("+966501234567")?.country.iso).toBe("SA");
    expect(parsePhone("+14165550123")?.country.iso).toBe("CA");
    expect(parsePhone("+12125550123")?.country.iso).toBe("US");
    expect(parsePhone("0501234567")).toBeNull();
    expect(isValidE164("+966512345678")).toBe(true);
    expect(isValidE164("+96651")).toBe(false);
  });
});

describe("NqPhoneInput", () => {
  it("shows the country and the grouped digits of a value", () => {
    const w = mount(NqPhoneInput, { props: { modelValue: "+966501234567" } });
    expect(w.find('[data-slot="phone-input"]').exists()).toBe(true);
    expect(w.find('[data-slot="phone-input-country"]').text()).toContain("+966");
    expect(digits(w).element.value).toBe("50 123 4567");
    expect(digits(w).attributes("type")).toBe("tel");
    expect(digits(w).attributes("dir")).toBe("ltr");
  });

  it("emits E.164 as digits are typed and drops the trunk zero", async () => {
    const w = mount(NqPhoneInput, { props: { modelValue: "" } });
    digits(w).element.value = "0501234567";
    await digits(w).trigger("input");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["+966501234567"]);
  });

  it("picks the country from a pasted international number", async () => {
    const w = mount(NqPhoneInput, { props: { modelValue: "" } });
    digits(w).element.value = "+201001234567";
    await digits(w).trigger("input");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["+201001234567"]);
    expect(w.find('[data-slot="phone-input-country"]').text()).toContain("+20");
  });

  it("carries the value in a hidden input and marks invalid", () => {
    const w = mount(NqPhoneInput, { props: { modelValue: "+966501234567", name: "phone", invalid: true } });
    expect(w.find<HTMLInputElement>('input[type="hidden"]').element.value).toBe("+966501234567");
    expect(w.find('[data-slot="phone-input"]').attributes("data-invalid")).toBe("");
    expect(digits(w).attributes("aria-invalid")).toBe("true");
  });

  it("uses Arabic strings and a Saudi default in an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqPhoneInput }, template: '<NasaqProvider locale="ar"><NqPhoneInput /></NasaqProvider>' });
    expect(w.find('[data-slot="phone-input-country"]').attributes("aria-label")).toContain("الدولة");
  });
});
