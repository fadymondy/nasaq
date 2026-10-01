import {
  AppHeader,
  AppMain,
  AppShell,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FeatureGate,
  PlanBadge,
  SidebarTrigger,
  toast,
  UpgradeBanner,
  UpgradeCard,
  UpgradeDialog,
} from "@nasaq/web";
import { BarChart3, FolderPlus, Hourglass } from "lucide-react";
import { useState } from "react";
import { frame } from "./_frame";
import { fakeCheckout, useSamplePlans } from "./_plans";
import { DemoSidebar, DemoSidebarFooter } from "./_shell";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Pricing/Upgrade Prompt",
  component: UpgradeDialog,
  args: { title: "", onUpgrade: () => undefined },
} satisfies Meta<typeof UpgradeDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const boxed = [frame("w-full max-w-3xl", "mahaam")];
const inTwoDays = () => new Date(Date.now() + (2 * 24 + 5) * 3600_000 + 13 * 60_000);

const upgrade = (planId: string | undefined, period: string) => {
  toast(`Checkout → ${planId} (${period})`);
  return fakeCheckout();
};

function Promotion() {
  const { plans, ar } = useSamplePlans();
  const [open, setOpen] = useState(true);
  return (
    <UpgradeDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>{ar ? "مشروع جديد" : "New project"}</Button>}
      icon={<FolderPlus aria-hidden />}
      title={ar ? "افتح مشاريع غير محدودة" : "Unlock unlimited projects"}
      description={ar ? "استخدمت مشاريعك الثلاثة في الخطة المجانية." : "You've used all 3 projects on the Free plan."}
      benefits={
        ar
          ? ["مشاريع غير محدودة لكل عملائك", "بوابة عملاء بعلامتك", "فواتير مباشرة من الوقت المسجّل"]
          : ["Unlimited projects for every client", "A client portal with your brand", "Invoices straight from tracked time"]
      }
      plans={plans.filter((p) => p.id === "team")}
      offer={{ label: ar ? "عرض الإطلاق: خصم ٣٠٪ على سنتك الأولى" : "Launch offer: 30% off your first year", endsAt: inTwoDays() }}
      onUpgrade={upgrade}
    />
  );
}

/** The popup at the moment of need: a limit was hit. One plan, a yearly default, a real deadline and a way out. */
export const PromotionPopup: Story = { parameters: { docs: { story: { inline: false, height: "760px" } } }, decorators: boxed, render: () => <Promotion /> };

function ChoosePlan() {
  const { plans, ar } = useSamplePlans();
  return (
    <UpgradeDialog
      defaultOpen
      trigger={<Button variant="secondary">{ar ? "ترقية" : "Upgrade"}</Button>}
      title={ar ? "اختر خطتك" : "Choose your plan"}
      description={ar ? "كل الخطط تبدأ بتجربة ١٤ يومًا." : "Every paid plan starts with a 14-day trial."}
      plans={plans.slice(0, 3)}
      currentPlanId="free"
      onUpgrade={upgrade}
    />
  );
}

/** Several plans: the popup becomes a plan picker with the Monthly / Yearly switch. */
export const ChoosePlanPopup: Story = { name: "Promotion popup, choose a plan", parameters: { docs: { story: { inline: false, height: "760px" } } }, decorators: boxed, render: () => <ChoosePlan /> };

function Banners() {
  const { ar } = useSamplePlans();
  const [offer, setOffer] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      {offer ? (
        <UpgradeBanner
          title={ar ? "خصم ٣٠٪ على الخطة السنوية حتى نهاية الأسبوع" : "30% off yearly plans until Sunday"}
          description={ar ? "ثبّت السعر لسنة كاملة." : "Lock in the price for a full year."}
          action={<Button variant="primary" size="sm">{ar ? "عرض الخطط" : "See plans"}</Button>}
          onDismiss={() => setOffer(false)}
        />
      ) : null}
      <UpgradeBanner
        tone="warning"
        icon={<Hourglass aria-hidden />}
        title={ar ? "تنتهي تجربتك خلال ٣ أيام" : "Your trial ends in 3 days"}
        description={ar ? "اختر خطة لتحتفظ بمشاريعك وسجلّك." : "Pick a plan to keep your projects and history."}
        action={<Button variant="primary" size="sm">{ar ? "اختر خطة" : "Choose a plan"}</Button>}
      />
      <UpgradeBanner
        tone="warning"
        title={ar ? "استخدمت ٩ من ١٠ مقاعد" : "You've used 9 of 10 seats"}
        description={ar ? "أضف مقاعد أو انتقل إلى الوكالة لدعوة المزيد." : "Add seats or move to Agency to invite more people."}
        action={
          <Button size="sm" variant="secondary">
            {ar ? "إدارة المقاعد" : "Manage seats"}
          </Button>
        }
      />
    </div>
  );
}

/** An offer (dismissible), a trial ending and a limit near. Show one at a time in a real page. */
export const Banner: Story = { decorators: boxed, render: () => <Banners /> };

function ReportsPreview() {
  const bars = [40, 65, 52, 80, 71, 90, 62, 75];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom reports</CardTitle>
        <CardDescription>Billable hours by client, last 8 weeks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-2">
          {bars.map((h, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static demo
            <div key={i} className="flex-1 rounded-t-sm bg-nq-brand/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Gate() {
  const { ar } = useSamplePlans();
  const [locked, setLocked] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      <FeatureGate
        locked={locked}
        plan={ar ? "فريق" : "Team"}
        title={ar ? "التقارير المخصّصة في خطة الفريق" : "Custom reports are on Team"}
        description={ar ? "أنشئ تقاريرك وجدولها لعملائك." : "Build your own reports and schedule them to clients."}
        onUpgrade={() => setLocked(false)}
      >
        <ReportsPreview />
      </FeatureGate>
      {!locked ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setLocked(true)}>
          Lock again
        </Button>
      ) : null}
    </div>
  );
}

/** A paid feature, locked: a blurred preview of what they'd get, with the upgrade on top. "See plans" unlocks it here. */
export const Gated: Story = { name: "Feature gate", decorators: boxed, render: () => <Gate /> };

/** The small mark for paid menu items, settings and buttons. */
export const Badge: Story = {
  decorators: boxed,
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <PlanBadge />
      <PlanBadge>Team</PlanBadge>
      <Button variant="secondary">
        <BarChart3 aria-hidden />
        Custom reports
        <PlanBadge />
      </Button>
    </div>
  ),
};

function Journey({ collapsed }: { collapsed?: boolean }) {
  const { plans, ar } = useSamplePlans();
  const [open, setOpen] = useState(false);
  const [rail, setRail] = useState(!!collapsed);
  const card = (
    <UpgradeCard
      title={ar ? "أنت على الخطة المجانية" : "You're on Free"}
      description={ar ? "افتح مشاريع غير محدودة وبوابة العملاء." : "Unlock unlimited projects and the client portal."}
      usage={{ value: 3, max: 3, label: ar ? "٣ من ٣ مشاريع" : "3 of 3 projects" }}
      onUpgrade={() => setOpen(true)}
    />
  );
  return (
    <DemoSidebarFooter value={card}>
      <AppShell sidebar={<DemoSidebar />} collapsed={rail} onCollapsedChange={setRail}>
        <AppHeader>
          <SidebarTrigger />
          <span className="text-label text-foreground">{ar ? "التقارير" : "Reports"}</span>
          <Button variant="primary" size="sm" className="ms-auto" onClick={() => setOpen(true)}>
            {ar ? "ترقية" : "Upgrade"}
          </Button>
        </AppHeader>
        <AppMain>
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            <UpgradeBanner
              tone="warning"
              icon={<Hourglass aria-hidden />}
              title={ar ? "تنتهي تجربة الفريق خلال ٣ أيام" : "Your Team trial ends in 3 days"}
              description={ar ? "اختر خطة لتحتفظ بالتقارير وبوابة العملاء." : "Pick a plan to keep reports and the client portal."}
              action={
                <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
                  {ar ? "اختر خطة" : "Choose a plan"}
                </Button>
              }
            />
            <FeatureGate
              locked
              plan={ar ? "فريق" : "Team"}
              title={ar ? "التقارير المخصّصة في خطة الفريق" : "Custom reports are on Team"}
              description={ar ? "أنشئ تقاريرك وجدولها لعملائك." : "Build your own reports and schedule them to clients."}
              onUpgrade={() => setOpen(true)}
            >
              <ReportsPreview />
            </FeatureGate>
          </div>
        </AppMain>
      </AppShell>
      <UpgradeDialog
        open={open}
        onOpenChange={setOpen}
        title={ar ? "اختر خطتك" : "Choose your plan"}
        description={ar ? "كل الخطط المدفوعة تبدأ بتجربة ١٤ يومًا." : "Every paid plan starts with a 14-day trial."}
        benefits={ar ? ["مشاريع غير محدودة", "تقارير مخصّصة", "بوابة العملاء"] : ["Unlimited projects", "Custom reports", "The client portal"]}
        plans={plans.slice(0, 3)}
        currentPlanId="free"
        offer={{ label: ar ? "خصم ٣٠٪ على سنتك الأولى" : "30% off your first year", endsAt: inTwoDays() }}
        onUpgrade={async (id, period) => {
          await upgrade(id, period);
          setOpen(false);
        }}
      />
    </DemoSidebarFooter>
  );
}

/** Every prompt in context: the sidebar card, a trial banner, a gated page and the header button all open the same popup. */
export const InApp: Story = {
  name: "In the app",
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
  render: () => <Journey />,
};

/** Collapsed sidebar: the upgrade card becomes a sparkles button with a tooltip. */
export const InAppCollapsed: Story = {
  name: "In the app, collapsed sidebar",
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
  render: () => <Journey collapsed />,
};
