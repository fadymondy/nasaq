import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqConnectedAccounts } from ".";

const providers = [
  { id: "google", connected: true, account: "fady@example.com" },
  { id: "github", connected: false },
];

describe("NqConnectedAccounts", () => {
  it("renders a labelled list with a row per provider and the data attributes", () => {
    const w = mount(NqConnectedAccounts, { props: { providers, otherSignInMethods: 1, onConnect: async () => {}, onDisconnect: async () => {} } });
    expect(w.attributes("data-slot")).toBe("connected-accounts");
    expect(w.get("ul").attributes("aria-label")).toBe("Sign-in providers");
    const rows = w.findAll('[data-slot="connected-account"]');
    expect(rows.map((r) => r.attributes("data-provider"))).toEqual(["google", "github"]);
    expect(rows[0]!.attributes("data-connected")).toBe("");
    expect(rows[1]!.attributes("data-connected")).toBeUndefined();
    expect(rows[0]!.get("bdi[dir='ltr']").text()).toBe("fady@example.com");
    expect(rows[0]!.text()).toContain("Disconnect");
    expect(rows[1]!.text()).toContain("Not connected");
    expect(rows[1]!.text()).toContain("Connect");
  });

  it("connects through onConnect and shows an error when it throws", async () => {
    const onConnect = vi.fn().mockRejectedValue(new Error("x"));
    const w = mount(NqConnectedAccounts, { props: { providers, otherSignInMethods: 1, onConnect, onDisconnect: async () => {} } });
    await w.get('[data-provider="github"] button').trigger("click");
    await flushPromises();
    expect(onConnect).toHaveBeenCalledWith("github");
    expect(w.get('[data-slot="alert"]').text()).toBe("Could not connect the account. Try again.");
  });

  it("confirms before disconnecting", async () => {
    const onDisconnect = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqConnectedAccounts, { props: { providers, otherSignInMethods: 1, onConnect: async () => {}, onDisconnect }, attachTo: document.body });
    await w.get('[data-provider="google"] button').trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe("Disconnect Google?");
    document.querySelector<HTMLElement>('[data-slot="confirm-button-action"]')!.click();
    await flushPromises();
    expect(onDisconnect).toHaveBeenCalledWith("google");
    w.unmount();
  });

  it("blocks disconnecting the last sign-in method and says why", async () => {
    const onDisconnect = vi.fn();
    const w = mount(NqConnectedAccounts, { props: { providers, onConnect: async () => {}, onDisconnect } });
    const row = w.get('[data-provider="google"]');
    expect(row.text()).toContain("This is your only way to sign in.");
    const button = row.get("button");
    expect(button.attributes("aria-disabled")).toBe("true");
    expect(button.attributes("aria-describedby")).toBeTruthy();
    await button.trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-slot="alert-dialog-title"]')).toBeNull();
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it("uses the Arabic strings in an Arabic document", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqConnectedAccounts, { props: { providers, otherSignInMethods: 1, onConnect: async () => {}, onDisconnect: async () => {} } });
    expect(w.text()).toContain("الحسابات المرتبطة");
    expect(w.text()).toContain("غير مرتبط");
    document.documentElement.lang = "";
  });
});
