import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NqForgotPasswordForm } from ".";

describe("NqForgotPasswordForm", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("renders the idle form", () => {
    const w = mount(NqForgotPasswordForm, { props: { onSubmit: async () => {} } });
    expect(w.attributes("data-slot")).toBe("forgot-password-form");
    expect(w.attributes("data-state")).toBe("idle");
    expect(w.find('input[name="email"]').attributes("dir")).toBe("ltr");
    expect(w.find('input[name="email"]').attributes("autocomplete")).toBe("email");
    expect(w.find('button[type="submit"]').text()).toBe("Send reset link");
  });

  it("validates the email without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqForgotPasswordForm, { props: { onSubmit } });
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Email: Enter your email address.");
    await w.find('input[name="email"]').setValue("nope");
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Enter a valid email address.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the server error and stays on the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Too many requests." });
    const w = mount(NqForgotPasswordForm, { props: { onSubmit } });
    await w.find('input[name="email"]').setValue("ada@example.com");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Too many requests.");
    expect(w.attributes("data-state")).toBe("idle");
  });

  it("shows the sent panel, counts down, resends through onResend and goes back", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onResend = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqForgotPasswordForm, { props: { onSubmit, onResend, resendSeconds: 2 } });
    await w.find('input[name="email"]').setValue(" ada@example.com ");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(w.attributes("data-state")).toBe("sent");
    expect(w.find("h2").text()).toBe("Check your inbox");
    expect(w.find("p bdi").text()).toBe("ada@example.com");
    const resend = w.find('[data-slot="forgot-password-resend"]');
    expect(resend.text()).toBe("Resend in 0:02");
    expect(resend.attributes("disabled")).toBeDefined();
    vi.advanceTimersByTime(2100);
    await flushPromises();
    expect(w.find('[data-slot="forgot-password-resend"]').text()).toBe("Resend email");
    await w.find('[data-slot="forgot-password-resend"]').trigger("click");
    await flushPromises();
    expect(onResend).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(w.find('[data-slot="forgot-password-resend"]').text()).toContain("Resend in");
    await w.findAll("button").find((b) => b.text() === "Use a different email")!.trigger("click");
    expect(w.attributes("data-state")).toBe("idle");
  });
});
