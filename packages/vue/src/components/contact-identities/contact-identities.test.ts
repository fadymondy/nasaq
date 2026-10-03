import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqContactIdentities, mergeContactConsent, sortContactIdentities, validateContactIdentity, type ContactIdentity } from ".";

const identities: ContactIdentity[] = [
  { id: "1", channel: "phone", value: "+966 50 123 4567" },
  { id: "2", channel: "email", value: "a@example.com", primary: true, verified: true },
  { id: "3", channel: "email", value: "b@example.com", label: "Work" },
];

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("dir");
  document.documentElement.lang = "en";
});

describe("contact identity logic", () => {
  it("validates, merges and sorts", () => {
    expect(validateContactIdentity("email", "")).toBe("empty");
    expect(validateContactIdentity("email", "nope")).toBe("email");
    expect(validateContactIdentity("phone", "12")).toBe("phone");
    expect(validateContactIdentity("email", " A@Example.com ", identities)).toBe("duplicate");
    expect(validateContactIdentity("slack", "@sara", identities)).toBeNull();
    expect(mergeContactConsent(["granted", "denied"])).toBe("denied");
    expect(mergeContactConsent([undefined, "granted"])).toBe("granted");
    expect(sortContactIdentities(identities).map((i) => i.id)).toEqual(["2", "3", "1"]);
  });
});

describe("NqContactIdentities", () => {
  it("lists accounts sorted, with the primary badge and a consent row per channel", () => {
    const w = mount(NqContactIdentities, { props: { identities, consent: { email: { status: "granted", source: "Signup form" } } } });
    expect(w.find('[data-slot="contact-identities"]').exists()).toBe(true);
    const rows = w.findAll("ul")[0]!.findAll("li");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain("a@example.com");
    expect(rows[0]!.text()).toContain("Primary");
    expect(rows[0]!.text()).toContain("Verified");
    expect(w.text()).toContain("Opted in");
    expect(w.text()).toContain("via Signup form");
    expect(w.text()).toContain("No account linked on this channel");
    expect(w.findAll('[role="switch"]')).toHaveLength(3);
  });

  it("shows the empty state, and Arabic strings", () => {
    const Host = { components: { NasaqProvider, NqContactIdentities }, template: `<NasaqProvider locale="ar"><NqContactIdentities :identities="[]" /></NasaqProvider>` };
    const w = mount(Host);
    expect(w.text()).toContain("لا توجد حسابات مرتبطة");
    expect(w.text()).toContain("WhatsApp");
    w.unmount();
  });

  it("validates before linking, then calls onAdd and closes the form", async () => {
    const onAdd = vi.fn(async () => undefined);
    const w = mount(NqContactIdentities, { props: { identities: [], onAdd }, attachTo: document.body });
    await w.find("header button").trigger("click");
    const form = w.find('[data-slot="contact-identities-form"]');
    expect(form.exists()).toBe(true);
    await form.trigger("submit");
    expect(w.find('[role="alert"]').text()).toBe("Enter the account.");
    await form.find('input[dir="ltr"]').setValue("nope");
    await form.trigger("submit");
    expect(w.find('[role="alert"]').text()).toBe("That is not a valid email address.");
    await form.find('input[dir="ltr"]').setValue("new@example.com");
    await form.trigger("submit");
    await flushPromises();
    expect(onAdd).toHaveBeenCalledWith({ channel: "email", value: "new@example.com", label: undefined });
    expect(w.find('[data-slot="contact-identities-form"]').exists()).toBe(false);
    w.unmount();
  });

  it("makes primary, shows an error from a callback, and toggles consent", async () => {
    const onSetPrimary = vi.fn(async () => ({ error: "Locked" }));
    const onConsentChange = vi.fn(async () => undefined);
    const w = mount(NqContactIdentities, { props: { identities, onSetPrimary, onConsentChange }, attachTo: document.body });
    const make = w.findAll("button").find((b) => b.text() === "Make primary")!;
    await make.trigger("click");
    await flushPromises();
    expect(onSetPrimary).toHaveBeenCalledWith(identities[2]);
    expect(w.find('[data-slot="alert"]').text()).toContain("Locked");
    await w.find('[role="switch"]').trigger("click");
    await flushPromises();
    expect(onConsentChange).toHaveBeenCalledWith("email", "granted");
    w.unmount();
  });

  it("confirms before unlinking", async () => {
    const onRemove = vi.fn(async () => undefined);
    const w = mount(NqContactIdentities, { props: { identities, onRemove }, attachTo: document.body });
    await w.find('button[aria-label="Unlink b@example.com"]').trigger("click");
    await flushPromises();
    expect(onRemove).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Unlink b@example.com?");
    const confirm = [...document.body.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')][0]!;
    confirm.click();
    await flushPromises();
    expect(onRemove).toHaveBeenCalledWith(identities[2]);
    w.unmount();
  });

  it("is inert when read only", () => {
    const w = mount(NqContactIdentities, { props: { identities, readOnly: true, onAdd: async () => undefined, onRemove: async () => undefined } });
    expect(w.findAll("button:not([role=switch])")).toHaveLength(0);
    expect(w.findAll('[role="switch"]').every((s) => s.attributes("data-disabled") !== undefined || s.attributes("disabled") !== undefined)).toBe(true);
  });
});
