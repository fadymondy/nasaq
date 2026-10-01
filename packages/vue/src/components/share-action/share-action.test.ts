import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { expiryToDate, mailtoLink, NqShareButton, parseEmails, withExpiry } from ".";
import { isEmail } from "./share-helpers";

const q = (s: string) => document.querySelector<HTMLElement>(s);

describe("share helpers", () => {
  it("validates, splits and dates", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("nope")).toBe(false);
    expect(parseEmails("A@x.com, b@y.com; a@x.com")).toEqual(["a@x.com", "b@y.com"]);
    expect(expiryToDate("never")).toBeNull();
    expect(expiryToDate("1d", 0)!.getTime()).toBe(86_400_000);
    expect(withExpiry("https://x.test/a", "7d", 0)).toContain("expires=1970-01-08");
    expect(mailtoLink("https://x.test", "Plan")).toContain("subject=Plan");
  });
});

describe("NqShareButton", () => {
  it("opens the dialog with the link, the people and the invite section", async () => {
    const onInvite = vi.fn();
    const w = mount(NqShareButton, {
      props: {
        url: "https://app.example.com/docs/q3",
        title: "Q3 plan",
        onInvite,
        people: [
          { id: "1", name: "Sara Ali", email: "sara@example.com", role: "owner", owner: true },
          { id: "2", name: "Omar Nasser", email: "omar@example.com", role: "editor" },
        ],
      },
      attachTo: document.body,
    });
    expect(w.find('[data-slot="share-button"]').text()).toContain("Share");
    await w.find('[data-slot="share-button"]').trigger("click");
    await flushPromises();
    const dialog = q('[data-slot="share-dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain("Share: Q3 plan");
    expect(dialog.textContent).toContain("Sara Ali");
    expect(dialog.textContent).toContain("Owner");
    expect(dialog.querySelector<HTMLInputElement>("input[readonly]")!.value).toBe("https://app.example.com/docs/q3");
    expect(dialog.querySelector('a[href^="mailto:"]')).not.toBeNull();
    expect(dialog.textContent).toContain("Invite people");
    w.unmount();
  });

  it("leaves the invite section out without onInvite", async () => {
    const w = mount(NqShareButton, { props: { url: "https://x.test" }, attachTo: document.body });
    await w.find('[data-slot="share-button"]').trigger("click");
    await flushPromises();
    expect(q('[data-slot="share-dialog"]')!.textContent).not.toContain("Send invite");
    w.unmount();
  });
});
