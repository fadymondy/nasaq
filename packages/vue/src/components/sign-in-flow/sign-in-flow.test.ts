import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqSignInFlow } from ".";

const toPassword = async (w: ReturnType<typeof mount>) => {
  await w.find('input[name="email"]').setValue("sara@example.com");
  await w.find('[data-slot="sign-in-flow-email"]').trigger("submit");
  await flushPromises();
};

describe("NqSignInFlow", () => {
  it("starts on the email step", () => {
    const w = mount(NqSignInFlow, { props: { onPassword: async () => {} } });
    expect(w.attributes("data-slot")).toBe("sign-in-flow");
    expect(w.attributes("data-step")).toBe("email");
    expect(w.find('[data-slot="sign-in-flow-email"]').exists()).toBe(true);
    expect(w.find('input[name="email"]').attributes("dir")).toBe("ltr");
    expect(w.find('button[type="submit"]').text()).toBe("Continue");
  });

  it("validates the email before it moves on", async () => {
    const w = mount(NqSignInFlow, { props: { onPassword: async () => {} } });
    await w.find('[data-slot="sign-in-flow-email"]').trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Enter your email address.");
    await w.find('input[name="email"]').setValue("nope");
    await w.find('[data-slot="sign-in-flow-email"]').trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Enter a valid email address.");
    expect(w.attributes("data-step")).toBe("email");
  });

  it("goes to the password step and signs in", async () => {
    const onPassword = vi.fn().mockResolvedValue(undefined);
    const onStepChange = vi.fn();
    const w = mount(NqSignInFlow, { props: { onPassword, onStepChange }, slots: { forgotPassword: "<a href='/f'>Forgot?</a>" } });
    await toPassword(w);
    expect(w.attributes("data-step")).toBe("password");
    expect(onStepChange).toHaveBeenCalledWith("password", "sara@example.com");
    expect(w.find('[data-slot="sign-in-flow-identity"]').text()).toContain("sara@example.com");
    expect(w.text()).toContain("Forgot?");
    await w.find('[data-slot="sign-in-flow-password"]').trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Enter your password.");
    await w.find('input[name="password"]').setValue("secret");
    await w.find('[data-slot="sign-in-flow-password"]').trigger("submit");
    await flushPromises();
    expect(onPassword).toHaveBeenCalledWith({ email: "sara@example.com", password: "secret", remember: false });
  });

  it("follows the step the backend picks, and goes back with Change", async () => {
    const onIdentify = vi.fn().mockResolvedValue({ step: "sso", connection: "Acme Okta" });
    const w = mount(NqSignInFlow, { props: { onIdentify } });
    await toPassword(w);
    expect(w.attributes("data-step")).toBe("sso");
    expect(w.find('[data-slot="sign-in-flow-sso"]').text()).toContain("Continue with Acme Okta");
    const change = w.findAll("button").find((b) => b.text().includes("Change"))!;
    await change.trigger("click");
    expect(w.attributes("data-step")).toBe("email");
  });

  it("shows the register and blocked notices", async () => {
    const w = mount(NqSignInFlow, { props: { onIdentify: async () => ({ step: "register" as const }) } });
    await toPassword(w);
    expect(w.find('[data-slot="sign-in-flow-register"]').text()).toContain("No account uses this email");
    const b = mount(NqSignInFlow, { props: { onIdentify: async () => ({ step: "blocked" as const, message: "Suspended." }) } });
    await toPassword(b);
    expect(b.find('[data-slot="sign-in-flow-blocked"]').text()).toContain("Suspended.");
  });

  it("goes to the code step without a password handler and emails the code", async () => {
    const onRequestCode = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqSignInFlow, { props: { onRequestCode, onCode: async () => {} } });
    await toPassword(w);
    expect(onRequestCode).toHaveBeenCalledWith("sara@example.com");
    expect(w.attributes("data-step")).toBe("code");
  });

  it("opens the forgot-password request in place", async () => {
    const w = mount(NqSignInFlow, { props: { onPassword: async () => {}, onForgotPassword: async () => {} } });
    await toPassword(w);
    await w.find('[data-slot="sign-in-flow-forgot-link"]').trigger("click");
    expect(w.attributes("data-step")).toBe("forgot");
    expect(w.find('[data-slot="sign-in-flow-forgot"]').exists()).toBe(true);
  });
});
