// The Blade switchers example under real Alpine, plus a hand-written theme switcher and menu bindings.
import Alpine from "alpinejs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("theme-toggle (Blade example)", () => {
  it("flips light and dark and keeps its name in step", async () => {
    await mount("switchers");
    const toggle = document.querySelector<HTMLElement>('[data-slot="theme-toggle"]')!;
    expect(toggle.getAttribute("data-state")).toBe("light");
    expect(toggle.getAttribute("aria-label")).toBe("Switch to dark theme");
    toggle.click();
    await tick();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(toggle.getAttribute("data-state")).toBe("dark");
    expect(toggle.getAttribute("aria-label")).toBe("Switch to light theme");
  });
});

describe("locale-switcher (Blade example)", () => {
  it("shows the language name and switches the page to Arabic and RTL", async () => {
    await mount("switchers");
    const trigger = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
    expect(trigger.textContent).toContain("English");
    trigger.click();
    await tick();
    const radios = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-radio-item"]')];
    expect(radios).toHaveLength(2);
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
    radios[1]!.click();
    await tick();
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(trigger.textContent).toContain("العربية");
  });
});

describe("theme switcher and menu items", () => {
  it("marks the pressed option, applies it and moves focus with arrows", async () => {
    const host = document.createElement("div");
    host.innerHTML = `<div x-data="nqThemePref()" role="group" x-on:keydown="onKey($event)">
      <button id="a" x-on:click="set('light')" x-bind:data-pressed="pref === 'light' ? '' : undefined">L</button>
      <button id="b" x-on:click="set('dark')" x-bind:data-pressed="pref === 'dark' ? '' : undefined">D</button>
      <button id="c" x-on:click="set('system')" x-bind:data-pressed="pref === 'system' ? '' : undefined">S</button></div>`;
    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    const [a, b, c] = ["a", "b", "c"].map((id) => document.getElementById(id)!);
    expect(c!.hasAttribute("data-pressed")).toBe(true);
    b!.click();
    await tick();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(b!.hasAttribute("data-pressed")).toBe(true);
    expect(localStorage.getItem("nq-theme")).toBe("dark");
    a!.focus();
    a!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(b);
    c!.click();
    await tick();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("applies a change made through x-model on pref", async () => {
    const host = document.createElement("div");
    host.innerHTML = `<div x-data="nqThemePref()"><input id="v" x-model="pref"></div>`;
    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    const input = document.getElementById("v") as HTMLInputElement;
    input.value = "dark";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
