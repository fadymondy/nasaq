import { BookmarkButton, Button, Linkify, ProgressiveList, ProgressiveReveal, ScrollFade, TranslatableText, UserText } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { arabicMixed, longText, wait } from "./_w4-demo";

const meta = { title: "Components/Utilities/Text Utilities", component: Linkify, parameters: { layout: "padded" } } satisfies Meta<typeof Linkify>;
export default meta;
type Story = StoryObj;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-eyebrow text-muted-foreground">{title}</h3>
    {children}
  </section>
);

const chips = ["Water", "Espresso", "Oatmeal", "Banana", "Karkade", "Orange", "Falafel", "Dragon fruit", "Tea", "Coffee"];
let calls = 0;

function All() {
  return (
    <div className="flex max-w-xl flex-col gap-8">
      <Section title="Linkify">
        <p className="text-body">
          <Linkify>{longText}</Linkify>
        </p>
        <p className="text-body">
          <Linkify>{arabicMixed}</Linkify>
        </p>
      </Section>
      <Section title="UserText (isolated, clamped)">
        <p className="text-body">
          Signed by <UserText>محمد Ahmed</UserText> on Monday.
        </p>
        <UserText block lines={2} linkify className="text-body">
          {`${longText} ${longText}`}
        </UserText>
      </Section>
      <Section title="TranslatableText">
        <TranslatableText
          original="أهلا وسهلا، هذا نص تجريبي للترجمة."
          sourceLang="ar"
          targetLang="en"
          onTranslate={async () => {
            await wait(600);
            calls += 1;
            return calls % 2 === 1 ? { error: "The translation service did not answer." } : "Welcome, this is a sample text for translation.";
          }}
        />
      </Section>
      <Section title="ScrollFade">
        <ScrollFade label="Chips">
          {chips.map((c) => (
            <Button key={c} variant="secondary" size="sm" className="shrink-0">
              {c}
            </Button>
          ))}
        </ScrollFade>
      </Section>
      <Section title="BookmarkButton">
        <div className="flex items-center gap-3">
          <BookmarkButton onSavedChange={async () => void (await wait(400))} />
          <BookmarkButton showLabel variant="secondary" onSavedChange={async () => ({ error: "Could not save." })} />
        </div>
      </Section>
      <Section title="ProgressiveReveal">
        <ProgressiveReveal collapsedHeight={72}>
          <p className="text-body">{`${longText} ${longText} ${longText}`}</p>
        </ProgressiveReveal>
      </Section>
      <Section title="ProgressiveList">
        <ProgressiveList initial={3} step={3} items={Array.from({ length: 8 }, (_, i) => `Entry ${i + 1}`)} />
      </Section>
    </div>
  );
}

export const Default: Story = { render: () => <All /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <All /> };
