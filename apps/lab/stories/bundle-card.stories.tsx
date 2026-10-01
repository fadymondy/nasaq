import { BundleCard, Button, ProductArtwork, useNasaq } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Pricing/Bundle Card",
  component: BundleCard,
  args: {
    items: [<ProductArtwork key="m" brand="mahaam" markSize={24} />, <ProductArtwork key="z" brand="zekra" markSize={24} />, <ProductArtwork key="o" brand="orchestra" markSize={24} />],
    title: "Agency kit",
    description: "Run client projects, remember every decision and orchestrate your AI agents.",
    includes: "Mahaam · Zekra · Orchestra",
    price: 18,
    compareAt: 21,
  },
  decorators: [frame("w-full max-w-3xl")],
} satisfies Meta<typeof BundleCard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Prices are illustrative. */
export const Playground: Story = { args: { action: <Button size="sm">Get the kit</Button> } };

/** Arabic copy; the saving badge and price follow the locale. Narrow the canvas to see it stack. */
export const Localised: Story = {
  render: (args) => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <BundleCard
        {...args}
        title={ar ? "حزمة الوكالات" : "Agency kit"}
        description={ar ? "أدِر مشاريع العملاء، وتذكّر كل قرار، ونسّق وكلاء الذكاء الاصطناعي." : args.description}
        includes={ar ? "مهام · ذكرة · اوركيسترا" : args.includes}
        action={
          <Button size="sm" variant="secondary">
            {ar ? "احصل على الحزمة" : "Get the kit"}
          </Button>
        }
      />
    );
  },
};
