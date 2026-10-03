import { Button, Input, toast, type WorkflowTreeStep, WorkflowViews } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Workflow/Workflow Views", component: WorkflowViews, parameters: { layout: "padded" } } satisfies Meta<typeof WorkflowViews>;
export default meta;
type Story = StoryObj;

function workflow(ar: boolean): WorkflowTreeStep[] {
  const L = (en: string, a: string) => (ar ? a : en);
  return [
    { id: "trigger", title: L("New order placed", "طلب جديد"), owner: L("Store", "المتجر"), kind: "system" },
    {
      id: "each",
      title: L("For each item", "لكل منتج"),
      description: L("Runs once per line on the order.", "تعمل مرة لكل سطر في الطلب."),
      children: [
        { id: "stock", title: L("Check stock", "التحقق من المخزون"), owner: L("Inventory API", "واجهة المخزون") },
        { id: "reserve", title: L("Reserve the item", "حجز المنتج") },
      ],
    },
    {
      id: "paid",
      title: L("Payment captured?", "تم تحصيل الدفع؟"),
      branches: [
        {
          label: L("Yes", "نعم"),
          steps: [
            { id: "label", title: L("Print shipping label", "طباعة ملصق الشحن") },
            { id: "pack", title: L("Pack and hand over", "التغليف والتسليم"), owner: L("Warehouse", "المستودع"), kind: "human" },
          ],
        },
        { label: L("No", "لا"), steps: [{ id: "remind", title: L("Send a payment reminder", "إرسال تذكير بالدفع") }] },
      ],
    },
    { id: "done", title: L("Order confirmed", "تأكيد الطلب"), kind: "output" },
  ];
}

/** A small editor for the same steps, to show every view reading one source. A real app would pass `StepEditor`. */
function TinyEditor({ steps, onChange }: { steps: WorkflowTreeStep[]; onChange: (s: WorkflowTreeStep[]) => void }) {
  const ar = useAr();
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <span dir="ltr" className="w-6 font-mono text-caption text-muted-foreground">
            {i + 1}
          </span>
          <Input
            aria-label={ar ? `اسم الخطوة ${i + 1}` : `Step ${i + 1} name`}
            value={s.title}
            onChange={(e) => onChange(steps.map((x) => (x.id === s.id ? { ...x, title: e.currentTarget.value } : x)))}
          />
          <Button size="icon" variant="ghost" aria-label={ar ? "حذف" : "Remove"} onClick={() => onChange(steps.filter((x) => x.id !== s.id))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button className="w-fit" onClick={() => onChange([...steps, { id: `s${Date.now()}`, title: ar ? "خطوة جديدة" : "New step" }])}>
        <Plus aria-hidden />
        {ar ? "إضافة خطوة" : "Add step"}
      </Button>
    </div>
  );
}

/** Steps and Pipeline from one tree, plus an Editor; the view is remembered. Click a step to highlight it. */
export const Default: Story = {
  render: function Render() {
    const ar = useAr();
    const [steps, setSteps] = useState(() => workflow(ar));
    const [active, setActive] = useState<string>();
    return (
      <WorkflowViews
        className="max-w-4xl"
        steps={steps}
        storageKey="nasaq-lab-workflow-view"
        highlight={active}
        onStepClick={(s) => {
          setActive(s.id);
          toast(s.title);
        }}
        editor={<TinyEditor steps={steps} onChange={setSteps} />}
      />
    );
  },
};

/** Read only: no editor, so only Steps and Pipeline. */
export const ReadOnly: Story = {
  render: function Render() {
    const ar = useAr();
    return <WorkflowViews className="max-w-4xl" steps={workflow(ar)} defaultView="pipeline" />;
  },
};

export const Empty: Story = { render: () => <WorkflowViews className="max-w-4xl" steps={[]} /> };
export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
