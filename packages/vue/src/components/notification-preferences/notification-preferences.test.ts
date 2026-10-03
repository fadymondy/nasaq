import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, NqNotificationPreferences, type NotificationKind, type NotificationPrefs } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const KINDS: NotificationKind[] = [
  { id: "mention", label: "Mentions", group: "Activity" },
  { id: "comment", label: "Comments", group: "Activity" },
  { id: "security", label: "Security", group: "Account", locked: ["email"] },
];
const VALUE: NotificationPrefs = { ...DEFAULT_PREFS, matrix: { mention: { email: true } } };
const NOW = new Date(2026, 8, 29, 9, 0, 0);

const make = (props: Record<string, unknown> = {}) =>
  mount(NqNotificationPreferences, { props: { kinds: KINDS, value: VALUE, onChange: vi.fn().mockResolvedValue(undefined), now: NOW, ...props }, attachTo: document.body });

const box = (w: ReturnType<typeof make>, label: string) => w.find(`[aria-label="${label}"]`);

describe("NqNotificationPreferences", () => {
  it("renders the matrix with locked cells ticked and disabled", () => {
    const w = make();
    expect(w.attributes("data-slot")).toBe("notification-preferences");
    expect(w.find('table[data-slot="notification-matrix"]').exists()).toBe(true);
    expect(box(w, "Mentions: Email").attributes("aria-checked")).toBe("true");
    expect(box(w, "Comments: Email").attributes("aria-checked")).toBe("false");
    const locked = box(w, "Security: Email");
    expect(locked.attributes("aria-checked")).toBe("true");
    expect(locked.attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("saves a cell at once and shows Saved", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const w = make({ onChange });
    await box(w, "Comments: Email").trigger("click");
    await flushPromises();
    expect(onChange.mock.calls[0]![0].matrix.comment.email).toBe(true);
    expect(w.text()).toContain("Saved");
    w.unmount();
  });

  it("rolls back and explains when saving fails", async () => {
    const onChange = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = make({ onChange });
    await box(w, "Comments: Email").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Nope");
    expect(box(w, "Comments: Email").attributes("aria-checked")).toBe("false");
    w.unmount();
  });

  it("turns a whole channel on from the header, skipping locked cells", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const w = make({ onChange });
    expect(box(w, "Turn Email on or off for every kind").attributes("aria-checked")).toBe("mixed");
    await box(w, "Turn Push on or off for every kind").trigger("click");
    await flushPromises();
    const next = onChange.mock.calls[0]![0] as NotificationPrefs;
    expect(next.matrix.mention!.push).toBe(true);
    expect(next.matrix.comment!.push).toBe(true);
    w.unmount();
  });

  it("asks the browser before turning push on, and changes nothing when refused", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const onRequestPush = vi.fn().mockResolvedValue("denied");
    const w = make({ onChange, pushPermission: "default", onRequestPush });
    expect(w.text()).toContain("The browser will ask for permission");
    await box(w, "Mentions: Push").trigger("click");
    await flushPromises();
    expect(onRequestPush).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(w.text()).toContain("Browser notifications are blocked");
    expect(box(w, "Mentions: Push").attributes("aria-checked")).toBe("false");
    w.unmount();
  });

  it("locks an unavailable channel and says why", () => {
    const w = make({ unavailable: { whatsapp: "Add a WhatsApp number first" } });
    expect(w.text()).toContain("Add a WhatsApp number first");
    expect(box(w, "Mentions: WhatsApp").attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("describes quiet hours across midnight", async () => {
    const value = { ...VALUE, quietHours: { enabled: true, from: "22:00", to: "07:00" } };
    const w = make({ value });
    const summary = w.find('[data-slot="quiet-summary"]').text();
    expect(summary).toContain("9 quiet each day");
    expect(summary).toContain("Ends the next day");
    expect(summary).toContain("Security notices always come through.");
    w.unmount();
  });

  it("validates the daily cap and saves a good one", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const w = make({ onChange, value: { ...VALUE, dailyCap: 20 } });
    const input = w.find('input[inputmode="numeric"]');
    (input.element as HTMLInputElement).value = "0";
    await input.trigger("input");
    await input.trigger("blur");
    expect(w.text()).toContain("Enter a whole number from 1 to 1,000.");
    expect(onChange).not.toHaveBeenCalled();
    (input.element as HTMLInputElement).value = "50";
    await input.trigger("input");
    await input.trigger("blur");
    await flushPromises();
    expect(onChange.mock.calls[0]![0].dailyCap).toBe(50);
    w.unmount();
  });

  it("shows the next digest from the given clock", () => {
    const value = { ...VALUE, digest: { enabled: true, frequency: "daily" as const, time: "08:00", day: 1 } };
    const w = make({ value });
    expect(w.find("time").attributes("datetime")).toBe(new Date(2026, 8, 30, 8, 0).toISOString());
    w.unmount();
  });

  it("hides sections that are not asked for", () => {
    const w = make({ sections: ["matrix"] });
    expect(w.text()).not.toContain("Quiet hours");
    expect(w.text()).not.toContain("Digest");
    w.unmount();
  });

  it("adds, tests and removes destinations", async () => {
    const onAddDestination = vi.fn().mockResolvedValue(undefined);
    const onTestDestination = vi.fn().mockResolvedValue({ ok: false, message: "Timed out" });
    const onRemoveDestination = vi.fn().mockResolvedValue(undefined);
    const w = make({
      destinations: [{ id: "d1", kind: "email", target: "team@example.com", verified: false }],
      onAddDestination,
      onTestDestination,
      onRemoveDestination,
    });
    const dest = w.find('[data-slot="notification-destinations"]');
    expect(dest.text()).toContain("Waiting for confirmation");
    const input = dest.find("form input");
    (input.element as HTMLInputElement).value = "nope";
    await input.trigger("input");
    await dest.find("form").trigger("submit");
    expect(dest.text()).toContain("Enter a valid email address.");
    (input.element as HTMLInputElement).value = "ops@example.com";
    await input.trigger("input");
    await dest.find("form").trigger("submit");
    await flushPromises();
    expect(onAddDestination).toHaveBeenCalledWith({ kind: "email", target: "ops@example.com" });
    await dest.findAll("button").find((b) => b.text() === "Send a test")!.trigger("click");
    await flushPromises();
    expect(dest.text()).toContain("Timed out");
    w.unmount();
  });

  it("speaks Arabic", () => {
    document.documentElement.lang = "ar";
    const w = make();
    expect(w.text()).toContain("بماذا نُنبّهك");
    w.unmount();
  });
});
