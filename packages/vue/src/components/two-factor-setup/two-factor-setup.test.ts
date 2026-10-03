import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqTwoFactorSetup, groupSecret, parseOtpAuthUri, recoveryCodesText } from ".";

const uri = "otpauth://totp/Nasaq:fady@example.com?secret=jbsw%20y3dp-ehpk3pxp&issuer=Nasaq";

describe("two-factor helpers", () => {
  it("groups, parses and formats", () => {
    expect(groupSecret("jbswy3dpehpk3pxp")).toBe("JBSW Y3DP EHPK 3PXP");
    expect(parseOtpAuthUri(uri)).toEqual({ secret: "JBSWY3DPEHPK3PXP", issuer: "Nasaq", account: "fady@example.com" });
    expect(parseOtpAuthUri("https://x.test")).toBeNull();
    expect(recoveryCodesText(["a", "b"], "Codes")).toBe("Codes\n\na\nb\n");
  });
});

describe("NqTwoFactorSetup", () => {
  it("starts on step 1 with the QR, the steps list and the grouped key", () => {
    const w = mount(NqTwoFactorSetup, { props: { otpauthUri: uri, onVerify: async () => {} } });
    expect(w.attributes("data-slot")).toBe("two-factor-setup");
    expect(w.attributes("data-state")).toBe("step-1");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-lg"]));
    const steps = w.findAll('[data-slot="two-factor-steps"] li');
    expect(steps).toHaveLength(3);
    expect(steps[0]!.attributes("aria-current")).toBe("step");
    expect(steps[0]!.classes()).toContain("bg-primary");
    expect(steps[2]!.classes()).toContain("bg-secondary");
    const qr = w.get('[data-slot="two-factor-qr"]');
    expect(qr.attributes("role")).toBe("img");
    expect(qr.attributes("aria-label")).toBe("QR code for your authenticator app");
    expect(qr.find("path").attributes("d")).toMatch(/^M4 4h/);
    const key = w.get('[data-slot="two-factor-key"] code');
    expect(key.attributes("dir")).toBe("ltr");
    expect(key.text()).toBe("JBSW Y3DP EHPK 3PXP");
  });

  it("verifies a code, shows an error, then the recovery codes and finishes", async () => {
    const onVerify = vi.fn().mockResolvedValueOnce({ error: "Wrong code" }).mockResolvedValueOnce({ recoveryCodes: ["aaaa-1111", "bbbb-2222"] });
    const onComplete = vi.fn();
    const w = mount(NqTwoFactorSetup, { props: { otpauthUri: uri, onVerify, onComplete }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Next")!.trigger("click");
    expect(w.attributes("data-state")).toBe("step-2");
    expect(w.find('[data-slot="two-factor-verify"]').exists()).toBe(true);
    const boxes = w.findAll('[data-slot="otp-input-box"]');
    expect(boxes).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      await boxes[i]!.setValue(String(i + 1));
    }
    await flushPromises();
    expect(onVerify).toHaveBeenCalledWith("123456");
    expect(w.get('[role="alert"]').text()).toBe("Wrong code");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onVerify).toHaveBeenCalledTimes(2);
    expect(w.attributes("data-state")).toBe("step-3");
    expect(w.findAll('[data-slot="two-factor-recovery-code"]').map((l) => l.text())).toEqual(["aaaa-1111", "bbbb-2222"]);
    const finish = w.findAll("button").find((b) => b.text() === "Finish")!;
    expect(finish.attributes("disabled")).toBeDefined();
    await w.get('[role="checkbox"]').trigger("click");
    await flushPromises();
    await w.findAll("button").find((b) => b.text() === "Finish")!.trigger("click");
    expect(onComplete).toHaveBeenCalledOnce();
    expect(w.attributes("data-state")).toBe("enabled");
    w.unmount();
  });

  it("skips step 3 when there are no recovery codes", async () => {
    const onComplete = vi.fn();
    const w = mount(NqTwoFactorSetup, { props: { otpauthUri: uri, onVerify: async () => {}, onComplete } });
    await w.findAll("button").find((b) => b.text() === "Next")!.trigger("click");
    const boxes = w.findAll('[data-slot="otp-input-box"]');
    for (let i = 0; i < 6; i++) await boxes[i]!.setValue("1");
    await flushPromises();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(w.attributes("data-state")).toBe("enabled");
  });

  it("shows the enabled state with the remaining count warning and the action buttons", () => {
    const w = mount(NqTwoFactorSetup, {
      props: { otpauthUri: uri, onVerify: async () => {}, enabled: true, recoveryCodesRemaining: 2, onDisable: async () => {}, onRegenerateRecoveryCodes: async () => ["x"] },
    });
    expect(w.attributes("data-state")).toBe("enabled");
    expect(w.text()).toContain("Two-factor authentication is on");
    expect(w.text()).toContain("2 recovery codes left");
    const tones = w.findAll('[data-slot="status"]').map((s) => s.attributes("data-tone"));
    expect(tones).toEqual(["success", "warning"]);
    expect(w.text()).toContain("Regenerate recovery codes");
    expect(w.text()).toContain("Disable two-factor");
  });

  it("asks for the password before disabling and keeps the dialog open on error", async () => {
    const onDisable = vi.fn().mockResolvedValueOnce({ error: "Wrong password" }).mockResolvedValueOnce(undefined);
    const w = mount(NqTwoFactorSetup, { props: { otpauthUri: uri, onVerify: async () => {}, enabled: true, onDisable }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Disable two-factor")!.trigger("click");
    await flushPromises();
    const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dialog.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Disable two-factor authentication?");
    const input = dialog.querySelector<HTMLInputElement>("input")!;
    input.value = "secret";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    dialog.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onDisable).toHaveBeenCalledWith("secret");
    expect(dialog.querySelector('[role="alert"]')!.textContent).toBe("Wrong password");
    w.unmount();
  });

  it("uses the Arabic strings in an Arabic document", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqTwoFactorSetup, { props: { otpauthUri: uri, onVerify: async () => {} } });
    expect(w.text()).toContain("المصادقة الثنائية");
    expect(w.get('[data-slot="two-factor-qr"]').attributes("aria-label")).toBe("رمز QR لتطبيق المصادقة");
    document.documentElement.lang = "";
  });
});
