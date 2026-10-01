import { InvoiceList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoInvoices, demoPayments } from "./_billing-demo";
import { useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Billing/InvoiceList", component: InvoiceList, parameters: { layout: "padded" } } satisfies Meta<typeof InvoiceList>;
export default meta;
type Story = StoryObj;

function Demo({ payments = true, state }: { payments?: boolean; state?: "loading" | "error" | "empty" }) {
  const ar = useAr();
  return (
    <InvoiceList
      invoices={state === "empty" ? [] : demoInvoices()}
      payments={payments ? demoPayments() : undefined}
      currency={ar ? "SAR" : "USD"}
      loading={state === "loading"}
      error={state === "error"}
      onRetry={() => undefined}
      onOpen={() => undefined}
      onPay={() => undefined}
      onDownload={async () => {
        await wait(700);
      }}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const InvoicesOnly: Story = { render: () => <Demo payments={false} /> };
export const Loading: Story = { render: () => <Demo state="loading" /> };
export const ErrorState: Story = { render: () => <Demo state="error" /> };
export const Empty: Story = { render: () => <Demo state="empty" /> };
