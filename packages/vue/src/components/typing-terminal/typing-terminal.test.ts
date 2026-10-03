import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NqTypingTerminal } from ".";

const steps = [
  { cmd: "npm i", out: ["\u001b[32m✓\u001b[0m done", "ready"] },
  { cmd: "togo dev", out: ["listening"] },
];

describe("NqTypingTerminal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "webdriver", { value: false, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it("renders the finished transcript first, with an sr-only copy of it", () => {
    const w = mount(NqTypingTerminal, { props: { steps, play: false } });
    expect(w.attributes("data-slot")).toBe("typing-terminal");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.find("pre.sr-only").text()).toContain("❯ npm i");
    expect(w.find("pre.sr-only").text()).toContain("✓ done");
    expect(w.findAll('[data-kind="command"]')).toHaveLength(2);
    expect(w.findAll('[data-kind="output"]')).toHaveLength(3);
    expect(w.find('[data-slot="typing-terminal-header"]').text()).toContain("Terminal");
    expect(w.text()).not.toContain("Replay");
  });

  it("types, prints and then offers Replay and emits complete", async () => {
    const w = mount(NqTypingTerminal, { props: { steps, typeMs: 10, lineMs: 10 } });
    await nextTick();
    expect(w.attributes("data-playing")).toBeDefined();
    await vi.advanceTimersByTimeAsync(40);
    expect(w.find('[data-kind="command"]').text()).toMatch(/^❯ n/);
    await vi.advanceTimersByTimeAsync(5000);
    expect(w.attributes("data-playing")).toBeUndefined();
    expect(w.emitted("complete")).toHaveLength(1);
    expect(w.findAll('[data-kind="output"]')).toHaveLength(3);
    expect(w.text()).toContain("Replay");
    await w.find("button").trigger("click");
    await vi.advanceTimersByTimeAsync(10);
    expect(w.attributes("data-playing")).toBeDefined();
  });

  it("shows the end slot when the playback ended", () => {
    const w = mount(NqTypingTerminal, { props: { steps, play: false }, slots: { end: "<b>Done</b>" } });
    expect(w.find('[data-slot="typing-terminal-end"]').text()).toBe("Done");
  });
});
