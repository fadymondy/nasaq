// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { defaultCurrency, formatMoney, init, delegate, menu, setLocale, setTheme, tabs, toast } from "../src/index";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("money", () => {
  it("defaults to USD, or SAR in Arabic, never a shekel", () => {
    expect(defaultCurrency("en")).toBe("USD");
    expect(defaultCurrency("ar")).toBe("SAR");
    expect(defaultCurrency("ar-EG")).toBe("SAR");
    expect(formatMoney(12.5)).toContain("$");
    expect(formatMoney(12.5, { locale: "ar" })).toMatch(/12\.50/);
    expect(formatMoney(1, { locale: "ar" })).not.toMatch(/ILS|₪/);
  });

  it("falls back instead of throwing on a bad code", () => {
    expect(formatMoney(3, { currency: "NOPE" })).toContain("$");
  });

  it("formats [data-nq-money] on init", () => {
    document.body.innerHTML = '<span data-nq-money="1200"></span><span lang="ar" data-nq-money="5" data-compact></span>';
    init();
    const [usd, sar] = document.querySelectorAll("span");
    expect(usd!.textContent).toBe("$1,200.00");
    expect(sar!.textContent).toMatch(/5/);
    expect(sar!.textContent).not.toMatch(/\.00/);
  });
});

describe("locale and theme", () => {
  it("sets lang and dir together", () => {
    setLocale("ar");
    expect(document.documentElement.dir).toBe("rtl");
    setLocale("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("applies and clears data-theme", () => {
    setTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    setTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

describe("tabs", () => {
  const markup = `
    <div data-nq="tabs">
      <div role="tablist">
        <button role="tab" aria-controls="a">A</button>
        <button role="tab" aria-controls="b">B</button>
        <button role="tab" aria-controls="c" disabled>C</button>
      </div>
      <div role="tabpanel" id="a"></div><div role="tabpanel" id="b"></div><div role="tabpanel" id="c"></div>
    </div>`;

  it("selects the first tab and hides the other panels", () => {
    document.body.innerHTML = markup;
    const h = tabs(document.querySelector('[data-nq="tabs"]')!);
    expect(h.value).toBe("a");
    expect(document.getElementById("b")!.hidden).toBe(true);
    h.select("b");
    expect(document.getElementById("a")!.hidden).toBe(true);
    expect(document.querySelectorAll('[role="tab"]')[1]!.getAttribute("aria-selected")).toBe("true");
  });

  it("moves with arrow keys and skips disabled tabs", () => {
    document.body.innerHTML = markup;
    const h = tabs(document.querySelector('[data-nq="tabs"]')!);
    const [a] = document.querySelectorAll<HTMLElement>('[role="tab"]');
    a!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(h.value).toBe("b");
  });

  it("does not select a disabled tab", () => {
    document.body.innerHTML = markup;
    const h = tabs(document.querySelector('[data-nq="tabs"]')!);
    h.select("c");
    expect(h.value).toBe("a");
  });
});

describe("menu", () => {
  it("opens, wires aria, and closes on Escape", () => {
    document.body.innerHTML = `
      <button id="t" aria-controls="m">Actions</button>
      <div id="m" role="menu"><button role="menuitem">Edit</button><button role="menuitem">Delete</button></div>`;
    const trigger = document.getElementById("t")!;
    const h = menu(trigger);
    expect(document.getElementById("m")!.hidden).toBe(true);
    trigger.click();
    expect(h.isOpen).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    document.getElementById("m")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(h.isOpen).toBe(false);
  });

  it("closes after choosing an item", () => {
    document.body.innerHTML = `<button id="t" aria-controls="m"></button><div id="m" role="menu"><button role="menuitem">Edit</button></div>`;
    const h = menu(document.getElementById("t")!);
    h.open();
    document.querySelector<HTMLElement>('[role="menuitem"]')!.click();
    expect(h.isOpen).toBe(false);
  });
});

describe("init and delegation", () => {
  it("binds once even when called twice", () => {
    document.body.innerHTML = `<button data-nq="menu" aria-controls="m"></button><div id="m" role="menu"><button role="menuitem">x</button></div>`;
    init();
    init();
    document.querySelector<HTMLElement>('[data-nq="menu"]')!.click();
    // a double bind would toggle open then closed again
    expect(document.getElementById("m")!.hidden).toBe(false);
  });

  it("theme buttons switch the theme", () => {
    document.body.innerHTML = '<button data-nq-theme="dark">Dark</button>';
    const stop = delegate();
    document.querySelector<HTMLElement>("button")!.click();
    expect(document.documentElement.dataset.theme).toBe("dark");
    stop();
  });
});

describe("toast", () => {
  it("adds a toast to a polite region and removes it", () => {
    const dismiss = toast({ title: "Saved", tone: "success", duration: 0 });
    const region = document.querySelector(".nq-toaster")!;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.querySelector(".nq-toast-title")!.textContent).toBe("Saved");
    expect(region.querySelector('[data-tone="success"] svg')).not.toBeNull();
    dismiss();
    expect(region.querySelector(".nq-toast")).toBeNull();
  });

  it("labels the close button in Arabic", () => {
    document.documentElement.lang = "ar";
    toast({ title: "تم", duration: 0 });
    expect(document.querySelector(".nq-toast-close")!.getAttribute("aria-label")).toBe("إغلاق");
  });
});
