import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("product-reviews");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const reviewsOf = (root: Element) => [...root.querySelectorAll<HTMLElement>("li[data-review-id]")].map((e) => e.dataset.reviewId);
const click = async (el: Element | null | undefined) => {
  (el as HTMLElement).click();
  await tick();
};
const type = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const failWith = (name: string, error: string) => document.addEventListener(name, (e) => (e as any).detail.waitUntil(Promise.resolve({ error })), { once: true });

describe("product-reviews (Blade example)", () => {
  it("draws the summary, the histogram and the reviews, most helpful first", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    expect(text(root.querySelector("h2"))).toBe("Customer reviews");
    expect(text(root.querySelector('[data-slot="product-review-summary"] bdi'))).toBe("3.7");
    expect(text(root.querySelector('[data-slot="product-review-summary"] p.text-caption'))).toBe("Based on 3 reviews");
    expect(root.querySelectorAll("button[data-level]")).toHaveLength(5);
    expect(reviewsOf(root)).toEqual(["r1", "r2", "r3"]);
    expect(text(root.querySelector('[role="status"][aria-live]'))).toBe("Showing 3 of 3 reviews");
  });

  it("filters by star level from the histogram and clears the filters", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    const events: unknown[] = [];
    root.addEventListener("nq-filters", (e) => events.push((e as CustomEvent).detail));
    await click(root.querySelector('button[data-level="2"]'));
    expect(reviewsOf(root)).toEqual(["r3"]);
    expect(root.querySelector('button[data-level="2"]')!.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelectorAll("[data-star-pill]")).toHaveLength(1);
    expect(events).toEqual([{ stars: [2], withPhotos: false, verifiedOnly: false }]);
    await click(root.querySelector("[data-star-pill]"));
    expect(reviewsOf(root)).toEqual(["r1", "r2", "r3"]);
    await click(root.querySelector('[data-key="withPhotos"]'));
    expect(reviewsOf(root)).toEqual(["r1"]);
    expect(root.querySelector('[data-key="withPhotos"]')!.hasAttribute("data-selected")).toBe(true);
    await click([...root.querySelectorAll("button")].find((b) => text(b) === "Clear filters"));
    expect(reviewsOf(root)).toEqual(["r1", "r2", "r3"]);
  });

  it("votes helpful optimistically and rolls back when the listener reports an error", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    const events: unknown[] = [];
    root.addEventListener("nq-vote", (e) => events.push({ id: (e as CustomEvent).detail.id, voted: (e as CustomEvent).detail.voted }));
    const row = () => root.querySelector<HTMLElement>('li[data-review-id="r1"]')!;
    const visibleVote = () => [...row().querySelectorAll<HTMLElement>("[data-vote]")].find((b) => b.style.display !== "none")!;
    expect(text(visibleVote())).toBe("Helpful (12)");
    await click(visibleVote());
    expect(text(visibleVote())).toBe("Helpful (13)");
    expect(visibleVote().getAttribute("aria-pressed")).toBe("true");
    expect(events).toEqual([{ id: "r1", voted: true }]);
    failWith("nq-vote", "nope");
    await click(visibleVote());
    await tick();
    expect(text(visibleVote())).toBe("Helpful (13)");
    expect(text(root.querySelector('[role="status"][aria-live]'))).toContain("Could not save your vote");
  });

  it("reports a review through the dialog", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    const reports: unknown[] = [];
    document.addEventListener("nq-report", (e) => reports.push({ id: (e as CustomEvent).detail.id, reason: (e as CustomEvent).detail.reason, note: (e as CustomEvent).detail.note }));
    await click(root.querySelector('li[data-review-id="r3"] [data-report]'));
    const dialog = [...document.querySelectorAll('[data-slot="dialog-content"]')].find((d) => text(d)?.includes("Report this review"))!;
    expect(dialog).toBeTruthy();
    const send = [...dialog.querySelectorAll<HTMLButtonElement>("button[type=submit]")][0]!;
    expect(send.disabled).toBe(true);
    await click(dialog.querySelectorAll('[role="radio"]')[2]);
    await type(dialog.querySelector("textarea")!, " ads ");
    expect(send.disabled).toBe(false);
    send.click();
    await tick(60);
    expect(reports).toEqual([{ id: "r3", reason: "fake", note: "ads" }]);
    expect(text(dialog)).toContain("Thanks. We will review it.");
    expect(root.querySelector<HTMLButtonElement>('li[data-review-id="r3"] [data-report]')!.disabled).toBe(true);
  });

  it("validates the write-a-review form, then sends it through the block", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    const sent: { review: Record<string, unknown> }[] = [];
    root.addEventListener("nq-review", (e) => sent.push((e as CustomEvent).detail));
    await click([...root.querySelectorAll("header button")].find((b) => text(b) === "Write a review"));
    const dialog = [...document.querySelectorAll('[data-slot="dialog-content"]')].find((d) => d.querySelector('[data-slot="product-review-form"]'))!;
    const form = dialog.querySelector<HTMLFormElement>("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(text(form)).toContain("Choose a star rating.");
    expect(text(form)).toContain("Write your review.");
    expect(text(form)).toContain("Enter your name.");
    expect(sent).toHaveLength(0);

    await click(form.querySelectorAll('[role="radio"][data-slot="rating-star"]')[3]);
    expect(form.querySelectorAll('[data-slot="rating-star"][aria-checked="true"]')).toHaveLength(1);
    await type(form.querySelector('[data-field="title"]')!, " Solid ");
    await type(form.querySelector('[data-field="body"]')!, "Does exactly what it says, and the strap is comfortable.");
    await type(form.querySelector('[data-field="name"]')!, "Dina");
    await click(form.querySelector('[data-slot="fit-option"][data-value="true"]'));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.review).toMatchObject({ rating: 4, title: "Solid", name: "Dina", fit: "true", photos: [] });
    expect(text(dialog)).toContain("Thanks for your review");
  });

  it("keeps the form open with the message when the listener resolves an error", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    await click([...root.querySelectorAll("header button")].find((b) => text(b) === "Write a review"));
    const form = [...document.querySelectorAll<HTMLFormElement>('[data-slot="product-review-form"] form')][0]!;
    await click(form.querySelectorAll('[data-slot="rating-star"]')[4]);
    await type(form.querySelector('[data-field="body"]') as HTMLTextAreaElement, "Long enough review text for the rules here.");
    await type(form.querySelector('[data-field="name"]') as HTMLInputElement, "Dina");
    failWith("nq-review", "Spam filter said no");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(text(form)).toContain("Spam filter said no");
    expect(form.hidden || (form as HTMLElement).style.display === "none").toBe(false);
  });

  it("opens the photo viewer from a review photo", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="product-reviews"]')!;
    await click(root.querySelector('li[data-review-id="r1"] button[aria-label="View customer photo"]'));
    const viewer = [...document.querySelectorAll('[data-slot="dialog-content"]')].find((d) => text(d)?.includes("Photos from customers"))!;
    expect(text(viewer)).toContain("Photo 1 of 1");
    expect(viewer.querySelector("img")!.getAttribute("alt")).toBe("Front view");
  });
});

describe("product-reviews Q&A (Blade example)", () => {
  it("lists questions, upvotes optimistically and posts a question", async () => {
    const host = await mount();
    const qa = host.querySelector<HTMLElement>('[data-slot="product-qa"]')!;
    expect(text(qa.querySelector("h2"))).toBe("Questions and answers");
    expect(text(qa.querySelector("h3"))).toBe("Is it machine washable?");
    const up = qa.querySelector<HTMLElement>('[data-question-id="q1"] [data-upvote]')!;
    expect(text(up)).toBe("3");
    const votes: unknown[] = [];
    qa.addEventListener("nq-vote-question", (e) => votes.push((e as CustomEvent).detail.voted));
    await click(up);
    expect(text(up)).toBe("4");
    expect(up.getAttribute("aria-pressed")).toBe("true");
    expect(votes).toEqual([true]);

    const asked: unknown[] = [];
    qa.addEventListener("nq-ask", (e) => asked.push((e as CustomEvent).detail.question));
    const form = qa.querySelector("form")!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(text(form)).toContain("Write your question.");
    await type(form.querySelector("textarea")!, "Does it come in blue and green?");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(60);
    expect(asked).toEqual(["Does it come in blue and green?"]);
    expect(text(form)).toContain("Your question was posted.");
  });
});
