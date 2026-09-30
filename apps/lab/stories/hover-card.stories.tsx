import { Avatar, HoverCard, HoverCardContent, HoverCardTrigger } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Overlays/Hover Card", component: HoverCard } satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="p-10">
      <p className="text-body-sm">
        Assigned to{" "}
        <HoverCard>
          <HoverCardTrigger delay={200} render={<a href="#sara" className="font-medium text-primary underline underline-offset-2" />}>
            @sara
          </HoverCardTrigger>
          <HoverCardContent>
            <div className="flex gap-3">
              <Avatar name="Sara Al-Harbi" />
              <div className="min-w-0">
                <p className="text-body-sm font-semibold">Sara Al-Harbi</p>
                <p className="text-caption text-muted-foreground">Design lead. Joined March 2024.</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
        .
      </p>
    </div>
  ),
};

export const Arabic: Story = {
  render: () => (
    <div className="p-10" lang="ar" dir="rtl">
      <p className="text-body-sm">
        أُسندت إلى{" "}
        <HoverCard>
          <HoverCardTrigger delay={200} render={<a href="#sara" className="font-medium text-primary underline underline-offset-2" />}>
            @سارة
          </HoverCardTrigger>
          <HoverCardContent dir="rtl" lang="ar" align="start">
            <div className="flex gap-3">
              <Avatar name="سارة الحربي" />
              <div className="min-w-0">
                <p className="text-body-sm font-semibold">سارة الحربي</p>
                <p className="text-caption text-muted-foreground">مسؤولة التصميم. انضمت في مارس 2024.</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
        .
      </p>
    </div>
  ),
};
