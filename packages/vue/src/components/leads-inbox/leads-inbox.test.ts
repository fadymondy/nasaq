import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canConvertLead, canMoveLead, classifyLeadSource, leadPipelineStates, NqLeadAttributionList, NqLeadSourceBadge, NqLeadsInbox, type Lead } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const leads: Lead[] = [
  { id: "1", name: "Sara Haddad", email: "sara@acme.example", company: "Acme", message: "Need a demo", status: "new", receivedAt: "2026-09-29T07:30:00Z", attribution: { utmSource: "google", utmMedium: "cpc", utmCampaign: "q3", gclid: "abc123" } },
  { id: "2", name: "Omar Nasser", email: "omar@example.com", status: "qualified", receivedAt: "2026-09-28T07:30:00Z" },
  { id: "3", name: "Spammy", status: "spam", receivedAt: "2026-09-27T07:30:00Z" },
];
const button = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim().startsWith(text));

describe("leads-inbox logic", () => {
  it("classifies sources and moves", () => {
    expect(classifyLeadSource({ gclid: "x" })).toMatchObject({ kind: "paid", name: "Google Ads" });
    expect(classifyLeadSource({ referrer: "https://www.linkedin.com/x" }).kind).toBe("social");
    expect(classifyLeadSource(undefined).kind).toBe("direct");
    expect(canMoveLead("converted", "new")).toBe(false);
    expect(canConvertLead("spam")).toBe(false);
    expect(leadPipelineStates("contacted").map((s) => s.state)).toEqual(["done", "current", "todo", "todo"]);
  });
});

describe("NqLeadsInbox", () => {
  it("shows the pipeline counts and filters by stage", async () => {
    const w = mount(NqLeadsInbox, { props: { leads }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("leads-inbox");
    expect(w.text()).toContain("Sara Haddad");
    await w.findAll("button").find((b) => b.text().startsWith("Spam"))!.trigger("click");
    expect(w.findAll("tbody tr[data-row]")).toHaveLength(1);
    expect(w.text()).toContain("Spammy");
  });

  it("renders the source badge and the attribution list", () => {
    const b = mount(NqLeadSourceBadge, { props: { attribution: leads[0]!.attribution } });
    expect(b.text()).toContain("Paid");
    expect(b.text()).toContain("Google Ads · q3");
    const l = mount(NqLeadAttributionList, { props: { attribution: leads[0]!.attribution } });
    expect(l.text()).toContain("UTM campaign");
    expect(l.text()).toContain("abc123");
    expect(mount(NqLeadAttributionList, { props: {} }).text()).toBe("Direct visit");
  });

  it("opens the detail on a row click and sends a reply", async () => {
    const onReply = vi.fn(async () => undefined);
    const w = mount(NqLeadsInbox, { props: { leads, onReply, onStatusChange: vi.fn(async () => undefined) }, attachTo: document.body });
    await w.find("tbody tr[data-row]").trigger("click");
    await flushPromises();
    const sheet = document.body.querySelector('[data-slot="sheet-content"]');
    expect(sheet).not.toBeNull();
    expect(sheet!.textContent).toContain("Need a demo");
    const area = sheet!.querySelector("textarea")!;
    area.value = "Thanks Sara";
    area.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    button("Send reply")!.click();
    await flushPromises();
    expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), "Thanks Sara");
  });

  it("converts a lead through the dialog", async () => {
    const onConvert = vi.fn(async () => undefined);
    const w = mount(NqLeadsInbox, { props: { leads, onConvert, defaultOpenId: "1" }, attachTo: document.body });
    await flushPromises();
    button("Convert to CRM")!.click();
    await flushPromises();
    expect(document.body.querySelector('[data-slot="lead-convert-dialog"]')).not.toBeNull();
    [...document.body.querySelectorAll<HTMLButtonElement>("[data-slot=lead-convert-dialog] button")].find((b) => b.textContent?.trim() === "Convert")!.click();
    await flushPromises();
    expect(onConvert).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), { contactName: "Sara Haddad", company: "Acme", deal: undefined });
    w.unmount();
  });
});
