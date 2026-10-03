// The Blade network-rules example (packages/php/examples/rendered/network-rules.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { diffRules, formatProtocolPort, isValidCidr, lockoutRisk, validateFirewallRule } from "../src/alpine/network-rules-logic";

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
  host.innerHTML = rendered("network-rules");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const panels = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="tabs-panel"]')];
const rowsOf = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>("[data-row]")];
const act = (root: HTMLElement, action: string, id: string) =>
  root.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const text = (el: Element) => el.textContent!.replace(/\s+/g, " ").trim();
const button = (root: ParentNode, label: string) => [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(label))!;
const inputs = (form: HTMLElement) => [...form.querySelectorAll<HTMLInputElement>("input")].filter((i) => i.type !== "hidden");

describe("network helpers", () => {
  it("validates, formats and diffs", () => {
    expect(isValidCidr("10.0.0.0/24")).toBe(true);
    expect(isValidCidr("10.0.0.0/33")).toBe(false);
    expect(formatProtocolPort({ protocol: "udp", port: "8000-8100" })).toBe("UDP 8000-8100");
    expect(validateFirewallRule({ protocol: "tcp", port: "", source: "any" })).toEqual(["port"]);
    expect(lockoutRisk([{ id: "x", action: "deny", protocol: "tcp", port: "22", source: "any" }])).toBe("x");
    const a = [{ id: "1" }, { id: "2" }];
    expect(diffRules(a, [a[1]!, a[0]!]).count).toBe(1);
  });
});

describe("network-rules (Blade example)", () => {
  it("renders both tables and an up-to-date bar", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [fw, http] = panels(root);
    expect(rowsOf(fw!)).toHaveLength(4);
    expect(rowsOf(http!)).toHaveLength(4);
    expect(text(rowsOf(fw!)[1]!)).toContain("TCP 443");
    expect(text(rowsOf(http!)[0]!)).toContain("301 → https://example.com/shop");
    expect(text(fw!)).toContain("Everything is applied.");
  });

  it("moves a rule, stages it, then applies the whole list", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [fw] = panels(root);
    let sent: { id: string }[] | undefined;
    root.addEventListener("apply-firewall", (e) => {
      sent = (e as CustomEvent).detail.rules;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    act(root, "fw-up", "f1");
    await tick();
    expect(text(rowsOf(fw!)[0]!)).toContain("Office");
    act(root, "fw-down", "f4");
    await tick();
    act(root, "fw-down", "f2");
    await tick(80);
    expect(rowsOf(fw!).map((r) => text(r).match(/443|22|80|3306/)![0])).toEqual(["22", "80", "443", "3306"]);
    expect(text(fw!)).toContain("1 change staged");
    button(fw!, "Apply changes").click();
    await tick(80);
    expect(sent!.map((r) => r.id)).toEqual(["f1", "f3", "f2", "f4"]);
    expect(text(fw!)).toContain("Changes applied.");
    expect(text(fw!)).toContain("Everything is applied.");
  });

  it("marks a removal, restores it, and discards", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [fw] = panels(root);
    act(root, "fw-remove", "f3");
    await tick(80);
    expect(text(rowsOf(fw!)[2]!)).toContain("Removed");
    expect(text(fw!)).toContain("1 change staged");
    act(root, "fw-edit", "f3");
    await tick(60);
    expect((Alpine.$data(root) as { fw: { open: boolean } }).fw.open).toBe(false);
    act(root, "fw-restore", "f3");
    await tick(80);
    expect(text(fw!)).toContain("Everything is applied.");
    act(root, "fw-remove", "f2");
    await tick(60);
    button(fw!, "Discard").click();
    await tick(80);
    expect(text(fw!)).toContain("Everything is applied.");
  });

  it("validates the dialog and stages a new rule", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [fw] = panels(root);
    button(fw!, "Add rule").click();
    await tick(80);
    const form = document.querySelector<HTMLElement>('[data-slot="network-rule-dialog"]')!;
    submit(form);
    await tick();
    expect(form.textContent).toContain("Enter a port from 1 to 65535");
    expect(rowsOf(fw!)).toHaveLength(4);
    const [port] = inputs(form);
    type(port!, "8080");
    submit(form);
    await tick(80);
    expect(rowsOf(fw!)).toHaveLength(5);
    expect(text(rowsOf(fw!)[4]!)).toContain("TCP 8080");
    expect(text(rowsOf(fw!)[4]!)).toContain("New");
    expect(text(fw!)).toContain("1 change staged");
  });

  it("warns when a deny-SSH rule comes first", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [fw] = panels(root);
    expect(text(fw!)).not.toContain("lock you out");
    button(fw!, "Add rule").click();
    await tick(80);
    const form = document.querySelector<HTMLElement>('[data-slot="network-rule-dialog"]')!;
    // Pick Deny, then port 22 from any, and move it to the top.
    const [port] = inputs(form);
    type(port!, "22");
    (Alpine.$data(root) as { ff: { action: string } }).ff.action = "deny";
    await tick(40);
    submit(form);
    await tick(80);
    expect(rowsOf(fw!)).toHaveLength(5);
    const id = (Alpine.$data(root) as { fw: { staged: { id: string; action: string }[] } }).fw.staged[4]!;
    expect(id.action).toBe("deny");
    for (let i = 0; i < 4; i++) act(root, "fw-up", id.id);
    await tick(80);
    expect(text(fw!)).toContain("lock you out");
  });

  it("stages an HTTP rule and shows an apply error", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [, http] = panels(root);
    root.addEventListener("apply-http", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Server said no" })));
    act(root, "ht-edit", "h4");
    await tick(80);
    const form = document.querySelectorAll<HTMLElement>('[data-slot="network-rule-dialog"]')[1]!;
    const fields = inputs(form);
    expect(fields.some((i) => i.value === "198.51.100.7")).toBe(true);
    type(fields.find((i) => i.value === "198.51.100.7")!, "not-an-ip");
    submit(form);
    await tick(60);
    expect(form.textContent).toContain("Enter an IP address or a block");
    type(fields.find((i) => i.value === "not-an-ip")!, "198.51.100.8");
    submit(form);
    await tick(80);
    expect(text(rowsOf(http!)[3]!)).toContain("198.51.100.8");
    expect(text(rowsOf(http!)[3]!)).toContain("Edited");
    button(http!, "Apply changes").click();
    await tick(80);
    expect(text(http!)).toContain("Server said no");
    expect(text(http!)).toContain("1 change staged");
  });

  it("applies a removal and drops the row", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="network-rules"]')!;
    const [fw] = panels(root);
    act(root, "fw-remove", "f1");
    await tick(60);
    button(fw!, "Apply changes").click();
    await tick(80);
    // The example listens and resolves, so the apply succeeds.
    expect(text(fw!)).toContain("Changes applied.");
    expect(rowsOf(fw!)).toHaveLength(3);
  });
});
