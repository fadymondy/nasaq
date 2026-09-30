import { OAuthConsent } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { consentScopes, sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/OAuth Consent", component: OAuthConsent } satisfies Meta<typeof OAuthConsent>;
export default meta;
type Story = StoryObj;

function Demo({ fail }: { fail?: boolean }) {
  const ar = useAr();
  return (
    <div className="max-w-md">
      <OAuthConsent
        app={{ name: "Zapline", publisher: ar ? "من شركة Zapline" : "by Zapline Inc." }}
        scopes={consentScopes(ar)}
        account={{ name: ar ? "فادي مندي" : "Fady Mondy", email: "fady@example.com" }}
        onSwitchAccount={() => undefined}
        redirectHost="app.zapline.io"
        onAllow={async () => {
          await sleep(900);
          if (fail) return { error: ar ? "تعذّر الوصول إلى التطبيق. حاول مرة أخرى." : "The app could not be reached. Try again." };
        }}
        onDeny={() => sleep(600)}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

/** A failed Allow shows the message and keeps both buttons available. */
export const Failure: Story = { render: () => <Demo fail /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
