import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqResetPasswordForm } from ".";

const STRONG = "Correct-Horse-9!";
const fill = async (w: ReturnType<typeof mount>, password: string, confirm: string) => {
  await w.find('input[name="password"]').setValue(password);
  await w.find('input[name="confirm"]').setValue(confirm);
};

describe("NqResetPasswordForm", () => {
  it("renders the idle form with the hint when there is no checklist", () => {
    const w = mount(NqResetPasswordForm, { props: { onSubmit: async () => {} } });
    expect(w.attributes("data-slot")).toBe("reset-password-form");
    expect(w.attributes("data-state")).toBe("idle");
    expect(w.find('input[name="password"]').attributes("autocomplete")).toBe("new-password");
    expect(w.text()).toContain("At least 8 characters.");
    expect(w.find('[data-slot="password-input-rules"]').exists()).toBe(false);
    expect(w.find('button[type="submit"]').text()).toBe("Reset password");
  });

  it("validates length and confirmation before onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqResetPasswordForm, { props: { onSubmit } });
    await fill(w, "short", "short");
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("New password: Use at least 8 characters.");
    await fill(w, "long-enough-1", "different");
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Confirm new password: The passwords do not match.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires every rule when rules is on", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqResetPasswordForm, { props: { onSubmit, rules: true } });
    expect(w.findAll('[data-slot="password-input-rules"] li')).toHaveLength(5);
    await fill(w, "alllowercaseletters", "alllowercaseletters");
    await w.find("form").trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Meet every requirement below.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows Password changed and a sign-in link", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqResetPasswordForm, { props: { onSubmit, rules: true, signIn: "/login", requestLink: "/forgot-password" } });
    await fill(w, STRONG, STRONG);
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ password: STRONG });
    expect(w.attributes("data-state")).toBe("success");
    expect(w.find("h2").text()).toBe("Password changed");
    expect(w.find('a[href="/login"]').text()).toBe("Sign in");
    expect(w.find('a[href="/forgot-password"]').exists()).toBe(false);
  });

  it("shows the expired state and calls a handler target", async () => {
    const requestLink = vi.fn();
    const w = mount(NqResetPasswordForm, { props: { onSubmit: async () => ({ expired: true as const }), requestLink } });
    await fill(w, "long-enough-1", "long-enough-1");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.attributes("data-state")).toBe("expired");
    expect(w.find("h2").text()).toBe("This link has expired");
    await w.find("button").trigger("click");
    expect(requestLink).toHaveBeenCalled();
  });

  it("can start expired and shows a server error otherwise", async () => {
    const w = mount(NqResetPasswordForm, { props: { onSubmit: async () => {}, defaultState: "expired" } });
    expect(w.attributes("data-state")).toBe("expired");
    const w2 = mount(NqResetPasswordForm, { props: { onSubmit: async () => ({ error: "Token rejected." }) } });
    await fill(w2, "long-enough-1", "long-enough-1");
    await w2.find("form").trigger("submit");
    await flushPromises();
    expect(w2.find('[data-slot="auth-error-summary"]').text()).toContain("Token rejected.");
    expect(w2.attributes("data-state")).toBe("idle");
  });
});
