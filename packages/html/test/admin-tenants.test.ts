// The Blade admin-tenants example (packages/php/examples/rendered/admin-tenants.html) under real Alpine.
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
  host.innerHTML = rendered("admin-tenants");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as HTMLElement);
const row = (id: string, planId: string, status: string, seatsUsed: number, name = id) => ({ id, name, planId, status, seatsUsed });
const act = (root: Element, action: string, r: unknown) => root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: r } }));

describe("admin-tenants (Blade example)", () => {
  it("renders the stats, the workspace rows and the plan cards", async () => {
    const host = await mount();
    const ws = host.querySelector<HTMLElement>('[data-slot="admin-workspaces"]')!;
    expect(ws.querySelectorAll('[data-slot="stat-card"]')).toHaveLength(4);
    expect(ws.textContent).toContain("Acme Co");
    expect(ws.textContent).toContain("12 of 15 seats");
    const plans = host.querySelector<HTMLElement>('[data-slot="admin-plans"]')!;
    expect(plans.querySelectorAll('[data-slot="plan-card"]')).toHaveLength(3);
    expect(plans.textContent).toContain("Up to 3 seats");
    expect(plans.textContent).toContain("Unlimited storage");
    expect(plans.textContent).toContain("Hidden");
  });

  it("changes a plan through the change-plan event and shows the notice", async () => {
    const host = await mount();
    const ws = host.querySelector<HTMLElement>('[data-slot="admin-workspaces"]')!;
    let detail: { planId: string; workspace: { id: string }; wait?: (p: Promise<unknown>) => void } | undefined;
    ws.addEventListener("change-plan", (e) => {
      detail = (e as CustomEvent).detail;
      detail!.wait?.(Promise.resolve());
    });
    act(ws, "plan", row("w2", "free", "trial", 3, "Globex"));
    await tick();
    expect(data(ws).changeOpen).toBe(true);
    expect(data(ws).canChange).toBe(false);
    data(ws).nextPlan = "team";
    await tick();
    expect(data(ws).canChange).toBe(true);
    await data(ws).doChange();
    await tick();
    expect(detail?.planId).toBe("team");
    expect(detail?.workspace.id).toBe("w2");
    expect(data(ws).changeOpen).toBe(false);
    expect(data(ws).notice.text).toBe("Globex is now on Team.");
  });

  it("warns when the new plan has fewer seats than the workspace uses", async () => {
    const host = await mount();
    const ws = host.querySelector<HTMLElement>('[data-slot="admin-workspaces"]')!;
    act(ws, "plan", row("w1", "team", "active", 12, "Acme Co"));
    data(ws).nextPlan = "free";
    await tick();
    expect(data(ws).overSeatsText).toBe("This plan allows 3 seats but the workspace uses 12.");
  });

  it("keeps the dialog open with the host's error, and a generic one when nobody listens", async () => {
    const host = await mount();
    const ws = host.querySelector<HTMLElement>('[data-slot="admin-workspaces"]')!;
    const off = (e: Event) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Over quota" }));
    ws.addEventListener("set-suspended", off);
    act(ws, "suspend", row("w1", "team", "active", 12, "Acme Co"));
    await tick();
    expect(data(ws).suspendOpen).toBe(true);
    await data(ws).doSuspend();
    expect(data(ws).dialogError).toBe("Over quota");
    expect(data(ws).suspendOpen).toBe(true);
    ws.removeEventListener("set-suspended", off);
    await data(ws).doSuspend();
    expect(data(ws).dialogError).toBe("That did not work. Try again.");
  });

  it("reactivates only suspended workspaces and opens a workspace", async () => {
    const host = await mount();
    const ws = host.querySelector<HTMLElement>('[data-slot="admin-workspaces"]')!;
    const calls: boolean[] = [];
    ws.addEventListener("set-suspended", (e) => {
      calls.push((e as CustomEvent).detail.suspended);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    act(ws, "reactivate", row("w1", "team", "active", 12));
    await tick();
    expect(calls).toEqual([]);
    act(ws, "reactivate", row("w3", "scale", "suspended", 40, "Initech"));
    await tick();
    expect(calls).toEqual([false]);
    expect(data(ws).notice.text).toBe("Initech was reactivated.");
    let opened = "";
    ws.addEventListener("open", (e) => (opened = (e as CustomEvent).detail.workspace.id));
    act(ws, "open", row("w3", "scale", "suspended", 40));
    expect(opened).toBe("w3");
  });

  it("validates the plan form, then fires save-plan", async () => {
    const host = await mount();
    const plans = host.querySelector<HTMLElement>('[data-slot="admin-plans"]')!;
    let plan: Record<string, unknown> | undefined;
    plans.addEventListener("save-plan", (e) => {
      plan = (e as CustomEvent).detail.plan;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    data(plans).openPlan(null);
    await tick();
    await data(plans).submitPlan();
    expect(data(plans).nameBad).toBe(true);
    expect(plan).toBeUndefined();
    data(plans).draft.name = "Pro";
    data(plans).draft.features = [{ text: "SSO" }, { text: " " }];
    await data(plans).submitPlan();
    expect(plan).toMatchObject({ name: "Pro", priceMonthly: 0, seats: null, storageGb: null, features: ["SSO"], visible: true, currency: "USD" });
    expect(data(plans).notice.text).toBe("Pro was created.");
  });

  it("prefills an existing plan for editing", async () => {
    const host = await mount();
    const plans = host.querySelector<HTMLElement>('[data-slot="admin-plans"]')!;
    data(plans).openPlan("team");
    await tick();
    expect(data(plans).draft.name).toBe("Team");
    expect(data(plans).draft.seats).toBe("15");
    expect(data(plans).planTitle).toBe("Edit Team");
    expect(data(plans).planSubmitLabel).toBe("Save plan");
  });
});
