import { RuleBuilder, type RuleDefinition } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoRule, ruleActions, ruleEvents, ruleFields, useAr } from "./_automation-demo";

const meta = { title: "Components/Workflow/Rule Builder", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ filled }: { filled?: boolean }) {
  const ar = useAr();
  const [rule, setRule] = useState<RuleDefinition | undefined>(() => (filled ? demoRule() : undefined));
  return (
    <div className="mx-auto max-w-3xl">
      <RuleBuilder events={ruleEvents(ar)} fields={ruleFields(ar)} actionTypes={ruleActions(ar)} value={rule} onValueChange={(next) => setRule(next)} />
    </div>
  );
}

/** A blank rule: choose an event, add conditions and actions, and read the sentence above. */
export const Default: Story = { render: () => <Demo /> };
/** Total over 500 and (Saudi Arabia or VIP), then email sales and tag the order. */
export const Filled: Story = { render: () => <Demo filled /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo filled /> };
