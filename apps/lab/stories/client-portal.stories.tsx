import { ClientPortal, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { PortalDemo } from "./_r2-portal";

const meta = { title: "Components/CRM/Client portal", component: ClientPortal } satisfies Meta<typeof ClientPortal>;
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

/** Ring and hours on Overview; a read-only board; requests with a form; hours per week; sent invoices only (INV-2026-0060 is a draft and is hidden). Menus open on context-click. */
export const Default: Story = { parameters: { layout: "padded" }, render: () => <PortalDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  parameters: { layout: "padded" },
  render: () => (
    <ArabicScope>
      <PortalDemo />
    </ArabicScope>
  ),
};

/** A new project: nothing yet, and every tab says so. */
export const NewProject: Story = { parameters: { layout: "padded" }, render: () => <PortalDemo empty /> };
