import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqSessionExpired } from ".";

const user = { name: "Sara Nasser", email: "sara@example.com" };

describe("NqSessionExpired", () => {
  it("renders the notice, the person and the password field", () => {
    const w = mount(NqSessionExpired, { props: { user, keepsWork: true, onSubmit: async () => {} } });
    expect(w.element.tagName).toBe("FORM");
    expect(w.attributes("data-slot")).toBe("session-expired");
    expect(w.attributes("data-reason")).toBe("expired");
    expect(w.find('[data-slot="alert"]').text()).toContain("Your session expired");
    expect(w.text()).toContain("Your unsaved changes are kept in this tab.");
    expect(w.find('[data-slot="session-expired-user"]').text()).toContain("sara@example.com");
    expect(w.find('input[name="password"]').attributes("autocomplete")).toBe("current-password");
    expect(w.find('input[name="username"]').attributes("hidden")).toBeDefined();
    expect(w.find('button[type="submit"]').text()).toBe("Sign in again");
  });

  it("changes the notice by reason", () => {
    const w = mount(NqSessionExpired, { props: { user, reason: "revoked", onSubmit: async () => {} } });
    expect(w.attributes("data-reason")).toBe("revoked");
    expect(w.find('[data-slot="alert"]').text()).toContain("You were signed out");
  });

  it("validates, then submits the password", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqSessionExpired, { props: { user, onSubmit } });
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Enter your password.");
    expect(onSubmit).not.toHaveBeenCalled();
    await w.find('input[name="password"]').setValue("secret");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ password: "secret", code: undefined });
  });

  it("asks for a 6-digit code when requireCode is on and shows a server error", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Wrong password." });
    const w = mount(NqSessionExpired, { props: { user, requireCode: true, onSubmit } });
    expect(w.findAll('[data-slot="otp-input"] input').length).toBeGreaterThan(0);
    await w.find('input[name="password"]').setValue("secret");
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Enter all 6 digits");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the server error, sign out and switch account", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Wrong password." });
    const onSignOut = vi.fn();
    const onSwitchAccount = vi.fn();
    const w = mount(NqSessionExpired, { props: { user, onSubmit, onSignOut, onSwitchAccount } });
    await w.find('input[name="password"]').setValue("x");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Wrong password.");
    const out = w.findAll("button").find((b) => b.text() === "Sign out")!;
    await out.trigger("click");
    expect(onSignOut).toHaveBeenCalled();
    await w.findAll("button").find((b) => b.text() === "Use a different account")!.trigger("click");
    expect(onSwitchAccount).toHaveBeenCalled();
  });
});
