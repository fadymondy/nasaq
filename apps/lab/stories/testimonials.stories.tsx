import { NasaqProvider, TestimonialForm, TestimonialWall, useNasaq, type Testimonial, type TestimonialLayout, type TestimonialSubmission } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { testimonialItems, useAr, wait } from "./_r2-demo";

const meta = { title: "Components/Forms/Testimonials", component: TestimonialWall } satisfies Meta<typeof TestimonialWall>;
export default meta;
type Story = StoryObj;

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

function Wall({ layout }: { layout: TestimonialLayout }) {
  const ar = useAr();
  const [items, setItems] = useState<Testimonial[]>(() => testimonialItems(ar));
  return (
    <TestimonialWall
      items={items}
      layout={layout}
      itemActions={(t) => [
        { id: "feature", label: t.featured ? (ar ? "إلغاء التثبيت" : "Unfeature") : ar ? "تثبيت" : "Feature", onSelect: () => setItems((l) => l.map((x) => (x.id === t.id ? { ...x, featured: !x.featured } : x))) },
        { id: "hide", label: ar ? "إخفاء" : "Hide", danger: true, group: "more", onSelect: () => setItems((l) => l.filter((x) => x.id !== t.id)) },
      ]}
    />
  );
}

/** Masonry wall. Context-click a card (or focus it and press Shift+F10) to feature or hide it. */
export const Wall_: Story = { name: "Wall", parameters: { layout: "padded" }, render: () => <Wall layout="wall" /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  parameters: { layout: "padded" },
  render: () => (
    <ArabicScope>
      <Wall layout="wall" />
    </ArabicScope>
  ),
};

export const Grid: Story = { parameters: { layout: "padded" }, render: () => <Wall layout="grid" /> };

/** One large quote at a time, featured first. Use the arrows or the dots. */
export const Spotlight: Story = { parameters: { layout: "padded" }, render: () => <Wall layout="spotlight" /> };

export const SpotlightArabic: Story = {
  globals: { locale: "ar" },
  parameters: { layout: "padded" },
  render: () => (
    <ArabicScope>
      <Wall layout="spotlight" />
    </ArabicScope>
  ),
};

export const NoTestimonials: Story = { parameters: { layout: "padded" }, render: () => <TestimonialWall items={[]} /> };

function Submit() {
  const [got, setGot] = useState<TestimonialSubmission | null>(null);
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <TestimonialForm
        onSubmit={async (s) => {
          await wait(500);
          setGot(s);
        }}
      />
      {got ? (
        <pre dir="ltr" className="overflow-auto rounded-md border bg-muted p-3 text-caption">
          {JSON.stringify(got, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/** The submit form: name, words, stars, consent. Send it empty to see the errors. */
export const SubmitForm: Story = { parameters: { layout: "padded" }, render: () => <Submit /> };

export const SubmitFormArabic: Story = {
  globals: { locale: "ar" },
  parameters: { layout: "padded" },
  render: () => (
    <ArabicScope>
      <Submit />
    </ArabicScope>
  ),
};
