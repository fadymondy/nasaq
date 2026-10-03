import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NqWhatsappQrConnect } from ".";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("NqWhatsappQrConnect", () => {
  it("disconnected: a start button runs onStart", async () => {
    const onStart = vi.fn(async () => {});
    const w = mount(NqWhatsappQrConnect, { props: { status: "disconnected", onStart } });
    expect(w.attributes("data-status")).toBe("disconnected");
    expect(w.text()).toContain("Not connected");
    await w.findAll("button").find((b) => b.text() === "Show QR code")!.trigger("click");
    expect(onStart).toHaveBeenCalled();
  });

  it("qr: draws the code, counts down, and refreshes once on expiry", async () => {
    let now = 1_000_000;
    const onRefresh = vi.fn(async () => {});
    const w = mount(NqWhatsappQrConnect, { props: { status: "qr", qr: "2@abc", expiresAt: now + 2000, onRefresh, now: () => now } });
    expect(w.find('[data-slot="qr-code"]').exists()).toBe(true);
    expect(w.get('[data-slot="whatsapp-countdown"]').text()).toBe("Code expires in 2s");
    now += 1000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.get('[data-slot="whatsapp-countdown"]').text()).toBe("Code expires in 1s");
    now += 1000;
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(w.get('[data-slot="whatsapp-countdown"]').text()).toBe("This code expired");
    w.unmount();
  });

  it("connected shows the account LTR and confirms before disconnecting; error shows a retry", async () => {
    const onDisconnect = vi.fn(async () => {});
    const w = mount(NqWhatsappQrConnect, { props: { status: "connected", account: "+20 100 000 0000", connectedSince: "May 1", onDisconnect }, attachTo: document.body });
    expect(w.get("bdi").attributes("dir")).toBe("ltr");
    expect(w.text()).toContain("Since May 1");
    expect(onDisconnect).not.toHaveBeenCalled();
    w.unmount();
    const e = mount(NqWhatsappQrConnect, { props: { status: "disconnected", error: true, onStart: async () => {} } });
    expect(e.get('[role="alert"]').text()).toContain("Could not get a code");
    expect(e.findAll("button").some((b) => b.text() === "Try again")).toBe(true);
  });
});
