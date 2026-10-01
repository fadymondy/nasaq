import { CashCollect } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Delivery/Cash Collect", component: CashCollect, parameters: { layout: "padded" } } satisfies Meta<typeof CashCollect>;
export default meta;
type Story = StoryObj;

function Demo({ prepaid = 0, start = null, allowShort = false }: { prepaid?: number; start?: number | null; allowShort?: boolean }) {
  const [done, setDone] = useState<number | null>(null);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <CashCollect orderTotalMinor={8500} deliveryFeeMinor={1500} prepaidMinor={prepaid} defaultCollectedMinor={start} allowShort={allowShort} onConfirm={setDone} />
      {done !== null ? <p className="text-body-sm text-muted-foreground">Confirmed {done} minor units</p> : null}
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo start={20000} /> };
export const Short: Story = { render: () => <Demo start={9000} /> };
export const ShortAllowed: Story = { render: () => <Demo start={9000} allowShort /> };
export const ChangeDue: Story = { render: () => <Demo start={20000} /> };
export const PartlyPrepaid: Story = { render: () => <Demo prepaid={8500} /> };
export const FullyPrepaid: Story = { render: () => <Demo prepaid={10000} /> };
