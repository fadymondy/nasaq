import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqLockScreen } from ".";

const user = { name: "Nour Adel", email: "nour@example.com" };
const now = new Date(2026, 8, 29, 9, 0, 0);
const key = (w: ReturnType<typeof mount>, d: string) => w.find(`[data-slot="lock-screen-pad"] button[aria-label="Digit ${d}"]`);
const type = async (w: ReturnType<typeof mount>, digits: string) => {
  for (const d of digits) await key(w, d).trigger("click");
  await flushPromises();
};

describe("NqLockScreen", () => {
  it("renders the frozen clock, the person and the keypad", () => {
    const w = mount(NqLockScreen, { props: { user, now, onUnlock: async () => {} } });
    expect(w.attributes("data-slot")).toBe("lock-screen");
    expect(w.attributes("data-method")).toBe("pin");
    expect(w.find("time").text()).toBe("09:00");
    expect(w.find("h1").text()).toBe("Nour Adel");
    expect(w.findAll('[data-slot="lock-screen-pad"] button')).toHaveLength(11);
  });

  it("submits a full PIN and counts wrong ones until a lockout", async () => {
    const onUnlock = vi.fn().mockResolvedValue({ error: undefined, fieldErrors: {} });
    const w = mount(NqLockScreen, { props: { user, now, maxAttempts: 2, onUnlock } });
    await type(w, "111111");
    expect(onUnlock).toHaveBeenCalledWith({ method: "pin", secret: "111111" });
    expect(w.find('p[role="alert"]').text()).toBe("That PIN is not right. 1 tries left.");
    await type(w, "222222");
    expect(w.find('p[role="alert"]').text()).toContain("Too many attempts");
    expect(key(w, "1").attributes("disabled")).toBeDefined();
  });

  it("switches to password, validates, and fires sign-out", async () => {
    const onSignOut = vi.fn();
    const w = mount(NqLockScreen, { props: { user, now, methods: ["pin", "password"], onSignOut, onUnlock: async () => {} } });
    const use = w.findAll("button").find((b) => b.text().includes("Use password"))!;
    await use.trigger("click");
    expect(w.attributes("data-method")).toBe("password");
    await w.find('[data-slot="lock-screen-password"]').trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Enter your password.");
    await w.findAll("button").find((b) => b.text().includes("Not you? Sign out"))!.trigger("click");
    expect(onSignOut).toHaveBeenCalled();
  });
});
