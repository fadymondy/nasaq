import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

// jsbarcode (imported only by ./draw) is not a dependency of packages/vue yet: a stub stands in and records the call.
vi.mock("./draw", () => ({
  JsBarcode: vi.fn((el: SVGElement, value: string) => {
    el.setAttribute("width", "200");
    el.setAttribute("height", "100");
    el.innerHTML = `<rect data-v="${value}" width="2" height="80"/>`;
  }),
}));

import { JsBarcode } from "./draw";
import { gtinCheckDigit, NqBarcode, NqBarcodeGenerator, validateBarcode } from ".";

describe("validateBarcode", () => {
  it("accepts a body or a full GTIN and names what is wrong otherwise", () => {
    expect(validateBarcode("EAN13", "5901234123457")).toBeNull();
    expect(validateBarcode("EAN13", "590123412345")).toBeNull();
    expect(validateBarcode("EAN13", "5901234123458")).toBe("checksum");
    expect(validateBarcode("EAN13", "59012")).toBe("length");
    expect(validateBarcode("EAN13", "59012341234AB")).toBe("digits");
    expect(validateBarcode("CODE128", "")).toBe("empty");
    expect(validateBarcode("ITF", "123")).toBe("length");
    expect(gtinCheckDigit("590123412345")).toBe(7);
  });
});

describe("NqBarcode", () => {
  it("draws one role=img SVG named after the value, LTR, with the React classes", async () => {
    const w = mount(NqBarcode, { props: { value: "NSQ-2026-0042" } });
    await w.vm.$nextTick();
    expect(w.attributes("data-slot")).toBe("barcode");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.classes()).toEqual(expect.arrayContaining(["inline-flex", "flex-col", "items-center", "gap-3"]));
    const svg = w.get('[data-slot="barcode-svg"]');
    expect(svg.attributes("role")).toBe("img");
    expect(svg.attributes("aria-label")).toBe("Code 128 barcode for NSQ-2026-0042");
    expect(svg.attributes("viewBox")).toBe("0 0 200 100");
    expect(svg.find("rect").exists()).toBe(true);
    expect(w.find('[data-slot="barcode-actions"]').exists()).toBe(false);
  });

  it("shows the reason instead of drawing when the value does not fit the format", () => {
    vi.mocked(JsBarcode).mockClear();
    const w = mount(NqBarcode, { props: { value: "123", format: "EAN13" } });
    expect(w.get('[role="alert"]').text()).toBe("This value has the wrong length for the format.");
    expect(w.attributes("data-invalid")).toBe("");
    expect(JsBarcode).not.toHaveBeenCalled();
    expect(w.emitted("validate")?.[0]).toEqual(["length"]);
  });

  it("shows the download buttons when downloadable", () => {
    const w = mount(NqBarcode, { props: { value: "abc", downloadable: true } });
    expect(w.findAll('[data-slot="barcode-actions"] button').map((b) => b.text())).toEqual(["Download SVG", "Download PNG"]);
  });
});

describe("NqBarcodeGenerator", () => {
  it("renders the card with the value field and a barcode preview", () => {
    const w = mount(NqBarcodeGenerator, { attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("barcode-generator");
    expect(w.get("input").element.value).toBe("NSQ-2026-0042");
    expect(w.find('[data-slot="barcode"]').exists()).toBe(true);
    w.unmount();
  });
});
