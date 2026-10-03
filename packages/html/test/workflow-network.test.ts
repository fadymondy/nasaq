// The Blade workflow-network example under real Alpine. happy-dom has no layout, so widths and boxes are stubbed.
import { afterEach, describe, expect, it } from "vitest";
import { connector, networkLinks, rowsFor } from "../src/alpine/workflow-network";
import { mount, setup, tick } from "./_float-setup";

setup();

const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
const saved = { clientWidth: Object.getOwnPropertyDescriptor(proto, "clientWidth"), offsetWidth: Object.getOwnPropertyDescriptor(proto, "offsetWidth"), offsetHeight: Object.getOwnPropertyDescriptor(proto, "offsetHeight"), rect: proto.getBoundingClientRect };

function stubLayout(width: number) {
  Object.defineProperty(proto, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(proto, "offsetWidth", { configurable: true, get: () => width });
  Object.defineProperty(proto, "offsetHeight", { configurable: true, get: () => 400 });
  // Each [data-step] sits in its own 100x40 slot, one per 80px of height, so connectors have somewhere to go.
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const step = this.getAttribute?.("data-step");
    if (!step) return { left: 0, top: 0, width, height: 400, right: width, bottom: 400, x: 0, y: 0 };
    const i = ["ask", "check", "review", "pay"].indexOf(step);
    return { left: 10, top: i * 80, width: 100, height: 40, right: 110, bottom: i * 80 + 40, x: 10, y: i * 80 };
  };
}

afterEach(() => {
  for (const key of ["clientWidth", "offsetWidth", "offsetHeight"] as const) {
    const d = saved[key];
    if (d) Object.defineProperty(proto, key, d);
    else delete proto[key];
  }
  proto.getBoundingClientRect = saved.rect;
});

describe("workflow-network (Blade example)", () => {
  it("renders the cards and the first frame as rows of up to four", async () => {
    const host = await mount("workflow-network");
    const fig = host.querySelector('[data-slot="workflow-network"]')!;
    expect(fig.querySelector("h3")!.textContent).toBe("Refund requests");
    expect(fig.querySelector(".sr-only")!.textContent).toBe("4 steps");
    expect([...fig.querySelectorAll("[data-step]")].map((c) => c.getAttribute("data-step"))).toEqual(["ask", "check", "review", "pay"]);
    expect(fig.querySelector('[data-step="check"]')!.textContent).toContain("Decision");
    expect(fig.querySelectorAll('[data-net="row"]')).toHaveLength(1);
  });

  it("draws a connector per link with labels at their midpoints", async () => {
    stubLayout(900);
    const host = await mount("workflow-network");
    const paths = host.querySelectorAll("svg[data-net='edges'] path[data-edge]");
    expect(paths).toHaveLength(4);
    expect(paths[0]!.getAttribute("d")!.startsWith("M ")).toBe(true);
    expect(paths[0]!.getAttribute("marker-end")).toMatch(/^url\(#nq-net-[0-9a-f]{8}\)$/);
    expect([...host.querySelectorAll("[data-net-label]")].map((l) => l.textContent)).toEqual(["Yes", "No", "Approved"]);
  });

  it("becomes one column on a narrow container", async () => {
    stubLayout(300);
    const host = await mount("workflow-network");
    const fig = host.querySelector('[data-slot="workflow-network"]')!;
    expect(fig.getAttribute("data-layout")).toBe("vertical");
    expect(fig.querySelectorAll('[data-net="row"]')).toHaveLength(4);
    expect(fig.querySelector('[data-net="rows"]')!.className).toContain("gap-9");
    await tick();
  });

  it("geometry helpers: default chain, balanced rows, connectors", () => {
    expect(networkLinks(["a", "b", "c"])).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ]);
    expect(networkLinks(["a", "b"], [{ from: "a", to: "x" }, { from: "a", to: "a" }, { from: "a", to: "b", label: "Yes" }])).toEqual([{ from: 0, to: 1, label: "Yes" }]);
    expect(rowsFor(5, 4)).toEqual([3, 2]);
    expect(connector({ x: 0, y: 0, w: 100, h: 40 }, { x: 140, y: 0, w: 100, h: 40 }).d.startsWith("M 100 20")).toBe(true);
  });
});
