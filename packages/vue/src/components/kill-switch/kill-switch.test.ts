import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqKillSwitch, NqPausedBanner } from ".";

const paused = { by: "Sara Ali", at: Date.now() - 60_000, reason: "Bad deploy" };
const noop = vi.fn().mockResolvedValue(undefined);

describe("NqPausedBanner", () => {
  it("is a pinned status region with who and why", () => {
    const w = mount(NqPausedBanner, { props: { paused } });
    expect(w.attributes("role")).toBe("status");
    expect(w.attributes("data-slot")).toBe("paused-banner");
    expect(w.classes()).toContain("sticky");
    expect(w.text()).toContain("Automations are paused");
    expect(w.text()).toContain("Paused by Sara Ali");
    expect(w.text()).toContain("Bad deploy");
    expect(w.find("button").exists()).toBe(false);
  });

  it("shows the message when onResume rejects", async () => {
    const onResume = vi.fn().mockRejectedValue(new Error("no"));
    const w = mount(NqPausedBanner, { props: { paused, onResume } });
    await w.find("button").trigger("click");
    await vi.waitFor(() => expect(w.find('[role="alert"]').exists()).toBe(true));
    expect(w.find('[role="alert"]').text()).toBe("Could not complete this. Try again.");
    await nextTick();
  });
});

describe("NqKillSwitch", () => {
  it("shows the running state with the stop button", () => {
    const w = mount(NqKillSwitch, { props: { paused: null, activeCount: 14, onStopAll: noop, onResume: noop } });
    expect(w.attributes("data-slot")).toBe("kill-switch");
    expect(w.attributes("data-paused")).toBe("false");
    expect(w.text()).toContain("Automations are running");
    expect(w.text()).toContain("14 automations are active");
    expect(w.findAll("button").some((b) => b.text() === "Stop all automations")).toBe(true);
  });

  it("shows the pause details when paused", () => {
    const w = mount(NqKillSwitch, { props: { paused, onStopAll: noop, onResume: noop } });
    expect(w.attributes("data-paused")).toBe("true");
    expect(w.text()).toContain("All automations are paused");
    expect(w.text()).toContain("Reason: Bad deploy");
  });

  it("lists browsers and hides unpair on the current one", () => {
    const browsers = [
      { id: "1", name: "Chrome", online: true, current: true },
      { id: "2", name: "Edge", online: false },
    ];
    const w = mount(NqKillSwitch, { props: { paused: null, onStopAll: noop, onResume: noop, browsers, onUnpairBrowser: noop } });
    expect(w.text()).toContain("This browser");
    expect(w.findAll("button").filter((b) => b.attributes("aria-label")?.startsWith("Unpair"))).toHaveLength(1);
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqKillSwitch },
      setup: () => ({ noop }),
      template: '<NasaqProvider locale="ar"><NqKillSwitch :paused="null" :on-stop-all="noop" :on-resume="noop" /></NasaqProvider>',
    });
    expect(w.text()).toContain("الإيقاف الطارئ");
  });
});
