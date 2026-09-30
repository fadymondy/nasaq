import { BidiText, Icon, Ltr } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ArrowRight, ChevronRight, Search, Send, Undo2 } from "lucide-react";

const meta = { title: "Foundations/Icons & Bidi", component: Icon } satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Directional: Story = {
  args: { icon: ArrowRight },
  render: () => (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-muted-foreground">Switch Dir to rtl: directional glyphs mirror, the rest stay put.</p>
      <div className="flex items-center gap-4 [&_svg]:size-5">
        <Icon icon={ArrowRight} />
        <Icon icon={ArrowLeft} />
        <Icon icon={ChevronRight} />
        <Icon icon={Send} />
        <Icon icon={Undo2} />
        <Icon icon={Search} />
      </div>
    </div>
  ),
};

export const Bidi: Story = {
  args: { icon: ArrowRight },
  render: () => (
    <div className="flex max-w-md flex-col gap-3" lang="ar" dir="rtl">
      <BidiText>
        رقم الفاتورة <Ltr>INV-2026-0042</Ltr> بتاريخ <Ltr>2026-09-29</Ltr>
      </BidiText>
    </div>
  ),
};
