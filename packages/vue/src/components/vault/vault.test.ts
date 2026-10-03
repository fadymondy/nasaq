import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { daysUntil, expiryState, groupSecrets, matchesSecret, NqVault, VAULT_MASK, type VaultSecret } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const NOW = new Date("2026-09-29T09:00:00Z");
const day = 86_400_000;
const secrets: VaultSecret[] = [
  { id: "a", name: "STRIPE_KEY", group: "Payments", kind: "api-key", hint: "…4242", updatedAt: NOW, expiresAt: NOW.getTime() + 200 * day },
  { id: "b", name: "DB_URL", group: "Backend", kind: "password", description: "Primary", updatedAt: NOW, expiresAt: NOW.getTime() + 6 * day },
  { id: "c", name: "OLD_TOKEN", group: "Backend", kind: "token", updatedAt: NOW, expiresAt: NOW.getTime() - day },
];
const log = [
  { id: "l1", secretName: "STRIPE_KEY", actor: "Layla", action: "reveal" as const, at: NOW.getTime() - 3_600_000, address: "10.0.0.1" },
  { id: "l2", secretName: "DB_URL", actor: "Omar", action: "copy" as const, at: NOW.getTime() - 2 * 3_600_000 },
];
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

function setup(extra: Record<string, unknown> = {}) {
  const onReveal = vi.fn(async (id: string) => ({ value: `value-of-${id}` }));
  const w = mount(NqVault, { props: { secrets, accessLog: log, onReveal, now: NOW, ...extra }, attachTo: document.body });
  return { w, onReveal };
}

describe("vault helpers", () => {
  it("groups, classifies expiry and matches", () => {
    expect(groupSecrets(secrets).map((g) => g.group)).toEqual(["Backend", "Payments"]);
    expect(expiryState(NOW.getTime() + 3 * day, NOW)).toBe("soon");
    expect(expiryState(NOW.getTime() - 1, NOW)).toBe("expired");
    expect(expiryState(undefined, NOW)).toBe("none");
    expect(daysUntil(NOW.getTime() + 6 * day, NOW)).toBe(6);
    expect(matchesSecret(secrets[0]!, "stripe")).toBe(true);
    expect(matchesSecret(secrets[0]!, "nope")).toBe(false);
  });
});

describe("NqVault", () => {
  it("renders grouped secrets with masks, kind and expiry badges, never a value", () => {
    const { w } = setup();
    expect(w.attributes("data-slot")).toBe("vault");
    expect(w.findAll('[data-slot="vault-secret"]')).toHaveLength(3);
    expect(w.findAll("h4").map((h) => h.text())).toEqual(["Backend2 secrets", "Payments1 secret"]);
    const first = w.findAll('[data-slot="vault-value"]')[0]!;
    expect(first.text()).toContain(VAULT_MASK);
    expect(first.attributes("dir")).toBe("ltr");
    expect(w.text()).toContain("Expires in 6 days");
    expect(w.text()).toContain("Expired");
    expect(w.text()).not.toContain("value-of");
    // Read-only: no add, edit or delete.
    expect(w.text()).not.toContain("Add secret");
    expect(w.find('[aria-label="Edit DB_URL"]').exists()).toBe(false);
  });

  it("reveals through onReveal, counts down, then hides again", async () => {
    vi.useFakeTimers();
    const { w, onReveal } = setup({ revealTimeout: 2000 });
    await w.find('[aria-label="Reveal STRIPE_KEY"]').trigger("click");
    await flushPromises();
    expect(onReveal).toHaveBeenCalledWith("a", "reveal");
    const row = w.find('[data-slot="vault-secret"][data-revealed]');
    expect(row.text()).toContain("value-of-a");
    expect(row.text()).toContain("Hides again in 2 seconds");
    expect(w.find('[aria-label="Hide STRIPE_KEY"]').attributes("aria-pressed")).toBe("true");
    await vi.advanceTimersByTimeAsync(2100);
    expect(w.find('[data-slot="vault-secret"][data-revealed]').exists()).toBe(false);
    expect(w.text()).not.toContain("value-of-a");
  });

  it("shows an error from onReveal", async () => {
    const onReveal = vi.fn(async () => ({ error: "Not allowed" }));
    const w = mount(NqVault, { props: { secrets, onReveal, now: NOW }, attachTo: document.body });
    await w.find('[aria-label="Reveal DB_URL"]').trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain("Not allowed");
  });

  it("copies with purpose copy and shows a check", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { w, onReveal } = setup();
    await w.find('[aria-label="Copy STRIPE_KEY"]').trigger("click");
    await flushPromises();
    expect(onReveal).toHaveBeenCalledWith("a", "copy");
    expect(writeText).toHaveBeenCalledWith("value-of-a");
    expect(w.find('[aria-label="Copy STRIPE_KEY"]').attributes("data-copied")).toBe("");
    expect(w.find('[role="status"]').text()).toBe("Copied to clipboard");
  });

  it("validates the add dialog, then saves", async () => {
    const onSave = vi.fn(async () => undefined);
    const { w } = setup({ onSave });
    await w.findAll("button").find((b) => b.text() === "Add secret")!.trigger("click");
    await flushPromises();
    const dlg = slot("vault-secret-dialog")!;
    expect(dlg).toBeTruthy();
    dlg.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(dlg.textContent).toContain("Enter a name.");
    expect(dlg.textContent).toContain("Enter the value.");
    expect(onSave).not.toHaveBeenCalled();
    const name = dlg.querySelector<HTMLInputElement>('[data-slot="input"]')!;
    name.value = "NEW_KEY";
    name.dispatchEvent(new Event("input"));
    const value = dlg.querySelector<HTMLTextAreaElement>("textarea")!;
    value.value = "s3cret";
    value.dispatchEvent(new Event("input"));
    await flushPromises();
    dlg.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith({ name: "NEW_KEY", group: "", kind: "api-key", value: "s3cret" }, undefined);
    w.unmount();
  });

  it("keeps the edit dialog open on a server error", async () => {
    const onSave = vi.fn(async () => ({ error: "Name taken" }));
    const { w } = setup({ onSave });
    await w.find('[aria-label="Edit DB_URL"]').trigger("click");
    await flushPromises();
    const dlg = slot("vault-secret-dialog")!;
    expect(dlg.textContent).toContain("Edit DB_URL");
    expect(dlg.textContent).toContain("Leave blank to keep the current value.");
    dlg.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "DB_URL", group: "Backend", value: "" }), "b");
    expect(dlg.textContent).toContain("Name taken");
    w.unmount();
  });

  it("asks before deleting", async () => {
    const onDelete = vi.fn(async () => undefined);
    const { w } = setup({ onDelete });
    await w.find('[aria-label="Delete DB_URL"]').trigger("click");
    await flushPromises();
    const dlg = slot("vault-delete-dialog")!;
    expect(dlg.textContent).toContain("Delete DB_URL?");
    expect(onDelete).not.toHaveBeenCalled();
    [...dlg.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Delete")!.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith("b");
    w.unmount();
  });

  it("shows the empty state with an add button, and a loading state", () => {
    const empty = mount(NqVault, { props: { secrets: [], onReveal: async () => ({ value: "" }), onSave: async () => undefined } });
    expect(empty.find('[data-slot="empty-state"]').text()).toContain("The vault is empty");
    expect(empty.find('[data-slot="empty-state"] button').text()).toContain("Add secret");
    const loading = mount(NqVault, { props: { secrets, loading: true, onReveal: async () => ({ value: "" }) } });
    expect(loading.find('[data-slot="loading-state"]').exists()).toBe(true);
  });

  it("filters when there are more than five secrets", async () => {
    const many: VaultSecret[] = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, name: `KEY_${i}`, group: "G", updatedAt: NOW }));
    const w = mount(NqVault, { props: { secrets: many, onReveal: async () => ({ value: "" }), now: NOW } });
    const input = w.find('input[type="search"]');
    await input.setValue("KEY_3");
    expect(w.findAll('[data-slot="vault-secret"]')).toHaveLength(1);
    await input.setValue("zzz");
    expect(w.text()).toContain("No secrets match your filter.");
  });

  it("lists the access log newest first on its tab", async () => {
    const { w } = setup();
    await w.findAll('[role="tab"]')[1]!.trigger("mousedown", { button: 0 });
    await flushPromises();
    const rows = document.querySelectorAll('[role="tabpanel"][data-state="active"] tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain("Layla");
    expect(rows[0]!.textContent).toContain("Revealed");
    expect(rows[1]!.textContent).toContain("Omar");
    w.unmount();
  });

  it("is Arabic inside an Arabic provider", () => {
    const onReveal = async () => ({ value: "" });
    const w = mount({ components: { NasaqProvider, NqVault }, setup: () => ({ secrets, onReveal, NOW }), template: `<NasaqProvider locale="ar" target="scope"><NqVault :secrets="secrets" :on-reveal="onReveal" :now="NOW" /></NasaqProvider>` });
    expect(w.find("h3").text()).toBe("الخزنة");
    expect(w.find('[aria-label="كشف DB_URL"]').exists()).toBe(true);
  });
});
