import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  groupWebhookEvents,
  isWebhookSourceStale,
  maskWebhookSecret,
  NqWebhooksManager,
  setWebhookEvents,
  validateWebhookEndpoint,
  validateWebhookEndpointUrl,
  webhookDeliveryStats,
  webhookPollUnit,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEvent,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const events: WebhookEvent[] = [
  { id: "order.created", label: "Order created", group: "Orders" },
  { id: "order.paid", label: "Order paid", group: "Orders" },
  { id: "customer.created", label: "Customer created", group: "Customers" },
];
const endpoints: WebhookEndpoint[] = [
  { id: "e1", name: "Order updates", url: "https://hooks.example.com/orders", channel: "Slack", events: ["order.created"], enabled: true, secretLast4: "a1b2" },
  { id: "e2", name: "Billing", url: "https://billing.example.com/hook", events: ["order.paid"], enabled: false, secretLast4: "c3d4" },
];
const deliveries: WebhookDelivery[] = [{ id: "d1", endpointId: "e1", event: "order.created", status: "success", code: 200, at: Date.now() - 60_000, attempt: 1, request: '{"a":1}' }];

describe("webhook helpers", () => {
  it("validates, groups and selects", () => {
    expect(validateWebhookEndpointUrl("http://example.com").ok).toBe(false);
    expect(validateWebhookEndpointUrl("http://localhost:3000/x").ok).toBe(true);
    expect(validateWebhookEndpoint({ name: "", url: "nope", events: [] })).toEqual(["name", "url", "events"]);
    expect(groupWebhookEvents(events).map((g) => g.group)).toEqual(["Orders", "Customers"]);
    expect(setWebhookEvents(["a"], ["a", "b"], false)).toEqual([]);
    expect(maskWebhookSecret("ab12")).toBe("whsec_••••••••ab12");
    expect(webhookPollUnit(300)).toEqual({ value: 5, unit: "minute" });
    expect(webhookDeliveryStats([{ status: "success" }, { status: "failed" }]).rate).toBe(0.5);
    expect(isWebhookSourceStale(Date.now() - 10_000_000, 60)).toBe(true);
  });
});

describe("NqWebhooksManager", () => {
  it("renders the tabs and the endpoint rows", () => {
    const w = mount(NqWebhooksManager, { props: { events, endpoints, deliveries, onSaveEndpoint: vi.fn(), onDeleteEndpoint: vi.fn(), class: "max-w-5xl" } });
    expect(w.attributes("data-slot")).toBe("webhooks-manager");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-5xl"]));
    expect(w.text()).toContain("Webhooks");
    expect(w.text()).toContain("Endpoints");
    expect(w.text()).toContain("Deliveries");
    expect(w.text()).toContain("Order updates");
    expect(w.text()).toContain("https://billing.example.com/hook");
  });

  it("shows the push endpoint card and dismisses it", async () => {
    const onDismissPush = vi.fn();
    const w = mount(NqWebhooksManager, { props: { events, endpoints, pushEndpoint: { url: "https://x.example.com/in", token: "tok_123" }, onDismissPush, onSaveEndpoint: vi.fn(), onDeleteEndpoint: vi.fn() } });
    expect(w.find('[data-slot="webhooks-push"]').exists()).toBe(true);
    await w.findAll("button").find((b) => b.text().includes("I have saved it"))!.trigger("click");
    expect(onDismissPush).toHaveBeenCalled();
  });

  it("validates the endpoint dialog and saves, then reveals the secret once", async () => {
    const onSaveEndpoint = vi.fn(async () => ({ secret: "whsec_abc123" }));
    const w = mount(NqWebhooksManager, { props: { events, endpoints, onSaveEndpoint, onDeleteEndpoint: vi.fn() }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Add endpoint"))!.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>('[data-slot="webhooks-endpoint-form"] form')!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Enter a name.");
    expect(document.body.textContent).toContain("Enter a URL.");
    expect(document.body.textContent).toContain("Pick at least one event.");
    expect(onSaveEndpoint).not.toHaveBeenCalled();

    const inputs = form.querySelectorAll<HTMLInputElement>("input");
    const type = (el: HTMLInputElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    type(inputs[0]!, "Mine");
    type(form.querySelector<HTMLInputElement>('input[type="url"]')!, "https://example.com/h");
    form.querySelectorAll<HTMLElement>('[role="checkbox"]')[1]!.click();
    await flushPromises();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onSaveEndpoint).toHaveBeenCalledTimes(1);
    const sent = (onSaveEndpoint.mock.calls[0] as unknown as [{ name: string; url: string; events: string[] }])[0];
    expect(sent).toMatchObject({ name: "Mine", url: "https://example.com/h" });
    expect(sent.events).toEqual(["order.created"]);
    await flushPromises();
    const reveal = document.querySelector('[data-slot="webhooks-reveal"]')!;
    expect(reveal.textContent).toContain("Signing secret");
    expect(reveal.querySelector<HTMLInputElement>("input")!.value).toBe("whsec_abc123");
  });

  it("toggles an endpoint through the switch", async () => {
    const onToggleEndpoint = vi.fn(async () => {});
    const w = mount(NqWebhooksManager, { props: { events, endpoints, onSaveEndpoint: vi.fn(), onDeleteEndpoint: vi.fn(), onToggleEndpoint }, attachTo: document.body });
    const sw = w.findAll('[role="switch"]')[0]!;
    await sw.trigger("click");
    await flushPromises();
    expect(onToggleEndpoint).toHaveBeenCalledWith("e2", true);
  });
});
