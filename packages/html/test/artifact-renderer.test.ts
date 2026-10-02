// The Blade artifact-renderer example under real Alpine.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const card = (host: HTMLElement, kind: string) => host.querySelector<HTMLElement>(`[data-slot="artifact-renderer"][data-kind="${kind}"]`)!;
const dialogs = () => [...document.querySelectorAll<HTMLElement>('[data-slot="artifact-confirm"]')].filter((d) => d.style.display !== "none" && !d.hasAttribute("hidden"));
const button = (root: HTMLElement, text: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;
const sendButton = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>("button")].at(-1)!;

describe("artifact-renderer (Blade example)", () => {
  it("renders the table, card, chart, stats and picker artifacts", async () => {
    const host = await mount("artifact-renderer");
    expect([...host.querySelectorAll("[data-slot=artifact-renderer]")].map((e) => e.getAttribute("data-kind"))).toEqual(["table", "card", "chart", "stats", "picker"]);
    const table = card(host, "table");
    expect(table.querySelector("[data-slot=card-title]")!.textContent).toBe("Overdue invoices");
    expect([...table.querySelectorAll("th")].map((h) => h.textContent!.trim())).toEqual(["No.", "Amount"]);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(card(host, "stats").textContent).toContain("Open tickets");
    expect(card(host, "stats").querySelector("[data-tone=warning]")).not.toBeNull();
    const chart = card(host, "chart").querySelector<HTMLElement>("[data-slot=chart]")!;
    expect(chart.getAttribute("aria-label")).toBe("Chart: Weekly revenue");
    expect(chart.querySelectorAll("svg path")).toHaveLength(3);
  });

  it("asks before a confirm action, and dispatches it once confirmed", async () => {
    const host = await mount("artifact-renderer");
    const root = card(host, "card");
    const seen: unknown[] = [];
    root.addEventListener("nq-artifact-action", (e) => seen.push({ id: (e as CustomEvent).detail.id, artifactId: (e as CustomEvent).detail.artifactId }));
    button(root, "Refund").click();
    await tick(300);
    expect(dialogs()).toHaveLength(1);
    expect(dialogs()[0]!.textContent).toContain("Refund this order?");
    expect(seen).toEqual([]);
    button(dialogs()[0]!, "Confirm").click();
    await tick(300);
    expect(seen).toEqual([{ id: "refund", artifactId: "order-42" }]);
    expect(dialogs()).toHaveLength(0);
    expect(host.textContent).toContain("Action: refund");
  });

  it("runs an action without a confirm straight away and shows a failure", async () => {
    const host = await mount("artifact-renderer");
    const root = card(host, "card");
    root.addEventListener("nq-artifact-action", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Could not send" })));
    button(root, "Send receipt").click();
    await tick(100);
    expect(root.querySelector("[data-slot=alert]")!.textContent).toContain("Could not send");
  });

  it("sends the chosen option and shows Sent", async () => {
    const host = await mount("artifact-renderer");
    const root = card(host, "picker");
    const send = sendButton(root);
    expect(send.disabled).toBe(true);
    const picked: string[][] = [];
    root.addEventListener("nq-artifact-pick", (e) => picked.push((e as CustomEvent).detail.values));
    root.querySelectorAll<HTMLElement>("[role=radio]")[1]!.click();
    await tick();
    expect(send.disabled).toBe(false);
    send.click();
    await tick(100);
    expect(picked).toEqual([["late"]]);
    expect(root.textContent).toContain("Sent");
    expect(send.disabled).toBe(true);
    expect(host.textContent).toContain("Picked: late");
  });

  it("keeps the picker open and shows the error when sending fails", async () => {
    const host = await mount("artifact-renderer");
    const root = card(host, "picker");
    root.addEventListener("nq-artifact-pick", (e) => (e as CustomEvent).detail.waitUntil(Promise.reject(new Error("Offline"))));
    root.querySelectorAll<HTMLElement>("[role=radio]")[0]!.click();
    await tick();
    sendButton(root).click();
    await tick(100);
    expect(root.querySelector("[data-slot=alert]")!.textContent).toContain("Offline");
    expect(sendButton(root).disabled).toBe(false);
  });
});
