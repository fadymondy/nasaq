import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import type { IntegrationService } from "../integration-connector";
import { NqAnalyticsConnect, NqAnalyticsPageFrame, activeAccountName } from ".";

const service: IntegrationService = {
  id: "ga",
  name: "Google Analytics",
  scopes: [{ id: "analytics.readonly", label: "See your reports", required: true }],
  status: "disconnected",
};
const noop = async () => undefined;

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("dir");
  document.documentElement.lang = "en";
});

describe("NqAnalyticsConnect", () => {
  it("shows the heading, the benefits and the connector for one service", () => {
    const w = mount(NqAnalyticsConnect, { props: { service, benefits: ["Users and sessions", "Top pages"], onConnect: noop, onDisconnect: noop, class: "extra" } });
    const root = w.get('[data-slot="analytics-connect"]');
    expect(root.attributes("data-status")).toBe("disconnected");
    expect(root.attributes("aria-label")).toBe("Connect Google Analytics");
    expect(root.classes()).toContain("extra");
    expect(root.get("h2").text()).toBe("Connect Google Analytics");
    expect(root.text()).toContain("Nasaq reads your Google Analytics data");
    expect(root.findAll("ul")[0]!.findAll("li")).toHaveLength(2);
    expect(root.findAll('[data-slot="integration-connector"]')).toHaveLength(1);
    expect(root.findAll('[data-slot="integration-service"]')).toHaveLength(1);
    expect(root.text()).toContain("Read-only access");
  });

  it("asks to sign in again when the connection expired, and honours title and description", () => {
    const expired = mount(NqAnalyticsConnect, { props: { service: { ...service, status: "needs-reauth" }, onConnect: noop, onDisconnect: noop } });
    expect(expired.get("h2").text()).toBe("Sign in to Google Analytics again");
    expect(expired.text()).toContain("The connection expired");
    const custom = mount(NqAnalyticsConnect, { props: { service, title: "Hook up GA", description: "Custom text", onConnect: noop, onDisconnect: noop } });
    expect(custom.get("h2").text()).toBe("Hook up GA");
    expect(custom.text()).toContain("Custom text");
    expect(custom.text()).not.toContain("What you will see");
  });

  it("speaks Arabic in an Arabic provider", () => {
    const Host = { components: { NasaqProvider, NqAnalyticsConnect }, setup: () => ({ service, noop }), template: `<NasaqProvider locale="ar"><NqAnalyticsConnect :service="service" :on-connect="noop" :on-disconnect="noop" /></NasaqProvider>` };
    const w = mount(Host);
    expect(w.get("h2").text()).toBe("ربط Google Analytics");
    expect(w.text()).toContain("وصول للقراءة فقط");
    w.unmount();
  });
});

describe("NqAnalyticsPageFrame", () => {
  it("shows the connect screen until the service is connected", () => {
    const w = mount(NqAnalyticsPageFrame, { props: { title: "Analytics", service, onConnect: noop, onDisconnect: noop }, slots: { default: "<p id='report'>report</p>" } });
    expect(w.get('[data-slot="analytics-page"]').attributes("data-connected")).toBe("false");
    expect(w.find('[data-slot="analytics-connect"]').exists()).toBe(true);
    expect(w.find("#report").exists()).toBe(false);
    expect(w.get("h1").text()).toBe("Analytics");
  });

  it("shows the report, the source line and refresh when connected", async () => {
    const onRefresh = vi.fn();
    const w = mount(NqAnalyticsPageFrame, {
      props: { title: "Analytics", description: "Nasaq blog", service: { ...service, status: "connected", connectedAs: "fady@example.com" }, updatedAt: new Date(), onConnect: noop, onDisconnect: noop, onRefresh },
      slots: { default: "<p id='report'>report</p>", actions: "<span id='period'>30d</span>" },
    });
    expect(w.get('[data-slot="analytics-page"]').attributes("data-connected")).toBe("true");
    expect(w.find("#report").exists()).toBe(true);
    expect(w.find('[data-slot="analytics-connect"]').exists()).toBe(false);
    expect(w.find("#period").exists()).toBe(true);
    expect(w.text()).toContain("Connected");
    expect(w.text()).toContain("fady@example.com");
    expect(w.text()).toContain("Updated");
    const refresh = w.findAll("button").find((b) => b.text() === "Refresh")!;
    await refresh.trigger("click");
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(w.findAll("button").some((b) => b.text() === "Disconnect")).toBe(true);
  });

  it("replaces the report with an error and a retry button", async () => {
    const onRetry = vi.fn();
    const w = mount(NqAnalyticsPageFrame, { props: { title: "Analytics", service: { ...service, status: "connected" }, error: "Quota exceeded", onRetry, onConnect: noop, onDisconnect: noop }, slots: { default: "<p id='report'>report</p>" } });
    await flushPromises();
    expect(w.find("#report").exists()).toBe(false);
    expect(w.get('[data-slot="error-state"]').text()).toContain("Quota exceeded");
    await w.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("activeAccountName", () => {
  it("finds the chosen account, else the first", () => {
    const s = { ...service, accounts: [{ id: "a", name: "A" }, { id: "b", name: "B" }] };
    expect(activeAccountName({ ...s, accountId: "b" })).toBe("B");
    expect(activeAccountName(s)).toBe("A");
    expect(activeAccountName(service)).toBeUndefined();
  });
});
