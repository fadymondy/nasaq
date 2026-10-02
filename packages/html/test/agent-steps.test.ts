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

const stepRows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="agent-step"]')];
const changeRows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="agent-change"]')];
const buttonByText = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === text)!;

describe("agent-steps (Blade example)", () => {
  it("lists the steps with the summary, masks secrets and shows confirm under the awaiting step", async () => {
    const host = await mount(rendered("agent-steps"));
    const root = host.querySelector<HTMLElement>('[data-slot="agent-steps"]')!;
    expect(root.dataset.state).toBe("awaiting");
    expect(stepRows().map((r) => r.dataset.status)).toEqual(["done", "awaiting", "pending"]);
    expect(host.textContent).toContain("Waiting for your approval");
    expect(host.textContent).not.toContain("tok-123");
    expect(changeRows()).toHaveLength(2);
    // The awaiting step shows its confirm; the others do not.
    expect(stepRows()[1]!.querySelector('[data-slot="agent-confirm"]')).not.toBeNull();
    expect(stepRows()[0]!.querySelector('[data-slot="agent-confirm"]')).toBeNull();
  });

  it("renders the diff, folds nothing short and counts changes", async () => {
    const host = await mount(rendered("agent-steps"));
    const first = changeRows()[0]!;
    const diffRows = [...first.querySelectorAll<HTMLElement>('[role="row"][data-diff]')];
    expect(diffRows.map((r) => r.dataset.diff)).toEqual(["del", "add", "same"]);
    expect(first.textContent).toContain("+1");
    expect(host.querySelector('[data-slot="agent-confirm"]')!.textContent).toContain("High risk");
  });

  it("applies the ticked changes through wait() and shows the decided state", async () => {
    const host = await mount(rendered("agent-steps"));
    const confirm = host.querySelector<HTMLElement>('[data-slot="agent-confirm"]')!;
    const seen: string[] = [];
    confirm.addEventListener("apply", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(`apply:${d.ids.join(",")}`);
      d.wait(Promise.resolve());
    });
    confirm.addEventListener("decided", (e) => seen.push(`decided:${(e as CustomEvent).detail.decision}`));
    // c2 is high risk: Apply stays disabled until it is acknowledged.
    const apply = buttonByText("Apply all");
    expect(apply.disabled).toBe(true);
    const ack = confirm.querySelector<HTMLButtonElement>('label button[role="checkbox"]')!;
    ack.click();
    await tick();
    expect(buttonByText("Apply all").disabled).toBe(false);
    buttonByText("Apply all").click();
    await tick(60);
    expect(seen).toEqual(["apply:c1,c2", "decided:applied"]);
    expect(confirm.dataset.decision).toBe("applied");
    expect(confirm.textContent).toContain("2 changes were applied.");
  });

  it("keeps the choice open when the apply fails", async () => {
    const host = await mount(rendered("agent-steps"));
    const confirm = host.querySelector<HTMLElement>('[data-slot="agent-confirm"]')!;
    confirm.addEventListener("apply", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Server said no" })));
    confirm.querySelector<HTMLButtonElement>('label button[role="checkbox"]')!.click();
    await tick();
    buttonByText("Apply all").click();
    await tick(60);
    expect(confirm.dataset.decision).toBeUndefined();
    expect(confirm.textContent).toContain("Server said no");
  });

  it("unticking a change leaves it out and rejects with a reason", async () => {
    const host = await mount(rendered("agent-steps"));
    const confirm = host.querySelector<HTMLElement>('[data-slot="agent-confirm"]')!;
    const seen: string[] = [];
    confirm.addEventListener("reject", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(`reject:${d.reason}`);
      d.wait(Promise.resolve());
    });
    // Untick the high risk change: Apply 1 needs no acknowledgement.
    changeRows()[1]!.querySelector<HTMLButtonElement>('button[role="checkbox"]')!.click();
    await tick();
    expect(buttonByText("Apply 1").disabled).toBe(false);
    buttonByText("Reject").click();
    await tick(300);
    const dlg = document.querySelector<HTMLElement>('[data-slot="agent-confirm-reject"]')!;
    const ta = dlg.querySelector<HTMLTextAreaElement>("textarea")!;
    ta.value = "Keep the old name";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    buttonByText("Reject changes").click();
    await tick(60);
    expect(seen).toEqual(["reject:Keep the old name"]);
    expect(confirm.dataset.decision).toBe("rejected");
  });
});
