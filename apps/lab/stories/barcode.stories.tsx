import { Barcode, BarcodeGenerator } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Utilities/Barcode" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Code 128 by default: any text. */
export const Default: Story = { render: () => <Barcode value="NSQ-2026-0042" downloadable /> };

/** Retail formats check the digits and the check digit, and explain what is wrong. The last one has a wrong check digit. */
export const Formats: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Barcode value="4006381333931" format="EAN13" />
      <Barcode value="036000291452" format="UPC" />
      <Barcode value="96385074" format="EAN8" />
      <Barcode value="4006381333932" format="EAN13" />
    </div>
  ),
};

/** Pick a format, type a value, see the reason when it cannot be encoded, download SVG or PNG. */
export const Generator: Story = { render: () => <BarcodeGenerator /> };

/** Arabic interface. The bars and digits stay left-to-right. */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BarcodeGenerator /> };
