// The Blade notification-preferences example (packages/php/examples/rendered/notification-preferences.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("notification-preferences");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="notification-preferences"]')!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const listen = (root: Element, name: string, result?: unknown) => {
  const calls: Record<string, unknown>[] = [];
  root.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail;
    calls.push(d);
    d.wait(Promise.resolve(typeof result === "function" ? result(d) : result));
  });
  return calls;
};

describe("notification-preferences (Blade example)", () => {
  it("renders the matrix, locks the security email cell and explains the unavailable column", async () => {
    const root = await mount();
    const table = root.querySelector('[data-slot="notification-matrix"]')!;
    expect(table.querySelectorAll("tbody tr").length).toBe(6);
    const locked = root.querySelector<HTMLElement>('[aria-label="Security alerts: Email"]')!;
    expect(locked.getAttribute("aria-checked")).toBe("true");
    expect(locked.hasAttribute("disabled")).toBe(true);
    expect(root.textContent).toContain("Add a WhatsApp number first");
    expect(root.querySelector<HTMLElement>('[aria-label="Mentions: WhatsApp"]')!.hasAttribute("disabled")).toBe(true);
    expect(root.querySelector('[data-slot="quiet-summary"]')!.textContent).toContain("9 quiet each day. Ends the next day");
    expect(root.querySelector("time")!.textContent).toMatch(/Monday/);
  });

  it("shows the column header as mixed, and a cell click saves at once", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    const header = root.querySelector<HTMLElement>('[aria-label="Turn Push on or off for every kind"]')!;
    expect(header.getAttribute("aria-checked")).toBe("mixed");
    root.querySelector<HTMLElement>('[aria-label="Mentions: Desktop"]')!.click();
    await tick();
    expect((saves[0]!.prefs as { matrix: Record<string, Record<string, boolean>> }).matrix.mention!.desktop).toBe(true);
    expect(data(root).status).toBe("Saved");
  });

  it("turns a whole column on from the header", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    root.querySelector<HTMLElement>('[aria-label="Turn Desktop on or off for every kind"]')!.click();
    await tick();
    const m = (saves[0]!.prefs as { matrix: Record<string, Record<string, boolean>> }).matrix;
    expect(m.mention!.desktop).toBe(true);
    expect(m.comment!.desktop).toBe(true);
    expect(m.billing!.desktop).toBe(true);
    expect(m.security!.desktop).toBe(true);
    expect(data(root).colOn.desktop).toBe(true);
  });

  it("rolls back, with the host's message, when a save fails", async () => {
    const root = await mount();
    listen(root, "save", { error: "Nope" });
    const d = data(root);
    d.cells["1|desktop"] = true;
    await tick();
    expect(d.notice).toEqual({ tone: "danger", text: "Nope" });
    expect(d.cells["1|desktop"]).toBe(false);
    expect(d.state).toBe("idle");
  });

  it("rolls back with the generic message when nobody listens", async () => {
    const root = await mount();
    const d = data(root);
    d.cells["1|desktop"] = true;
    await tick();
    expect(d.notice.text).toBe("That did not save, so it was put back. Try again.");
    expect(d.cells["1|desktop"]).toBe(false);
  });

  it("asks the browser before turning push on, and changes nothing when refused", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    const asks = listen(root, "request-push", "denied");
    const d = data(root);
    d.cells["1|push"] = true;
    await tick();
    expect(asks).toHaveLength(1);
    expect(saves).toHaveLength(0);
    expect(d.notice).toEqual({ tone: "warning", text: expect.stringContaining("Browser notifications are blocked") });
    expect(d.cells["1|push"]).toBe(false);
  });

  it("saves the push cell once the browser grants", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    listen(root, "request-push", "granted");
    data(root).cells["1|push"] = true;
    await tick();
    expect((saves[0]!.prefs as { matrix: Record<string, Record<string, boolean>> }).matrix.comment!.push).toBe(true);
  });

  it("saves quiet hours, batching and digest changes", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    const d = data(root);
    d.quietTo = "07:00";
    d.quietFrom = "23:00";
    await tick();
    expect(d.quietSummary).toContain("8 quiet each day");
    d.batching = "daily";
    await tick();
    d.frequency = "daily";
    d.digestTime = "20:00";
    await tick();
    const last = saves.at(-1)!.prefs as { quietHours: { from: string }; batching: string; digest: { frequency: string; time: string } };
    expect(last.quietHours.from).toBe("23:00");
    expect(last.batching).toBe("daily");
    expect(last.digest).toMatchObject({ frequency: "daily", time: "20:00" });
    expect(d.nextIso).toBe(new Date(2026, 8, 29, 20, 0).toISOString());
  });

  it("validates the daily cap before saving it", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    const d = data(root);
    d.capText = "0";
    d.saveCap();
    expect(d.capInvalid).toBe(true);
    expect(saves).toHaveLength(0);
    d.capText = "50";
    d.saveCap();
    await tick();
    expect((saves[0]!.prefs as { dailyCap: number }).dailyCap).toBe(50);
    expect(d.capInvalid).toBe(false);
  });

  it("turns the cap off and on", async () => {
    const root = await mount();
    const saves = listen(root, "save");
    const d = data(root);
    d.capOn = false;
    await tick();
    expect((saves[0]!.prefs as { dailyCap: number | null }).dailyCap).toBeNull();
    d.capOn = true;
    await tick();
    expect((saves[1]!.prefs as { dailyCap: number | null }).dailyCap).toBe(20);
    expect(d.capText).toBe("20");
  });

  it("adds a destination after validating it", async () => {
    const root = await mount();
    const adds = listen(root, "add-destination");
    const d = data(root);
    d.newTarget = "nope";
    await d.addDestination();
    expect(d.targetError).toBe("Enter a valid email address.");
    expect(adds).toHaveLength(0);
    d.newTarget = "ops@example.com";
    await tick();
    await d.addDestination();
    expect(adds[0]).toMatchObject({ kind: "email", target: "ops@example.com" });
    expect(d.newTarget).toBe("");
    expect(d.targetBad).toBe(false);
  });

  it("shows a server error from adding", async () => {
    const root = await mount();
    listen(root, "add-destination", { error: "Already added" });
    const d = data(root);
    d.newKind = "webhook";
    d.newTarget = "http://hooks.example.com";
    await d.addDestination();
    expect(d.targetError).toBe("Webhooks must use https.");
    d.newTarget = "https://hooks.example.com/x";
    await tick();
    await d.addDestination();
    expect(d.targetError).toBe("Already added");
  });

  it("tests a destination and shows the result", async () => {
    const root = await mount();
    listen(root, "test-destination", { ok: false, message: "Timed out" });
    const d = data(root);
    await d.test("d2");
    expect(d.results.d2).toEqual({ ok: false, text: "Timed out" });
    await tick();
    const p = root.querySelector<HTMLElement>('[data-destination="d2"] p[role="status"]')!;
    expect(p.textContent).toBe("Timed out");
  });

  it("removes a destination and hides its row", async () => {
    const root = await mount();
    const removes = listen(root, "remove-destination");
    const d = data(root);
    await d.remove("d1");
    expect(removes[0]).toMatchObject({ id: "d1", target: "team@example.com" });
    await tick();
    expect(root.querySelector<HTMLElement>('[data-destination="d1"]')!.style.display).toBe("none");
    expect(d.visibleCount).toBe(1);
  });
});
