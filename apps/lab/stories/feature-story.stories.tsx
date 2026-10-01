import { Button, FeatureStory, ScreenshotFrame, useNasaq } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessageSquareWarning } from "lucide-react";

const meta = {
  title: "Components/Website/Feature Story",
  component: FeatureStory,
  args: { title: "Feedback straight from your clients' sites" },
  decorators: [frame("w-full max-w-5xl", "mahaam")],
} satisfies Meta<typeof FeatureStory>;
export default meta;
type Story = StoryObj<typeof meta>;

function Snippet() {
  return (
    <ScreenshotFrame variant="window" title="index.html">
      <pre dir="ltr" className="overflow-x-auto p-4 text-left font-mono text-caption text-foreground">
        {`<script src="https://mahaam.app/feedback.js"\n  data-key="pk_live_…" defer></script>`}
      </pre>
    </ScreenshotFrame>
  );
}

/** Mahaam's Feedback SDK, told as a story. Resize the canvas to see it stack. */
export const Playground: Story = {
  render: (args) => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <FeatureStory
        {...args}
        icon={<MessageSquareWarning />}
        eyebrow={ar ? "حزمة الملاحظات" : "Feedback SDK"}
        title={ar ? "ملاحظات مباشرة من مواقع عملائك" : args.title}
        description={
          ar
            ? "أضف سكربتًا واحدًا — أو حزمة Laravel أو Node أو Go أو Python — إلى موقع العميل: زر عائم يسجّل المشكلات مع لقطة شاشة وسجلات مباشرة في المشروع."
            : "Drop one script — or the Laravel, Node, Go or Python package — onto a client's site: a floating button files issues with a screenshot and logs straight onto the project."
        }
        points={ar ? ["لقطة شاشة وسجلات المتصفح تلقائيًا", "مفاتيح لكل مشروع يمكن إلغاؤها"] : ["Screenshot and browser logs attached automatically", "Per-project keys you can revoke"]}
        action={<Button variant="link">{ar ? "اقرأ الدليل" : "Read the guide"}</Button>}
        media={<Snippet />}
      />
    );
  },
};

export const Reversed: Story = { args: { reverse: true, description: "Media first on wide screens.", media: <Snippet /> } };
