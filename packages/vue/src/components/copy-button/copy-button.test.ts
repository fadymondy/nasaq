import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqCopyButton, NqCopyField, copyText } from ".";

afterEach(() => vi.restoreAllMocks());

function stubClipboard(impl: (t: string) => Promise<void>) {
  const writeText = vi.fn(impl);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

describe("NqCopyButton", () => {
  it("icon-only by default, named by label, copies and shows the copied state", async () => {
    const writeText = stubClipboard(async () => {});
    const w = mount(NqCopyButton, { props: { value: "sk-123" } });
    const btn = w.get('[data-slot="copy-button"]');
    expect(btn.attributes("aria-label")).toBe("Copy");
    expect(btn.classes()).toContain("size-control-sm");
    await btn.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("sk-123");
    expect(btn.attributes("data-copied")).toBeDefined();
    expect(w.get('[data-slot="copy-button-status"]').text()).toBe("Copied to clipboard");
    expect(w.emitted("copy")?.[0]).toEqual(["sk-123"]);
  });

  it("with text it drops the aria-label; value may be a function", async () => {
    const writeText = stubClipboard(async () => {});
    const w = mount(NqCopyButton, { props: { value: () => "late" }, slots: { default: "Copy link" } });
    const btn = w.get('[data-slot="copy-button"]');
    expect(btn.attributes("aria-label")).toBeUndefined();
    expect(btn.text()).toBe("Copy link");
    await btn.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("late");
  });

  it("reports failure", async () => {
    stubClipboard(async () => {
      throw new Error("no");
    });
    document.execCommand = vi.fn(() => false);
    const w = mount(NqCopyButton, { props: { value: "x" } });
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.get('[data-slot="copy-button-status"]').text()).toBe("Could not copy");
    expect(w.emitted("copyError")).toHaveLength(1);
    expect(await copyText("x")).toBe(false);
  });
});

describe("NqCopyField", () => {
  it("is a read-only left-to-right input with a copy button at the end", () => {
    const w = mount(NqCopyField, { props: { value: "https://nasaq.app/invite/9", label: "Invite link" } });
    expect(w.attributes("data-slot")).toBe("copy-field");
    const input = w.get("input");
    expect(input.attributes("readonly")).toBeDefined();
    expect(input.attributes("dir")).toBe("ltr");
    expect(input.attributes("aria-label")).toBe("Invite link");
    expect((input.element as HTMLInputElement).value).toBe("https://nasaq.app/invite/9");
    expect(w.get('[data-slot="input-group-addon"]').attributes("data-align")).toBe("end");
    expect(w.find('[data-slot="copy-button"]').exists()).toBe(true);
  });
});
