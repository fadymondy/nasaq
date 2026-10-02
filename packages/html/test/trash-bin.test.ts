// The Blade trash-bin example under real Alpine: rows sorted by time left, restore and delete-forever through the dialog, empty, and fail().
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="trash-bin"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (host: HTMLElement): any => Alpine.$data(root(host));
const cards = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-card]")];

describe("trash-bin (Blade example)", () => {
  it("lists the items by what expires first, with the urgency badge", async () => {
    const host = await mount("trash-bin");
    expect(root(host).querySelector("h2")!.textContent).toBe("Trash");
    expect(root(host).textContent).toContain("30 days after you delete them");
    expect(data(host).entries.map((r: { id: string }) => r.id)).toEqual(["2", "3", "1"]);
    expect(cards(host)).toHaveLength(3);
    expect(host.querySelector('[data-urgency="soon"]')!.textContent).toBe("4 days left");
  });

  it("restores at once and fires trash-restore; fail puts the item back", async () => {
    const host = await mount("trash-bin");
    const events: { ids: string[]; fail(m?: string): void }[] = [];
    root(host).addEventListener("trash-restore", (e) => events.push((e as CustomEvent).detail));
    const notes: string[] = [];
    root(host).addEventListener("trash-notify", (e) => notes.push((e as CustomEvent).detail.message));
    data(host).onAction({ action: "restore", row: { id: "3" } });
    await tick();
    expect(events[0]!.ids).toEqual(["3"]);
    expect(notes).toEqual(["1 item restored"]);
    expect(data(host).entries).toHaveLength(2);
    events[0]!.fail();
    await tick();
    expect(data(host).entries).toHaveLength(3);
    expect(data(host).failure).toBe("Something went wrong. Nothing was changed.");
  });

  it("asks before deleting for good", async () => {
    const host = await mount("trash-bin");
    const deleted: string[][] = [];
    root(host).addEventListener("trash-delete", (e) => deleted.push((e as CustomEvent).detail.ids));
    data(host).onAction({ action: "delete", row: { id: "1" } });
    await tick();
    expect(data(host).confirmOpen).toBe(true);
    expect(data(host).dialogTitle()).toBe("Delete “Q3 budget.xlsx” forever?");
    expect(deleted).toEqual([]);
    data(host).confirmed();
    await tick();
    expect(deleted).toEqual([["1"]]);
    expect(data(host).entries.map((r: { id: string }) => r.id)).toEqual(["2", "3"]);
  });

  it("empties the trash after confirming", async () => {
    const host = await mount("trash-bin");
    const emptied: string[][] = [];
    root(host).addEventListener("trash-empty", (e) => emptied.push((e as CustomEvent).detail.ids));
    data(host).askEmpty();
    await tick();
    expect(data(host).dialogTitle()).toBe("Empty the trash?");
    expect(data(host).dialogBody()).toBe("3 items will be deleted for good. This cannot be undone.");
    data(host).confirmed();
    await tick();
    expect(emptied[0]).toHaveLength(3);
    expect(data(host).entries).toEqual([]);
    expect(root(host).textContent).toContain("The trash is empty");
  });
});
