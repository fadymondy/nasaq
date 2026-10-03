import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqSocialComposer, NqSocialMetricsTable } from ".";

const accounts = [
  { id: "x1", platform: "x", name: "@nasaq" },
  { id: "ig1", platform: "instagram", name: "nasaq" },
] as const;

describe("NqSocialComposer", () => {
  it("renders a target per selected account and flags missing media", async () => {
    const w = mount(NqSocialComposer, { props: { accounts: [...accounts] } });
    expect(w.attributes("data-slot")).toBe("social-composer");
    expect(w.findAll("[data-slot=social-target]")).toHaveLength(0);
    const buttons = w.findAll("fieldset button");
    await buttons[0]!.trigger("click");
    await buttons[1]!.trigger("click");
    await w.get("textarea").setValue("hello");
    const targets = w.findAll("[data-slot=social-target]");
    expect(targets.map((t) => t.attributes("data-platform")).sort()).toEqual(["instagram", "x"]);
    expect(w.text()).toContain("5 of 280");
    const submit = w.findAll("button").find((b) => b.text().includes("Publish"));
    expect(submit!.attributes("disabled")).toBeDefined();
  });

  it("emits submit when every target passes", async () => {
    const w = mount(NqSocialComposer, { props: { accounts: [...accounts] } });
    await w.findAll("fieldset button")[0]!.trigger("click");
    await w.get("textarea").setValue("hello");
    const submit = w.findAll("button").find((b) => b.text().includes("Publish"))!;
    await submit.trigger("click");
    expect(w.emitted("submit")).toHaveLength(1);
  });
});

describe("NqSocialMetricsTable", () => {
  it("shows totals and rows", () => {
    const w = mount(NqSocialMetricsTable, {
      props: { rows: [{ id: "p1", platform: "x", text: "Hi", status: "published", impressions: 1000, likes: 10 }] },
    });
    expect(w.attributes("data-slot")).toBe("social-metrics");
    expect(w.findAll("tbody tr")).toHaveLength(1);
    expect(w.text()).toContain("Published posts");
  });
});
