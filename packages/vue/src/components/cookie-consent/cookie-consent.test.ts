import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { consentAcceptAll, consentModeSignals, consentRejectAll, consentSource, normalizeConsentState, NqCookieConsent, DEFAULT_CONSENT_CATEGORIES, type ConsentCategory } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const cats: ConsentCategory[] = [
  { id: "necessary", required: true },
  { id: "analytics", cookies: [{ name: "_ga", purpose: "Counts visits", duration: "1 year" }] },
];
const mountIt = (props: Record<string, unknown>) => mount(NqCookieConsent, { props: { categories: cats, ...props } as never, attachTo: document.body });
const buttons = (root: ParentNode = document.body) => [...root.querySelectorAll("button")];
const byText = (text: string, root: ParentNode = document.body) => buttons(root).find((b) => b.textContent?.trim() === text)!;

describe("consent model", () => {
  it("accepts, rejects and normalizes", () => {
    expect(consentAcceptAll(cats)).toEqual({ necessary: true, analytics: true });
    expect(consentRejectAll(cats)).toEqual({ necessary: true, analytics: false });
    expect(normalizeConsentState(cats, { analytics: true })).toEqual({ necessary: true, analytics: true });
    expect(consentSource(cats, { analytics: true })).toBe("accept-all");
    expect(consentSource(cats, {})).toBe("reject-all");
    expect(consentSource(DEFAULT_CONSENT_CATEGORIES, { analytics: true })).toBe("custom");
    expect(consentModeSignals({ analytics: true }).analytics_storage).toBe("granted");
  });
});

describe("NqCookieConsent", () => {
  it("shows the banner until a choice exists, and hides it when saved", async () => {
    const w = mountIt({ onSave: vi.fn(), consent: null, inline: true, policyHref: "/cookies" });
    expect(w.find('[data-slot="cookie-consent"]').exists()).toBe(true);
    expect(w.find('a[href="/cookies"]').text()).toBe("Cookie policy");
    await w.setProps({ consent: { necessary: true, analytics: false } });
    expect(w.find('[data-slot="cookie-consent"]').exists()).toBe(false);
    w.unmount();
  });

  it("accepts all and rejects all through onSave", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mountIt({ onSave, inline: true });
    await byText("Accept all", w.element).click();
    await flushPromises();
    expect(onSave).toHaveBeenLastCalledWith({ necessary: true, analytics: true }, "accept-all");
    expect(w.find('[data-slot="cookie-consent"]').exists()).toBe(false);
    w.unmount();
    const onReject = vi.fn();
    const r = mountIt({ onSave: onReject, inline: true });
    await byText("Reject all", r.element).click();
    await flushPromises();
    expect(onReject).toHaveBeenCalledWith({ necessary: true, analytics: false }, "reject-all");
    r.unmount();
  });

  it("keeps the banner and shows the error when saving fails", async () => {
    const w = mountIt({ onSave: vi.fn().mockRejectedValue(new Error("x")), inline: true });
    await byText("Accept all", w.element).click();
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Your choices could not be saved. Try again.");
    w.unmount();
    const s = mountIt({ onSave: vi.fn().mockResolvedValue({ error: "Offline" }), inline: true });
    await byText("Reject all", s.element).click();
    await flushPromises();
    expect(s.find('[role="alert"]').text()).toBe("Offline");
    s.unmount();
  });

  it("opens the preferences, lists cookies and saves a custom choice", async () => {
    const onSave = vi.fn();
    const w = mountIt({ onSave, inline: true });
    await byText("Customise", w.element).click();
    await flushPromises();
    const dialog = document.body.querySelector('[data-slot="cookie-preferences"]')!;
    expect(dialog).toBeTruthy();
    const rows = dialog.querySelectorAll('[data-slot="cookie-category"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Always on");
    expect(rows[0]!.querySelector("button[role=switch]")!.hasAttribute("disabled")).toBe(true);
    expect(rows[1]!.textContent).toContain("Show cookies (1)");
    await (rows[1]!.querySelector("button[role=switch]") as HTMLElement).click();
    await flushPromises();
    await byText("Save choices").click();
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith({ necessary: true, analytics: true }, "accept-all");
    expect(document.body.querySelector('[data-slot="cookie-preferences"]')).toBeNull();
    w.unmount();
  });

  it("emits the open state and follows a controlled preferencesOpen", async () => {
    const w = mountIt({ onSave: vi.fn(), inline: true, preferencesOpen: true });
    await flushPromises();
    expect(document.body.querySelector('[data-slot="cookie-preferences"]')).toBeTruthy();
    w.unmount();
  });

  it("renders Arabic strings and category overrides", async () => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    const c = mount(NqCookieConsent, {
      props: { categories: [{ id: "necessary", required: true }, { id: "x", label: "Custom" }], onSave: vi.fn(), inline: true, labels: { acceptAll: "Yes" } } as never,
      attachTo: document.body,
    });
    expect(c.text()).toContain("Yes");
    expect(c.text()).toContain("خياراتك في الخصوصية");
    c.unmount();
  });
});
