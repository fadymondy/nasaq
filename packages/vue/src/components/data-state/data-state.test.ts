import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqDataState, NqServiceUnavailable } from ".";

const content = { default: "<p id='ok'>Orders</p>" };

describe("NqDataState", () => {
  it("renders the content when no state applies", () => {
    const w = mount(NqDataState, { slots: content });
    expect(w.find("#ok").exists()).toBe(true);
  });

  it("loading wins over everything", () => {
    const w = mount(NqDataState, { props: { loading: true, error: "x", empty: true }, slots: content });
    expect(w.find('[data-slot="loading-state"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="skeleton"]')).toHaveLength(6);
    expect(w.find("#ok").exists()).toBe(false);
  });

  it("unauthorized shows a sign-in link or button", async () => {
    const link = mount(NqDataState, { props: { unauthorized: true, signInHref: "/login" } });
    const root = link.get('[data-slot="data-state"]');
    expect(root.attributes("data-state")).toBe("unauthorized");
    expect(link.get("a").attributes("href")).toBe("/login");
    expect(link.text()).toContain("Your session has ended");
    const onSignIn = vi.fn();
    const btn = mount(NqDataState, { props: { unauthorized: true, onSignIn } });
    await btn.get("button").trigger("click");
    expect(onSignIn).toHaveBeenCalled();
  });

  it("unavailable is a 503 card with retry; error shows the detail and retry", async () => {
    const onRetry = vi.fn();
    const u = mount(NqDataState, { props: { unavailable: true, onRetry } });
    expect(u.get('[data-slot="service-unavailable"]').attributes("data-state")).toBe("unavailable");
    expect(u.get('[data-slot="service-unavailable"]').attributes("role")).toBe("status");
    await u.get("button").trigger("click");
    expect(onRetry).toHaveBeenCalledTimes(1);
    const e = mount(NqDataState, { props: { error: new Error("Boom"), onRetry } });
    const root = e.get('[data-slot="error-state"]');
    expect(root.attributes("data-state")).toBe("error");
    expect(root.text()).toContain("Something went wrong");
    expect(root.text()).toContain("Boom");
  });

  it("empty shows the empty card and the empty-action slot", () => {
    const w = mount(NqDataState, { props: { empty: true }, slots: { "empty-action": "<button id='new'>New</button>" } });
    const root = w.get('[data-slot="empty-state"]');
    expect(root.attributes("data-state")).toBe("empty");
    expect(root.text()).toContain("Nothing here yet");
    expect(w.find("#new").exists()).toBe(true);
  });
});

describe("NqServiceUnavailable", () => {
  it("has no button without onRetry", () => {
    const w = mount(NqServiceUnavailable);
    expect(w.find("button").exists()).toBe(false);
    expect(w.text()).toContain("This service is not available right now");
  });
});
