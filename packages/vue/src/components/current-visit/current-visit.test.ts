import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqCurrentVisit } from ".";
import { canFinishVisit, followUpDate, formatVisitElapsed, validatePrescription, withoutBlankPrescriptions } from "./visit-math";

const NOW = new Date(2030, 0, 1, 9, 0).getTime();
const patient = { id: "p1", name: "Huda Salem", age: 34, phone: "+966 50 123 4567", allergies: ["Penicillin"], conditions: [] };
const mk = (extra: Record<string, unknown> = {}) =>
  mount(NqCurrentVisit, {
    props: { patient, service: "Consultation", room: "3", startedAt: NOW - 125_000, now: NOW, history: [], onFinish: async () => {}, ...extra },
    attachTo: document.body,
  });

describe("visit math", () => {
  it("validates, trims and decides when a visit can finish", () => {
    expect(formatVisitElapsed(125)).toBe("02:05");
    expect(validatePrescription({ drug: "", dose: "", frequency: "", days: 5 })).toBeDefined();
    expect(withoutBlankPrescriptions([{ id: "x", drug: "", dose: "", frequency: "", days: Number.NaN }])).toEqual([]);
    expect(canFinishVisit({ notes: "", prescriptions: [] }).ok).toBe(false);
    expect(canFinishVisit({ notes: "note", prescriptions: [] }).ok).toBe(true);
    expect(followUpDate(new Date(2030, 0, 1), 7).getDate()).toBe(8);
  });
});

describe("NqCurrentVisit", () => {
  it("shows the patient, the allergies and the running timer", () => {
    const w = mk();
    expect(w.find('[data-slot="current-visit"]').exists()).toBe(true);
    expect(w.find('[data-slot="current-visit-patient"]').text()).toContain("Huda Salem");
    expect(w.text()).toContain("Penicillin");
    expect(w.text()).toContain("No earlier visits.");
    expect(w.find('[role="timer"]').text()).toContain("02:05");
    w.unmount();
  });

  it("blocks finishing with nothing recorded", async () => {
    const onFinish = vi.fn(async () => {});
    const w = mk({ onFinish });
    await w.findAll("button").find((b) => b.text() === "Finish visit")!.trigger("click");
    await flushPromises();
    expect(onFinish).not.toHaveBeenCalled();
    expect(w.text()).toContain("Add a note or a prescription to finish.");
    w.unmount();
  });

  it("finishes with the note and a chosen follow-up", async () => {
    const onFinish = vi.fn(async () => {});
    const w = mk({ onFinish });
    await w.find("textarea").setValue("All good");
    await w.findAll("button").find((b) => b.text() === "In 1 week")!.trigger("click");
    expect(w.findAll("button").find((b) => b.text() === "In 1 week")!.attributes("aria-pressed")).toBe("true");
    await w.findAll("button").find((b) => b.text() === "Finish visit")!.trigger("click");
    await flushPromises();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = (onFinish.mock.calls[0] as unknown as [{ notes: string; followUp: Date | null }])[0];
    expect(result.notes).toBe("All good");
    expect(result.followUp).toBeInstanceOf(Date);
    w.unmount();
  });

  it("flags a half-filled medicine instead of dropping it", async () => {
    const onFinish = vi.fn(async () => {});
    const w = mk({ onFinish });
    await w.findAll("button").find((b) => b.text() === "Add medicine")!.trigger("click");
    await w.find('[data-slot="current-visit-rx"] input').setValue("Amoxicillin");
    await w.findAll("button").find((b) => b.text() === "Finish visit")!.trigger("click");
    await flushPromises();
    expect(onFinish).not.toHaveBeenCalled();
    expect(w.text()).toContain("Fix the highlighted medicines to finish.");
    w.unmount();
  });

  it("shows an error result from onFinish", async () => {
    const w = mk({ defaultNotes: "x", onFinish: async () => ({ error: "Offline" }) });
    await w.findAll("button").find((b) => b.text() === "Finish visit")!.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Offline");
    w.unmount();
  });
});
