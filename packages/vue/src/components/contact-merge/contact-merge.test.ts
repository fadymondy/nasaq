import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqContactMerge, resolveContactMerge, type ContactMergeRecord } from ".";

const records: ContactMergeRecord[] = [
  {
    id: "a",
    name: "Sara One",
    values: { name: "Sara One", email: "sara@example.com", phone: "+966 50", tags: ["vip"] },
    stats: [{ label: "Deals", value: 2 }],
    consent: { email: "granted" },
  },
  {
    id: "b",
    name: "Sara Two",
    values: { name: "Sara Two", email: "sara@example.com", phone: "+966 55", jobTitle: "Designer", tags: ["lead"] },
    stats: [{ label: "Deals", value: 1 }],
    consent: { email: "denied" },
  },
];

afterEach(() => {
  document.body.innerHTML = "";
});

const mountIt = (onMerge: (o: unknown) => Promise<void | { error?: string }> = vi.fn(async () => undefined), extra: Record<string, unknown> = {}) =>
  mount(NqContactMerge, { props: { records, onMerge, ...extra }, attachTo: document.body });

describe("NqContactMerge", () => {
  it("asks only about the fields that differ and lists the identical ones apart", () => {
    const w = mountIt();
    expect(w.find("h3").text()).toBe("3 fields differ");
    expect(w.findAll('[data-slot="contact-merge-field"]')).toHaveLength(3);
    expect(w.find("details").text()).toContain("Email");
  });

  it("shows the result, the totals and the safest consent", () => {
    const w = mountIt();
    const result = w.get('[data-slot="contact-merge-result"]').text();
    expect(result).toContain("Sara One");
    expect(result).toContain("vip");
    expect(result).toContain("lead");
    expect(w.text()).toContain("Deals: 3");
    expect(w.text()).toContain("Opted out");
  });

  it("switching the survivor moves the untouched fields to it", async () => {
    const w = mountIt();
    const cards = w.findAll('[data-slot="radio-card"]');
    await cards[1]!.trigger("click");
    expect(w.get('[data-slot="contact-merge-result"]').text()).toContain("Sara Two");
  });

  it("confirms, then calls onMerge with the outcome", async () => {
    const onMerge = vi.fn(async () => undefined);
    const w = mountIt(onMerge);
    await w.findAll("button").find((b) => b.text() === "Merge 2 contacts")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Merge into Sara One?");
    expect(document.body.textContent).toContain("The other record is deleted.");
    const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Merge")!;
    confirm.click();
    await flushPromises();
    expect(onMerge).toHaveBeenCalledTimes(1);
    const outcome = (onMerge.mock.calls[0] as unknown[])[0] as ReturnType<typeof resolveContactMerge>;
    expect(outcome.survivorId).toBe("a");
    expect(outcome.mergedIds).toEqual(["b"]);
    expect(outcome.values.tags).toEqual(["vip", "lead"]);
    expect(outcome.values.jobTitle).toBe("Designer");
  });

  it("keeps the dialog and shows the error when onMerge returns one", async () => {
    const w = mountIt(vi.fn(async () => ({ error: "Locked by another user." })));
    await w.findAll("button").find((b) => b.text() === "Merge 2 contacts")!.trigger("click");
    await flushPromises();
    [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Merge")!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Locked by another user.");
    expect(document.body.textContent).toContain("Merge into Sara One?");
  });

  it("asks for two records", () => {
    const w = mount(NqContactMerge, { props: { records: [records[0]!], onMerge: async () => undefined } });
    expect(w.text()).toContain("Pick at least two contacts to merge.");
  });
});
