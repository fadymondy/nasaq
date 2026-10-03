import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqRegisterForm } from ".";

const fill = async (w: ReturnType<typeof mount>, name: string, email: string, password: string, confirm: string) => {
  await w.find('input[name="name"]').setValue(name);
  await w.find('input[name="email"]').setValue(email);
  await w.find('input[name="password"]').setValue(password);
  await w.find('input[name="confirm"]').setValue(confirm);
};

describe("NqRegisterForm", () => {
  it("renders the fields, the hint, the terms slot and the submit button", () => {
    const w = mount(NqRegisterForm, { props: { onSubmit: async () => {} }, slots: { terms: "I agree to the <a href='/t'>Terms</a>" } });
    expect(w.attributes("data-slot")).toBe("register-form");
    expect(w.find('input[name="name"]').attributes("autocomplete")).toBe("name");
    expect(w.find('input[name="email"]').attributes("dir")).toBe("ltr");
    expect(w.find('input[name="password"]').attributes("autocomplete")).toBe("new-password");
    expect(w.text()).toContain("At least 8 characters.");
    expect(w.find("a[href='/t']").text()).toBe("Terms");
    expect(w.find('button[type="submit"]').text()).toBe("Create account");
  });

  it("validates every field before it calls onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqRegisterForm, { props: { onSubmit } });
    await w.trigger("submit");
    const summary = w.find('[data-slot="auth-error-summary"]').text();
    expect(summary).toContain("Full name: Enter your name.");
    expect(summary).toContain("Email: Enter your email address.");
    expect(summary).toContain("Password: Use at least 8 characters.");
    await fill(w, "Ada", "ada@example.com", "longenough1", "different1");
    await w.trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("The passwords do not match.");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Accept the terms to continue.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the values and shows a server field error", async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce({ fieldErrors: { email: "This email is already registered." } }).mockResolvedValueOnce(undefined);
    const w = mount(NqRegisterForm, { props: { onSubmit } });
    await fill(w, " Ada ", "ada@example.com", "longenough1", "longenough1");
    await w.find('[data-slot="checkbox"]').trigger("click");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com", password: "longenough1", acceptTerms: true });
    expect(w.find('[data-slot="field-error"]').text()).toBe("This email is already registered.");
    await w.trigger("submit");
    await flushPromises();
    expect(w.find('[data-slot="field-error"]').exists()).toBe(false);
  });

  it("can drop the terms checkbox and shows provider buttons", async () => {
    const onOAuth = vi.fn();
    const w = mount(NqRegisterForm, { props: { onSubmit: async () => {}, requireTerms: false, oauthProviders: ["google"], onOAuth } });
    expect(w.find('[data-slot="checkbox"]').exists()).toBe(false);
    expect(w.find('[data-slot="oauth-divider"]').text()).toBe("or sign up with email");
    await w.find('[data-provider="google"]').trigger("click");
    expect(onOAuth).toHaveBeenCalledWith("google");
  });
});
