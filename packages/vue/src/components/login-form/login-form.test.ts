import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NqLoginForm } from ".";

const fill = async (w: ReturnType<typeof mount>, email: string, password: string) => {
  await w.find('input[name="email"]').setValue(email);
  if (password) await w.find('input[name="password"]').setValue(password);
};

describe("NqLoginForm", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("renders the fields, remember me, the submit button and the forgot link slot", () => {
    const w = mount(NqLoginForm, { props: { onSubmit: async () => {} }, slots: { forgotPassword: "<a href='/f'>Forgot?</a>" } });
    expect(w.attributes("data-slot")).toBe("login-form");
    expect(w.attributes("data-state")).toBe("idle");
    expect(w.attributes("novalidate")).toBeDefined();
    expect(w.find('input[name="email"]').attributes("autocomplete")).toBe("username");
    expect(w.find('input[name="email"]').attributes("dir")).toBe("ltr");
    expect(w.find('input[name="password"]').attributes("autocomplete")).toBe("current-password");
    expect(w.text()).toContain("Remember me");
    expect(w.text()).toContain("Forgot?");
    expect(w.find('button[type="submit"]').text()).toBe("Sign in");
  });

  it("validates without calling onSubmit and lists the problems", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqLoginForm, { props: { onSubmit } });
    await w.trigger("submit");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Email: Enter your email address.");
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Password: Enter your password.");
    await fill(w, "nope", "pw");
    await w.trigger("submit");
    expect(w.text()).toContain("Enter a valid email address.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed values and shows a server error", async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce({ error: "Incorrect email or password." }).mockRejectedValueOnce(new Error("x"));
    const w = mount(NqLoginForm, { props: { onSubmit } });
    await fill(w, " ada@example.com ", "secret");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.com", password: "secret", remember: false });
    expect(w.find('[data-slot="auth-error-summary"]').text()).toContain("Incorrect email or password.");
    await w.trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Something went wrong. Try again.");
  });

  it("offers a magic link, shows the sent panel with a resend timer and goes back", async () => {
    const onMagicLink = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqLoginForm, { props: { onSubmit: async () => {}, onMagicLink, magicLinkSeconds: 30 } });
    await fill(w, "ada@example.com", "");
    await w.find('[data-slot="login-form-magic-link"]').trigger("click");
    await flushPromises();
    expect(onMagicLink).toHaveBeenCalledWith({ email: "ada@example.com" });
    expect(w.attributes("data-state")).toBe("sent");
    expect(w.find("h2").text()).toBe("Check your email");
    expect(w.find("bdi").text()).toBe("ada@example.com");
    const resend = w.find('[data-slot="login-form-resend"]');
    expect(resend.attributes("disabled")).toBeDefined();
    expect(resend.text()).toBe("Send again in 0:30");
    vi.advanceTimersByTime(31000);
    await flushPromises();
    expect(w.find('[data-slot="login-form-resend"]').text()).toBe("Send the link again");
    await w.findAll("button").find((b) => b.text() === "Use a different email")!.trigger("click");
    expect(w.attributes("data-state")).toBe("idle");
  });

  it("magic-link only drops the password, and an empty methods list shows the notice", async () => {
    const onMagicLink = vi.fn();
    const only = mount(NqLoginForm, { props: { onSubmit: async () => {}, onMagicLink, methods: ["magic-link"] } });
    expect(only.find('input[name="password"]').exists()).toBe(false);
    expect(only.find('button[type="submit"]').text()).toBe("Email me a sign-in link");
    const none = mount(NqLoginForm, { props: { onSubmit: async () => {}, methods: [] } });
    expect(none.attributes("data-state")).toBe("blocked");
    expect(none.text()).toContain("Sign-in is not available");
    expect(none.find("input").exists()).toBe(false);
  });

  it("calls the dev login and shows its failure", async () => {
    const onDevLogin = vi.fn().mockResolvedValue({ error: "No dev user." });
    const w = mount(NqLoginForm, { props: { onSubmit: async () => {}, onDevLogin } });
    await w.find('[data-slot="login-form-dev"]').trigger("click");
    await flushPromises();
    expect(onDevLogin).toHaveBeenCalled();
    expect(w.text()).toContain("No dev user.");
  });

  it("shows the provider buttons and forwards the id", async () => {
    const onOAuth = vi.fn();
    const w = mount(NqLoginForm, { props: { onSubmit: async () => {}, oauthProviders: ["google", "github"], onOAuth } });
    expect(w.findAll('[data-slot="oauth-button"]')).toHaveLength(2);
    expect(w.find('[data-slot="oauth-divider"]').text()).toBe("or");
    await w.find('[data-provider="github"]').trigger("click");
    expect(onOAuth).toHaveBeenCalledWith("github");
  });
});
