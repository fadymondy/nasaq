import { AppGlyph, ProductArtwork } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarCheck, ReceiptText, Store, Users } from "lucide-react";

const meta = {
  title: "Components/Brand/Product Artwork",
  component: ProductArtwork,
  args: { brand: "mahaam", markSize: 48, className: "aspect-[16/10] w-80" },
} satisfies Meta<typeof ProductArtwork>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Each product's field is derived from its own manifest colour. The mark is never recoloured. */
export const Family: Story = {
  render: () => (
    <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
      {(["mahaam", "zekra", "moharrik", "hosbah", "orchestra", "seatfor", "health-debug", "circlexo"] as const).map((b) => (
        <ProductArtwork key={b} brand={b} className="aspect-square" />
      ))}
    </div>
  ),
};

/** For modules that have no mark of their own, use a line icon on the current brand's tint. Never a fake logo. */
export const Glyphs: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <AppGlyph icon={Users} size="sm" />
      <AppGlyph icon={ReceiptText} />
      <AppGlyph icon={CalendarCheck} size="lg" />
      <AppGlyph icon={Store} size="lg" brand="mahaam" />
    </div>
  ),
};
