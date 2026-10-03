// The Blade dropdown-menu example under real Alpine, plus a hand-written menu with checkbox, radio and a submenu.
import Alpine from "alpinejs";
import { afterEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const trigger = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
const popup = () => document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]');
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("dropdown-menu (Blade example)", () => {
  it("is closed to start and opens on click with the menu role", async () => {
    await mount("dropdown-menu");
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(popup()!.style.display).toBe("none");
    trigger().click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(trigger().hasAttribute("data-popup-open")).toBe(true);
    expect(popup()!.style.display).not.toBe("none");
    expect(popup()!.getAttribute("role")).toBe("menu");
    expect(items().map((i) => i.getAttribute("role"))).toEqual(["menuitem", "menuitem", "menuitem"]);
  });

  it("opens from the keyboard onto the first item and moves with the arrows, looping", async () => {
    await mount("dropdown-menu");
    trigger().focus();
    key(trigger(), "ArrowDown");
    await tick();
    const [edit, dup, del] = items();
    expect(document.activeElement).toBe(edit);
    expect(edit!.hasAttribute("data-highlighted")).toBe(true);
    key(popup()!, "ArrowDown");
    expect(document.activeElement).toBe(dup);
    expect(edit!.hasAttribute("data-highlighted")).toBe(false);
    key(popup()!, "End");
    expect(document.activeElement).toBe(del);
    key(popup()!, "ArrowDown");
    expect(document.activeElement).toBe(edit);
    key(popup()!, "d");
    expect(document.activeElement).toBe(dup);
  });

  it("closes on Escape with focus back on the trigger, and on an item click", async () => {
    await mount("dropdown-menu");
    trigger().click();
    await tick();
    key(popup()!, "Escape");
    await tick(400);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
    trigger().click();
    await tick();
    items()[0]!.click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on an outside pointer down", async () => {
    await mount("dropdown-menu");
    trigger().click();
    await tick();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});

const rich = `
<div x-data="nqDropdownMenu(false)" class="contents">
  <button type="button" data-slot="dropdown-menu-trigger" x-ref="trigger" x-bind="trigger">Open</button>
  <template x-teleport="body">
    <div data-slot="dropdown-menu-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" x-anchor.bottom-start.offset.4="$refs.trigger">
      <div data-slot="dropdown-menu-item" role="menuitem" x-bind="item">Plain</div>
      <div data-slot="dropdown-menu-item" role="menuitem" x-bind="item" data-disabled aria-disabled="true">Off</div>
      <div data-slot="dropdown-menu-checkbox-item" role="menuitemcheckbox" x-data="{ checked: false }" x-bind="item" data-keep-open
        x-on:click="checked = ! checked" x-bind:aria-checked="checked ? 'true' : 'false'" x-bind:data-checked="checked ? '' : undefined">Grid</div>
      <div data-slot="dropdown-menu-radio-group" role="group" x-data="{ value: 'a' }">
        <div data-slot="dropdown-menu-radio-item" role="menuitemradio" x-bind="item" data-keep-open
          x-on:click="value = 'a'" x-bind:aria-checked="value === 'a' ? 'true' : 'false'">A</div>
        <div data-slot="dropdown-menu-radio-item" role="menuitemradio" x-bind="item" data-keep-open
          x-on:click="value = 'b'" x-bind:aria-checked="value === 'b' ? 'true' : 'false'">B</div>
      </div>
      <div data-slot="dropdown-menu-sub" role="none" x-data="nqDropdownSub()" class="contents">
        <div data-slot="dropdown-menu-sub-trigger" role="menuitem" x-ref="subtrigger" x-bind="subTrigger">More</div>
        <template x-teleport="body">
          <div data-slot="dropdown-menu-sub-content" x-bind="subPopup" x-init="subPopupEl = $el" x-nq-presence="subOpen" x-anchor.right-start.offset.-4="$refs.subtrigger">
            <div data-slot="dropdown-menu-item" role="menuitem" x-bind="item" id="inner">Inner</div>
          </div>
        </template>
      </div>
    </div>
  </template>
</div>`;

async function mountRich(dir = "ltr") {
  const host = document.createElement("div");
  document.documentElement.setAttribute("dir", dir);
  host.innerHTML = rich;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("dropdown-menu (checkbox, radio, submenu)", () => {
  afterEach(() => document.documentElement.removeAttribute("dir"));

  it("skips disabled items, toggles checkbox and radio without closing", async () => {
    await mountRich();
    trigger().click();
    await tick();
    const rows = [...popup()!.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    key(popup()!, "ArrowDown");
    expect(document.activeElement).toBe(rows[0]);
    key(popup()!, "ArrowDown");
    expect(document.activeElement).toBe(rows[2]);
    rows[2]!.click();
    await tick();
    expect(rows[2]!.getAttribute("aria-checked")).toBe("true");
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    rows[4]!.click();
    await tick();
    expect(rows[4]!.getAttribute("aria-checked")).toBe("true");
    expect(rows[3]!.getAttribute("aria-checked")).toBe("false");
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("opens the submenu with ArrowRight and closes it with ArrowLeft", async () => {
    await mountRich();
    trigger().click();
    await tick();
    const sub = popup()!.querySelector<HTMLElement>('[data-slot="dropdown-menu-sub-trigger"]')!;
    sub.focus();
    key(sub, "ArrowRight");
    await tick();
    const inner = document.getElementById("inner")!;
    expect(sub.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(inner);
    key(inner.closest('[role="menu"]')!, "ArrowLeft");
    await tick(400);
    expect(sub.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(sub);
  });

  it("mirrors the submenu arrows in RTL and closes everything when a submenu item is chosen", async () => {
    await mountRich("rtl");
    trigger().click();
    await tick();
    const sub = popup()!.querySelector<HTMLElement>('[data-slot="dropdown-menu-sub-trigger"]')!;
    sub.focus();
    key(sub, "ArrowRight");
    await tick();
    expect(sub.getAttribute("aria-expanded")).toBe("false");
    key(sub, "ArrowLeft");
    await tick();
    expect(sub.getAttribute("aria-expanded")).toBe("true");
    document.getElementById("inner")!.click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
