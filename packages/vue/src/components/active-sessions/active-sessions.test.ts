import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqActiveSessions, type ActiveSession } from ".";

const now = Date.now();
const sessions: ActiveSession[] = [
  { id: "b", device: "Safari on iPhone", kind: "mobile", ip: "41.1.1.1", location: "Cairo, Egypt", lastActiveAt: now - 5 * 3_600_000 },
  { id: "a", device: "Chrome on macOS", kind: "desktop", lastActiveAt: now - 60_000, current: true },
  { id: "c", lastActiveAt: now - 86_400_000 },
];

const rows = (w: { findAll: (s: string) => unknown[] }) => w.findAll('[data-slot="session-row"]') as ReturnType<ReturnType<typeof mount>["findAll"]>;

describe("NqActiveSessions", () => {
  it("lists the current device first, marked, with device, place, IP and relative time", () => {
    const w = mount(NqActiveSessions, { props: { sessions } });
    expect(w.attributes("data-slot")).toBe("active-sessions");
    expect(w.find("h2").text()).toBe("Active sessions");
    expect(w.find("ul").attributes("aria-label")).toBe("Signed-in devices");
    const r = rows(w);
    expect(r).toHaveLength(3);
    expect(r[0]!.attributes("data-current")).toBe("");
    expect(r[0]!.text()).toContain("Chrome on macOS");
    expect(r[0]!.text()).toContain("This device");
    expect(r[1]!.attributes("data-current")).toBeUndefined();
    expect(r[1]!.text()).toContain("Cairo, Egypt");
    expect(r[1]!.find("[dir=ltr]").text()).toBe("41.1.1.1");
    expect(r[1]!.find("time").attributes("datetime")).toBeTruthy();
    expect(r[2]!.text()).toContain("Unknown device");
    expect(w.find("li:first-child").classes()).toContain("first:border-t-0");
  });

  it("shows sign out only on other devices when onRevoke is set, named by the device", () => {
    const none = mount(NqActiveSessions, { props: { sessions } });
    expect(none.findAll('[data-slot="alert-dialog-trigger"]')).toHaveLength(0);
    const w = mount(NqActiveSessions, { props: { sessions, onRevoke: async () => {}, onRevokeOthers: async () => {} } });
    const r = rows(w);
    expect(r[0]!.find("button").exists()).toBe(false);
    expect(r[1]!.find("button").text()).toBe("Sign out: Safari on iPhone");
    expect(w.findAll('[data-slot="alert-dialog-trigger"]')).toHaveLength(3);
  });

  it("revokes after the confirmation and keeps the dialog open with the error on failure", async () => {
    const onRevoke = vi.fn().mockResolvedValue({ error: "Could not sign out" });
    const w = mount(NqActiveSessions, { props: { sessions, onRevoke }, attachTo: document.body });
    await rows(w)[1]!.find("button").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-slot="confirm-button-action"]')!.click();
    await flushPromises();
    expect(onRevoke).toHaveBeenCalledWith("b");
    expect(w.find('[data-slot="alert"]').text()).toBe("Could not sign out");
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    w.unmount();
  });

  it("shows the empty state when no sessions are listed and hides sign-out-others without others", () => {
    const empty = mount(NqActiveSessions, { props: { sessions: [] } });
    expect(empty.find('[data-slot="empty-state"]').text()).toContain("No other sessions");
    const one = mount(NqActiveSessions, { props: { sessions: [sessions[1]!], onRevokeOthers: async () => {} } });
    expect(one.find('[data-slot="card-action"]').exists()).toBe(false);
  });

  it("uses Arabic strings by locale and lets labels override", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqActiveSessions, { props: { sessions, labels: { current: "هنا" } } });
    expect(w.find("h2").text()).toBe("الجلسات النشطة");
    expect(w.text()).toContain("هنا");
    document.documentElement.lang = "en";
  });
});
