import { Button, DesktopLoginScreen } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Moon, Power, RotateCcw } from "lucide-react";
import { DEMO_NOW, sleep, useAr, Wallpaper } from "./_onboarding-demo";

const meta = { title: "Components/Auth/Pages/Desktop Login Screen", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ power = true, footer = true }: { power?: boolean; footer?: boolean }) {
  const ar = useAr();
  return (
    <DesktopLoginScreen
      wallpaper={<Wallpaper />}
      now={DEMO_NOW}
      title="ToGO OS"
      description={ar ? "سجّل الدخول للمتابعة" : "Sign in to continue"}
      onSubmit={async ({ password }) => {
        await sleep(700);
        if (password !== "password") return { error: ar ? "البريد أو كلمة المرور غير صحيحة." : "Incorrect email or password." };
      }}
      formProps={{ showRemember: false, forgotPassword: <a href="#forgot">{ar ? "نسيت كلمة المرور؟" : "Forgot password?"}</a> }}
      footer={
        footer ? (
          <Button variant="ghost" size="sm">
            {ar ? "المتابعة كمطوّر" : "Continue as developer"}
          </Button>
        ) : undefined
      }
      powerActions={
        power
          ? [
              { id: "sleep", label: ar ? "سكون" : "Sleep", icon: Moon, onSelect: () => {} },
              { id: "restart", label: ar ? "إعادة التشغيل" : "Restart", icon: RotateCcw, onSelect: () => {} },
              { id: "shutdown", label: ar ? "إيقاف التشغيل" : "Shut down", icon: Power, onSelect: () => {} },
            ]
          : undefined
      }
    />
  );
}

/** Sign in with any email and the password `password`. */
export const Default: Story = { render: () => <Demo /> };

/** Just the clock and the form. */
export const Minimal: Story = { render: () => <Demo power={false} footer={false} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
