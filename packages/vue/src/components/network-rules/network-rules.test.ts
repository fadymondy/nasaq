import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { diffNetworkRules, formatProtocolPort, isValidCidr, isValidPort, lockoutRisk, NqNetworkRules, validateFirewallRule, type FirewallRule, type HttpRule } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const firewall: FirewallRule[] = [
  { id: "f1", action: "allow", protocol: "tcp", port: "22", source: "203.0.113.0/24", note: "Office" },
  { id: "f2", action: "allow", protocol: "tcp", port: "443", source: "any" },
];
const http: HttpRule[] = [{ id: "h1", type: "redirect", path: "/old", target: "https://example.com/new", status: 301 }];

describe("network helpers", () => {
  it("validates and formats", () => {
    expect(isValidCidr("10.0.0.0/24")).toBe(true);
    expect(isValidCidr("10.0.0.0/33")).toBe(false);
    expect(isValidPort("8000-8100")).toBe(true);
    expect(isValidPort("0")).toBe(false);
    expect(formatProtocolPort({ protocol: "tcp", port: "443" })).toBe("TCP 443");
    expect(validateFirewallRule({ protocol: "icmp", port: "1", source: "any" })).toEqual(["portForProtocol"]);
    expect(lockoutRisk([{ id: "x", action: "deny", protocol: "tcp", port: "22", source: "any" }])).toBe("x");
    expect(lockoutRisk(firewall)).toBeNull();
    const d = diffNetworkRules(firewall, [firewall[1]!, firewall[0]!]);
    expect(d.moved).toBe(true);
    expect(d.count).toBe(1);
  });
});

describe("NqNetworkRules", () => {
  it("renders the tabs and the firewall rows", () => {
    const w = mount(NqNetworkRules, { props: { firewall, http, onApplyFirewall: vi.fn(), onApplyHttp: vi.fn(), class: "max-w-4xl" } });
    expect(w.attributes("data-slot")).toBe("network-rules");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-4xl"]));
    expect(w.text()).toContain("Firewall");
    expect(w.text()).toContain("HTTP rules");
    expect(w.text()).toContain("TCP 443");
    expect(w.text()).toContain("Everything is applied.");
  });

  it("hides the HTTP tab without http rules", () => {
    const w = mount(NqNetworkRules, { props: { firewall, onApplyFirewall: vi.fn() } });
    expect(w.text()).not.toContain("HTTP rules");
  });

  it("stages a new rule and applies the whole list", async () => {
    const onApplyFirewall = vi.fn(async () => {});
    const w = mount(NqNetworkRules, { props: { firewall, onApplyFirewall }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Add rule"))!.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>('[data-slot="network-rule-dialog"] form')!;
    expect(form).not.toBeNull();
    const inputs = form.querySelectorAll<HTMLInputElement>("input");
    inputs[0]!.value = "8080";
    inputs[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(w.text()).toContain("1 change staged");
    expect(w.text()).toContain("New");
    await w.findAll("button").find((b) => b.text().includes("Apply changes"))!.trigger("click");
    await flushPromises();
    expect(onApplyFirewall).toHaveBeenCalledTimes(1);
    const sent = (onApplyFirewall.mock.calls[0] as unknown as [FirewallRule[]])[0];
    expect(sent).toHaveLength(3);
    expect(sent[2]).toMatchObject({ action: "allow", protocol: "tcp", port: "8080", source: "any" });
    expect(w.text()).toContain("Changes applied.");
  });

  it("rejects an invalid port in the dialog", async () => {
    const onApplyFirewall = vi.fn(async () => {});
    const w = mount(NqNetworkRules, { props: { firewall, onApplyFirewall }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text().includes("Add rule"))!.trigger("click");
    await flushPromises();
    const form = document.querySelector<HTMLFormElement>('[data-slot="network-rule-dialog"] form')!;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Enter a port from 1 to 65535");
    expect(w.text()).toContain("Everything is applied.");
  });

  it("warns about an SSH lockout", () => {
    const onApplyFirewall = vi.fn(async () => {});
    const w = mount(NqNetworkRules, { props: { firewall: [{ id: "x", action: "deny", protocol: "tcp", port: "22", source: "any" }], onApplyFirewall } });
    expect(w.text()).toContain("can lock you out");
  });
});
