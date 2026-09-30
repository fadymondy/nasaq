import { Badge, Timeline, TimelineItem, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheck, CreditCard, GitPullRequest, MessageSquare } from "lucide-react";

const meta = { title: "Components/Data Display/Timeline", component: Timeline } satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<typeof meta>;

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

function Feed() {
  const ar = useNasaq().locale.startsWith("ar");
  return (
    <Timeline className="w-full max-w-md">
      <TimelineItem
        actor={{ name: ar ? "سارة الحربي" : "Sara Alharbi" }}
        title={ar ? "أسندت MH-142 إلى خالد" : "Assigned MH-142 to Khaled"}
        description={ar ? "الأولوية: عالية" : "Priority: high"}
        time={ago(5)}
      />
      <TimelineItem
        icon={<GitPullRequest />}
        title={ar ? "فُتح طلب دمج #48" : "Pull request #48 opened"}
        description={ar ? "إعادة التوجيه بعد تسجيل الدخول" : "Post-login redirect"}
        time={ago(95)}
      >
        <Badge variant="info">{ar ? "قيد المراجعة" : "In review"}</Badge>
      </TimelineItem>
      <TimelineItem
        icon={<MessageSquare />}
        title={ar ? "علّقت نورة على التصميم" : "Noura commented on the design"}
        time={ago(60 * 26)}
      />
      <TimelineItem icon={<CreditCard />} title={ar ? "دُفعت الفاتورة INV-031" : "Invoice INV-031 paid"} time={ago(60 * 24 * 4)} />
      <TimelineItem icon={<CircleCheck />} title={ar ? "أُنشئ المشروع" : "Project created"} time={ago(60 * 24 * 40)} />
    </Timeline>
  );
}

/** An activity feed: avatar or icon markers on a rail at the inline start, with relative times. */
export const ActivityFeed: Story = { render: () => <Feed /> };

/** Markers only, for events that have no actor or icon. */
export const Plain: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Timeline className="w-full max-w-sm">
        <TimelineItem title={ar ? "تم الشحن" : "Shipped"} time={ago(30)} />
        <TimelineItem title={ar ? "قيد التجهيز" : "Packed"} time={ago(60 * 5)} />
        <TimelineItem title={ar ? "تم استلام الطلب" : "Order received"} time={ago(60 * 9)} />
      </Timeline>
    );
  },
};

/** The same feed forced to Arabic (RTL): the rail and markers move to the right. */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Feed /> };
