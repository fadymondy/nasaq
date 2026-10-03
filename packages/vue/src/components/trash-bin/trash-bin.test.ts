import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqTrashBin } from ".";
import { trashRetention } from "./trash-math";

afterEach(() => {
  document.body.innerHTML = "";
});

const now = new Date("2030-01-31T09:00:00Z");
const day = 86_400_000;
const items = [
  { id: "a", name: "Budget.xlsx", deletedAt: new Date(now.getTime() - 2 * day), deletedBy: "Huda" },
  { id: "b", name: "Plan", deletedAt: new Date(now.getTime() - 28 * day) },
];
const mk = (extra: Record<string, unknown> = {}) => mount(NqTrashBin, { props: { items, now, ...extra }, attachTo: document.body });

describe("trashRetention", () => {
  it("rounds days up and flags urgency", () => {
    const r = trashRetention(items[1]!.deletedAt, { retentionDays: 30, now });
    expect(r.daysLeft).toBe(2);
    expect(r.urgency).toBe("urgent");
    expect(trashRetention(items[0]!.deletedAt, { retentionDays: null, now }).urgency).toBe("kept");
  });
});

describe("NqTrashBin", () => {
  it("renders the heading, the retention notice and the rows", () => {
    const w = mk();
    expect(w.find('[data-slot="trash-bin"]').exists()).toBe(true);
    expect(w.find("h2").text()).toBe("Trash");
    expect(w.text()).toContain("30 days after you delete them");
    expect(w.text()).toContain("Budget.xlsx");
    expect(w.text()).toContain("2 days left");
    expect(w.find('[data-urgency="urgent"]').exists()).toBe(true);
    w.unmount();
  });

  it("speaks Arabic and hides the heading on null", () => {
    const w = mk({ locale: "ar", title: null });
    expect(w.find("h2").exists()).toBe(false);
    expect(w.text()).toContain("الاسم");
    w.unmount();
  });

  it("shows the empty state", () => {
    const w = mk({ items: [] });
    expect(w.text()).toContain("The trash is empty");
    w.unmount();
  });

  it("asks before emptying and calls onEmpty on confirm", async () => {
    const onEmpty = vi.fn(async () => {});
    const onNotify = vi.fn();
    const w = mk({ onEmpty, onNotify });
    await w.findAll("button").find((b) => b.text() === "Empty trash")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Empty the trash?");
    expect(onEmpty).not.toHaveBeenCalled();
    const confirm = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Empty trash" && b.closest('[role="alertdialog"]')) as HTMLElement;
    confirm.click();
    await flushPromises();
    expect(onEmpty).toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith("Trash emptied");
    w.unmount();
  });
});
