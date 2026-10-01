import { Button, Spinner, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta = { title: "Components/Loading & States/Spinner", component: Spinner } satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Decorative and `aria-hidden`: always pair it with text that says what is pending. */
export const Default: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <Spinner />
        {ar ? "جارٍ مزامنة المهام…" : "Syncing tasks…"}
      </div>
    );
  },
};

/** Sized and coloured with className; it inherits `currentColor`. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-muted-foreground">
      <Spinner className="size-3" />
      <Spinner />
      <Spinner className="size-6" />
      <Spinner className="size-8 text-nq-accent" />
    </div>
  ),
};

/** Inline in a button while an action runs. */
export const InButton: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (!busy) return;
      const t = setTimeout(() => setBusy(false), 2000);
      return () => clearTimeout(t);
    }, [busy]);
    return (
      <Button variant="secondary" disabled={busy} onClick={() => setBusy(true)}>
        {busy ? <Spinner /> : null}
        {busy ? (ar ? "جارٍ الإرسال…" : "Sending…") : ar ? "إرسال الفاتورة" : "Send invoice"}
      </Button>
    );
  },
};
