import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqNotificationItem } from ".";

describe("NqNotificationItem", () => {
  it("is a button with the row classes, an avatar and the unread dot", async () => {
    const w = mount(NqNotificationItem, {
      props: { actor: { name: "نور عادل" }, title: "Mention", description: "Ship it", time: "2m", dateTime: "2026-09-29T10:15:00Z", unread: true },
      attrs: { class: "px-6" },
    });
    expect(w.element.tagName).toBe("BUTTON");
    expect(w.attributes("type")).toBe("button");
    expect(w.attributes("data-slot")).toBe("notification-item");
    expect(w.attributes("data-unread")).toBe("");
    expect(w.classes()).toEqual(expect.arrayContaining(["hover:bg-nq-hover", "px-6"]));
    expect(w.classes()).not.toContain("px-4");
    expect(w.find('[data-slot="avatar"]').exists()).toBe(true);
    expect(w.find("time").attributes("datetime")).toBe("2026-09-29T10:15:00Z");
    expect(w.find(".sr-only").text()).toBe("Unread");
    expect(w.find("span.min-w-0 > span.font-medium").text()).toBe("Mention");
    await w.trigger("click");
    expect(w.emitted("click")).toHaveLength(1);
  });

  it("read rows are muted and have no dot; the icon slot wins over the actor", () => {
    const w = mount(NqNotificationItem, { props: { actor: { name: "A" }, title: "T" }, slots: { icon: "<svg data-i />" } });
    expect(w.attributes("data-unread")).toBeUndefined();
    expect(w.find(".sr-only").exists()).toBe(false);
    expect(w.find("span.min-w-0 > span.text-body-sm").text()).toBe("T");
    expect(w.find('[data-slot="avatar"]').exists()).toBe(false);
    expect(w.find("[data-i]").exists()).toBe(true);
  });

  it("renders an anchor with rel for new tabs, and the unread label", () => {
    const w = mount(NqNotificationItem, { props: { href: "/x", target: "_blank", title: "T", unread: true, unreadLabel: "غير مقروء" } });
    expect(w.element.tagName).toBe("A");
    expect(w.attributes("href")).toBe("/x");
    expect(w.attributes("rel")).toBe("noopener noreferrer");
    expect(w.attributes("type")).toBeUndefined();
    expect(w.find(".sr-only").text()).toBe("غير مقروء");
  });
});
