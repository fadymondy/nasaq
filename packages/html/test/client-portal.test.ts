// The Blade client-portal example under real Alpine: the tab bar, the request form, the card menu and the invoice list without drafts.
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="client-portal"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement): any => Alpine.$data(root(host));
const visible = (el: Element) => (el as HTMLElement).style.display !== "none" && !(el as HTMLElement).hidden;

describe("client-portal (Blade example)", () => {
  it("shows the header, the ring and the overview tiles", async () => {
    const host = await mount("client-portal");
    expect(root(host).querySelector("h1")!.textContent).toBe("New booking platform");
    expect(root(host).querySelector('[data-slot="portal-ring"] svg')!.getAttribute("aria-label")).toBe("25% done");
    expect(root(host).textContent).toContain("1 of 4 tasks done");
    expect(root(host).querySelectorAll('[data-slot="portal-task"]')).toHaveLength(4);
  });

  it("switches tabs and reports the change", async () => {
    const host = await mount("client-portal");
    const tabs: string[] = [];
    root(host).addEventListener("portal-tab-change", (e) => tabs.push((e as CustomEvent).detail.tab));
    const tab = [...root(host).querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => b.textContent!.trim() === "Requests")!;
    tab.click();
    await tick(100);
    expect(data(host).portalTab).toBe("requests");
    expect(tabs).toEqual(["requests"]);
    const panels = [...root(host).querySelectorAll<HTMLElement>('[role="tabpanel"]')].filter(visible);
    expect(panels).toHaveLength(1);
    expect(panels[0]!.querySelector('[data-slot="portal-request-form"]')).not.toBeNull();
  });

  it("validates the request form, then sends it", async () => {
    const host = await mount("client-portal");
    const sent: { title: string; description: string }[] = [];
    root(host).addEventListener("portal-request", (e) => sent.push((e as CustomEvent).detail));
    await data(host).submit();
    await tick();
    expect(data(host).error).toBe("Tell us what you need.");
    expect(sent).toHaveLength(0);
    data(host).reqTitle = "A new report";
    await data(host).submit();
    await tick();
    expect(sent[0]).toMatchObject({ title: "A new report", description: "" });
    expect(data(host).sent).toBe(true);
    expect(data(host).reqTitle).toBe("");
  });

  it("keeps the text when the host fails the request", async () => {
    const host = await mount("client-portal");
    root(host).addEventListener("portal-request", (e) => (e as CustomEvent).detail.fail("Server is down"));
    data(host).reqTitle = "A new report";
    await data(host).submit();
    await tick();
    expect(data(host).error).toBe("Server is down");
    expect(data(host).reqTitle).toBe("A new report");
    expect(data(host).sent).toBe(false);
  });

  it("fires portal-action from a card menu", async () => {
    const host = await mount("client-portal");
    const actions: unknown[] = [];
    root(host).addEventListener("portal-action", (e) => actions.push((e as CustomEvent).detail));
    data(host).act("task", "ask", "t2");
    expect(actions).toEqual([{ kind: "task", action: "ask", id: "t2" }]);
  });

  it("lists sent invoices only", async () => {
    const host = await mount("client-portal");
    expect(root(host).textContent).toContain("INV-0042");
    expect(root(host).textContent).not.toContain("INV-0043");
  });
});
