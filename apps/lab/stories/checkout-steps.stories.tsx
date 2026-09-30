import { CheckoutSteps, PaymentMethodForm, emptyPaymentForm, type PaymentFormValue } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { checkoutPlans } from "./_billing-demo";
import { useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Commerce/CheckoutSteps", component: CheckoutSteps, parameters: { layout: "padded" } } satisfies Meta<typeof CheckoutSteps>;
export default meta;
type Story = StoryObj;

function Demo({ fail }: { fail?: boolean }) {
  const ar = useAr();
  return (
    <CheckoutSteps
      plans={checkoutPlans(ar)}
      currency={ar ? "SAR" : "USD"}
      taxRate={0.15}
      taxLabel={ar ? "ضريبة القيمة المضافة" : "VAT"}
      defaultPlanId="team"
      onComplete={async () => {
        await wait(800);
        return fail ? { error: ar ? "رفض البنك عملية الدفع." : "Your bank declined the payment." } : { reference: "SUB-2026-1042" };
      }}
      onDone={() => undefined}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const DeclinedPayment: Story = { render: () => <Demo fail /> };
export const StartOnPayment: Story = {
  render: () => <CheckoutSteps plans={checkoutPlans(false)} defaultStep="payment" defaultPlanId="starter" onComplete={async () => undefined} />,
};

function FormDemo() {
  const [value, setValue] = useState<PaymentFormValue>(emptyPaymentForm);
  return (
    <div className="max-w-md">
      <PaymentMethodForm value={value} onChange={setValue} />
    </div>
  );
}

/** The card form on its own. Numbers are formatted as you type, the brand shows as text, and nothing leaves the form. */
export const PaymentForm: Story = { render: () => <FormDemo /> };
