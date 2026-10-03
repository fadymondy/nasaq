// The Blade notification-center example under real Alpine (nqNotificationCenter).
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const trigger = () => document.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!;
const popup = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]')!;
const badge = () => document.querySelector<HTMLElement>('[data-notification="badge"]')!;
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="notification-item"]')];

describe("notification-center (Blade example)", () => {
  it("shows the unread count and is closed to start", async () => {
    await mount("notification-center");
    expect(badge().textContent?.trim()).toBe("1");
    expect(trigger().getAttribute("aria-label")).toBe("Notifications, 1 unread");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(popup().style.display).toBe("none");
  });

  it("opens and lists the rows in All and Unread", async () => {
    await mount("notification-center");
    trigger().click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(popup().textContent).toContain("Sara mentioned you in MH-142");
    expect(popup().textContent).toContain("Invoice INV-031 was paid");
    expect(items().length).toBeGreaterThanOrEqual(2);
  });

  it("pressing a row marks it read and fires nq-notification-click", async () => {
    await mount("notification-center");
    let id = "";
    document.addEventListener("nq-notification-click", (e) => (id = (e as CustomEvent).detail.id));
    trigger().click();
    await tick();
    items().find((i) => i.textContent?.includes("Sara"))!.click();
    await tick();
    expect(id).toBe("1");
    expect(badge().style.display).toBe("none");
  });

  it("Mark all read fires nq-mark-all-read", async () => {
    await mount("notification-center");
    let fired = 0;
    document.addEventListener("nq-mark-all-read", () => fired++);
    trigger().click();
    await tick();
    popup().querySelector<HTMLElement>('[data-notification="mark-all-read"]')!.click();
    await tick();
    expect(fired).toBe(1);
    expect(badge().style.display).toBe("none");
  });
});
