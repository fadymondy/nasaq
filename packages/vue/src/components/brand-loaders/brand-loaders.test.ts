import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NqBootSplash, NqBrailleLoader, NqDotMatrixFill, NqLogoLoader, BRAILLE_FRAMES, dotMatrixLevels, ringArc } from ".";
import { NasaqProvider } from "../../provider";
import { h } from "vue";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("loader maths", () => {
  it("fills dots by progress and sweeps when indeterminate", () => {
    const full = dotMatrixLevels({ cols: 4, rows: 2, value: 100 });
    expect(full.every((l) => l === 1)).toBe(true);
    expect(dotMatrixLevels({ cols: 4, rows: 2, value: 0 }).every((l) => l === 0)).toBe(true);
    expect(dotMatrixLevels({ cols: 4, rows: 1, value: null, tick: 1 })[0]).toBeGreaterThan(0);
    const { circumference, dashOffset } = ringArc(25, 46);
    expect(dashOffset).toBeCloseTo(circumference * 0.75);
  });
});

describe("NqBrailleLoader", () => {
  it("advances frames and announces the label", async () => {
    const w = mount(NqBrailleLoader, { props: { interval: 50 } });
    expect(w.attributes("role")).toBe("status");
    expect(w.text()).toContain("Loading");
    expect(w.find("[aria-hidden]").text()).toBe(BRAILLE_FRAMES[0]);
    await vi.advanceTimersByTimeAsync(55);
    expect(w.find("[aria-hidden]").text()).toBe(BRAILLE_FRAMES[1]);
    w.unmount();
  });
});

describe("NqDotMatrixFill", () => {
  it("is a progressbar with a value, and drops it when indeterminate", () => {
    const a = mount(NqDotMatrixFill, { props: { value: 50, cols: 4, rows: 2 } });
    expect(a.attributes("aria-valuenow")).toBe("50");
    expect(a.attributes("dir")).toBe("ltr");
    expect(a.findAll("[aria-hidden]").length).toBe(8);
    const b = mount(NqDotMatrixFill, { props: { value: null, cols: 4, rows: 2 } });
    expect(b.attributes("aria-valuenow")).toBeUndefined();
    a.unmount();
    b.unmount();
  });
});

describe("NqLogoLoader", () => {
  it("is a status ring until it has a value", () => {
    const spin = mount(NqLogoLoader);
    expect(spin.attributes("role")).toBe("status");
    expect(spin.attributes("data-variant")).toBe("ring");
    expect(spin.find("svg").classes()).toContain("motion-safe:animate-spin");
    const prog = mount(NqLogoLoader, { props: { value: 40 } });
    expect(prog.attributes("role")).toBe("progressbar");
    expect(prog.attributes("aria-valuenow")).toBe("40");
    expect(prog.find("svg").classes()).toContain("-rotate-90");
    const pulse = mount(NqLogoLoader, { props: { variant: "pulse" } });
    expect(pulse.find("circle").exists()).toBe(false);
  });
});

describe("NqBootSplash", () => {
  it("shows the stage and percent, then the slow line", async () => {
    const w = mount(NqBootSplash, { props: { stage: "Loading your workspace", progress: 40, slowAfterMs: 1000 } });
    expect(w.attributes("data-state")).toBe("loading");
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.text()).toContain("Loading your workspace");
    expect(w.text()).toContain("40%");
    expect(w.text()).not.toContain("taking longer");
    await vi.advanceTimersByTimeAsync(1100);
    expect(w.text()).toContain("taking longer");
    w.unmount();
  });

  it("failed state alerts with details and a retry only when listened to", async () => {
    const onRetry = vi.fn();
    const w = mount(NqBootSplash, { props: { state: "failed", error: { message: "Server down", detail: "req_1" }, onRetry } });
    expect(w.find('[role="alert"]').exists()).toBe(true);
    expect(w.text()).toContain("Server down");
    expect(w.find("code").text()).toBe("req_1");
    await w.find('button[data-slot="button"]').trigger("click");
    expect(onRetry).toHaveBeenCalledOnce();
    const bare = mount(NqBootSplash, { props: { state: "failed" } });
    expect(bare.find('button[data-slot="button"]').exists()).toBe(false);
    expect(bare.text()).toContain("Could not start");
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqBootSplash, { slowAfterMs: 0 })) });
    expect(w.text()).toContain("جارٍ تجهيز كل شيء");
  });
});
