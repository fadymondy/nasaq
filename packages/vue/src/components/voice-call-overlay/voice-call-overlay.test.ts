import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqVoiceCallOverlay, NqVoiceVisualizer, formatVoiceCallTime, voiceCallWords } from ".";


const agent = { name: "Nasaq assistant", subtitle: "Support" };
const base = { state: "listening" as const, agent, onEnd: () => {}, contained: true };

describe("NqVoiceCallOverlay", () => {
  it("renders a dialog labelled with the agent", () => {
    const w = mount(NqVoiceCallOverlay, { props: base });
    const root = w.get("[data-slot=voice-call-overlay]");
    expect(root.attributes("role")).toBe("dialog");
    expect(root.attributes("aria-label")).toContain("Nasaq assistant");
    expect(root.attributes("aria-modal")).toBeUndefined();
    expect(root.attributes("data-state")).toBe("listening");
  });

  it("formats the elapsed time", () => {
    expect(formatVoiceCallTime(65)).toBe("1:05");
    const w = mount(NqVoiceCallOverlay, { props: { ...base, elapsed: 65 } });
    expect(w.text()).toContain("1:05");
  });

  it("emits update:muted from the mute button", async () => {
    const w = mount(NqVoiceCallOverlay, { props: base });
    await w.get("button[aria-pressed=false]").trigger("click");
    expect(w.emitted("update:muted")?.[0]).toEqual([true]);
  });

  it("calls onEnd from the hang-up button", async () => {
    const onEnd = vi.fn();
    const w = mount(NqVoiceCallOverlay, { props: { ...base, onEnd } });
    const buttons = w.findAll("button");
    await buttons[buttons.length - 1]!.trigger("click");
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("shows only the last caption lines and toggles captions", async () => {
    const captions = [1, 2, 3, 4].map((n) => ({ id: String(n), role: "agent" as const, text: `line ${n}` }));
    const w = mount(NqVoiceCallOverlay, { props: { ...base, captions } });
    expect(w.text()).not.toContain("line 1");
    expect(w.text()).toContain("line 4");
    await w.findAll("button")[1]!.trigger("click");
    expect(w.find("[role=log]").exists()).toBe(false);
    expect(w.emitted("update:showCaptions")?.[0]).toEqual([false]);
  });

  it("shows the error and a retry button", async () => {
    const onRetry = vi.fn();
    const w = mount(NqVoiceCallOverlay, { props: { ...base, state: "error", error: "Lost connection", onRetry } });
    expect(w.text()).toContain("Lost connection");
    await w.findAll("button")[0]!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows the interrupt button while speaking", () => {
    const w = mount(NqVoiceCallOverlay, { props: { ...base, state: "speaking", onInterrupt: () => {} } });
    expect(w.text()).toContain(voiceCallWords("en").interrupt);
  });

  it("uses Arabic labels in an Arabic provider", () => {
    const w = mount(NasaqProvider, { props: { locale: "ar" }, slots: { default: () => [] } });
    expect(voiceCallWords("ar").end).not.toBe(voiceCallWords("en").end);
    w.unmount();
  });
});

describe("NqVoiceVisualizer", () => {
  it("is a meter with one element per bar", () => {
    const w = mount(NqVoiceVisualizer, { props: { state: "speaking", level: 0.5, bars: 9 } });
    const root = w.get("[data-slot=voice-visualizer]");
    expect(root.attributes("role")).toBe("meter");
    expect(root.attributes("aria-valuenow")).toBe("50");
    expect(root.findAll("span").length).toBe(9);
  });

  it("reads zero when muted", () => {
    const w = mount(NqVoiceVisualizer, { props: { state: "listening", level: 0.8, muted: true } });
    expect(w.get("[role=meter]").attributes("aria-valuenow")).toBe("0");
  });
});
