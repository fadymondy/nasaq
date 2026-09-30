/* Automation rules: build a when / if / then rule and save it once nothing is missing. Demo data lives in ./_automation-demo.tsx. */
import { Button, Input, RuleBuilder, type RuleDefinition, type RuleIssue } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoRule, ruleActions, ruleEvents, ruleFields, useAr, wait } from "./_automation-demo";
import { FlowPage } from "./_workflow-demo";

const meta = { title: "Pages/App/Automation Rules", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [rule, setRule] = useState<RuleDefinition>(() => demoRule());
  const [issues, setIssues] = useState<RuleIssue[]>([]);
  const [name, setName] = useState(ar ? "طلبات كبيرة" : "Big orders");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <FlowPage
      title={ar ? "قواعد الأتمتة" : "Automation rules"}
      description={ar ? "عندما يحدث شيء وتتحقق شروطك، نفّذ ما تريد تلقائيًا." : "When something happens and your conditions hold, do what you want automatically."}
      actions={
        <Button
          loading={saving}
          disabled={issues.length > 0 || !name.trim()}
          onClick={async () => {
            setSaving(true);
            await wait(700);
            setSaving(false);
            setSaved(true);
          }}
        >
          {saved ? (ar ? "تم الحفظ" : "Saved") : ar ? "احفظ القاعدة" : "Save rule"}
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        <RuleBuilder
          events={ruleEvents(ar)}
          fields={ruleFields(ar)}
          actionTypes={ruleActions(ar)}
          value={rule}
          onValueChange={(next, found) => {
            setRule(next);
            setIssues(found);
            setSaved(false);
          }}
          header={<Input className="mt-3" aria-label={ar ? "اسم القاعدة" : "Rule name"} value={name} onChange={(e) => setName(e.target.value)} />}
        />
      </div>
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
