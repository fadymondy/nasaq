import { ConfirmProvider, DesktopShell, desktopPowerMenu, ProductLogo, useConfirm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";
import { DesktopDemo, desktopApps, desktopMenus } from "./_w1-demo";

const meta = { title: "Components/Apps & Platforms/Pages/Desktop OS Shell", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function PowerMenuDemo() {
  const ar = useAr();
  const confirm = useConfirm();
  const [last, setLast] = useState("");
  const done = (what: string) => () => setLast(what);
  const system = desktopPowerMenu({
    locale: ar ? "ar" : "en",
    appName: "ToGO",
    onAbout: done(ar ? "حول" : "About"),
    onSettings: done(ar ? "الإعدادات" : "Settings"),
    onSleep: done(ar ? "سكون" : "Sleep"),
    onRestart: done(ar ? "إعادة التشغيل" : "Restart"),
    onShutDown: done(ar ? "إيقاف التشغيل" : "Shut down"),
    onLogOut: done(ar ? "تسجيل الخروج" : "Log out"),
    confirm,
  });
  return (
    <div className="h-dvh w-full">
      <DesktopShell
        apps={desktopApps(ar)}
        menus={(focused) => [system, ...desktopMenus(ar)(focused)]}
        menuBarStart={<ProductLogo size={16} className="px-1" />}
        menuBarEnd={<span role="status">{last ? (ar ? `آخر إجراء: ${last}` : `Last action: ${last}`) : null}</span>}
        defaultWindows={[]}
      />
    </div>
  );
}

export const Default: Story = { render: () => <DesktopDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DesktopDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <DesktopDemo /> };
/** `desktopPowerMenu` builds the System menu. Restart, Shut Down and Log out ask first through `useConfirm`. */
export const PowerMenu: Story = {
  render: () => (
    <ConfirmProvider>
      <PowerMenuDemo />
    </ConfirmProvider>
  ),
};
export const PowerMenuArabic: Story = { ...PowerMenu, globals: { locale: "ar" } };
