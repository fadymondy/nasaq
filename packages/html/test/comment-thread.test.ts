// The comment-thread Blade example, as rendered by Laravel, under real Alpine with the Nasaq runtime.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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
  host.innerHTML = rendered("comment-thread");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const form = (host: HTMLElement, kind: string) => host.querySelector<HTMLFormElement>(`form[data-composer="${kind}"]`)!;
const type = async (f: HTMLFormElement, text: string) => {
  const ta = f.querySelector<HTMLTextAreaElement>("textarea")!;
  ta.value = text;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("comment-thread (Blade example)", () => {
  it("renders the threads and keeps the reply and edit composers hidden", async () => {
    const host = await mount();
    expect(host.querySelectorAll('[data-slot="comment"]').length).toBe(3);
    expect(host.querySelector('[data-slot="comment"][data-pending]')).not.toBeNull();
    expect(form(host, "reply").closest("li")!.getAttribute("style")).toContain("display: none");
  });

  it("posts a comment with the trimmed text and clears the box", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="comment-thread"]')!;
    const got: Array<Record<string, unknown>> = [];
    root.addEventListener("nq-comment-submit", (e) => {
      const d = (e as CustomEvent).detail;
      got.push({ body: d.body, parentId: d.parentId });
      d.wait(Promise.resolve());
    });
    const f = form(host, "main");
    const submit = f.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);
    await type(f, "  Nice  ");
    expect(submit.disabled).toBe(false);
    f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(got).toEqual([{ body: "Nice", parentId: undefined }]);
    expect(f.querySelector("textarea")!.value).toBe("");
  });

  it("keeps the text and shows the error when the host says no", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="comment-thread"]')!;
    root.addEventListener("nq-comment-submit", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Rate limited" })));
    const f = form(host, "main");
    await type(f, "hello");
    f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(f.querySelector('[role="alert"]')!.textContent).toBe("Rate limited");
    expect(f.querySelector("textarea")!.value).toBe("hello");
  });

  it("opens the reply composer and posts with parentId", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="comment-thread"]')!;
    let parent: unknown;
    root.addEventListener("nq-comment-submit", (e) => {
      parent = (e as CustomEvent).detail.parentId;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    host.querySelector<HTMLElement>('button[data-action="reply"]')!.click();
    await tick();
    const f = form(host, "reply");
    expect(f.closest("li")!.getAttribute("style") ?? "").not.toContain("display: none");
    await type(f, "Thanks");
    f.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(parent).toBe("c1");
  });

  it("asks before deleting", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="comment-thread"]')!;
    const ids: string[] = [];
    root.addEventListener("nq-comment-delete", (e) => {
      ids.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const own = host.querySelector('[data-slot="comment"]')!.closest("li")!;
    const dialog = own.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(dialog.getAttribute("style")).toContain("display: none");
    // The Delete items live in menus that are closed; call the same method they do.
    (Alpine.$data(root) as { askDelete(id: string): void }).askDelete("c1");
    await tick();
    expect(dialog.getAttribute("style") ?? "").not.toContain("display: none");
    expect(ids).toEqual([]);
    dialog.querySelector<HTMLElement>('[data-action="confirm-delete"]')!.click();
    await tick();
    expect(ids).toEqual(["c1"]);
  });
});
