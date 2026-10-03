import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { daysLeft, keyStatus, maskKey, NqApiKeys, toggleScope, type ApiKeyRecord } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const day = 86_400_000;
const scopes = [
  { id: "read", label: "Read" },
  { id: "write", label: "Write", description: "Change records" },
];
const keys: ApiKeyRecord[] = [
  { id: "a", name: "Prod", prefix: "nsq_live_a1b2", last4: "wxyz", scopes: ["read", "write"], createdAt: Date.now() - 10 * day, lastUsedAt: null, expiresAt: Date.now() + 3 * day },
  { id: "b", name: "Old", prefix: "nsq_live_c3d4", scopes: ["read"], createdAt: Date.now() - 50 * day, revokedAt: Date.now() - day },
];
const onCreate = vi.fn(async () => ({ secret: "nsq_live_FULLSECRET" }));

const dialog = (slot: string) => document.querySelector<HTMLElement>(`[data-slot="${slot}"]`);

describe("api-keys helpers", () => {
  it("masks, classifies and toggles", () => {
    expect(maskKey("nsq_live_a1b2", "wxyz")).toBe("nsq_live_a1b2••••••••wxyz");
    expect(keyStatus({ expiresAt: Date.now() + 3 * day })).toBe("expiring");
    expect(keyStatus({ revokedAt: 1 })).toBe("revoked");
    expect(keyStatus({ expiresAt: Date.now() - 1 })).toBe("expired");
    expect(daysLeft(null)).toBeNull();
    expect(toggleScope(["write"], "read", ["read", "write"])).toEqual(["read", "write"]);
  });
});

describe("NqApiKeys", () => {
  it("renders the card, the list with status, masked key, scopes and dates", () => {
    const w = mount(NqApiKeys, { props: { keys, scopes, onCreate, class: "max-w-2xl" } });
    expect(w.attributes("data-slot")).toBe("api-keys");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-2xl"]));
    expect(w.find("h2").text()).toBe("API keys");
    const rows = w.findAll('[data-slot="api-key"]');
    expect(rows.map((r) => r.attributes("data-status"))).toEqual(["expiring", "revoked"]);
    expect(rows[0]!.find('[data-slot="api-key-masked"]').text()).toBe("nsq_live_a1b2••••••••wxyz");
    expect(rows[0]!.find('[data-slot="api-key-masked"]').attributes("dir")).toBe("ltr");
    expect(rows[0]!.text()).toContain("Expiring soon");
    expect(rows[0]!.text()).toContain("Never used");
    expect(rows[0]!.text()).toContain("in 3 days");
    expect(rows[0]!.findAll('[data-slot="badge"]').map((b) => b.text())).toEqual(["Read", "Write"]);
    expect(rows[1]!.find("span.line-through").exists()).toBe(true);
    // Revoked keys have no actions; no rotate/revoke handlers means no buttons either.
    expect(rows[0]!.find('[role="group"]').exists()).toBe(true);
    expect(rows[1]!.find('[role="group"]').exists()).toBe(false);
  });

  it("shows the empty state", () => {
    const w = mount(NqApiKeys, { props: { keys: [], scopes, onCreate } });
    expect(w.find('[data-slot="empty-state"]').text()).toContain("No API keys yet");
  });

  it("validates the create form, then shows the secret once", async () => {
    const w = mount(NqApiKeys, { props: { keys, scopes, onCreate }, attachTo: document.body });
    await w.find("button").trigger("click");
    await flushPromises();
    const create = dialog("api-key-create")!;
    expect(create).toBeTruthy();
    create.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(create.textContent).toContain("Give the key a name.");
    expect(create.textContent).toContain("Pick at least one scope.");
    expect(onCreate).not.toHaveBeenCalled();

    const input = create.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    input.value = "CI";
    input.dispatchEvent(new Event("input"));
    create.querySelector<HTMLElement>('[data-slot="checkbox"]')!.click();
    await flushPromises();
    create.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onCreate).toHaveBeenCalledWith({ name: "CI", scopes: ["read"], expiresInDays: 90 });
    await vi.waitFor(() => expect(dialog("api-key-reveal")).toBeTruthy());
    const field = dialog("api-key-reveal")!.querySelector<HTMLInputElement>('[data-slot="input-group-input"]')!;
    expect(field.value).toBe("nsq_live_FULLSECRET");
    expect(field.readOnly).toBe(true);
    w.unmount();
  });

  it("shows a server error and keeps the form open", async () => {
    const failing = vi.fn(async () => ({ error: "Name taken" }));
    const w = mount(NqApiKeys, { props: { keys, scopes, onCreate: failing, defaultScopes: ["read"] }, attachTo: document.body });
    await w.find("button").trigger("click");
    await flushPromises();
    const create = dialog("api-key-create")!;
    const input = create.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    input.value = "Dup";
    input.dispatchEvent(new Event("input"));
    create.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(create.textContent).toContain("Name taken");
    expect(dialog("api-key-reveal")).toBeNull();
    w.unmount();
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqApiKeys }, setup: () => ({ keys, scopes, onCreate }), template: `<NasaqProvider locale="ar" target="scope"><NqApiKeys :keys="keys" :scopes="scopes" :on-create="onCreate" /></NasaqProvider>` });
    expect(w.find("h2").text()).toBe("مفاتيح API");
    expect(w.text()).toContain("لم يُستخدم بعد");
  });
});
