/*
 * A full product page put together from the marketing sections and the existing feature story, plan and testimonial
 * components: hero with an app mockup, logos marquee, how it works, features, an AI session, plans, testimonials, credit
 * packs and the closing banner.
 */
import {
  AppMockupHero,
  Button,
  CtaBanner,
  FeatureGrid,
  FeatureStory,
  HowItWorks,
  Marquee,
  PlanCard,
  PlanGrid,
  Price,
  PricingPacks,
  SessionPlayback,
  TestimonialWall,
  TextFlip,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileEdit, Search, Send } from "lucide-react";
import { LOGO_NAMES, MockApp, useAr, useFeatures, useSessionEvents, useTestimonials } from "./_w3-demo";

const meta = { title: "Pages/Marketing/Marketing Sections", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const features = useFeatures();
  const events = useSessionEvents();
  const testimonials = useTestimonials();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pb-20 sm:px-8">
      <AppMockupHero
        eyebrow={ar ? "جديد" : "New"}
        title={
          <>
            {ar ? "احجز المقاعد لـ" : "Book seats for your "}
            <TextFlip phrases={ar ? ["فعالياتك", "مطعمك", "عيادتك"] : ["events", "restaurant", "clinic"]} className="text-nq-brand" />
          </>
        }
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
        mockup={<MockApp height={300} />}
        mockupLabel={ar ? "لوحة الحجوزات" : "The bookings dashboard"}
        frameTitle="app.example.com"
      />
      <Marquee speed={36}>
        {LOGO_NAMES.map((n) => (
          <span key={n} className="text-h3 text-muted-foreground">
            {n}
          </span>
        ))}
      </Marquee>
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
      <FeatureStory
        eyebrow={ar ? "الذكاء الاصطناعي" : "AI"}
        title={ar ? "مساعد يعمل معك" : "An assistant that works with you"}
        description={ar ? "اطلب ما تريد بجملة واحدة وشاهده يُنفَّذ خطوة بخطوة." : "Ask in one sentence and watch it happen step by step."}
        points={ar ? ["يقرأ مشروعك", "يشرح ما يفعله", "يشغّل الاختبارات"] : ["Reads your project", "Explains what it does", "Runs the tests"]}
        media={<SessionPlayback events={events} title={ar ? "مساعد البرمجة" : "Coding assistant"} height="20rem" />}
      />
      <PlanGrid>
        <PlanCard name={ar ? "مجانية" : "Free"} price={<Price amount={0} size="lg" />} features={ar ? ["10 حجوزات شهرياً"] : ["10 bookings a month"]} action={<Button className="w-full">{ar ? "ابدأ" : "Start"}</Button>} />
        <PlanCard highlighted badge={ar ? "الأشهر" : "Most popular"} name={ar ? "فريق" : "Team"} price={<Price amount={29} period="month" size="lg" />} features={ar ? ["حجوزات غير محدودة", "5 أعضاء"] : ["Unlimited bookings", "5 members"]} action={<Button variant="primary" className="w-full">{ar ? "جرّب" : "Try it"}</Button>} />
        <PlanCard name={ar ? "مؤسسة" : "Business"} price={<Price amount={99} period="month" size="lg" />} features={ar ? ["كل شيء في فريق", "دعم مخصص"] : ["Everything in Team", "Priority support"]} action={<Button className="w-full">{ar ? "تحدث إلينا" : "Talk to us"}</Button>} />
      </PlanGrid>
      <TestimonialWall items={testimonials} layout="grid" />
      <PricingPacks
        title={ar ? "اشحن رصيدك" : "Top up credits"}
        packs={[
          { id: "s", name: ar ? "أساسية" : "Starter", credits: 500, price: 9 },
          { id: "p", name: ar ? "احترافية" : "Pro", credits: 2500, bonus: 250, price: 39, highlighted: true, badge: ar ? "الأفضل قيمة" : "Best value" },
          { id: "t", name: ar ? "فريق" : "Team", credits: 10000, bonus: 1500, price: 129 },
        ]}
        onPurchase={() => new Promise((r) => setTimeout(r, 900))}
      />
      <CtaBanner
        title={ar ? "جاهز للبدء؟" : "Ready to start?"}
        description={ar ? "أنشئ حسابك وابدأ أول حجز اليوم." : "Create your account and take your first booking today."}
        action={
          <Button variant="primary" size="lg">
            {ar ? "أنشئ حساباً" : "Create account"}
          </Button>
        }
        note={ar ? "بلا بطاقة ائتمان" : "No credit card needed"}
      />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
