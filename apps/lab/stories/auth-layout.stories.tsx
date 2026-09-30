import { AuthLayout, LoginForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrandPanel, StoryFooter, fakeLogin, useAr } from "./_auth";

const meta = { title: "Components/Auth/Auth Layout", component: AuthLayout, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof AuthLayout>;
export default meta;
type Story = StoryObj;

function Form() {
  const ar = useAr();
  return <LoginForm onSubmit={(v) => fakeLogin(v.password, ar)} oauthProviders={["google", "github"]} />;
}

function Card() {
  const ar = useAr();
  return (
    <AuthLayout title={ar ? "مرحبًا بعودتك" : "Welcome back"} description={ar ? "سجّل الدخول إلى حسابك." : "Sign in to your account."} footer={<StoryFooter />}>
      <Form />
    </AuthLayout>
  );
}

function Split() {
  const ar = useAr();
  return (
    <AuthLayout variant="split" panel={<BrandPanel />} title={ar ? "مرحبًا بعودتك" : "Welcome back"} description={ar ? "سجّل الدخول إلى حسابك." : "Sign in to your account."} footer={<StoryFooter />}>
      <Form />
    </AuthLayout>
  );
}

/** One centred card. The mark sits above it and the footer below. */
export const CardVariant: Story = { name: "Card", render: () => <Card /> };

/** Brand panel on the inline start (the right in Arabic), form on the other side. The panel hides below the `lg` breakpoint. */
export const SplitVariant: Story = { name: "Split", render: () => <Split /> };

export const SplitArabic: Story = { name: "Split (Arabic)", globals: { locale: "ar" }, render: () => <Split /> };
