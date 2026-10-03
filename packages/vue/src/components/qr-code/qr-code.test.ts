import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqQrCode, NqQrCodeGenerator, qrLayout, qrSvgString } from ".";

describe("qrLayout / qrSvgString", () => {
  it("is deterministic and keeps the finder patterns out of the data modules", () => {
    const a = qrLayout({ value: "https://nasaqui.com" });
    const b = qrLayout({ value: "https://nasaqui.com" });
    expect(a).toEqual(b);
    expect(a.eyes).toHaveLength(3);
    expect(a.size).toBeGreaterThan(0);
    expect(a.logo).toBeNull();
  });

  it("a logo forces ecc H (a larger or equal matrix) and reserves a centre box", () => {
    const plain = qrLayout({ value: "hello", ecc: "L" });
    const withLogo = qrLayout({ value: "hello", ecc: "L", logo: { src: "data:image/png;base64,AAAA" } });
    expect(withLogo.size).toBeGreaterThanOrEqual(plain.size);
    expect(withLogo.logo?.size).toBeGreaterThanOrEqual(3);
    expect(qrSvgString({ value: "hello", fg: "#111", bg: "#fff" })).toMatch(/^<svg [^>]*viewBox="0 0 \d+ \d+"/);
  });
});

describe("NqQrCode", () => {
  it("renders one role=img SVG named after the value, LTR, with the React classes", () => {
    const w = mount(NqQrCode, { props: { value: "https://nasaqui.com" } });
    expect(w.attributes("data-slot")).toBe("qr-code");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.classes()).toEqual(expect.arrayContaining(["inline-flex", "flex-col", "items-center", "gap-3"]));
    const svg = w.get('[data-slot="qr-code-svg"]');
    expect(svg.attributes("role")).toBe("img");
    expect(svg.attributes("aria-label")).toBe("QR code for https://nasaqui.com");
    expect(svg.attributes("width")).toBe("192");
    expect(svg.attributes("shape-rendering")).toBe("crispEdges");
    expect(svg.classes()).toEqual(expect.arrayContaining(["aspect-square", "rounded-control", "border"]));
    expect(svg.findAll("g")).toHaveLength(3);
    expect(svg.find("image").exists()).toBe(false);
    expect(w.find('[data-slot="qr-code-actions"]').exists()).toBe(false);
  });

  it("styles, colours, size=fill, label and the centre logo", () => {
    const w = mount(NqQrCode, {
      props: { value: "x".repeat(60), moduleStyle: "dots", eyeStyle: "circle", fg: "#112233", eyeFg: "#ff0000", size: "fill", label: "Pay", logo: { src: "data:image/png;base64,AAAA" } },
    });
    expect(w.attributes("data-module-style")).toBe("dots");
    expect(w.attributes("data-eye-style")).toBe("circle");
    expect(w.classes()).toContain("w-full");
    const svg = w.get("svg");
    expect(svg.attributes("aria-label")).toBe("Pay");
    expect(svg.attributes("width")).toBeUndefined();
    expect(svg.attributes("shape-rendering")).toBe("geometricPrecision");
    expect(svg.find("path").attributes("fill")).toBe("#112233");
    expect(svg.find("g").attributes("fill")).toBe("#ff0000");
    expect(svg.find("image").attributes("href")).toBe("data:image/png;base64,AAAA");
    const long = mount(NqQrCode, { props: { value: "y".repeat(60) } });
    expect(long.get("svg").attributes("aria-label")).toBe(`QR code for ${"y".repeat(40)}…`);
  });

  it("downloadable adds the two buttons, in Arabic when the document is Arabic", () => {
    const en = mount(NqQrCode, { props: { value: "a", downloadable: true } });
    expect(en.findAll('[data-slot="qr-code-actions"] button').map((b) => b.text())).toEqual(["Download SVG", "Download PNG"]);
    document.documentElement.lang = "ar";
    const ar = mount(NqQrCode, { props: { value: "a", downloadable: true } });
    expect(ar.attributes("dir")).toBe("ltr");
    expect(ar.findAll("button").map((b) => b.text())).toEqual(["تنزيل SVG", "تنزيل PNG"]);
    expect(ar.get("svg").attributes("aria-label")).toBe("رمز QR لـ a");
    document.documentElement.lang = "";
  });
});

describe("NqQrCodeGenerator", () => {
  it("renders the card with the editable content and a live, downloadable preview", async () => {
    const w = mount(NqQrCodeGenerator, { attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("qr-code-generator");
    expect(w.get('[data-slot="card-title"]').text()).toBe("QR code");
    const before = w.get('[data-slot="qr-code-svg"] path').attributes("d");
    const ta = w.get("textarea");
    expect((ta.element as HTMLTextAreaElement).value).toBe("https://nasaqui.com");
    await ta.setValue("something else entirely");
    expect(w.get('[data-slot="qr-code-svg"] path').attributes("d")).not.toBe(before);
    expect(w.get('[data-slot="qr-code"]').attributes("data-module-style")).toBe("rounded");
    expect(w.findAll('[data-slot="qr-code-actions"] button')).toHaveLength(2);
    expect(w.text()).toContain("Add a logo");
    w.unmount();
  });
});
