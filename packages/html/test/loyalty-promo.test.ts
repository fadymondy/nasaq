// The Blade loyalty-promo example (packages/php/examples/rendered/loyalty-promo.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("loyalty-promo");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
const root = (h: HTMLElement, slot: string) => h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement, slot: string) => Alpine.$data(root(h, slot)) as any;

describe("loyalty-promo (Alpine)", () => {
  it("renders the card with the balance, the member code and the rewards", async () => {
    const h = await mount();
    const card = root(h, "loyalty-card");
    expect(card.textContent).toContain("Sara");
    expect(card.textContent).toContain("1,840");
    expect(card.textContent).toContain("Free coffee");
    expect(card.querySelectorAll("[data-reward-id]")).toHaveLength(2);
  });

  it("fires nq-loyalty-redeem when a reward is claimed", async () => {
    const h = await mount();
    const seen: string[] = [];
    root(h, "loyalty-card").addEventListener("nq-loyalty-redeem", (e) => seen.push((e as CustomEvent).detail.reward.id));
    root(h, "loyalty-card")
      .querySelector('[data-reward-id="r1"]')!
      .dispatchEvent(new CustomEvent("nq-claim", { bubbles: true, cancelable: true, detail: {} }));
    await tick();
    expect(seen).toEqual(["r1"]);
  });

  it("renders the Arabic card", async () => {
    const h = await mount();
    const cards = h.querySelectorAll('[data-slot="loyalty-card"]');
    expect(cards[cards.length - 1]!.textContent).toContain("سارة");
  });

  it("lists the points history newest first", async () => {
    const h = await mount();
    const items = root(h, "points-history").querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("Order #1042");
    expect(items[0]!.textContent).toContain("+120");
    expect(items[1]!.textContent).toContain("−500");
  });

  it("shows the visit history summary", async () => {
    const h = await mount();
    const v = root(h, "visit-history");
    expect(v.textContent).toContain("$45.00");
    expect(v.textContent).toContain("Downtown");
  });

  it("promo field: empty and bad formats, an unknown code, then a local apply and remove", async () => {
    const h = await mount();
    const f = root(h, "promo-code-field");
    const d = data(h, "promo-code-field");
    const events: string[] = [];
    f.addEventListener("nq-promo-applied", () => events.push("applied"));
    f.addEventListener("nq-promo-remove", () => events.push("remove"));
    await d.apply();
    expect(d.error).not.toBe("");
    d.value = "nope";
    await d.apply();
    expect(d.applied).toBeNull();
    expect(d.error).not.toBe("");
    d.value = "welcome10";
    await d.apply();
    expect(d.applied).toEqual({ code: "WELCOME10", discount: 500 });
    expect(events).toEqual(["applied"]);
    await tick();
    expect(f.querySelector('[data-slot="promo-code-applied"]')!.textContent).toContain("$5.00");
    await d.remove();
    expect(d.applied).toBeNull();
    expect(events).toEqual(["applied", "remove"]);
  });

  it("promo field: a handler can reject with a message, or claim with setApplied", async () => {
    const h = await mount();
    const f = root(h, "promo-code-field");
    const d = data(h, "promo-code-field");
    let n = 0;
    f.addEventListener("nq-promo-apply", (e) => {
      const detail = (e as CustomEvent).detail;
      if (n++ === 0) detail.reject("Expired");
      else detail.waitUntil(Promise.resolve().then(() => detail.setApplied({ code: detail.code, discount: 100 })));
    });
    d.value = "SAVE1";
    await d.apply();
    expect(d.error).toBe("Expired");
    expect(d.applied).toBeNull();
    await d.apply();
    expect(d.applied).toEqual({ code: "SAVE1", discount: 100 });
  });

  it("manager: lists the codes and filters by search and status", async () => {
    const h = await mount();
    const d = data(h, "promo-code-manager");
    await tick();
    expect(d.visible.map((p: { code: string }) => p.code).sort()).toEqual(["FLAT5", "WELCOME10"]);
    expect(root(h, "promo-code-manager").querySelectorAll('[data-slot="promo-row"]')).toHaveLength(2);
    d.query = "flat";
    expect(d.visible).toHaveLength(1);
    d.query = "";
    d.statusFilter = "live";
    expect(d.visible.map((p: { code: string }) => p.code)).toEqual(["WELCOME10"]);
  });

  it("manager: validates, then adds a code locally and fires nq-promo-save", async () => {
    const h = await mount();
    const d = data(h, "promo-code-manager");
    const seen: { input: { code: string; value: number }; id?: string }[] = [];
    root(h, "promo-code-manager").addEventListener("nq-promo-save", (e) => seen.push((e as CustomEvent).detail));
    d.openEditor();
    expect(d.editorOpen).toBe(true);
    await d.submit();
    expect(d.bad).toBe(true);
    expect(seen).toHaveLength(0);
    d.code = "spring25";
    d.percent = "25";
    await d.submit();
    expect(seen[0]!.input.code).toBe("SPRING25");
    expect(seen[0]!.input.value).toBe(2500);
    expect(seen[0]!.id).toBeUndefined();
    expect(d.promos).toHaveLength(3);
    expect(d.editorOpen).toBe(false);
  });

  it("manager: edits a code and keeps the editor open when the handler rejects", async () => {
    const h = await mount();
    const d = data(h, "promo-code-manager");
    const el = root(h, "promo-code-manager");
    const p = d.promos.find((x: { id: string }) => x.id === "p1");
    d.openEditor(p);
    expect(d.code).toBe("WELCOME10");
    expect(d.percent).toBe("10");
    el.addEventListener("nq-promo-save", (e) => (e as CustomEvent).detail.reject("Taken"), { once: true });
    d.percent = "15";
    await d.submit();
    expect(d.failed).toBe("Taken");
    expect(d.editorOpen).toBe(true);
    expect(d.promos.find((x: { id: string }) => x.id === "p1").value).toBe(1000);
    await d.submit();
    expect(d.promos.find((x: { id: string }) => x.id === "p1").value).toBe(1500);
    expect(d.editorOpen).toBe(false);
  });

  it("manager: turns a code on and off, firing nq-promo-active", async () => {
    const h = await mount();
    const d = data(h, "promo-code-manager");
    const seen: boolean[] = [];
    root(h, "promo-code-manager").addEventListener("nq-promo-active", (e) => seen.push((e as CustomEvent).detail.active));
    const p = d.promos.find((x: { id: string }) => x.id === "p2");
    await d.setActive(p, true);
    expect(seen).toEqual([true]);
    expect(d.promos.find((x: { id: string }) => x.id === "p2").active).toBe(true);
  });

  it("manager: confirms before deleting, firing nq-promo-delete", async () => {
    const h = await mount();
    const d = data(h, "promo-code-manager");
    const seen: string[] = [];
    root(h, "promo-code-manager").addEventListener("nq-promo-delete", (e) => seen.push((e as CustomEvent).detail.promo.id));
    d.openDelete(d.promos[0]);
    expect(d.deleteOpen).toBe(true);
    expect(d.deleteText(d.target)).toContain("WELCOME10");
    await d.confirmDelete();
    expect(seen).toEqual(["p1"]);
    expect(d.promos).toHaveLength(1);
    expect(d.deleteOpen).toBe(false);
  });

  it("manager: the row has a menu trigger", async () => {
    const h = await mount();
    expect(root(h, "promo-code-manager").querySelectorAll('[data-slot="promo-actions"]').length).toBe(2);
  });
});
