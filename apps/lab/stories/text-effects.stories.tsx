import { HandwrittenMark, HandwrittenNote, Marquee, TextFlip, TextReveal, TextShimmer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { LOGO_NAMES, useAr } from "./_w3-demo";

const meta = { title: "Components/Typography/Text Effects", component: TextFlip, parameters: { layout: "padded" } } satisfies Meta<typeof TextFlip>;
export default meta;
type Story = StoryObj;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-5">
      <h2 className="text-label text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Demo() {
  const ar = useAr();
  const [paused, setPaused] = useState(false);
  const phrases = ar ? ["فريقك", "عيادتك", "متجرك", "مطعمك"] : ["team", "studio", "clinic", "shop"];
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Block title="TextFlip">
        <p className="text-h1 text-foreground">
          {ar ? "أدِر " : "Run your "}
          <TextFlip phrases={phrases} paused={paused} className="text-nq-brand" />
          {ar ? " بسهولة" : " with ease"}
        </p>
        <button type="button" className="w-fit text-caption text-muted-foreground underline" onClick={() => setPaused((p) => !p)}>
          {paused ? "Resume" : "Pause"}
        </button>
      </Block>
      <Block title="TextShimmer">
        <p className="text-h3 text-foreground">
          <TextShimmer>{ar ? "يفكّر في الإجابة..." : "Thinking about it..."}</TextShimmer>
        </p>
      </Block>
      <Block title="Marquee">
        <Marquee speed={40}>
          {LOGO_NAMES.map((n) => (
            <span key={n} className="text-h3 text-muted-foreground">
              {n}
            </span>
          ))}
        </Marquee>
        <Marquee speed={30} direction="end">
          {(ar ? ["حجوزات", "مقاعد", "مدفوعات", "تقارير", "فرق"] : ["Bookings", "Seats", "Payments", "Reports", "Teams"]).map((n) => (
            <span key={n} className="rounded-full border border-border px-3 py-1 text-body-sm text-nq-fg-body">
              {n}
            </span>
          ))}
        </Marquee>
      </Block>
      <Block title="TextReveal">
        <TextReveal
          as="p"
          className="text-h3 text-foreground"
          text={ar ? "يرسم نسق المنتج نفسه بكل لغة، من اليمين إلى اليسار ومن اليسار إلى اليمين." : "Nasaq draws the same product in every language, left to right and right to left."}
        />
      </Block>
      <Block title="HandwrittenNote and HandwrittenMark">
        <div className="flex flex-wrap items-start gap-8">
          <HandwrittenNote author={ar ? "- ليلى" : "- Layla"}>{ar ? "لا تنسَ تأكيد الحجز قبل الخميس!" : "Remember to confirm the booking before Thursday!"}</HandwrittenNote>
          <HandwrittenNote tone="info" rotate={3} tape={false}>
            {ar ? "فكرة: أضف إشعاراً بالبريد" : "Idea: add an email alert"}
          </HandwrittenNote>
        </div>
        <p className="text-body text-foreground">
          {ar ? "هذه " : "This is "}
          <HandwrittenMark kind="underline">{ar ? "الميزة الأهم" : "the key feature"}</HandwrittenMark>
          {ar ? "، وتلك " : ", and that is "}
          <HandwrittenMark kind="circle" tone="danger" delay={400}>
            {ar ? "مهمة" : "urgent"}
          </HandwrittenMark>
          {ar ? " و" : " and "}
          <HandwrittenMark kind="highlight" tone="warning" delay={800}>
            {ar ? "مميّزة" : "highlighted"}
          </HandwrittenMark>
          .
        </p>
      </Block>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
