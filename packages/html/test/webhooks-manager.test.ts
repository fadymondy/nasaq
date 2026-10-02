// The Blade webhooks-manager example (packages/php/examples/rendered/webhooks-manager.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { webhookDay } from "../src/alpine/webhooks-manager";
import { canReplay, deliveryStats, groupEvents, isSourceStale, maskSecret, pollUnit, setEvents, validateEndpoint, validateEndpointUrl } from "../src/alpine/webhooks-manager-logic";

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
  host.innerHTML = rendered("webhooks-manager");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

type Detail = Record<string, unknown> & { wait: (p: Promise<unknown>) => void };
/** Answers the host events after the example's own listeners (the last wait() wins). */
function answer(root: HTMLElement, answers: Record<string, (d: Detail) => unknown>) {
  const seen: { name: string; detail: Detail }[] = [];
  for (const [name, fn] of Object.entries(answers)) {
    root.addEventListener(name, (e) => {
      const detail = (e as CustomEvent<Detail>).detail;
      seen.push({ name, detail });
      detail.wait(Promise.resolve().then(() => fn(detail)));
    });
  }
  return seen;
}
const data = (root: HTMLElement) => Alpine.$data(root) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const panels = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="tabs-panel"]')];
const rowsOf = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>("[data-row]")];
const act = (root: HTMLElement, action: string, id: string) => root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const edit = (root: HTMLElement, column: string, id: string, value: unknown) => {
  const detail: { row: { id: string }; column: string; value: unknown; promise?: Promise<unknown> } = { row: { id }, column, value };
  root.dispatchEvent(new CustomEvent("nq-data-table-edit", { bubbles: true, detail }));
  return detail.promise;
};
const text = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();
const button = (root: ParentNode, label: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(label))!;

describe("webhook helpers", () => {
  it("validates, groups and selects", () => {
    expect(validateEndpointUrl("http://example.com").ok).toBe(false);
    expect(validateEndpointUrl("http://localhost:3000/x").ok).toBe(true);
    expect(validateEndpoint({ name: "", url: "nope", events: [] })).toEqual(["name", "url", "events"]);
    expect(groupEvents([{ id: "a", label: "A", group: "G" }, { id: "b", label: "B" }]).map((g) => g.group)).toEqual(["G", ""]);
    expect(setEvents(["a"], ["a", "b"], false)).toEqual([]);
    expect(maskSecret("ab12")).toBe("whsec_••••••••ab12");
    expect(pollUnit(300)).toEqual({ value: 5, unit: "minute" });
    expect(deliveryStats([{ status: "success" }, { status: "failed" }]).rate).toBe(0.5);
    expect(canReplay("pending")).toBe(false);
    expect(isSourceStale(Date.now() - 10_000_000, 60)).toBe(true);
    expect(webhookDay(undefined)).toBe("");
    expect(webhookDay("2026-09-29T12:00:00")).toBe("2026-09-29");
  });
});

describe("webhooks-manager (Blade example)", () => {
  it("renders the tabs, the three tables and the push card, which dismisses", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    const [ep, dl, src] = panels(root);
    expect(text(root)).toContain("Webhooks");
    expect(rowsOf(ep!)).toHaveLength(3);
    expect(text(ep!)).toContain("Order updates");
    expect(text(ep!)).toContain("https://billing.example.com/webhook");
    expect(rowsOf(dl!)).toHaveLength(3);
    expect(rowsOf(src!)).toHaveLength(2);
    expect(text(src!)).toContain("5 minutes");
    expect(root.querySelectorAll('[role="switch"]')).toHaveLength(3);
    const seen = answer(root, { "dismiss-push": () => undefined });
    const push = root.querySelector<HTMLElement>('[data-slot="webhooks-push"]')!;
    expect(push.style.display).not.toBe("none");
    button(push, "I have saved it").click();
    await tick();
    expect(push.style.display).toBe("none");
    expect(seen.map((s) => s.name)).toEqual(["dismiss-push"]);
  });

  it("toggles an endpoint from the switch and rolls back on an error", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    const seen = answer(root, { "toggle-endpoint": (d) => (d.id === "e1" ? { error: "Nope" } : undefined) });
    expect(await edit(root, "enabled", "e3", true)).toBeUndefined();
    expect(seen[0]!.detail).toMatchObject({ id: "e3", enabled: true });
    expect(data(root).endpoints.find((e: { id: string }) => e.id === "e3").enabled).toBe(true);
    expect(await edit(root, "enabled", "e1", false)).toEqual({ error: "Nope" });
    expect(data(root).endpoints.find((e: { id: string }) => e.id === "e1").enabled).toBe(true);
  });

  it("validates the endpoint form, saves, then reveals the secret once", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    const seen = answer(root, { "save-endpoint": () => ({ secret: "whsec_abc123", id: "e9" }) });
    button(root, "Add endpoint").click();
    await tick();
    const form = document.querySelector<HTMLFormElement>('[data-slot="webhooks-endpoint-form"]')!;
    expect(form).not.toBeNull();
    submit(form);
    await tick();
    expect(data(root).form.invalid).toEqual({ name: true, url: true });
    expect(data(root).form.eventsInvalid).toBe(true);
    expect(text(form)).toContain("Enter a URL.");
    expect(seen).toHaveLength(0);

    const inputs = [...form.querySelectorAll<HTMLInputElement>("input")].filter((i) => i.type !== "hidden");
    type(inputs[0]!, "Mine");
    type(form.querySelector<HTMLInputElement>('input[type="url"]')!, "https://example.com/h");
    form.querySelectorAll<HTMLElement>('[role="checkbox"]')[0]!.click();
    await tick();
    submit(form);
    await tick(80);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.detail).toMatchObject({ name: "Mine", url: "https://example.com/h", events: ["order.created"] });
    expect(data(root).form.open).toBe(false);
    expect(data(root).endpoints.map((e: { id: string }) => e.id)).toContain("e9");
    expect(data(root).ep.rows).toHaveLength(4);
    expect(data(root).reveal.open).toBe(true);
    const reveal = document.querySelector('[data-slot="webhooks-reveal"]')!;
    expect(reveal.querySelector<HTMLInputElement>("input")!.value).toBe("whsec_abc123");
  });

  it("shows a save error from the host and keeps the form open", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    answer(root, { "save-endpoint": () => ({ error: "Name taken" }) });
    act(root, "ep-edit", "e1");
    await tick();
    expect(data(root).form.name).toBe("Order updates");
    submit(document.querySelector<HTMLFormElement>('[data-slot="webhooks-endpoint-form"]')!);
    await tick(80);
    expect(data(root).form.open).toBe(true);
    expect(data(root).form.error).toBe("Name taken");
  });

  it("deletes after confirming and rotates a secret", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    const seen = answer(root, { "delete-endpoint": () => undefined, "rotate-secret": () => ({ secret: "whsec_new9999" }) });
    act(root, "ep-delete", "e3");
    await tick();
    expect(data(root).confirm.open).toBe(true);
    expect(data(root).confirm.title).toBe("Delete Billing sync?");
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(seen.map((s) => s.name)).toEqual(["delete-endpoint"]);
    expect(data(root).ep.rows).toHaveLength(2);

    act(root, "ep-rotate", "e1");
    await tick();
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-action"]')!.click();
    await tick(80);
    expect(data(root).reveal.secret).toBe("whsec_new9999");
    expect(data(root).endpoints.find((e: { id: string }) => e.id === "e1").secretLast4).toBe("9999");
  });

  it("sends a test and says how it went; a missing listener shows the generic error", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    answer(root, { "test-endpoint": () => ({ ok: false, code: 500, error: "Boom" }) });
    act(root, "ep-test", "e1");
    await tick(80);
    expect(data(root).notice).toEqual({ tone: "danger", text: "Test to Order updates failed. Boom" });
    // The example has no handler for these events once Alpine runs a plain host.
    const bare = Alpine.$data(root) as { root: HTMLElement };
    bare.root = document.createElement("div");
    act(root, "ep-test", "e2");
    await tick(80);
    expect(data(root).failure).toBe("Something went wrong. Try again.");
  });

  it("opens a delivery, replays it and filters by endpoint", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    const seen = answer(root, { "replay-delivery": () => undefined });
    root.dispatchEvent(new CustomEvent("nq-data-table-row-click", { bubbles: true, detail: { row: { id: "d2" } } }));
    await tick();
    expect(data(root).detail).toMatchObject({ open: true, event: "order.paid", name: "Team chat", status: "failed", code: "500", canReplay: true });
    const dialog = document.querySelector('[data-slot="webhooks-delivery"]')!;
    expect(dialog.querySelector('[data-slot="webhooks-response"]')!.textContent).toBe("Internal Server Error");
    expect(dialog.querySelector('[data-slot="webhooks-request"]')!.textContent).toContain('"id": "ord_2"');
    button(dialog, "Send again").click();
    await tick(80);
    expect(seen[0]!.detail).toMatchObject({ id: "d2" });
    expect(data(root).detail.open).toBe(false);
    expect(data(root).notice.text).toBe("Sent again to Team chat.");

    act(root, "dl-replay", "d3");
    await tick();
    expect(seen).toHaveLength(1);

    data(root).dl.filter = "e1";
    await tick();
    expect(data(root).dl.rows.map((r: { id: string }) => r.id)).toEqual(["d3", "d1"]);
  });

  it("changes a poll interval in its cell and polls now", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="webhooks-manager"]')!;
    const seen = answer(root, { "set-interval": (d) => (d.seconds === 60 ? { error: "Too fast" } : undefined), "poll-source": () => ({ lastStatus: "ok" }) });
    expect(await edit(root, "interval", "s1", "900")).toBeUndefined();
    expect(seen[0]!.detail).toMatchObject({ id: "s1", seconds: 900 });
    expect(data(root).sources.find((s: { id: string }) => s.id === "s1").intervalSeconds).toBe(900);
    expect(await edit(root, "interval", "s1", "60")).toEqual({ error: "Too fast" });
    expect(data(root).sources.find((s: { id: string }) => s.id === "s1").intervalSeconds).toBe(900);

    act(root, "src-poll", "s2");
    await tick(80);
    expect(data(root).src.rows.find((r: { id: string }) => r.id === "s2")).toMatchObject({ status: "ok", error: "" });
    expect(data(root).notice.text).toBe("Polled Shipping provider.");
  });
});
