import { type ConsentState, CookieConsent, consentModeSignals } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { consentCategories, sleep, useAr } from "./_onboarding-demo";

const meta = { title: "Components/Website/Cookie Consent", component: CookieConsent, parameters: { layout: "fullscreen" } } satisfies Meta<typeof CookieConsent>;
export default meta;
type Story = StoryObj;

function Demo({ open = false, position = "bottom" }: { open?: boolean; position?: "bottom" | "start" | "end" }) {
  const ar = useAr();
  const categories = consentCategories(ar);
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [prefs, setPrefs] = useState(open);
  return (
    <div className="flex min-h-[32rem] flex-col gap-4 p-6">
      <p className="text-body text-muted-foreground">{ar ? "محتوى الصفحة. القرار يُحفظ عبر onSave ولا يضبط المكوّن أي ملف تعريف ارتباط." : "Page content. The choice goes through onSave; the component sets no cookies itself."}</p>
      <button type="button" className="w-fit text-body-sm underline underline-offset-4" onClick={() => setPrefs(true)}>
        {ar ? "إعدادات ملفات الارتباط" : "Cookie settings"}
      </button>
      {consent ? (
        <pre dir="ltr" className="w-fit rounded-control border border-border bg-muted p-3 text-caption">
          {JSON.stringify(consentModeSignals(consent, categories), null, 2)}
        </pre>
      ) : null}
      <CookieConsent
        inline
        categories={categories}
        consent={consent}
        position={position}
        policyHref="#cookies"
        preferencesOpen={prefs}
        onPreferencesOpenChange={setPrefs}
        onSave={async (state) => {
          await sleep(400);
          setConsent(state);
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const PreferencesOpen: Story = { name: "Preferences open", render: () => <Demo open /> };
export const CornerCard: Story = { name: "Corner card", render: () => <Demo position="end" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
