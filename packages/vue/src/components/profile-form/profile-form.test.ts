import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqProfileForm, type ProfileFormValues } from ".";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const VALUES: ProfileFormValues = { name: "Sara", username: "sara", email: "sara@x.com", phone: "", bio: "Hi", locale: "en", timezone: "Asia/Riyadh", location: "", website: "" };
const ZONES = [{ value: "Asia/Riyadh", label: "Riyadh (GMT+3)" }];

const type = async (w: ReturnType<typeof mount>, sel: string, value: string) => {
  const input = w.find(sel);
  (input.element as HTMLInputElement).value = value;
  await input.trigger("input");
};
const make = (props: Record<string, unknown> = {}) => mount(NqProfileForm, { props: { values: VALUES, timezones: ZONES, onSubmit: vi.fn().mockResolvedValue(undefined), ...props }, attachTo: document.body });

describe("NqProfileForm", () => {
  it("shows the sections and no save bar until something changes", () => {
    const w = make();
    expect(w.attributes("data-slot")).toBe("profile-form");
    expect(w.text()).toContain("Public profile");
    expect(w.text()).toContain("Preferences");
    expect(w.find('[data-slot="profile-form-savebar"]').exists()).toBe(false);
    w.unmount();
  });

  it("shows the bar when dirty, saves the trimmed name and then hides it", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = make({ onSubmit });
    await type(w, 'input[name="name"]', "  Sara H  ");
    expect(w.find('[data-slot="profile-form-savebar"]').exists()).toBe(true);
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit.mock.calls[0]![0].name).toBe("Sara H");
    expect(w.find('[data-slot="profile-form-savebar"]').exists()).toBe(false);
    expect(w.text()).toContain("Profile updated.");
    w.unmount();
  });

  it("discard restores the saved values", async () => {
    const w = make();
    await type(w, 'input[name="name"]', "Other");
    const buttons = w.find('[data-slot="profile-form-savebar"]').findAll("button");
    await buttons[0]!.trigger("click");
    expect((w.find('input[name="name"]').element as HTMLInputElement).value).toBe("Sara");
    expect(w.find('[data-slot="profile-form-savebar"]').exists()).toBe(false);
    w.unmount();
  });

  it("asks for a name and shows server field errors", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Nope", fieldErrors: { phone: "Bad number" } });
    const w = make({ onSubmit });
    await type(w, 'input[name="name"]', " ");
    await w.trigger("submit");
    expect(w.text()).toContain("Enter your name.");
    expect(onSubmit).not.toHaveBeenCalled();
    await type(w, 'input[name="name"]', "Sara B");
    await w.trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Nope");
    expect(w.text()).toContain("Bad number");
    w.unmount();
  });

  it("lowercases the username, checks it after a pause and blocks a taken one", async () => {
    vi.useFakeTimers();
    const checkUsername = vi.fn().mockResolvedValue(false);
    const w = make({ checkUsername });
    await type(w, 'input[name="username"]', "Sara_B!");
    expect((w.find('input[name="username"]').element as HTMLInputElement).value).toBe("sara_b");
    expect(w.text()).toContain("Checking availability");
    await vi.advanceTimersByTimeAsync(450);
    expect(checkUsername).toHaveBeenCalledWith("sara_b");
    expect(w.text()).toContain("That username is taken.");
    expect(w.find('[data-slot="profile-form-savebar"] button[type="submit"]').attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("flags a bad username format while typing and counts the bio", async () => {
    const w = make();
    await type(w, 'input[name="username"]', "a");
    expect(w.text()).toContain("Use 3 to 30 letters");
    await type(w, 'textarea[name="bio"]', "Hello");
    expect(w.find('[data-slot="profile-form-counter"]').text()).toBe("5/160");
    w.unmount();
  });

  it("validates the website only after a save attempt", async () => {
    const onSubmit = vi.fn();
    const w = make({ onSubmit });
    await type(w, 'input[name="website"]', "nope");
    expect(w.text()).not.toContain("Enter a full link");
    await w.trigger("submit");
    expect(w.text()).toContain("Enter a full link");
    expect(onSubmit).not.toHaveBeenCalled();
    w.unmount();
  });

  it("resends the verification email once and then waits", async () => {
    const onResendVerification = vi.fn().mockResolvedValue(undefined);
    const w = make({ emailVerified: false, onResendVerification });
    expect(w.text()).toContain("Not verified");
    const resend = w.findAll("button").find((b) => b.text() === "Resend verification email")!;
    await resend.trigger("click");
    await flushPromises();
    expect(onResendVerification).toHaveBeenCalledTimes(1);
    expect(w.text()).toContain("Verification email sent to");
    expect(w.findAll("button").find((b) => b.text() === "Resend verification email")!.attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("changes the email through the dialog and shows the pending notice", async () => {
    const onChangeEmail = vi.fn().mockResolvedValue(undefined);
    const w = make({ emailVerified: true, onChangeEmail });
    await w.findAll("button").find((b) => b.text() === "Change email")!.trigger("click");
    await flushPromises();
    const dlg = document.body.querySelector("form[novalidate].grid") as HTMLFormElement;
    expect(dlg).not.toBeNull();
    const set = (name: string, v: string) => {
      const el = dlg.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set("new-email", "sara@x.com");
    set("current-password", "pw");
    dlg.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(dlg.textContent).toContain("That is already your email.");
    set("new-email", "new@x.com");
    dlg.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onChangeEmail).toHaveBeenCalledWith({ email: "new@x.com", password: "pw" });
    expect(w.text()).toContain("new@x.com");
    w.unmount();
  });

  it("speaks Arabic with Western digits in the counter", async () => {
    document.documentElement.lang = "ar";
    const w = make();
    expect(w.text()).toContain("الملف العام");
    expect(w.find('[data-slot="profile-form-counter"]').text()).toBe("2/160");
    w.unmount();
  });
});
