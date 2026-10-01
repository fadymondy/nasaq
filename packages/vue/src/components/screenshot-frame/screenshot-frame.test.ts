import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqScreenshotFrame } from ".";

describe("NqScreenshotFrame", () => {
  it("browser variant: bar with a left-to-right address pill and a caption", () => {
    const w = mount(NqScreenshotFrame, { props: { variant: "browser", title: "app.mahaam.com", caption: "Board" }, slots: { default: '<img alt="" src="/x.png">' } });
    expect(w.attributes("data-variant")).toBe("browser");
    expect(w.find('[data-slot="screenshot-frame-bar"]').exists()).toBe(true);
    const pill = w.find("[dir=ltr]");
    expect(pill.text()).toBe("app.mahaam.com");
    expect(pill.classes()).toContain("bg-secondary");
    expect(w.find("figcaption").text()).toBe("Board");
  });

  it("a label makes the screen one image and the content inert", () => {
    const w = mount(NqScreenshotFrame, { props: { label: "Board" }, slots: { default: "<p>live</p>" } });
    const screen = w.find('[data-slot="screenshot-frame-screen"]');
    expect(screen.attributes("role")).toBe("img");
    expect(screen.attributes("aria-label")).toBe("Board");
    const inner = screen.find("div");
    expect(inner.attributes("aria-hidden")).toBe("true");
    expect(inner.element.hasAttribute("inert")).toBe(true);
  });

  it("phone variant has no bar and centres the device", () => {
    const w = mount(NqScreenshotFrame, { props: { variant: "phone" }, slots: { default: "x" } });
    expect(w.classes()).toContain("items-center");
    expect(w.find('[data-slot="screenshot-frame-bar"]').exists()).toBe(false);
    expect(w.find('[data-slot="screenshot-frame-screen"]').classes()).toContain("aspect-[9/19]");
  });
});
