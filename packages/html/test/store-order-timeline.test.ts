// The tracking variant is static: the rendered Blade example is the whole port. The activity variant's note composer
// is Alpine (nqStoreOrderTimeline); its markup below is what <x-nq::store-order-timeline variant="activity" add-note /> renders.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("store-order-timeline (Blade example)", () => {
  it("renders the tracking steps with state attributes and the carrier link", async () => {
    const host = await mountHtml(rendered("store-order-timeline"));
    const root = host.querySelector<HTMLElement>('[data-slot="store-order-timeline"]')!;
    expect(root.getAttribute("data-variant")).toBe("tracking");
    expect([...root.querySelectorAll("li[data-state]")].map((li) => li.getAttribute("data-state"))).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    expect(root.querySelector('li[aria-current="step"]')).not.toBeNull();
    const link = root.querySelector<HTMLAnchorElement>("a")!;
    expect(link.getAttribute("href")).toBe("https://track.example.com/?n=AB123456789");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });
});

describe("store-order-timeline note composer", () => {
  it("enables Add note only with text, dispatches nq-add-note with the trimmed note and clears", async () => {
    const host = await mountHtml(`
      <form x-data="nqStoreOrderTimeline" x-on:submit.prevent="submit()">
        <textarea data-slot="textarea" aria-label="Add a note" x-model="note"></textarea>
        <button type="submit" x-bind:disabled="! canSubmit" x-bind:data-disabled="! canSubmit">Add note</button>
      </form>`);
    const area = host.querySelector<HTMLTextAreaElement>("textarea")!;
    const button = host.querySelector<HTMLButtonElement>("button")!;
    expect(button.hasAttribute("disabled")).toBe(true);

    const notes: unknown[] = [];
    host.addEventListener("nq-add-note", (e) => notes.push((e as CustomEvent).detail));

    area.value = "   ";
    area.dispatchEvent(new Event("input"));
    await tick();
    expect(button.hasAttribute("disabled")).toBe(true);

    area.value = "  call the customer ";
    area.dispatchEvent(new Event("input"));
    await tick();
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.hasAttribute("data-disabled")).toBe(false);

    host.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(notes).toEqual([{ note: "call the customer" }]);
    expect(area.value).toBe("");
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
