import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NqUserMenu } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const user = { name: "Fady Mondy", email: "hello@example.com" };

describe("NqUserMenu", () => {
  it("shows the name and email on the trigger", () => {
    const w = mount(NqUserMenu, { props: { user }, attachTo: document.body });
    const trigger = w.find('[data-slot="user-menu"]');
    expect(trigger.text()).toContain("Fady Mondy");
    expect(trigger.text()).toContain("hello@example.com");
    w.unmount();
  });

  it("avatar variant is icon-only and labelled", () => {
    const w = mount(NqUserMenu, { props: { user, variant: "avatar" }, attachTo: document.body });
    const trigger = w.find('[data-slot="user-menu"]');
    expect(trigger.attributes("aria-label")).toBe("Fady Mondy");
    expect(trigger.text()).not.toContain("hello@example.com");
    w.unmount();
  });

  it("opens with Theme, Language and a Sign out item that emits", async () => {
    const w = mount(NqUserMenu, { props: { user, onSignOut: () => {} }, slots: { default: "<div role='menuitem'>Account</div>" }, attachTo: document.body });
    await w.find('[data-slot="user-menu"]').trigger("click", { button: 0, ctrlKey: false });
    await flushPromises();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Account");
    expect(text).toContain("Theme");
    expect(text).toContain("Language");
    const out = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) => i.textContent?.includes("Sign out"));
    expect(out).toBeTruthy();
    out!.click();
    await flushPromises();
    expect(w.emitted("signOut")).toHaveLength(1);
    w.unmount();
  });
});
