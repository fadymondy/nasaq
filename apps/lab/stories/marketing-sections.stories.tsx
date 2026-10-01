import { AppMockupHero, AuroraBackground, Button, CtaBanner, FeatureGrid, GridBackground, HowItWorks, PricingPacks, SessionPlayback } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileEdit, Search, Send } from "lucide-react";
import { MockApp, useAr, useFeatures, useSessionEvents } from "./_w3-demo";

const meta = { title: "Components/Website/Marketing Sections", component: FeatureGrid, parameters: { layout: "padded" } } satisfies Meta<typeof FeatureGrid>;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  const features = useFeatures();
  const events = useSessionEvents();
  return (
    <div className="flex max-w-5xl flex-col gap-16">
      <AppMockupHero
        eyebrow={ar ? "جديد" : "New"}
        title={ar ? "احجز المقاعد في ثوانٍ" : "Book seats in seconds"}
        description={ar ? "الخطط وخرائط المقاعد والمدفوعات في مكان واحد." : "Plans, seat maps and payments in one place."}
        actions={
          <>
            <Button variant="primary" size="lg">
              {ar ? "ابدأ مجاناً" : "Start free"}
            </Button>
            <Button size="lg">{ar ? "شاهد العرض" : "See the demo"}</Button>
          </>
        }
        proof={ar ? "مجاني لمدة 14 يوماً، بلا بطاقة" : "Free for 14 days, no card"}
        mockup={<MockApp />}
        mockupLabel={ar ? "لوحة الحجوزات" : "The bookings dashboard"}
        frameTitle="app.example.com"
      />
      <HowItWorks
        eyebrow={ar ? "كيف يعمل" : "How it works"}
        title={ar ? "من الفكرة إلى أول حجز" : "From idea to first booking"}
        steps={[
          { icon: <FileEdit />, title: ar ? "أنشئ" : "Create", description: ar ? "صمّم خريطة المقاعد بالسحب." : "Draw the seat map by dragging." },
          { icon: <Send />, title: ar ? "شارك" : "Share", description: ar ? "أرسل الرابط أو ضعه في موقعك." : "Send the link or embed it in your site." },
          { icon: <Search />, title: ar ? "تابع" : "Track", description: ar ? "شاهد الحجوزات والمدفوعات فور حدوثها." : "See bookings and payments as they happen." },
        ]}
      />
      <FeatureGrid title={ar ? "كل ما تحتاجه" : "Everything you need"} features={features} />
      <PricingPacks
        title={ar ? "اشحن رصيدك" : "Top up credits"}
        description={ar ? "ادفع مرة واحدة ولا تنتهي صلاحية الرصيد." : "Pay once, credits never expire."}
        packs={[
          { id: "s", name: ar ? "أساسية" : "Starter", credits: 500, price: 9, description: ar ? "تكفي لتجربة الأداة." : "Enough to try it out." },
          { id: "p", name: ar ? "احترافية" : "Pro", credits: 2500, bonus: 250, price: 39, highlighted: true, badge: ar ? "الأفضل قيمة" : "Best value" },
          { id: "t", name: ar ? "فريق" : "Team", credits: 10000, bonus: 1500, price: 129 },
        ]}
        onPurchase={() => new Promise((r) => setTimeout(r, 900))}
      />
      <SessionPlayback title={ar ? "مساعد البرمجة" : "Coding assistant"} events={events} />
      <div className="grid gap-4 sm:grid-cols-2">
        <AuroraBackground tone="multi" className="rounded-card border border-border">
          <div className="p-10 text-center text-label text-foreground">Aurora</div>
        </AuroraBackground>
        <GridBackground pattern="dots" className="rounded-card border border-border">
          <div className="p-10 text-center text-label text-foreground">Grid</div>
        </GridBackground>
      </div>
      <CtaBanner
        title={ar ? "جاهز للبدء؟" : "Ready to start?"}
        description={ar ? "أنشئ حسابك وابدأ أول حجز اليوم." : "Create your account and take your first booking today."}
        action={
          <Button variant="primary" size="lg">
            {ar ? "أنشئ حساباً" : "Create account"}
          </Button>
        }
        secondaryAction={<Button size="lg">{ar ? "تحدث إلينا" : "Talk to us"}</Button>}
        note={ar ? "بلا بطاقة ائتمان" : "No credit card needed"}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
export const SplitBanner: Story = {
  render: () => <CtaBanner layout="split" tone="neutral" title="Ship your next page today" description="One clear ask, one main button." action={<Button variant="primary">Get started</Button>} />,
};
