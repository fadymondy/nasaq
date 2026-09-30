import { Button, Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "lucide-react";

const meta = { title: "Components/Overlays/Popover", component: Popover } satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex gap-3 p-10">
      <Popover>
        <PopoverTrigger render={<Button variant="secondary" />}>Details</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Deployment window</PopoverTitle>
          <PopoverDescription>Releases go out Sunday to Thursday, 10:00 to 16:00 Riyadh time.</PopoverDescription>
          <div className="mt-3 flex justify-end">
            <PopoverClose render={<Button size="sm" />}>Got it</PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger render={<Button size="icon" variant="ghost" aria-label="More info" />}>
          <Info />
        </PopoverTrigger>
        <PopoverContent side="inline-end" align="start">
          <PopoverTitle>Inline end</PopoverTitle>
          <PopoverDescription>Opens at the inline end and mirrors in RTL.</PopoverDescription>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const Arabic: Story = {
  render: () => (
    <div className="flex gap-3 p-10" lang="ar" dir="rtl">
      <Popover>
        <PopoverTrigger render={<Button variant="secondary" />}>التفاصيل</PopoverTrigger>
        <PopoverContent dir="rtl" lang="ar" align="start">
          <PopoverTitle>نافذة النشر</PopoverTitle>
          <PopoverDescription>تُنشر الإصدارات من الأحد إلى الخميس، من العاشرة صباحًا حتى الرابعة مساءً بتوقيت الرياض.</PopoverDescription>
          <div className="mt-3 flex justify-end">
            <PopoverClose render={<Button size="sm" />}>حسنًا</PopoverClose>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
