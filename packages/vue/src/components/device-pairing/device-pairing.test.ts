import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqDeviceApproval, NqDeviceCodeDisplay, NqDeviceCodeEntry, NqDeviceHandoff, formatUserCode, normalizeUserCode } from ".";

const request = { code: "WDJBMJHT", client: "Mahaam Desktop", deviceName: "MacBook", ip: "203.0.113.7", scopes: ["Read projects"] };

describe("device code helpers", () => {
  it("normalises and groups", () => {
    expect(normalizeUserCode("wdjb mjht")).toBe("WDJBMJHT");
    expect(formatUserCode("wdjbmjht")).toBe("WDJB-MJHT");
  });
});

describe("NqDeviceCodeEntry", () => {
  it("validates, then submits the normalised code", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqDeviceCodeEntry, { props: { onSubmit, defaultCode: "wdjb-mjht" } });
    expect(w.attributes("data-slot")).toBe("device-code-entry");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith("WDJBMJHT");
  });
  it("shows an error for an incomplete code", async () => {
    const w = mount(NqDeviceCodeEntry, { props: { onSubmit: async () => {}, defaultCode: "WDJ" } });
    await w.trigger("submit");
    await flushPromises();
    expect(w.find('p[role="alert"]').text()).toBe("Enter all 8 characters.");
  });
});

describe("NqDeviceApproval", () => {
  it("shows the code and decides", async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqDeviceApproval, { props: { request, onApprove, onDeny: async () => {} } });
    expect(w.attributes("data-status")).toBe("pending");
    expect(w.find('[data-slot="device-code"]').text()).toBe("WDJB-MJHT");
    expect(w.text()).toContain("203.0.113.7");
    const approve = w.findAll("button").find((b) => b.text() === "Approve")!;
    await approve.trigger("click");
    await flushPromises();
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
  it("shows an error from the host", async () => {
    const w = mount(NqDeviceApproval, { props: { request, onApprove: async () => ({ error: "Nope" }), onDeny: async () => {} } });
    await w.findAll("button").find((b) => b.text() === "Approve")!.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Nope");
  });
  it("reads an expired code as expired", () => {
    const w = mount(NqDeviceApproval, { props: { request, expiresAt: Date.now() - 1000, onApprove: async () => {}, onDeny: async () => {}, onEnterAnother: () => {} } });
    expect(w.attributes("data-status")).toBe("expired");
    expect(w.text()).toContain("Enter another code");
  });
});

describe("NqDeviceCodeDisplay", () => {
  it("shows the grouped code and a waiting state", () => {
    const w = mount(NqDeviceCodeDisplay, { props: { code: "WDJBMJHT", verificationUri: "https://nasaq.app/device" } });
    expect(w.attributes("data-status")).toBe("pending");
    expect(w.find('[data-slot="device-code"]').text()).toBe("WDJB-MJHT");
    expect(w.text()).toContain("Waiting for approval");
  });
  it("offers a refresh when expired", async () => {
    const onRefresh = vi.fn();
    const w = mount(NqDeviceCodeDisplay, { props: { code: "WDJBMJHT", verificationUri: "https://x.test", status: "expired", onRefresh } });
    await w.findAll("button").find((b) => b.text() === "Get a new code")!.trigger("click");
    expect(onRefresh).toHaveBeenCalled();
  });
});

describe("NqDeviceHandoff", () => {
  it("links to the deep link and shows the fallback code", () => {
    const w = mount(NqDeviceHandoff, { props: { appName: "Mahaam Desktop", href: "mahaam://auth", fallbackCode: "WDJBMJHT" } });
    expect(w.attributes("data-state")).toBe("opening");
    expect(w.find("a").attributes("href")).toBe("mahaam://auth");
    expect(w.find("h1").text()).toBe("Open Mahaam Desktop");
    expect(w.text()).toContain("WDJB-MJHT");
  });
});
