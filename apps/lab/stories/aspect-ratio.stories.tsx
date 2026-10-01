import { AspectRatio } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Layout/Aspect Ratio", component: AspectRatio, parameters: { layout: "padded" } } satisfies Meta<typeof AspectRatio>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Resize the canvas: the box keeps 16:9. */
export const Playground: Story = {
  args: { ratio: 16 / 9 },
  render: (args) => (
    <div className="max-w-xl">
      <AspectRatio {...args} className="hatch rounded-card border border-border">
        <div className="absolute inset-0 flex items-center justify-center text-label text-muted-foreground">16 : 9</div>
      </AspectRatio>
    </div>
  ),
};

/** Common ratios side by side. */
export const Ratios: Story = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
      {[
        [1, "1 : 1"],
        [4 / 3, "4 : 3"],
        [3 / 4, "3 : 4"],
        [21 / 9, "21 : 9"],
      ].map(([r, label]) => (
        <AspectRatio key={label as string} ratio={r as number} className="hatch rounded-card border border-border">
          <div className="absolute inset-0 flex items-center justify-center text-caption text-muted-foreground">{label}</div>
        </AspectRatio>
      ))}
    </div>
  ),
};

/** An image child fills and crops to the box. */
export const Image: Story = {
  render: () => {
    const ar = useAr();
    return (
      <figure className="flex max-w-md flex-col gap-2">
        <AspectRatio ratio={4 / 3} className="rounded-card border border-border">
          <img src="https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&q=60" alt={ar ? "أهرامات الجيزة" : "The pyramids of Giza"} />
        </AspectRatio>
        <figcaption className="text-caption text-muted-foreground">{ar ? "صورة بنسبة ٤:٣" : "A 4:3 photo"}</figcaption>
      </figure>
    );
  },
};

export const Arabic: Story = { ...Image, globals: { locale: "ar" } };
