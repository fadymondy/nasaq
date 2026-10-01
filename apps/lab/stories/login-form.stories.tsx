import { buttonVariants, LoginForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEMO_PASSWORD, fakeLogin, sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/Login Form", component: LoginForm } satisfies Meta<typeof LoginForm>;
export default meta;
type Story = StoryObj;

function Forgot() {
  const ar = useAr();
  return (
    <a href="#forgot" className={buttonVariants({ variant: "link", size: "sm" })}>
      {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
    </a>
  );
}

function Basic() {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <LoginForm onSubmit={(v) => fakeLogin(v.password, ar)} forgotPassword={<Forgot />} />
    </div>
  );
}

function Full() {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <LoginForm
        onSubmit={(v) => fakeLogin(v.password, ar)}
        forgotPassword={<Forgot />}
        oauthProviders={["google", "github", "apple"]}
        onOAuth={() => sleep(1500)}
        onPasskey={() => sleep(1500)}
        onPasskeyAutofill={async () => {
          // A real app calls navigator.credentials.get({ mediation: "conditional", signal }) here.
        }}
      />
    </div>
  );
}

/** Any email, password `nasaq123`. A wrong password returns a form error; submit empty to see field errors and the focus move. */
export const Default: Story = { render: () => <Basic /> };

/** Provider buttons and, where the browser supports WebAuthn, a passkey button. */
export const WithProvidersAndPasskey: Story = { name: "With providers and passkey", render: () => <Full /> };

/** The server answers per field. */
export const FieldErrors: Story = {
  name: "Server field errors",
  render: () => (
    <div className="max-w-sm">
      <LoginForm defaultEmail="nobody@example.com" onSubmit={async () => ({ fieldErrors: { email: "No account uses this email.", password: `Try "${DEMO_PASSWORD}".` } })} />
    </div>
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Full /> };

function Magic({ only = false }: { only?: boolean }) {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <LoginForm
        methods={only ? ["magic-link"] : undefined}
        onSubmit={(v) => fakeLogin(v.password, ar)}
        onMagicLink={() => sleep(800)}
        magicLinkSeconds={15}
        forgotPassword={<Forgot />}
      />
    </div>
  );
}

/** `onMagicLink` adds "Email me a sign-in link": it checks the email only, then shows "Check your email" with a resend timer. */
export const MagicLink: Story = { name: "With magic link", render: () => <Magic /> };

/** `methods={["magic-link"]}` drops the password field: the main button sends the link. */
export const MagicLinkOnly: Story = { name: "Magic link only", render: () => <Magic only /> };

/** `methods={[]}`: this account or tenant may not sign in here. Only the notice (and the dev button, when set) remains. */
export const Blocked: Story = {
  render: () => (
    <div className="max-w-sm">
      <LoginForm methods={[]} onSubmit={() => {}} />
    </div>
  ),
};

/** `onDevLogin` adds a dashed "Dev login" button for local builds. This one fails, to show the error. */
export const DevLogin: Story = {
  name: "Dev login",
  render: () => (
    <div className="max-w-sm">
      <LoginForm
        onSubmit={(v) => fakeLogin(v.password, false)}
        onDevLogin={async () => {
          await sleep(600);
          throw new Error("no dev user");
        }}
      />
    </div>
  ),
};

export const MagicLinkArabic: Story = { name: "Magic link (Arabic)", globals: { locale: "ar" }, render: () => <Magic /> };
