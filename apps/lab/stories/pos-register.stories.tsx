import { type PosRegisterProps, PosRegister, type PosSale, type PosSession } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { parkedDemo } from "./_pos-demo";
import { CURRENCY, posCategories, posProducts, t, useAr, VAT_BPS, wait } from "./_v1-demo";

const meta = { title: "Components/Commerce/POS Register", component: PosRegister, parameters: { layout: "padded" } } satisfies Meta<typeof PosRegister>;
export default meta;
type Story = StoryObj;

const openSession = (ar: boolean): PosSession => ({ id: "s1", cashier: t(ar, "Lina", "لينا"), openedAt: "2026-09-30T08:00:00", openingFloat: 50000 });

function Demo(props: Partial<PosRegisterProps> & { open?: boolean; slow?: boolean; fail?: boolean }) {
  const ar = useAr();
  const { open = true, slow, fail, ...rest } = props;
  return (
    <PosRegister
      products={posProducts(ar)}
      categories={posCategories(ar)}
      currency={CURRENCY}
      defaultTaxBps={VAT_BPS}
      cashier={t(ar, "Lina", "لينا")}
      defaultSession={open ? openSession(ar) : null}
      onCheckout={async (_sale: PosSale) => {
        if (slow || fail) await wait(700);
        if (fail) throw new Error("declined");
      }}
      {...rest}
    />
  );
}

/** Tap products, charge in cash, card or wallet, and close the drawer at the end of the shift. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
/** No session yet: enter the opening float to start. */
export const Closed: Story = { render: () => <Demo open={false} /> };
/** The payment fails once the busy state has shown; nothing is recorded. */
export const PaymentFails: Story = { render: () => <Demo fail /> };
/** Prices already contain VAT. */
export const TaxInclusive: Story = { render: () => <Demo taxMode="inclusive" /> };

function ParkedDemo() {
  return <Demo defaultParkedSales={parkedDemo(useAr())} />;
}

/** Three sales on hold. The badge on "Parked sales" shows the count; resume asks first when the basket has items, and discard always asks. */
export const ParkedSales: Story = {
  render: () => <ParkedDemo />,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole("button", { name: /Parked sales/ }));
  },
};

/** Two tenders: a card part first, then cash that overpays the rest, so change comes back from the cash only. */
export const SplitPayment: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    await userEvent.click(await page.findByRole("button", { name: /Chicken sandwich/ }));
    await userEvent.click(await page.findByRole("button", { name: /Espresso/ }));
    await userEvent.click((await page.findAllByRole("button", { name: /^Charge/ }))[0]!);
    const dialog = within(document.body);
    await userEvent.click(await dialog.findByRole("button", { name: "Card" }));
    await userEvent.type(await dialog.findByRole("textbox", { name: "Amount" }), "30");
    await userEvent.click(await dialog.findByRole("button", { name: /Add payment/ }));
    await userEvent.click(await dialog.findByRole("button", { name: "Cash" }));
    await userEvent.type(await dialog.findByRole("textbox", { name: "Cash received" }), "20");
  },
};
