import { Button, Collapsible, CollapsiblePanel, CollapsibleTrigger, Icon, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Layout/Collapsible", component: Collapsible } satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Show/hide disclosure. The panel animates height and opacity in 200ms; reduced motion turns it off. */
export const Default: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Collapsible className="w-96 rounded-md border border-border">
        <CollapsibleTrigger render={<Button variant="ghost" className="w-full justify-between" />}>
          {ar ? "تفاصيل الفاتورة" : "Invoice details"}
          <Icon icon={ChevronDown} />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <dl className="space-y-1 border-t border-border px-4 py-3 text-body-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{ar ? "الرقم" : "Number"}</dt>
              <dd>INV-2026-031</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{ar ? "المجموع" : "Total"}</dt>
              <dd className="tabular-nums">SAR 12,450.00</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{ar ? "الاستحقاق" : "Due"}</dt>
              <dd>2026-10-15</dd>
            </div>
          </dl>
        </CollapsiblePanel>
      </Collapsible>
    );
  },
};

/** Start open, and control the state from outside (e.g. remember it per user). */
export const Controlled: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    const [open, setOpen] = useState(true);
    return (
      <div className="w-96 space-y-3">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium">{ar ? "المهام المكتملة (4)" : "Completed tasks (4)"}</span>
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
              {open ? (ar ? "إخفاء" : "Hide") : ar ? "إظهار" : "Show"}
            </CollapsibleTrigger>
          </div>
          <CollapsiblePanel>
            <ul className="mt-2 space-y-1 text-body-sm text-muted-foreground">
              <li>{ar ? "تصميم صفحة الدخول" : "Design the sign-in page"}</li>
              <li>{ar ? "ربط بوابة الدفع" : "Connect the payment gateway"}</li>
              <li>{ar ? "ترجمة رسائل الخطأ" : "Translate error messages"}</li>
              <li>{ar ? "مراجعة إمكانية الوصول" : "Accessibility review"}</li>
            </ul>
          </CollapsiblePanel>
        </Collapsible>
        <p className="text-caption text-muted-foreground">{open ? "open" : "closed"}</p>
      </div>
    );
  },
};
