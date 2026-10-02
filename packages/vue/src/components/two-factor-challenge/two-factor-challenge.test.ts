import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqTwoFactorChallenge } from ".";

const paste = (w: ReturnType<typeof mount>, code: string) => {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: { getData: () => code } });
  w.find('[data-slot="otp-input-box"]').element.dispatchEvent(event);
};

describe("NqTwoFactorChallenge", () => {
  it("renders the authenticator step", () => {
    const w = mount(NqTwoFactorChallenge, { props: { onSubmit: async () => {} } });
    expect(w.attributes("data-slot")).toBe("two-factor-challenge");
    expect(w.attributes("data-method")).toBe("totp");
    expect(w.findAll('[data-slot="otp-input-box"]')).toHaveLength(6);
    expect(w.text()).toContain("Use a recovery code instead");
    expect(w.text()).toContain("Trust this device for 30 days");
    expect(w.find('[data-slot="two-factor-passkey"]').exists()).toBe(false);
  });

  it("asks for every digit when submitted early", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqTwoFactorChallenge, { props: { onSubmit } });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Enter all 6 digits.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on paste with the method and trust flag, then clears on a wrong code", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "Wrong." });
    const w = mount(NqTwoFactorChallenge, { props: { onSubmit }, attachTo: document.body });
    await w.find('[name="trustDevice"], [data-slot="checkbox"]').trigger("click");
    paste(w, "999999");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ code: "999999", method: "totp", trustDevice: true });
    expect(w.find('[role="alert"]').text()).toBe("Wrong.");
    expect((w.find('[data-slot="otp-input-box"]').element as HTMLInputElement).value).toBe("");
    w.unmount();
  });

  it("switches to a recovery code and submits it trimmed", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqTwoFactorChallenge, { props: { onSubmit } });
    await w.findAll("button").find((b) => b.text().includes("recovery code instead"))!.trigger("click");
    expect(w.attributes("data-method")).toBe("recovery");
    expect(w.findAll('[data-slot="otp-input-box"]')).toHaveLength(0);
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Enter a recovery code.");
    await w.find('input[name="code"]').setValue(" abcd-1234 ");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledWith({ code: "abcd-1234", method: "recovery", trustDevice: false });
  });
});
