import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

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

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("activity-composer (Blade example)", () => {
  it("renders Planned before History, overdue first, with an Overdue badge", async () => {
    const host = await mount(rendered("activity-composer"));
    const timeline = host.querySelector('[data-slot="activity-timeline"]')!;
    const sections = [...timeline.querySelectorAll("section")];
    expect(sections.map((s) => s.querySelector("h3")!.textContent!.trim().replace(/\s+/g, " "))).toEqual(["Planned 2", "History"]);
    const open = [...sections[0]!.querySelectorAll("[data-activity-id]")].map((e) => e.getAttribute("data-activity-id"));
    expect(open).toEqual(["a3", "a2"]);
    expect(sections[0]!.querySelector('[data-activity-id="a3"]')!.textContent).toContain("Overdue");
    expect(sections[0]!.querySelector('[data-activity-id="a2"]')!.textContent).not.toContain("Overdue");
    expect([...sections[1]!.querySelectorAll("[data-activity-id]")].map((e) => e.getAttribute("data-activity-id"))).toEqual(["a1", "a4", "a5"]);
  });

  it("shows the duration field only for calls and meetings", async () => {
    const host = await mount(rendered("activity-composer"));
    const form = host.querySelector<HTMLElement>('[data-slot="activity-composer"]')!;
    const duration = form.querySelector('input[type="number"]')!.closest('[data-slot="field"]')!;
    expect(visible(duration)).toBe(false);
    const call = [...form.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent!.includes("Call"))!;
    call.click();
    await tick();
    expect(visible(duration)).toBe(true);
    expect(form.querySelector("button[type=submit]")!.textContent).toContain("Log call");
    expect(form.querySelector("textarea")!.getAttribute("placeholder")).toBe("Summarise the call…");
  });

  it("blocks an empty note, then fires nq-activity-submit and clears the form", async () => {
    const host = await mount(rendered("activity-composer"));
    const form = host.querySelector<HTMLFormElement>('[data-slot="activity-composer"]')!;
    const events: { kind: string; body: string; durationMinutes?: number }[] = [];
    form.addEventListener("nq-activity-submit", (e) => {
      const d = (e as CustomEvent).detail;
      events.push(d);
      d.wait(Promise.resolve());
    });
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(form.querySelector('[role="alert"]')!.textContent).toBe("Write something first.");
    expect(events).toHaveLength(0);
    const area = form.querySelector("textarea")!;
    area.value = "  Left a voicemail ";
    area.dispatchEvent(new Event("input"));
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe("note");
    expect(events[0]!.body).toBe("Left a voicemail");
    expect(area.value).toBe("");
  });

  it("keeps the text and shows the message when the host refuses", async () => {
    const host = await mount(rendered("activity-composer"));
    const form = host.querySelector<HTMLFormElement>('[data-slot="activity-composer"]')!;
    form.addEventListener("nq-activity-submit", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Server said no" })));
    const area = form.querySelector("textarea")!;
    area.value = "Hello";
    area.dispatchEvent(new Event("input"));
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(visible(form.querySelector('[role="alert"]'))).toBe(true);
    expect(form.querySelector('[role="alert"]')!.textContent).toBe("Server said no");
    expect(area.value).toBe("Hello");
  });

  it("fires nq-activity-toggle from the checkbox and puts it back when refused", async () => {
    const host = await mount(rendered("activity-composer"));
    const timeline = host.querySelector<HTMLElement>('[data-slot="activity-timeline"]')!;
    const seen: { id: string; done: boolean }[] = [];
    timeline.addEventListener("nq-activity-toggle", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ id: d.id, done: d.done });
      d.wait(Promise.resolve({ error: "Could not save" }));
    });
    const box = timeline.querySelector<HTMLElement>('[data-activity-id="a2"] [role="checkbox"]')!;
    box.click();
    await tick();
    expect(seen).toEqual([{ id: "a2", done: true }]);
    expect(timeline.querySelector('[role="alert"]')!.textContent).toBe("Could not save");
    expect(box.getAttribute("aria-checked")).toBe("false");
    // A done task offers Reopen.
    seen.length = 0;
    timeline.querySelector<HTMLElement>('[data-activity-id="a5"] [role="checkbox"]')!.click();
    await tick();
    expect(seen).toEqual([{ id: "a5", done: false }]);
  });

  it("fires nq-activity-delete from the row menu", async () => {
    const host = await mount(rendered("activity-composer"));
    const timeline = host.querySelector<HTMLElement>('[data-slot="activity-timeline"]')!;
    const ids: string[] = [];
    timeline.addEventListener("nq-activity-delete", (e) => {
      const d = (e as CustomEvent).detail;
      ids.push(d.id);
      d.wait(Promise.resolve());
    });
    const row = timeline.querySelector<HTMLElement>('[data-activity-id="a4"]')!;
    row.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!.click();
    await tick();
    const item = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"][data-action="delete"]')].find((i) => i.offsetParent !== null || i.isConnected && i.closest('[data-slot="dropdown-menu-content"]')?.getAttribute("data-open") !== null);
    expect(item).toBeTruthy();
    item!.click();
    await tick();
    expect(ids.length).toBeGreaterThanOrEqual(1);
  });
});
