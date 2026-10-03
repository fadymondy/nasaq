import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { applyBrand, darkVariant, hexToHSL, hslToHex, NqBrandingProvider, readableOn, useBranding } from ".";

describe("colour helpers", () => {
  it("round-trips hex and hsl", () => {
    expect(hexToHSL("#ff0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHSL("not a colour")).toBeNull();
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe("#FF0000");
    expect(hexToHSL("#808080")).toEqual({ h: 0, s: 0, l: 50 });
  });

  it("picks ivory or indigo by contrast and lifts dark variants", () => {
    expect(readableOn("#FFFFFF")).toBe("#0E1A3C");
    expect(readableOn("#0A2540")).toBe("#F0EBE1");
    expect(hexToHSL(darkVariant("#0A3D2E")!)!.l).toBeGreaterThanOrEqual(62);
    expect(darkVariant("nope")).toBeNull();
  });
});

describe("applyBrand", () => {
  it("writes the variables, skips invalid colours and cleans up", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const undo = applyBrand(el, { brand: "#0a7c66", accent: "nope" });
    expect(el.style.getPropertyValue("--nq-brand-l")).toBe("#0A7C66");
    expect(el.style.getPropertyValue("--nq-action-l")).toBe("#0A7C66");
    expect(el.style.getPropertyValue("--nq-on-action-l")).toBe("#F0EBE1");
    expect(el.style.getPropertyValue("--nq-brand-d")).not.toBe("");
    expect(el.style.getPropertyValue("--nq-accent-brand")).toBe("");
    expect(el.getAttribute("data-brand")).toBe("runtime");
    undo();
    expect(el.style.getPropertyValue("--nq-brand-l")).toBe("");
    expect(el.hasAttribute("data-brand")).toBe(false);
    el.remove();
  });
});

describe("NqBrandingProvider", () => {
  it("applies to a target, follows changes, shares the logo and name, and removes on unmount", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const brand = ref("#0A7C66");
    const Child = defineComponent({
      setup() {
        const b = useBranding();
        return () => h("span", { id: "who" }, `${b?.value.name}|${b?.value.logoUrl}`);
      },
    });
    const w = mount({ render: () => h(NqBrandingProvider, { brand: brand.value, logoUrl: "  ", name: "Acme", target: () => target }, () => h(Child)) }, { attachTo: document.body });
    expect(target.style.getPropertyValue("--nq-brand-l")).toBe("#0A7C66");
    expect(w.find("#who").text()).toBe("Acme|null");
    brand.value = "#112233";
    await nextTick();
    expect(target.style.getPropertyValue("--nq-brand-l")).toBe("#112233");
    w.unmount();
    expect(target.style.getPropertyValue("--nq-brand-l")).toBe("");
    target.remove();
  });

  it("useBranding is null outside a provider", () => {
    let seen: unknown = "unset";
    mount(defineComponent({ setup() { seen = useBranding(); return () => h("i"); } }));
    expect(seen).toBeNull();
  });
});
