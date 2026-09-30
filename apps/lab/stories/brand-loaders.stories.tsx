import { BrailleLoader, DotMatrixFill, LogoLoader, ProductMark } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useEffect, useState } from "react";
import { useAr } from "./_onboarding-demo";

const meta = { title: "Components/Brand/Brand Loaders", component: LogoLoader } satisfies Meta<typeof LogoLoader>;
export default meta;
type Story = StoryObj;

function useProgress() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setV((n) => (n >= 100 ? 0 : n + 4)), 300);
    return () => clearInterval(id);
  }, []);
  return v;
}

function Cell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-card p-6">
      <div className="flex min-h-24 items-center justify-center">{children}</div>
      <p className="text-caption text-muted-foreground">{title}</p>
    </div>
  );
}

function Gallery() {
  const ar = useAr();
  const v = useProgress();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Cell title={ar ? "برايل" : "Braille"}>
        <BrailleLoader className="text-h1" />
      </Cell>
      <Cell title={ar ? "موجة برايل" : "Braille wave"}>
        <BrailleLoader className="text-h1" frames={["⠁", "⠉", "⠋", "⠛", "⠟", "⠿", "⠾", "⠼", "⠸", "⠰", "⠠", "⠀"]} />
      </Cell>
      <Cell title={ar ? "نقاط، غير محدد" : "Dot matrix, indeterminate"}>
        <DotMatrixFill value={null} cols={14} rows={5} />
      </Cell>
      <Cell title={ar ? `نقاط، ${v}%` : `Dot matrix, ${v}%`}>
        <DotMatrixFill value={v} cols={14} rows={5} />
      </Cell>
      <Cell title={ar ? "شعار نابض" : "Logo, pulse"}>
        <LogoLoader variant="pulse" />
      </Cell>
      <Cell title={ar ? `شعار بحلقة، ${v}%` : `Logo, ring, ${v}%`}>
        <LogoLoader variant="ring" value={v} />
      </Cell>
    </div>
  );
}

export const Default: Story = { render: () => <Gallery /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Gallery /> };

/** The host mark goes in whole. The loader only fades it or rings it; it never redraws it. */
export const SuppliedMark: Story = {
  name: "Supplied mark",
  render: () => (
    <div className="flex gap-8">
      <LogoLoader mark={<ProductMark size={56} />} size={96} variant="pulse" />
      <LogoLoader mark={<ProductMark size={56} />} size={96} variant="ring" value={null} />
    </div>
  ),
};
