import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NqIntegrationConnector, type IntegrationService } from ".";
import { NasaqProvider } from "../../provider";

const services: IntegrationService[] = [
  {
    id: "gsc",
    name: "Search Console",
    group: "Google",
    status: "disconnected",
    description: "Search performance data.",
    scopes: [
      { id: "read", label: "Read performance data", required: true },
      { id: "sitemaps", label: "Submit sitemaps" },
    ],
  },
  {
    id: "ga",
    name: "Analytics",
    group: "Google",
    status: "connected",
    connectedAs: "me@example.com",
    lastSyncAt: null,
    scopes: [{ id: "read", label: "Read reports", required: true }],
    accounts: [{ id: "p1", name: "Blog", detail: "properties/1" }],
    accountId: "p1",
  },
  { id: "gh", name: "GitHub", status: "error", message: "Token revoked", scopes: [{ id: "repo", label: "Repos" }] },
];

afterEach(() => {
  document.body.innerHTML = "";
});
const q = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const settle = () => new Promise((r) => setTimeout(r, 250));
const noop = async () => undefined;

describe("NqIntegrationConnector", () => {
  it("renders groups, statuses, and the right actions per state", () => {
    const w = mount(NqIntegrationConnector, { props: { services, onConnect: noop, onDisconnect: noop, onSelectAccount: noop, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("integration-connector");
    expect(w.classes()).toContain("extra");
    expect(w.find("h2").text()).toBe("Connections");
    expect(w.findAll("section")).toHaveLength(2);
    expect(w.findAll("section > h3").map((h) => h.text())).toEqual(["Google"]);
    const cards = w.findAll('[data-slot="integration-service"]');
    expect(cards.map((c) => c.attributes("data-status"))).toEqual(["disconnected", "connected", "error"]);
    expect(cards[0]!.text()).toContain("Not connected");
    expect(cards[0]!.text()).toContain("Connect");
    expect(cards[0]!.find("dl").exists()).toBe(false);
    expect(cards[1]!.text()).toContain("Signed in as");
    expect(cards[1]!.text()).toContain("me@example.com");
    expect(cards[1]!.text()).toContain("Not synced yet");
    expect(cards[1]!.text()).toContain("1 permission");
    expect(cards[1]!.text()).toContain("Change permissions");
    expect(cards[1]!.find('[aria-label="Analytics: Account"]').exists()).toBe(true);
    expect(cards[2]!.text()).toContain("Token revoked");
    expect(cards[2]!.text()).toContain("Reconnect");
  });

  it("shows an empty state and hides the heading when bare", () => {
    const empty = mount(NqIntegrationConnector, { props: { services: [], onConnect: noop, onDisconnect: noop } });
    expect(empty.find('[data-slot="empty-state"]').exists()).toBe(true);
    expect(empty.text()).toContain("No services to connect");
    const bare = mount(NqIntegrationConnector, { props: { services, bare: true, onConnect: noop, onDisconnect: noop } });
    expect(bare.find("h2").exists()).toBe(false);
  });

  it("asks for consent on the scopes, then calls onConnect with the ticked ids", async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqIntegrationConnector, { props: { services, onConnect, onDisconnect: noop }, attachTo: document.body });
    await w.findAll('[data-slot="integration-service"]')[0]!.findAll("button").find((b) => b.text() === "Connect")!.trigger("click");
    await flushPromises();
    expect(q('[data-slot="dialog-title"]').textContent).toBe("Connect Search Console");
    const boxes = [...document.querySelectorAll<HTMLElement>('[role="checkbox"]')];
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.getAttribute("aria-checked")).toBe("true");
    expect(boxes[0]!.hasAttribute("disabled") || boxes[0]!.getAttribute("data-disabled") !== null).toBe(true);
    expect(document.body.textContent).toContain("Required");
    q("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(onConnect).toHaveBeenCalledWith("gsc", ["read", "sitemaps"]);
    await settle();
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    w.unmount();
  });

  it("keeps the dialog open and shows the error from onConnect", async () => {
    const onConnect = vi.fn().mockResolvedValue({ error: "Popup blocked" });
    const w = mount(NqIntegrationConnector, { props: { services, onConnect, onDisconnect: noop }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Connect")!.trigger("click");
    await flushPromises();
    q("form").dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();
    expect(q('[data-slot="integration-connect-dialog"] [data-slot="alert"]').textContent).toContain("Popup blocked");
    w.unmount();
  });

  it("confirms before disconnecting, and reports a returned error above the cards", async () => {
    const onDisconnect = vi.fn().mockResolvedValue({ error: "Could not revoke" });
    const w = mount(NqIntegrationConnector, { props: { services, onConnect: noop, onDisconnect }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Disconnect")!.trigger("click");
    await flushPromises();
    expect(q('[data-slot="alert-dialog-title"]').textContent).toBe("Disconnect Analytics?");
    expect(onDisconnect).not.toHaveBeenCalled();
    q<HTMLElement>('[data-slot="confirm-button-action"]').click();
    await flushPromises();
    await settle();
    expect(onDisconnect).toHaveBeenCalledWith("ga");
    expect(w.find('[data-slot="alert"]').text()).toContain("Could not revoke");
    w.unmount();
  });

  it("speaks Arabic under an Arabic provider", () => {
    const Host = defineComponent({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqIntegrationConnector, { services, onConnect: noop, onDisconnect: noop })) });
    const w = mount(Host);
    expect(w.text()).toContain("الاتصالات");
    expect(w.text()).toContain("غير مرتبطة");
  });
});
