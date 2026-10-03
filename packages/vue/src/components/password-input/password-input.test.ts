import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqPasswordInput, computePasswordRules, computeRuleScore, estimatePasswordStrength, passwordMeetsPolicy } from ".";

describe("strength helpers", () => {
  it("estimates 0 to 4", () => {
    expect(estimatePasswordStrength("")).toBe(0);
    expect(estimatePasswordStrength("abcdef")).toBe(1);
    expect(estimatePasswordStrength("abcdefg1")).toBe(2);
    expect(estimatePasswordStrength("abcdefgH12")).toBe(3);
    expect(estimatePasswordStrength("abcdefgH12!x")).toBe(4);
  });

  it("checks a policy", () => {
    const rules = computePasswordRules("Abcdefghij1!");
    expect(rules.map((r) => r.id)).toEqual(["length", "upper", "lower", "digit", "symbol"]);
    expect(passwordMeetsPolicy(rules)).toBe(true);
    expect(computeRuleScore(computePasswordRules("short"))).toBe(0);
    expect(computeRuleScore(rules)).toBe(4);
  });
});

describe("NqPasswordInput", () => {
  it("is a password input with a toggle that flips type and aria-pressed", async () => {
    const w = mount(NqPasswordInput, { attrs: { autocomplete: "current-password", name: "pw" } });
    expect(w.attributes("data-slot")).toBe("password-input");
    const input = w.find("input");
    expect(input.attributes("type")).toBe("password");
    expect(input.attributes("autocomplete")).toBe("current-password");
    expect(input.attributes("name")).toBe("pw");
    expect(input.attributes("data-slot")).toBe("input-group-input");
    const toggle = w.find('[data-slot="password-input-toggle"]');
    expect(toggle.attributes("aria-label")).toBe("Show password");
    expect(toggle.attributes("aria-pressed")).toBe("false");
    await toggle.trigger("click");
    expect(input.attributes("type")).toBe("text");
    expect(toggle.attributes("aria-pressed")).toBe("true");
    expect(toggle.attributes("aria-label")).toBe("Show password");
    expect(w.emitted("update:visible")![0]).toEqual([true]);
  });

  it("v-model and the strength meter", async () => {
    const w = mount(NqPasswordInput, { props: { showStrength: true, modelValue: "" } });
    expect(w.find('[data-slot="password-input-strength"]').attributes("data-score")).toBe("0");
    expect(w.find('[data-slot="password-input-strength"]').classes()).toContain("opacity-60");
    await w.find("input").setValue("abcdefgH12!x");
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual(["abcdefgH12!x"]);
    await w.setProps({ modelValue: "abcdefgH12!x" });
    const strength = w.find('[data-slot="password-input-strength"]');
    expect(strength.attributes("data-score")).toBe("4");
    expect(strength.text()).toContain("Strong");
    expect(strength.find('[data-slot="meter"]').attributes("data-tone")).toBe("success");
    expect(strength.find('[data-slot="meter"]').attributes("aria-label")).toBe("Password strength");
  });

  it("rules checklist marks met rules", async () => {
    const w = mount(NqPasswordInput, { props: { rules: true, modelValue: "Abcdefghij1!" } });
    const items = w.findAll('[data-slot="password-input-rules"] li');
    expect(items).toHaveLength(5);
    expect(items.every((li) => li.attributes("data-met") !== undefined)).toBe(true);
    expect(items[0]!.text()).toContain("At least 12 characters");
    expect(items[0]!.text()).toContain("met");
    await w.setProps({ modelValue: "abc" });
    expect(w.findAll('[data-slot="password-input-rules"] li')[0]!.attributes("data-met")).toBeUndefined();
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqPasswordInput }, template: `<NasaqProvider locale="ar" target="scope"><NqPasswordInput :show-strength="true" rules /></NasaqProvider>` });
    expect(w.find('[data-slot="password-input-toggle"]').attributes("aria-label")).toBe("إظهار كلمة المرور");
    expect(w.find('[data-slot="password-input-rules"]').attributes("aria-label")).toBe("متطلبات كلمة المرور");
  });
});
