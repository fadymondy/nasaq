import { QrCode, QrCodeGenerator } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Utilities/QR Code" } satisfies Meta;
export default meta;
type Story = StoryObj;

const URL_VALUE = "https://nasaq.fadymondy.com";

/** Square modules, black on white: the most scannable. Colours default to that on purpose. */
export const Default: Story = { render: () => <QrCode value={URL_VALUE} downloadable /> };

/** Dots or rounded modules, and round or rounded eyes. Colours can be tokens such as var(--nq-brand). Keep strong contrast. */
export const Styles: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <QrCode value={URL_VALUE} moduleStyle="dots" eyeStyle="circle" size={160} />
      <QrCode value={URL_VALUE} moduleStyle="rounded" eyeStyle="rounded" size={160} fg="var(--nq-brand)" />
      <QrCode value={URL_VALUE} moduleStyle="square" eyeStyle="square" size={160} eyeFg="var(--nq-brand)" />
    </div>
  ),
};

const LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="rgb(30,64,175)"/><path d="M20 44V20l24 24V20" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/></svg>',
)}`;

/** A centre logo. It forces the highest error correction and clears the modules underneath. */
export const WithLogo: Story = {
  name: "With logo",
  render: () => <QrCode value={URL_VALUE} logo={{ src: LOGO }} moduleStyle="rounded" eyeStyle="rounded" downloadable />,
};

/** The full generator: content, styles, colours, logo upload, SVG and PNG download. */
export const Generator: Story = { render: () => <QrCodeGenerator defaultLogo={LOGO} /> };

/** Arabic interface. The encoded value stays as typed. */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <QrCodeGenerator /> };
