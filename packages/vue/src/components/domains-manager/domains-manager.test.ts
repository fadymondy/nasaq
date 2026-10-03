import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidDomainHostname, normalizeDomainHost, NqDomainChips, NqDomainsManager, splitDomainOverflow, summarizeDomains, type DomainRecord } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const domains: DomainRecord[] = [
  { id: "1", host: "shop.example.com", check: "verified", primary: true, addedAt: Date.now() - 86_400_000 },
  { id: "2", host: "www.example.com", check: "failed", error: "CNAME mismatch" },
  { id: "3", host: "a.example.org", check: "pending" },
  { id: "4", host: "b.example.org", check: "pending" },
];
const cb = () => vi.fn(async () => {});

describe("domains helpers", () => {
  it("normalises, validates, summarises and splits", () => {
    expect(normalizeDomainHost("HTTPS://Shop.Example.com/path")).toBe("shop.example.com");
    expect(isValidDomainHostname("shop.example.com")).toBe(true);
    expect(isValidDomainHostname("nope")).toBe(false);
    expect(summarizeDomains(domains)).toMatchObject({ total: 4, verified: 1 });
    expect(splitDomainOverflow([1, 2, 3], 2).hidden.length).toBe(0);
    expect(splitDomainOverflow([1, 2, 3, 4], 2).hidden.length).toBe(2);
  });
});

describe("NqDomainsManager", () => {
  it("renders the card, summary, setup box and rows", () => {
    const w = mount(NqDomainsManager, { props: { domains, cnameTarget: "edge.example.com", onAdd: cb(), onRemove: cb(), onRecheck: cb(), class: "max-w-2xl" } });
    expect(w.attributes("data-slot")).toBe("domains-manager");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-2xl"]));
    expect(w.find('[data-slot="domains-add"]').exists()).toBe(true);
    expect(w.find('[data-slot="domains-setup"]').text()).toContain("edge.example.com");
    expect(w.text()).toContain("shop.example.com");
    expect(w.text()).toContain("Primary");
  });

  it("rejects an invalid host and a duplicate, then adds a good one", async () => {
    const onAdd = cb();
    const w = mount(NqDomainsManager, { props: { domains, onAdd, onRemove: cb(), onRecheck: cb() } });
    const input = w.find('[data-slot="domains-add"] input');
    await input.setValue("nope");
    await w.find('[data-slot="domains-add"]').trigger("submit");
    expect(onAdd).not.toHaveBeenCalled();
    await input.setValue("shop.example.com");
    await w.find('[data-slot="domains-add"]').trigger("submit");
    expect(onAdd).not.toHaveBeenCalled();
    await input.setValue("https://New.Example.com/x");
    await w.find('[data-slot="domains-add"]').trigger("submit");
    await flushPromises();
    expect(onAdd).toHaveBeenCalledWith("new.example.com");
  });
});

describe("NqDomainChips", () => {
  it("shows up to max chips and folds the rest into a +N chip", () => {
    const w = mount(NqDomainChips, { props: { domains, max: 2 } });
    expect(w.attributes("data-slot")).toBe("domain-chips");
    const chips = w.findAll('[data-slot="domain-chip"]');
    expect(chips.map((c) => c.attributes("data-check"))).toEqual(["verified", "failed"]);
    expect(w.find('[data-slot="domain-chips-more"]').text()).toContain("2");
  });

  it("has no more chip when everything fits", () => {
    const w = mount(NqDomainChips, { props: { domains: domains.slice(0, 2), max: 2 } });
    expect(w.find('[data-slot="domain-chips-more"]').exists()).toBe(false);
  });
});
