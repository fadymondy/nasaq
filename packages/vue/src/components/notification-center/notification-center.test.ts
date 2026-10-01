import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqNotificationCenter } from ".";

const items = [
  { id: "1", title: "Sara mentioned you", unread: true, actor: { name: "Sara Alharbi" } },
  { id: "2", title: "Invoice paid" },
];

describe("NqNotificationCenter", () => {
  it("shows an unread count on the bell and opens a panel listing items", async () => {
    const w = mount(NqNotificationCenter, { props: { items }, attachTo: document.body });
    const bell = w.find("button");
    expect(bell.attributes("aria-label") ?? bell.text()).toBeTruthy();
    expect(w.text()).toContain("1");
    await bell.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Sara mentioned you");
    expect(document.body.textContent).toContain("Invoice paid");
    w.unmount();
  });

  it("emits markAllRead and itemClick", async () => {
    const w = mount(NqNotificationCenter, { props: { items, defaultOpen: true }, attachTo: document.body });
    await flushPromises();
    const mark = [...document.querySelectorAll("button")].find((b) => /mark all/i.test(b.textContent ?? ""));
    expect(mark).toBeTruthy();
    mark!.click();
    expect(w.emitted("markAllRead")).toHaveLength(1);
    const row = [...document.querySelectorAll<HTMLElement>("button,a")].find((b) => (b.textContent ?? "").includes("Invoice paid"));
    row!.click();
    expect(w.emitted("itemClick")![0]![0]).toMatchObject({ id: "2" });
    w.unmount();
  });
});
