// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { closeDialog, delegate, init, observe, openDialog, tabs } from "../src/index";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const tick = () => new Promise((r) => setTimeout(r, 0));
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("dialog", () => {
  it("opens from data-nq-open and closes from data-nq-close with its value", () => {
    document.body.innerHTML = `
      <button id="open" data-nq-open="invite">Invite</button>
      <dialog id="invite" class="nq-dialog" data-nq="dialog"><button id="cancel" data-nq-close="cancel">Cancel</button></dialog>`;
    cleanups.push(delegate(), init());
    const dlg = document.getElementById("invite") as HTMLDialogElement;
    document.getElementById("open")!.click();
    expect(dlg.open).toBe(true);
    document.getElementById("cancel")!.click();
    expect(dlg.open).toBe(false);
    expect(dlg.returnValue).toBe("cancel");
  });

  it("openDialog and closeDialog take an id and ignore unknown ids", () => {
    document.body.innerHTML = `<dialog id="d"></dialog>`;
    openDialog("d");
    expect((document.getElementById("d") as HTMLDialogElement).open).toBe(true);
    closeDialog("d");
    expect((document.getElementById("d") as HTMLDialogElement).open).toBe(false);
    expect(() => openDialog("missing")).not.toThrow();
  });

  it("keeps a non-dismissible dialog open on a backdrop click", () => {
    document.body.innerHTML = `<dialog id="d" data-nq="dialog" data-dismissible="false"></dialog>`;
    cleanups.push(init());
    const dlg = document.getElementById("d") as HTMLDialogElement;
    openDialog(dlg);
    dlg.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: -10, clientY: -10 }));
    expect(dlg.open).toBe(true);
  });
});

describe("tooltip", () => {
  it("shows on focus, describes the anchor, and hides on Escape", () => {
    document.body.innerHTML = `<button aria-label="Archive" data-nq-tooltip="Archive">A</button>`;
    cleanups.push(init());
    const btn = document.querySelector("button")!;
    btn.dispatchEvent(new FocusEvent("focus"));
    const tip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toBe("Archive");
    expect(btn.getAttribute("aria-describedby")).toBe(tip.id);
    key(btn, "Escape");
    expect(tip.hidden).toBe(true);
  });
});

describe("accordion", () => {
  it("keeps one item open unless data-type is multiple", () => {
    document.body.innerHTML = `
      <div data-nq="accordion"><details id="a" open><summary>A</summary></details><details id="b"><summary>B</summary></details></div>`;
    cleanups.push(init());
    const a = document.getElementById("a") as HTMLDetailsElement;
    const b = document.getElementById("b") as HTMLDetailsElement;
    b.open = true;
    b.dispatchEvent(new Event("toggle"));
    expect(a.open).toBe(false);
  });
});

describe("tabs in RTL", () => {
  it("mirrors the arrow keys and announces changes", () => {
    document.documentElement.dir = "rtl";
    document.body.innerHTML = `
      <div data-nq="tabs">
        <div role="tablist"><button role="tab" aria-controls="p1">One</button><button role="tab" aria-controls="p2">Two</button></div>
        <div role="tabpanel" id="p1"></div><div role="tabpanel" id="p2"></div>
      </div>`;
    const root = document.querySelector<HTMLElement>('[data-nq="tabs"]')!;
    const seen: string[] = [];
    root.addEventListener("nq:change", (e) => seen.push((e as CustomEvent).detail.value));
    const handle = tabs(root);
    cleanups.push(handle.destroy);
    key(document.querySelector('[aria-controls="p1"]')!, "ArrowLeft");
    expect(handle.value).toBe("p2");
    expect(document.getElementById("p1")!.hidden).toBe(true);
    expect(seen.at(-1)).toBe("p2");
  });
});

describe("observe", () => {
  it("binds markup added later (Livewire, HTMX, Turbo)", async () => {
    cleanups.push(observe(document.body));
    const holder = document.createElement("div");
    holder.innerHTML = `<span data-nq-money="7"></span>`;
    document.body.append(holder);
    await tick();
    expect(holder.querySelector("span")!.textContent).toBe("$7.00");
  });
});

describe("cdn build", () => {
  it("exposes window.Nasaq", async () => {
    await import("../src/cdn");
    const w = window as unknown as { Nasaq: { formatMoney(n: number, o?: object): string } };
    expect(w.Nasaq.formatMoney(3, { locale: "ar" })).toMatch(/3\.00/);
  });
});
