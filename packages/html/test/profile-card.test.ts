// The Blade profile-card example under real Alpine: the hover card (hover, focus, touch tap, outside tap) and its actions.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const card = () => document.querySelector<HTMLElement>('[data-slot="profile-hover-card-content"]')!;
const touch = (type: string) => {
  const e = new Event(type, { bubbles: true });
  Object.defineProperty(e, "pointerType", { value: "touch" });
  return e;
};

describe("profile-card (Blade example)", () => {
  it("renders the card on the server: name, status, local time and offset", async () => {
    await mount("profile-card");
    const inline = document.querySelectorAll<HTMLElement>('[data-slot="profile-card"]');
    const omar = [...inline].find((c) => c.textContent?.includes("Omar Haddad"))!;
    expect(omar.textContent?.replace(/\s/g, " ")).toContain("7:00 AM");
    expect(omar.textContent).toContain("5h behind you");
    expect(omar.querySelector('[data-slot="presence-dot"]')!.getAttribute("aria-label")).toBe("Away");
  });

  it("opens after the delay on hover, then closes after the close delay", async () => {
    const host = await mount("profile-card");
    const trigger = host.querySelector<HTMLElement>('[data-slot="profile-hover-card-trigger"]')!;
    expect(card().style.display).toBe("none");
    trigger.dispatchEvent(new Event("pointerenter"));
    await tick(100);
    expect(card().style.display).toBe("none");
    await tick(350);
    expect(card().style.display).not.toBe("none");
    expect(card().getAttribute("role")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.dispatchEvent(new Event("pointerleave"));
    await tick(300);
    expect(card().style.display).toBe("none");
  });

  it("opens on focus and closes on Escape", async () => {
    const host = await mount("profile-card");
    const trigger = host.querySelector<HTMLElement>('[data-slot="profile-hover-card-trigger"]')!;
    trigger.dispatchEvent(new Event("focus"));
    await tick(450);
    expect(card().style.display).not.toBe("none");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(300);
    expect(card().style.display).toBe("none");
  });

  it("a touch tap toggles it and a tap outside closes it", async () => {
    const host = await mount("profile-card");
    const trigger = host.querySelector<HTMLElement>('[data-slot="profile-hover-card-trigger"]')!;
    trigger.dispatchEvent(touch("pointerenter"));
    await tick(450);
    expect(card().style.display).toBe("none");
    trigger.dispatchEvent(touch("pointerup"));
    await tick(300);
    expect(card().style.display).not.toBe("none");
    // A tap inside the card keeps it open.
    card().dispatchEvent(touch("pointerdown"));
    await tick(300);
    expect(card().style.display).not.toBe("none");
    document.body.dispatchEvent(touch("pointerdown"));
    await tick(300);
    expect(card().style.display).toBe("none");
  });

  it("the action buttons dispatch events carrying the person's id", async () => {
    const host = await mount("profile-card");
    const trigger = host.querySelector<HTMLElement>('[data-slot="profile-hover-card-trigger"]')!;
    trigger.dispatchEvent(new Event("focus"));
    await tick(450);
    const seen: string[] = [];
    for (const name of ["nq-message", "nq-view-profile"]) document.addEventListener(name, (e) => seen.push(`${name}:${(e as CustomEvent).detail.id}`));
    const buttons = [...card().querySelectorAll<HTMLElement>('[data-slot="profile-card-actions"] button')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(["Message", "View profile"]);
    buttons.forEach((b) => b.click());
    expect(seen).toEqual(["nq-message:u1", "nq-view-profile:u1"]);
  });

  it("mention chips: a team has no card, a person opens one", async () => {
    await mount("profile-card");
    const chips = [...document.querySelectorAll<HTMLElement>('[data-slot="mention-chip"]')];
    expect(chips.map((c) => c.dataset.kind)).toEqual(["person", "team"]);
    expect(chips[0]!.getAttribute("role")).toBe("button");
    expect(chips[1]!.getAttribute("role")).toBeNull();
  });
});
