import { BRAND_KEYS, BRANDS, NASAQ_MARK } from "@nasaq/brands";
import { ProductLogo, ProductMark } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Brand/Product Mark",
  component: ProductMark,
  args: { brand: "nasaq", size: 64 },
  argTypes: { brand: { control: "select", options: BRAND_KEYS }, size: { control: { type: "range", min: 12, max: 256 } } },
} satisfies Meta<typeof ProductMark>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const NasaqProposal: Story = {
  name: "Nasaq mark (proposal)",
  render: () => (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose text-body-sm text-muted-foreground">
        Proposal for review: an arrow of four cubes on the fadymondy.com lattice, two per arm, with the gold cube at its centre.
      </p>
      <div className="flex items-end gap-6">
        {[16, 24, 32, 64, 128].map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <ProductMark mark={NASAQ_MARK} size={size} />
            <span className="font-mono text-caption text-muted-foreground">{size}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-6">
        <div className="bg-[#FAF8F3] p-6">
          <ProductMark mark={NASAQ_MARK} size={96} onDark={false} />
        </div>
        <div className="bg-[#0B1429] p-6">
          <ProductMark mark={NASAQ_MARK} size={96} onDark />
        </div>
      </div>
    </div>
  ),
};

export const AllBrands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {BRAND_KEYS.map((key) => (
        <div key={key} className="flex flex-col items-center gap-3 border border-border p-4">
          <ProductMark brand={key} size={56} />
          <span className="text-caption text-muted-foreground">{BRANDS[key].name.en}</span>
        </div>
      ))}
    </div>
  ),
};

export const Logos: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {BRAND_KEYS.map((key) => (
        <ProductLogo key={key} brand={key} />
      ))}
    </div>
  ),
};

export const CustomLogo: Story = { render: () => <ProductMark src="/__missing-logo__.png" size={48} /> };
