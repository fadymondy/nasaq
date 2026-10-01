import { InvoiceView } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoInvoices, invoiceFor } from "./_billing-demo";
import { useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Billing/InvoiceView", component: InvoiceView, parameters: { layout: "padded" } } satisfies Meta<typeof InvoiceView>;
export default meta;
type Story = StoryObj;

function Demo({ index = 0, discount }: { index?: number; discount?: number }) {
  const ar = useAr();
  const invoice = { ...invoiceFor(demoInvoices()[index]!, ar), discount };
  return (
    <div className="mx-auto max-w-3xl">
      <InvoiceView
        invoice={invoice}
        onDownload={async () => {
          await wait(700);
        }}
        onPay={() => undefined}
      />
    </div>
  );
}

/** Open invoice: Download, Print and Pay now. Print it: only the sheet shows, in black on white. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Overdue: Story = { render: () => <Demo index={1} /> };
export const Paid: Story = { render: () => <Demo index={2} /> };
export const WithDiscount: Story = { render: () => <Demo discount={50} /> };
