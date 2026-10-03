import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NqVerifyOtpForm, maskDestination } from ".";

describe("NqVerifyOtpForm", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("masks the destination and renders the boxes", () => {
    const w = mount(NqVerifyOtpForm, { props: { destination: "fady@example.com", onSubmit: async () => {} } });
    expect(w.attributes("data-slot")).toBe("verify-otp-form");
    expect(w.find("bdi").text()).toBe("f•••y@example.com");
    expect(w.findAll('[data-slot="otp-input-box"]')).toHaveLength(6);
    expect(w.find('[data-slot="verify-otp-resend"]').exists()).toBe(false);
    expect(maskDestination("+966501234567", "sms")).toBe("••••••••••67");
  });

  it("asks for every digit when submitted early", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqVerifyOtpForm, { props: { destination: "a@b.co", onSubmit } });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Enter all 6 digits.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on the last digit and clears the code on a wrong one", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "That code is not right." });
    const w = mount(NqVerifyOtpForm, { props: { destination: "a@b.co", onSubmit }, attachTo: document.body });
    const first = w.find('[data-slot="otp-input-box"]');
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(paste, "clipboardData", { value: { getData: () => "999999" } });
    first.element.dispatchEvent(paste);
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ code: "999999" });
    expect(w.find('[role="alert"]').text()).toBe("That code is not right.");
    expect((w.find('[data-slot="otp-input-box"]').element as HTMLInputElement).value).toBe("");
    w.unmount();
  });

  it("counts down before resend, then resends and restarts", async () => {
    const onResend = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqVerifyOtpForm, { props: { destination: "a@b.co", onSubmit: async () => {}, onResend, resendSeconds: 3 } });
    const btn = () => w.find('[data-slot="verify-otp-resend"]');
    expect(btn().text()).toContain("Resend in 0:03");
    expect(btn().attributes("disabled")).toBeDefined();
    await vi.advanceTimersByTimeAsync(3100);
    expect(btn().text()).toBe("Resend code");
    await btn().trigger("click");
    await flushPromises();
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(w.find('span[role="status"]').text()).toBe("We sent a new code.");
    expect(btn().text()).toContain("Resend in");
  });
});
