import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { isSubscriberEmail, maskSubscriberEmail, NqSubscriptionLanding, validateSubscription } from ".";

describe("helpers", () => {
  it("validates, masks and checks the shape of an email", () => {
    expect(isSubscriberEmail("sara@example.com")).toBe(true);
    expect(isSubscriberEmail("sara@")).toBe(false);
    expect(maskSubscriberEmail("sara@example.com")).toBe("s***@example.com");
    expect(validateSubscription({ email: "", consent: false })).toEqual(["email-empty", "consent-missing"]);
    expect(validateSubscription({ email: "a@b.co", consent: true })).toEqual([]);
  });
});

describe("NqSubscriptionLanding", () => {
  it("subscribe: renders the root slot, brand and form with an unticked consent box", () => {
    const w = mount(NqSubscriptionLanding, { props: { mode: "subscribe", brand: "Nasaq" } });
    expect(w.attributes("data-slot")).toBe("subscription-landing");
    expect(w.attributes("data-mode")).toBe("subscribe");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "min-h-full", "w-full", "flex-col", "items-center"]));
    expect(w.text()).toContain("Nasaq");
    expect(w.get("h1").text()).toBe("Stay in the loop");
    expect(w.get('input[type="email"]').attributes("dir")).toBe("ltr");
    expect(w.get('[data-slot="checkbox"]').attributes("aria-checked")).toBe("false");
  });

  it("blocks an empty submit with errors, then calls onSubscribe and shows the inbox message", async () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqSubscriptionLanding, { props: { mode: "subscribe", onSubscribe } });
    await w.get("form").trigger("submit");
    expect(onSubscribe).not.toHaveBeenCalled();
    expect(w.findAll('[role="alert"]').map((a) => a.text())).toEqual(["Enter your email address.", "Tick the box to agree."]);
    await w.get('input[type="email"]').setValue("sara@example.com");
    await w.get('[data-slot="checkbox"]').trigger("click");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onSubscribe).toHaveBeenCalledWith({ email: "sara@example.com", name: undefined });
    expect(w.get("h1").text()).toBe("Check your inbox");
    expect(w.get('[role="status"]').text()).toContain("sara@example.com");
  });

  it("shows the error a handler returns and stays on the form", async () => {
    const onSubscribe = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqSubscriptionLanding, { props: { mode: "subscribe", onSubscribe } });
    await w.get('input[type="email"]').setValue("sara@example.com");
    await w.get('[data-slot="checkbox"]').trigger("click");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Nope");
    expect(w.get("h1").text()).toBe("Stay in the loop");
  });

  it("confirm: a button, never automatic, with the address masked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqSubscriptionLanding, { props: { mode: "confirm", email: "sara@example.com", onConfirm } });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(w.text()).toContain("s***@example.com");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(w.get("h1").text()).toBe("You are subscribed");
  });

  it("unsubscribe: sends the reason, then offers the way back", async () => {
    const onUnsubscribe = vi.fn().mockResolvedValue(undefined);
    const onResubscribe = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqSubscriptionLanding, { props: { mode: "unsubscribe", email: "sara@example.com", onUnsubscribe, onResubscribe } });
    expect(w.findAll('[data-slot="radio"]')).toHaveLength(4);
    await w.findAll('[data-slot="radio"]')[0]!.trigger("click");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onUnsubscribe).toHaveBeenCalledWith({ reason: "too_many", note: undefined });
    expect(w.get("h1").text()).toBe("You are unsubscribed");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(onResubscribe).toHaveBeenCalledOnce();
    expect(w.get("h1").text()).toBe("Welcome back");
  });
});
