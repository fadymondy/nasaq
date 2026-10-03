import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqDeliveryTracker } from ".";

describe("NqDeliveryTracker", () => {
  it("renders five steps with state attributes and a live ETA while on the way", () => {
    const w = mount(NqDeliveryTracker, { props: { status: "on-the-way", orderNumber: "1042", etaSeconds: 540, class: "gap-8" } });
    expect(w.attributes("data-slot")).toBe("delivery-tracker");
    expect(w.attributes("data-status")).toBe("on-the-way");
    expect(w.attributes("aria-label")).toBe("Order tracking");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "gap-8"]));
    expect(w.classes()).not.toContain("gap-4");
    const steps = w.findAll("li[data-step]");
    expect(steps.map((s) => s.attributes("data-state"))).toEqual(["done", "done", "done", "current", "upcoming"]);
    expect(steps[3]!.attributes("aria-current")).toBe("step");
    expect(steps[3]!.text()).toContain("(current step)");
    expect(w.find('[data-slot="delivery-eta"]').text()).toBe("Arriving in 9 min");
    expect(w.text()).toContain("Order 1042");
    expect(w.find('[data-slot="delivery-terminal"]').exists()).toBe(false);
  });

  it("shows a stopped step and the reason for a cancelled order", () => {
    const w = mount(NqDeliveryTracker, { props: { status: "cancelled", reachedBefore: "assigned", reason: "Customer asked" } });
    const states = w.findAll("li[data-step]").map((s) => s.attributes("data-state"));
    expect(states).toEqual(["done", "done", "stopped", "upcoming", "upcoming"]);
    const alert = w.find('[role="alert"]');
    expect(alert.text()).toContain("Order cancelled");
    expect(alert.text()).toContain("Reason: Customer asked");
    expect(w.find("[data-slot='delivery-eta']").exists()).toBe(false);
  });

  it("shows the courier with a tel link, or buttons when listeners are set; renders the map slot", async () => {
    const courier = { name: "Omar", nameAr: "عمر", phone: "+970 59-123-4567", vehicle: "Motorbike" };
    const link = mount(NqDeliveryTracker, { props: { status: "assigned", courier }, slots: { map: "<i data-x>map</i>" } });
    expect(link.find('[data-slot="delivery-courier"]').text()).toContain("Omar");
    expect(link.find("a").attributes("href")).toBe("tel:+970591234567");
    expect(link.find('[data-slot="delivery-map"] [data-x]').exists()).toBe(true);

    let called = 0;
    const btn = mount(NqDeliveryTracker, { props: { status: "on-the-way", courier }, attrs: { onCall: () => called++, onMessage: () => {} } });
    expect(btn.find("a").exists()).toBe(false);
    const buttons = btn.findAll("button");
    expect(buttons.map((b) => b.text())).toEqual(["Message", "Call"]);
    await buttons[1]!.trigger("click");
    expect(called).toBe(1);
    expect(mount(NqDeliveryTracker, { props: { status: "delivered", courier } }).find('[data-slot="delivery-courier"]').exists()).toBe(false);
  });

  it("uses Arabic words and the Arabic courier name under an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqDeliveryTracker },
      template: `<NasaqProvider locale="ar" target="scope"><NqDeliveryTracker status="on-the-way" :eta-seconds="540" :courier="{ name: 'Omar', nameAr: 'عمر' }" /></NasaqProvider>`,
    });
    expect(w.text()).toContain("في الطريق إليك");
    expect(w.text()).toContain("يصل خلال 9 د");
    expect(w.text()).toContain("عمر");
    expect(w.find("section").attributes("aria-label")).toBe("تتبّع الطلب");
  });
});
