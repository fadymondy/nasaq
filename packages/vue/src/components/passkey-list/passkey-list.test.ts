import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqPasskeyList, isPasskeySupported } from ".";

const passkeys = [
  { id: "a", name: "MacBook Pro", kind: "device" as const, createdAt: "2026-03-02T09:00:00Z", lastUsedAt: "2026-09-28T08:30:00Z" },
  { id: "b", name: "YubiKey", kind: "security-key" as const, authenticator: "YubiKey 5C", createdAt: "2026-07-21T15:30:00Z" },
];

describe("NqPasskeyList", () => {
  it("renders the card, a labelled list and a row per passkey with hints", () => {
    const w = mount(NqPasskeyList, { props: { passkeys, onAdd: async () => {}, supported: true } });
    expect(w.attributes("data-slot")).toBe("passkey-list");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-2xl"]));
    expect(w.get("ul").attributes("aria-label")).toBe("Your passkeys");
    const rows = w.findAll('[data-slot="passkey-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("MacBook Pro");
    expect(rows[0]!.text()).toContain("This device");
    expect(rows[0]!.text()).toContain("Last used");
    expect(rows[1]!.text()).toContain("YubiKey 5C");
    expect(rows[1]!.text()).toContain("Never used");
    expect(w.text()).toContain("Add a passkey");
  });

  it("shows the empty state with a primary add button when there are none", () => {
    const w = mount(NqPasskeyList, { props: { passkeys: [], onAdd: async () => {}, supported: true } });
    expect(w.find("ul").exists()).toBe(false);
    expect(w.get('[data-slot="empty-state"]').text()).toContain("No passkeys yet");
    expect(w.get('[data-slot="empty-state"] button').classes()).toContain("bg-primary");
  });

  it("warns and disables adding when the browser has no passkey support", () => {
    expect(isPasskeySupported()).toBe(false);
    const w = mount(NqPasskeyList, { props: { passkeys, onAdd: async () => {}, supported: false } });
    expect(w.get('[data-slot="alert"]').attributes("data-tone")).toBe("warning");
    expect(w.get('[data-slot="card-action"] button').attributes("disabled")).toBeDefined();
  });

  it("runs onAdd and reports a failed ceremony", async () => {
    const onAdd = vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    const w = mount(NqPasskeyList, { props: { passkeys, onAdd, supported: true } });
    await w.get('[data-slot="card-action"] button').trigger("click");
    await flushPromises();
    expect(onAdd).toHaveBeenCalledOnce();
    expect(w.get('[data-slot="alert"][data-tone="danger"]').text()).toBe("Adding the passkey was cancelled.");
  });

  it("renames in place: Enter saves, an error keeps the field open, Escape cancels", async () => {
    const onRename = vi.fn().mockResolvedValueOnce({ error: "Name taken" }).mockResolvedValueOnce(undefined);
    const w = mount(NqPasskeyList, { props: { passkeys, onAdd: async () => {}, onRename, supported: true } });
    await w.get('button[aria-label="Rename: MacBook Pro"]').trigger("click");
    const input = w.get("input");
    expect(input.attributes("aria-label")).toBe("Passkey name");
    await input.setValue("Work laptop");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onRename).toHaveBeenCalledWith("a", "Work laptop");
    expect(w.get('[role="alert"]').text()).toBe("Name taken");
    expect(w.find("input").attributes("aria-invalid")).toBe("true");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.find("input").exists()).toBe(false);
    await w.get('button[aria-label="Rename: MacBook Pro"]').trigger("click");
    await w.get("input").trigger("keydown", { key: "Escape" });
    expect(w.find("input").exists()).toBe(false);
  });

  it("asks before removing and calls onRemove on confirm", async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqPasskeyList, { props: { passkeys, onAdd: async () => {}, onRemove, supported: true }, attachTo: document.body });
    await w.get('button[aria-label="Remove: YubiKey"]').trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-slot="alert-dialog-title"]')!.textContent).toBe('Remove "YubiKey"?');
    document.querySelector<HTMLElement>('[data-slot="confirm-button-action"]')!.click();
    await flushPromises();
    expect(onRemove).toHaveBeenCalledWith("b");
    w.unmount();
  });

  it("uses the Arabic strings in an Arabic document", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqPasskeyList, { props: { passkeys: [], onAdd: async () => {}, supported: true } });
    expect(w.text()).toContain("مفاتيح المرور");
    expect(w.text()).toContain("إضافة مفتاح مرور");
    document.documentElement.lang = "";
  });
});
