import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqChangePasswordForm } from ".";

const fill = async (w: ReturnType<typeof mount>, c: string, n: string, k: string) => {
  await w.find('input[name="currentPassword"]').setValue(c);
  await w.find('input[name="newPassword"]').setValue(n);
  await w.find('input[name="confirmPassword"]').setValue(k);
};

describe("NqChangePasswordForm", () => {
  it("renders the three fields with autocomplete, the hint, checkbox and submit", () => {
    const w = mount(NqChangePasswordForm, { props: { onSubmit: async () => {} } });
    expect(w.attributes("data-slot")).toBe("change-password-form");
    expect(w.attributes("novalidate")).toBeDefined();
    expect(w.find('input[name="currentPassword"]').attributes("autocomplete")).toBe("current-password");
    expect(w.find('input[name="newPassword"]').attributes("autocomplete")).toBe("new-password");
    expect(w.find('input[name="confirmPassword"]').attributes("autocomplete")).toBe("new-password");
    expect(w.text()).toContain("At least 8 characters.");
    expect(w.text()).toContain("Sign out of all other sessions");
    expect(w.find('button[type="submit"]').text()).toBe("Change password");
  });

  it("validates required, length, same and mismatch without calling onSubmit", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqChangePasswordForm, { props: { onSubmit } });
    await w.trigger("submit");
    expect(w.findAll('[data-slot="field-error"]')).toHaveLength(3);
    await fill(w, "oldpassword", "short", "short");
    await w.trigger("submit");
    expect(w.text()).toContain("Use at least 8 characters.");
    await fill(w, "oldpassword", "oldpassword", "oldpassword");
    await w.trigger("submit");
    expect(w.text()).toContain("Choose a password different from your current one.");
    await fill(w, "oldpassword", "newpassword1", "newpassword2");
    await w.trigger("submit");
    expect(w.text()).toContain("The passwords do not match.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the values, clears the fields and shows success", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqChangePasswordForm, { props: { onSubmit, defaultSignOutOthers: false } });
    await fill(w, "oldpassword", "newpassword1", "newpassword1");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ currentPassword: "oldpassword", newPassword: "newpassword1", signOutOthers: false });
    expect(w.find('[data-slot="alert"]').text()).toBe("Your password was changed.");
    expect((w.find('input[name="currentPassword"]').element as HTMLInputElement).value).toBe("");
  });

  it("shows server field errors and the generic error on a throw", async () => {
    const onSubmit = vi.fn().mockResolvedValueOnce({ fieldErrors: { currentPassword: "Wrong password." } }).mockRejectedValueOnce(new Error("x"));
    const w = mount(NqChangePasswordForm, { props: { onSubmit } });
    await fill(w, "oldpassword", "newpassword1", "newpassword1");
    await w.trigger("submit");
    await flushPromises();
    expect(w.find('[data-slot="field-error"]').text()).toBe("Wrong password.");
    await w.trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Could not change your password. Try again.");
  });

  it("can hide the sign-out-others checkbox and reports it as false", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqChangePasswordForm, { props: { onSubmit, showSignOutOthers: false } });
    expect(w.text()).not.toContain("Sign out of all other sessions");
    await fill(w, "oldpassword", "newpassword1", "newpassword1");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit.mock.calls[0]![0].signOutOthers).toBe(false);
  });
});
