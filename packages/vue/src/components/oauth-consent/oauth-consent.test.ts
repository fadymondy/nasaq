import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqOAuthConsent } from ".";

const base = {
  app: { name: "Zapline", publisher: "by Zapline Inc." },
  account: { name: "Fady Mondy", email: "fady@example.com" },
  scopes: [{ id: "profile", label: "Read your profile" }, { id: "write", label: "Edit tasks", sensitive: true, description: "Create and change tasks." }],
  onAllow: async () => {},
  onDeny: async () => {},
};

describe("NqOAuthConsent", () => {
  it("renders the app, the account and the scopes", () => {
    const w = mount(NqOAuthConsent, { props: { ...base, headingLevel: 1, redirectHost: "app.zapline.io" } });
    expect(w.attributes("data-slot")).toBe("oauth-consent");
    expect(w.find("h1").text()).toBe("Zapline wants to access your Nasaq account");
    expect(w.find('[data-slot="oauth-consent-app"]').text()).toContain("by Zapline Inc.");
    expect(w.find('[data-slot="oauth-consent-app"] span[aria-hidden="true"]').text()).toBe("Z");
    expect(w.find('[data-slot="oauth-consent-account"] bdi').text()).toBe("fady@example.com");
    expect(w.findAll('[data-slot="oauth-consent-scopes"] li')).toHaveLength(2);
    expect(w.find('[data-scope="write"]').text()).toContain("Sensitive");
    expect(w.find('[data-scope="profile"]').text()).not.toContain("Sensitive");
    expect(w.text()).toContain("app.zapline.io");
    expect(w.find('[data-slot="oauth-consent-account"] button').exists()).toBe(false);
  });

  it("allows and denies through the callbacks", async () => {
    const onAllow = vi.fn().mockResolvedValue(undefined);
    const onDeny = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqOAuthConsent, { props: { ...base, onAllow, onDeny } });
    await w.find('[data-slot="oauth-consent-allow"]').trigger("click");
    await flushPromises();
    await w.find('[data-slot="oauth-consent-deny"]').trigger("click");
    await flushPromises();
    expect(onAllow).toHaveBeenCalledTimes(1);
    expect(onDeny).toHaveBeenCalledTimes(1);
  });

  it("is busy and disables the other button while a call runs", async () => {
    let finish: () => void = () => {};
    const onAllow = () => new Promise<void>((done) => (finish = done));
    const w = mount(NqOAuthConsent, { props: { ...base, onAllow } });
    await w.find('[data-slot="oauth-consent-allow"]').trigger("click");
    expect(w.attributes("aria-busy")).toBe("true");
    expect((w.find('[data-slot="oauth-consent-deny"]').element as HTMLButtonElement).disabled).toBe(true);
    finish();
    await flushPromises();
    expect(w.attributes("aria-busy")).toBeUndefined();
  });

  it("shows a returned error, the generic one on a throw, and the switch button", async () => {
    const onSwitchAccount = vi.fn();
    const w = mount(NqOAuthConsent, { props: { ...base, onSwitchAccount, onDeny: async () => ({ error: "Could not deny." }) } });
    await w.find('[data-slot="oauth-consent-deny"]').trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="alert"]').text()).toContain("Could not deny.");
    await w.setProps({ onAllow: () => Promise.reject(new Error("x")) });
    await w.find('[data-slot="oauth-consent-allow"]').trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="alert"]').text()).toContain("Something went wrong. Try again.");
    await w.find('[data-slot="oauth-consent-account"] button').trigger("click");
    expect(onSwitchAccount).toHaveBeenCalled();
  });
});
