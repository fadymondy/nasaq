import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqStepper, NqStepperItem } from ".";

const steps = (props: Record<string, unknown> = {}, itemProps: Record<string, unknown>[] = []) =>
  mount({
    components: { NqStepper, NqStepperItem },
    setup: () => ({ props, itemProps }),
    template: `<NqStepper v-bind="props" aria-label="Setup steps">
      <NqStepperItem title="Account" description="Name and email" v-bind="itemProps[0]" />
      <NqStepperItem title="Workspace" v-bind="itemProps[1]" />
      <NqStepperItem title="Invite" v-bind="itemProps[2]" />
    </NqStepper>`,
  });

describe("NqStepper", () => {
  it("derives each step status from current and marks the connectors", () => {
    const w = steps({ current: 1 });
    const ol = w.find("ol");
    expect(ol.attributes("data-slot")).toBe("stepper");
    expect(ol.attributes("data-orientation")).toBe("horizontal");
    expect(ol.attributes("aria-label")).toBe("Setup steps");
    expect(ol.classes()).toEqual(expect.arrayContaining(["flex", "flex-row"]));
    const items = w.findAll('[data-slot="stepper-item"]');
    expect(items.map((i) => i.attributes("data-status"))).toEqual(["complete", "current", "upcoming"]);
    expect(items[2]!.classes()).not.toContain("flex-1");
    expect(items[0]!.classes()).toContain("flex-1");
    const connectors = w.findAll('[data-slot="stepper-connector"]');
    expect(connectors).toHaveLength(2);
    expect(connectors[0]!.attributes("data-complete")).toBe("");
    expect(connectors[1]!.attributes("data-complete")).toBeUndefined();
    expect(items[0]!.find('[data-slot="stepper-marker"] svg').exists()).toBe(true);
    expect(items[1]!.find('[data-slot="stepper-marker"]').text()).toBe("2");
    expect(items[1]!.find('[data-slot="stepper-step"]').attributes("aria-current")).toBe("step");
    expect(items[1]!.find(".sr-only").text()).toBe("(Current step)");
    expect(items[2]!.find(".sr-only").text()).toBe("(Upcoming)");
  });

  it("supports error, vertical layout and clickable steps", async () => {
    let clicked = 0;
    const w = steps({ current: 1, orientation: "vertical" }, [{ onClick: () => clicked++ }, { error: true }]);
    const items = w.findAll('[data-slot="stepper-item"]');
    expect(items[0]!.classes()).toContain("grid");
    expect(items[1]!.attributes("data-status")).toBe("error");
    expect(items[1]!.find(".sr-only").text()).toBe("(Error)");
    expect(items[1]!.find('[data-slot="stepper-step"]').attributes("aria-current")).toBe("step");
    expect(items[1]!.find('[data-slot="stepper-marker"]').classes()).toContain("text-nq-danger-text");
    const button = items[0]!.find('[data-slot="stepper-step"]');
    expect(button.element.tagName).toBe("BUTTON");
    await button.trigger("click");
    expect(clicked).toBe(1);
    expect(items[2]!.find('[data-slot="stepper-step"]').element.tagName).toBe("DIV");
  });
});
