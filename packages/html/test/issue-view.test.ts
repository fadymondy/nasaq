// The issue-view Blade example, as rendered by Laravel, under real Alpine with the Nasaq runtime.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { issueFormatHours, issueParseEstimate, issueTextToHtml } from "../src/alpine/issue-view-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("issue-view");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="issue-view"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element): any => Alpine.$data(el as never);
const selectRoot = (host: HTMLElement, row: number) => host.querySelectorAll<HTMLElement>('[data-slot="issue-property"]')[row]!.querySelector<HTMLElement>('[data-slot="select"]')!;

describe("issue-view helpers", () => {
  it("parses and formats estimates", () => {
    expect(issueParseEstimate("1h 30m")).toBe(1.5);
    expect(issueParseEstimate("2,5")).toBe(2.5);
    expect(issueParseEstimate("abc")).toBeNull();
    expect(issueFormatHours(1.5)).toBe("1h 30m");
    expect(issueFormatHours(0)).toBe("0m");
    expect(issueTextToHtml("a < b\n\nsecond")).toBe("<p>a &lt; b</p><p>second</p>");
  });
});

describe("issue-view (Blade example)", () => {
  it("renders the page with its parts, nine properties and the tabs", async () => {
    const host = await mount();
    expect(root(host).dataset.variant).toBe("page");
    expect(host.querySelectorAll('[data-slot="issue-property"]').length).toBe(9);
    expect(host.querySelector('[data-slot="issue-description"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="issue-sub-issues"]')!.querySelectorAll('[role="listitem"]').length).toBe(2);
    const mine = [...host.querySelectorAll('[data-slot="tabs-list"]')].find((l) => l.textContent!.includes("Comments"))!;
    expect([...mine.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.replace(/\s+/g, ""))).toEqual(["Comments2", "Activity2", "Time", "AIcost"]);
    expect(host.querySelector('[data-slot="issue-properties"]')!.getAttribute("aria-busy")).toBe("false");
    expect(host.textContent).toContain("Due soon");
  });

  it("shows the current choices in the pickers", async () => {
    const host = await mount();
    const values = [...host.querySelectorAll('[data-slot="issue-property"]')].map((r) => r.querySelector('[data-slot="select-value"]')?.textContent?.trim());
    expect(values[0]).toBe("In progress");
    expect(values[1]).toBe("High");
    expect(values[2]).toBe("Bug");
    expect(values[3]!.endsWith("Layla Hassan")).toBe(true);
  });

  it("saves a changed status through nq-issue-update and keeps it", async () => {
    const host = await mount();
    const got: unknown[] = [];
    root(host).addEventListener("nq-issue-update", (e) => {
      const d = (e as CustomEvent).detail;
      got.push(d.patch);
      d.wait(Promise.resolve());
    });
    data(selectRoot(host, 0)).value = "done";
    await tick();
    expect(got).toEqual([{ statusId: "done" }]);
    expect(data(host.querySelector('[data-slot="issue-properties"]')!).v.status).toBe("done");
    expect(host.querySelector('[data-slot="issue-properties"] [role="alert"]')!.getAttribute("style")).toContain("display: none");
  });

  it("puts the field back and shows the message when the host returns an error", async () => {
    const host = await mount();
    root(host).addEventListener("nq-issue-update", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Not allowed" })));
    data(selectRoot(host, 1)).value = "low";
    await tick();
    const props = host.querySelector<HTMLElement>('[data-slot="issue-properties"]')!;
    expect(data(props).v.priority).toBe("high");
    expect(props.querySelector('[role="alert"]')!.textContent).toBe("Not allowed");
  });

  it("fails with the generic message when nobody listens", async () => {
    const host = await mount();
    data(selectRoot(host, 2)).value = "task";
    await tick();
    expect(host.querySelector('[data-slot="issue-properties"] [role="alert"]')!.textContent).toContain("That did not work");
    expect(data(host.querySelector('[data-slot="issue-properties"]')!).v.type).toBe("bug");
  });

  it("clears the assignee with the none choice", async () => {
    const host = await mount();
    const got: unknown[] = [];
    root(host).addEventListener("nq-issue-update", (e) => {
      got.push((e as CustomEvent).detail.patch);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    data(selectRoot(host, 3)).value = "__none__";
    await tick();
    expect(got).toEqual([{ assigneeId: null }]);
  });

  it("toggles a label and shows its chip", async () => {
    const host = await mount();
    const got: unknown[] = [];
    root(host).addEventListener("nq-issue-update", (e) => {
      got.push((e as CustomEvent).detail.patch);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const props = host.querySelector<HTMLElement>('[data-slot="issue-properties"]')!;
    await data(props).toggleLabel("l1");
    await tick();
    expect(got).toEqual([{ labelIds: ["l2", "l1"] }]);
    expect(data(props).has("l1")).toBe(true);
  });

  it("commits a typed estimate and rejects one it cannot read", async () => {
    const host = await mount();
    const got: unknown[] = [];
    root(host).addEventListener("nq-issue-update", (e) => {
      got.push((e as CustomEvent).detail.patch);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const props = host.querySelector<HTMLElement>('[data-slot="issue-properties"]')!;
    const input = props.querySelector<HTMLInputElement>('input[aria-labelledby$="-estimate"]')!;
    expect(input.value).toBe("4h");
    input.value = "1h 30m";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(got).toEqual([{ estimateHours: 1.5 }]);
    input.value = "soon";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(got.length).toBe(1);
    expect(props.querySelector('[role="alert"]')!.textContent).toContain("Hours");
  });

  it("edits the title: Enter saves, an empty title is refused", async () => {
    const host = await mount();
    const got: unknown[] = [];
    root(host).addEventListener("nq-issue-update", (e) => {
      got.push((e as CustomEvent).detail.patch);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const view = data(root(host));
    view.startTitle();
    await tick();
    expect(view.editingTitle).toBe(true);
    view.titleDraft = "  ";
    await view.commitTitle();
    expect(view.titleError).toBe("A title is required");
    view.titleDraft = "Refunds fail";
    await view.commitTitle();
    expect(got).toEqual([{ title: "Refunds fail" }]);
    expect(view.editingTitle).toBe(false);
    expect(root(host).querySelector("h1")!.textContent).toContain("Refunds fail");
  });

  it("saves the description as HTML from the plain editor", async () => {
    const host = await mount();
    const got: Array<Record<string, unknown>> = [];
    root(host).addEventListener("nq-issue-update", (e) => {
      got.push((e as CustomEvent).detail.patch);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const view = data(root(host));
    view.startDesc(false);
    view.descDraft = "Now with <b>two</b> cards";
    await view.saveDesc(false);
    expect(got).toEqual([{ description: "<p>Now with &lt;b&gt;two&lt;/b&gt; cards</p>" }]);
    expect(view.editingDesc).toBe(false);
    expect(view.plain).toBe("Now with <b>two</b> cards");
  });

  it("adds a sub-issue and announces opening one", async () => {
    const host = await mount();
    const events: Array<[string, unknown]> = [];
    root(host).addEventListener("nq-issue-add-sub", (e) => {
      events.push(["add", (e as CustomEvent).detail.title]);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    root(host).addEventListener("nq-issue-open", (e) => events.push(["open", (e as CustomEvent).detail.id]));
    const view = data(root(host));
    view.subTitle = " Write the docs ";
    await view.addSub();
    expect(view.subTitle).toBe("");
    host.querySelector<HTMLButtonElement>('[data-slot="issue-sub-issues"] [role="listitem"] button')!.click();
    expect(events).toEqual([["add", "Write the docs"], ["open", "s1"]]);
  });
});
