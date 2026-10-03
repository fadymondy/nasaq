import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dnsFqdn, dnsNeedsPriority, formatDnsTtl, isDnsHostname, isDnsIPv4, isDnsIPv6, isDnsProxiable, NqDnsManagement, validateDnsRecord, type DnsRecord } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const records: DnsRecord[] = [
  { id: "a", type: "A", name: "@", content: "203.0.113.10", ttl: 1, proxied: true },
  { id: "b", type: "MX", name: "mail", content: "mx.example.com", ttl: 3600, priority: 10 },
];

describe("dns helpers", () => {
  it("validates addresses and names", () => {
    expect(isDnsIPv4("203.0.113.10")).toBe(true);
    expect(isDnsIPv4("300.1.1.1")).toBe(false);
    expect(isDnsIPv6("2001:db8::1")).toBe(true);
    expect(isDnsHostname("mail.example.com")).toBe(true);
    expect(isDnsProxiable("A")).toBe(true);
    expect(isDnsProxiable("MX")).toBe(false);
    expect(dnsNeedsPriority("MX")).toBe(true);
    expect(dnsFqdn("www", "example.com")).toBe("www.example.com");
    expect(dnsFqdn("@", "example.com")).toBe("example.com");
    expect(formatDnsTtl(1, { auto: "Auto", minutes: (n: number) => `${n} min`, hours: (n: number) => `${n} h`, days: (n: number) => `${n} d`, seconds: (n: number) => `${n} s` })).toBe("Auto");
  });

  it("validates a draft", () => {
    const errors = validateDnsRecord({ type: "A", name: "@", content: "nope", ttl: 300, proxied: false, priority: 0 }, "example.com");
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });
});

describe("NqDnsManagement", () => {
  it("renders the card, the rows and the zone", () => {
    const w = mount(NqDnsManagement, { props: { zone: "example.com", records, onSave: vi.fn(async () => {}), class: "max-w-2xl" } });
    expect(w.attributes("data-slot")).toBe("dns-management");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-2xl"]));
    expect(w.text()).toContain("DNS records");
    expect(w.text()).toContain("example.com");
    expect(w.text()).toContain("203.0.113.10");
    expect(w.text()).toContain("mx.example.com");
  });

  it("shows the empty state", () => {
    const w = mount(NqDnsManagement, { props: { zone: "example.com", records: [], onSave: vi.fn(async () => {}) } });
    expect(w.text()).toContain("No DNS records yet");
  });

  it("opens the add dialog and blocks an invalid record", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqDnsManagement, { props: { zone: "example.com", records, onSave }, attachTo: document.body });
    const add = w.findAll("button").find((b) => b.text().includes("Add record"))!;
    await add.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>('[data-slot="dns-record-form"]')!;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    w.unmount();
  });
});
