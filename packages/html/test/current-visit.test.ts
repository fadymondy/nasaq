// The Blade example (php/examples/current-visit.blade.php) under real Alpine: the timer, the prescription rows and their validation,
// the follow-up choice, and the "finish" event with fail(message).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { canFinish, followUpIso, formatElapsed, validateRx } from "../src/alpine/current-visit-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const btn = (label: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === label)!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
const alertWith = (text: string) => [...document.querySelectorAll<HTMLElement>('[data-slot="alert"]')].find((a) => a.textContent!.includes(text))!;
const type = (el: HTMLInputElement | HTMLTextAreaElement, v: string) => {
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("current-visit logic", () => {
  it("validates a prescription, with days typed as text", () => {
    expect(validateRx({ id: "a", drug: "", dose: "", frequency: "", days: "" })).toEqual({ drug: "required", dose: "required", frequency: "required", days: "required" });
    expect(validateRx({ id: "a", drug: "x", dose: "1", frequency: "d", days: "400" }).days).toBe("invalid");
    expect(validateRx({ id: "a", drug: "x", dose: "1", frequency: "d", days: "5" })).toEqual({});
  });
  it("needs a note or a valid prescription", () => {
    expect(canFinish("", []).reason).toBe("empty");
    expect(canFinish("ok", []).ok).toBe(true);
    expect(canFinish("", [{ id: "a", drug: "x", dose: "", frequency: "", days: "5" }]).reason).toBe("invalid-prescription");
  });
  it("formats the timer and moves a follow-up to a working day", () => {
    expect(formatElapsed(754)).toBe("12:34");
    expect(formatElapsed(3725)).toBe("1:02:05");
    expect(followUpIso("2026-09-29", 7)).toBe("2026-10-06");
    expect(followUpIso("2026-09-29", 3, [0, 1, 2, 3, 4])).toBe("2026-10-04");
  });
});

describe("current-visit (Blade example)", () => {
  it("shows the patient, the history and the frozen timer", async () => {
    const host = await mount(rendered("current-visit"));
    expect(host.textContent).toContain("Huda Salem");
    expect(host.textContent).toContain("Penicillin");
    expect(host.querySelector('[role="timer"]')!.textContent).toContain("12:34");
    expect(host.querySelectorAll('[data-slot="current-visit-rx"]')).toHaveLength(1);
    expect(visible(alertWith("Visit saved"))).toBe(false);
  });

  it("adds and removes a medicine row, and flags a half-filled one on finish", async () => {
    const host = await mount(rendered("current-visit"));
    btn("Add medicine").click();
    await tick();
    const rows = () => host.querySelectorAll('[data-slot="current-visit-rx"]');
    expect(rows()).toHaveLength(2);
    type(rows()[1]!.querySelector<HTMLInputElement>("input")!, "Ibuprofen");
    await tick();
    btn("Finish visit").click();
    await tick();
    expect(visible(alertWith("Fix the highlighted"))).toBe(true);
    expect(rows()[1]!.querySelector("[data-invalid]")).not.toBeNull();
    (rows()[1]!.querySelector('button[aria-label="Remove medicine 2"]') as HTMLButtonElement).click();
    await tick();
    expect(rows()).toHaveLength(1);
  });

  it("blocks an empty visit, then fires finish and locks; fail unlocks with the message", async () => {
    const host = await mount(rendered("current-visit"));
    const root = host.querySelector<HTMLElement>('[data-slot="current-visit"]')!;
    (host.querySelector('button[aria-label="Remove medicine 1"]') as HTMLButtonElement).click();
    await tick();
    btn("Finish visit").click();
    await tick();
    expect(visible(alertWith("Add a note or a prescription"))).toBe(true);

    let detail: { notes: string; prescriptions: unknown[]; followUp: string | null; fail: (m?: string) => void } | undefined;
    root.addEventListener("finish", (e) => (detail = (e as CustomEvent).detail));
    type(host.querySelector("textarea")!, "  Healthy.  ");
    btn("In 1 week").click();
    await tick();
    expect(btn("In 1 week").getAttribute("aria-pressed")).toBe("true");
    expect(host.textContent).toContain("Follow-up on");
    btn("Finish visit").click();
    await tick();
    expect(detail?.notes).toBe("Healthy.");
    expect(detail?.prescriptions).toEqual([]);
    expect(detail?.followUp).toBe("2026-10-06");
    expect(visible(alertWith("Visit saved"))).toBe(true);
    expect(btn("Finish visit").disabled).toBe(true);

    detail!.fail("Server said no.");
    await tick();
    expect(visible(alertWith("Visit saved"))).toBe(false);
    expect(alertWith("Server said no.").textContent).toContain("Server said no.");
    expect(btn("Finish visit").disabled).toBe(false);
  });
});
