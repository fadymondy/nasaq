// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";

// Alpine reads window at import time, so load it inside the DOM environment.
let Alpine: typeof import("alpinejs");

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeAll(async () => {
  document.body.innerHTML = `
    <div id="money" x-data="{ price: 12.5 }">
      <span id="usd" x-nq-money="price"></span>
      <span id="sar" lang="ar" data-locale="ar" x-nq-money="price"></span>
      <button id="bump" @click="price = 20">bump</button>
    </div>

    <div id="tabs" x-data="nqTabs('one')">
      <div role="tablist" class="nq-tabs-list">
        <button x-bind="tab('one')">One</button>
        <button x-bind="tab('two')">Two</button>
      </div>
      <div x-bind="panel('one')">first</div>
      <div x-bind="panel('two')">second</div>
    </div>

    <div id="menu" x-data="nqMenu">
      <button id="menu-trigger" x-bind="trigger">Actions</button>
      <div id="menu-panel" x-bind="menu"><button x-bind="item">Edit</button></div>
    </div>

    <div id="vanilla" x-data>
      <button id="vt" x-nq:menu aria-controls="vm">More</button>
      <div id="vm" role="menu"><button role="menuitem">Archive</button></div>
    </div>

    <div id="store" x-data><span id="theme" x-text="$nq.theme"></span><button id="dark" @click="$nq.setTheme('dark')"></button></div>
  `;
  Alpine = (await import("alpinejs")).default as unknown as typeof Alpine;
  const nasaq = (await import("../src/alpine")).default;
  (window as unknown as { Alpine: unknown }).Alpine = Alpine;
  Alpine.plugin(nasaq);
  Alpine.start();
  await tick();
});

describe("alpine plugin", () => {
  it("x-nq-money formats reactively, USD or SAR in Arabic", async () => {
    expect(document.getElementById("usd")!.textContent).toBe("$12.50");
    expect(document.getElementById("sar")!.textContent).toMatch(/12\.50/);
    expect(document.getElementById("sar")!.textContent).not.toMatch(/\$/);
    document.getElementById("bump")!.click();
    await tick();
    expect(document.getElementById("usd")!.textContent).toBe("$20.00");
  });

  it("nqTabs wires aria and switches panels", async () => {
    const [one, two] = document.querySelectorAll<HTMLElement>("#tabs [role=tab]");
    expect(one!.getAttribute("aria-selected")).toBe("true");
    expect(one!.getAttribute("aria-controls")).toBe("nq-panel-one");
    two!.click();
    await tick();
    expect(two!.getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("nq-panel-one")!.style.display).toBe("none");
  });

  it("nqMenu toggles from its trigger", async () => {
    const trigger = document.getElementById("menu-trigger")!;
    expect(document.getElementById("menu-panel")!.style.display).toBe("none");
    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("menu-panel")!.style.display).not.toBe("none");
  });

  it("x-nq:menu binds the vanilla menu", async () => {
    const t = document.getElementById("vt")!;
    expect(t.getAttribute("aria-haspopup")).toBe("menu");
    t.click();
    expect(document.getElementById("vm")!.hidden).toBe(false);
  });

  it("$nq is the reactive store", async () => {
    document.getElementById("dark")!.click();
    await tick();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.getElementById("theme")!.textContent).toBe("dark");
  });

  it("listens for the Livewire nq-toast event", () => {
    window.dispatchEvent(new CustomEvent("nq-toast", { detail: { title: "Saved", tone: "success", duration: 0 } }));
    expect(document.querySelector(".nq-toast-title")!.textContent).toBe("Saved");
  });
});
