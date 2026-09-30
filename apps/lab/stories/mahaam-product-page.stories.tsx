/*
 * Validation screen (brief item 19): one complete marketplace product page, for Mahaam, opened from the
 * CircleXO App Store inside the shared product shell. Tests whether Nasaq carries product marketing as
 * well as dashboards, using only catalogue components. Plans, prices, ratings and transcript figures
 * are illustrative; identity, copy, features and integrations are Mahaam's own.
 */
import { AppShell } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MahaamPage } from "./_mahaam";
import { DemoSidebar, Palette } from "./_shell";
import { InstallProvider } from "./_store";

const meta = {
  title: "Pages/Marketing/Mahaam Product Page",
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
  globals: { brand: "circlexo" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Page() {
  return (
    <AppShell sidebar={<DemoSidebar active="store" />}>
      <InstallProvider>
        <MahaamPage />
      </InstallProvider>
      <Palette />
    </AppShell>
  );
}

/**
 * The store shell stays CircleXO; everything under the breadcrumb is scoped to Mahaam's brand, so the
 * one primary button (Install) takes Mahaam's colour. Try the screenshot tabs, the yearly switch, Install,
 * and the toolbar for theme, Arabic and the mobile viewport.
 */
export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
