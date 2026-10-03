import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqAccountDeletion, NqCancelDeletionPage, NqDataExport, NqDataPrivacy, daysRemaining, deletionDate, deletionPhase, graceElapsed, pollDelay, type DataExportRequest } from ".";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const NOW = new Date(2026, 8, 29, 9, 0, 0);
const ready: DataExportRequest = { id: "e1", status: "ready", requestedAt: new Date(2026, 8, 28), completedAt: new Date(2026, 8, 28, 1), expiresAt: new Date(2026, 9, 5), sizeBytes: 2048 };

describe("privacy rules", () => {
  it("computes dates and delays", () => {
    expect(pollDelay(0)).toBe(3000);
    expect(pollDelay(2)).toBe(6750);
    expect(pollDelay(20)).toBe(30000);
    expect(deletionDate(NOW, 30).getTime() - NOW.getTime()).toBe(30 * 86_400_000);
    expect(daysRemaining(new Date(2026, 9, 14), NOW)).toBe(15);
    expect(deletionPhase(null, NOW)).toBe("none");
    expect(deletionPhase(new Date(2026, 8, 1), NOW)).toBe("due");
    expect(graceElapsed(new Date(2026, 9, 14), 30, NOW)).toBeCloseTo(0.5, 1);
  });
});

describe("NqDataExport", () => {
  it("offers to request when nothing exists", async () => {
    const onRequest = vi.fn().mockResolvedValue({ request: { id: "e2", status: "queued", requestedAt: NOW } });
    const onChange = vi.fn();
    const w = mount(NqDataExport, { props: { request: null, onRequest, onChange }, attachTo: document.body });
    expect(w.attributes("data-status")).toBe("none");
    await w.findAll("button").find((b) => b.text() === "Request export")!.trigger("click");
    await flushPromises();
    expect(onChange).toHaveBeenCalled();
    expect(w.attributes("data-status")).toBe("queued");
    expect(w.text()).toContain("Waiting in line");
    w.unmount();
  });

  it("shows the error from a failed request", async () => {
    const w = mount(NqDataExport, { props: { request: null, onRequest: vi.fn().mockResolvedValue({ error: "Busy" }) }, attachTo: document.body });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Busy");
    w.unmount();
  });

  it("downloads a ready export", async () => {
    const onDownload = vi.fn();
    const w = mount(NqDataExport, { props: { request: ready, onRequest: vi.fn(), onDownload, includes: ["Profile"] }, attachTo: document.body });
    expect(w.text()).toContain("Ready to download");
    expect(w.text()).toContain("Profile");
    await w.findAll("button").find((b) => b.text().startsWith("Download"))!.trigger("click");
    await flushPromises();
    expect(onDownload).toHaveBeenCalledWith(ready);
    w.unmount();
  });

  it("polls with backoff until ready, then stops", async () => {
    vi.useFakeTimers();
    const poll = vi.fn().mockResolvedValue(ready);
    const w = mount(NqDataExport, { props: { request: { id: "e1", status: "processing", requestedAt: NOW, progress: 0.4 }, onRequest: vi.fn(), poll }, attachTo: document.body });
    expect(w.find('[role="progressbar"]').exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(poll).toHaveBeenCalledTimes(1);
    expect(w.attributes("data-status")).toBe("ready");
    await vi.advanceTimersByTimeAsync(60000);
    expect(poll).toHaveBeenCalledTimes(1);
    w.unmount();
  });

  it("stalls after three failures and checks again on request", async () => {
    vi.useFakeTimers();
    const poll = vi.fn().mockRejectedValue(new Error("x"));
    const w = mount(NqDataExport, { props: { request: { id: "e1", status: "queued", requestedAt: NOW }, onRequest: vi.fn(), poll }, attachTo: document.body });
    await vi.advanceTimersByTimeAsync(60000);
    expect(poll).toHaveBeenCalledTimes(3);
    expect(w.text()).toContain("We could not check the status");
    await w.findAll("button").find((b) => b.text() === "Check again")!.trigger("click");
    await vi.advanceTimersByTimeAsync(3000);
    expect(poll).toHaveBeenCalledTimes(4);
    w.unmount();
  });
});

describe("NqAccountDeletion", () => {
  it("shows the danger zone, and the schedule date after confirming", async () => {
    const onSchedule = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAccountDeletion, { props: { confirmText: "me@x.com", onSchedule, onCancel: vi.fn(), now: NOW }, attachTo: document.body });
    expect(w.attributes("data-phase")).toBe("none");
    expect(w.text()).toContain("permanently deleted after 30 days");
    await w.findAll("button").find((b) => b.text() === "Delete my account")!.trigger("click");
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('input[name="confirm-delete"]')!;
    input.value = "me@x.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    document.body.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await flushPromises();
    expect(onSchedule).toHaveBeenCalled();
    expect(w.attributes("data-phase")).toBe("pending");
    expect(w.text()).toContain("30 days left");
    w.unmount();
  });

  it("shows the countdown and cancels", async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAccountDeletion, { props: { scheduledFor: new Date(2026, 9, 14, 9), confirmText: "x", onSchedule: vi.fn(), onCancel, now: NOW }, attachTo: document.body });
    expect(w.attributes("data-phase")).toBe("pending");
    expect(w.text()).toContain("15 days left");
    await w.findAll("button").find((b) => b.text() === "Cancel deletion")!.trigger("click");
    await flushPromises();
    expect(onCancel).toHaveBeenCalled();
    expect(w.attributes("data-phase")).toBe("none");
    expect(w.text()).toContain("Deletion cancelled");
    w.unmount();
  });

  it("says the account is being deleted once the date passed", () => {
    const w = mount(NqAccountDeletion, { props: { scheduledFor: new Date(2026, 8, 1), confirmText: "x", onSchedule: vi.fn(), onCancel: vi.fn(), now: NOW }, attachTo: document.body });
    expect(w.attributes("data-phase")).toBe("due");
    expect(w.text()).toContain("being deleted");
    w.unmount();
  });
});

describe("NqCancelDeletionPage", () => {
  it("keeps the account and shows the result", async () => {
    const onCancelDeletion = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqCancelDeletionPage, { props: { state: "ready", bare: true, account: { name: "Sara", email: "s@x.com" }, scheduledFor: new Date(2026, 9, 14), onCancelDeletion, onSignIn: vi.fn() }, attachTo: document.body });
    expect(w.find('[data-slot="cancel-deletion-page"]').attributes("data-state")).toBe("ready");
    expect(w.text()).toContain("s@x.com");
    await w.findAll("button").find((b) => b.text() === "Keep my account")!.trigger("click");
    await flushPromises();
    expect(w.find('[data-slot="cancel-deletion-page"]').attributes("data-state")).toBe("cancelled");
    expect(w.text()).toContain("Your account is safe");
    w.unmount();
  });

  it("shows the failure message", async () => {
    const w = mount(NqCancelDeletionPage, { props: { state: "ready", bare: true, onCancelDeletion: vi.fn().mockResolvedValue({ error: "Link used" }) }, attachTo: document.body });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Link used");
    w.unmount();
  });

  it("explains an expired link", () => {
    const w = mount(NqCancelDeletionPage, { props: { state: "expired", bare: true, onCancelDeletion: vi.fn(), onSignUp: vi.fn() }, attachTo: document.body });
    expect(w.text()).toContain("This account has been deleted");
    expect(w.text()).toContain("Create a new account");
    w.unmount();
  });
});

describe("NqDataPrivacy", () => {
  it("stacks both flows and speaks Arabic", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqDataPrivacy, {
      props: { dataExport: { request: null, onRequest: vi.fn() }, deletion: { confirmText: "x", onSchedule: vi.fn(), onCancel: vi.fn(), now: NOW } },
      attachTo: document.body,
    });
    expect(w.attributes("data-slot")).toBe("data-privacy");
    expect(w.find('[data-slot="data-export"]').exists()).toBe(true);
    expect(w.find('[data-slot="account-deletion"]').exists()).toBe(true);
    expect(w.text()).toContain("صدّر بياناتك");
    w.unmount();
  });
});
