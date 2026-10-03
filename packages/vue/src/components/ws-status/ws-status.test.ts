import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqWsStatus, backoffDelay, formatCountdown, formatLatency, latencyQuality, signalBars } from ".";

afterEach(() => vi.useRealTimers());

describe("ws-status helpers", () => {
  it("formats and grades", () => {
    expect(formatLatency(42)).toBe("42 ms");
    expect(formatLatency(1200)).toBe("1.2 s");
    expect(formatLatency(-1)).toBe("-");
    expect(latencyQuality(150)).toBe("good");
    expect(latencyQuality(400)).toBe("fair");
    expect(latencyQuality(401)).toBe("poor");
    expect(signalBars(undefined)).toBe(0);
    expect(backoffDelay(1)).toBe(1000);
    expect(backoffDelay(10)).toBe(30000);
    expect(formatCountdown(65)).toBe("1:05");
  });
});

describe("NqWsStatus", () => {
  it("badge: live state with latency", () => {
    const w = mount(NqWsStatus, { props: { state: "connected", latencyMs: 42 } });
    expect(w.attributes("data-slot")).toBe("ws-status");
    expect(w.attributes("data-state")).toBe("connected");
    expect(w.attributes("data-variant")).toBe("badge");
    expect(w.find('[role="status"]').text()).toBe("Live");
    expect(w.find('[data-slot="ws-latency"]').text()).toContain("42 ms");
    expect(w.find("button").exists()).toBe(false);
  });

  it("reconnecting counts down and retries", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const onRetry = vi.fn();
    const w = mount(NqWsStatus, { props: { state: "reconnecting", retryAt: Date.now() + 7000, onRetry, variant: "banner", attempt: 2 } });
    expect(w.find('[data-slot="ws-countdown"]').text()).toBe("Retrying in 0:07");
    expect(w.text()).toContain("Attempt 2");
    expect(w.text()).toContain("Data may be out of date.");
    await vi.advanceTimersByTimeAsync(2000);
    expect(w.find('[data-slot="ws-countdown"]').text()).toBe("Retrying in 0:05");
    await w.find("button").trigger("click");
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offline inline shows a retry link and Arabic words", () => {
    const w = mount({
      components: { NasaqProvider, NqWsStatus },
      setup: () => ({ r: () => {} }),
      template: `<NasaqProvider locale="ar" target="scope"><NqWsStatus state="offline" variant="inline" :on-retry="r" /></NasaqProvider>`,
    });
    expect(w.find('[role="status"]').text()).toBe("غير متصل");
    expect(w.find("button").text()).toBe("أعد المحاولة الآن");
  });
});
