import { NotificationCenter, type NotificationCenterItem, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreditCard } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Collaboration/Notification Center", component: NotificationCenter, args: { items: [] } } satisfies Meta<typeof NotificationCenter>;
export default meta;
type Story = StoryObj<typeof meta>;

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);

function makeItems(ar: boolean, count: number): NotificationCenterItem[] {
  const base: NotificationCenterItem[] = [
    {
      id: "1",
      actor: { name: ar ? "سارة الحربي" : "Sara Alharbi" },
      title: ar ? "أشارت إليك سارة في MH-142" : "Sara mentioned you in MH-142",
      description: ar ? "هل يمكنك مراجعة إعادة التوجيه؟" : "Can you review the redirect?",
      time: ago(5),
      unread: true,
    },
    { id: "2", icon: <CreditCard />, title: ar ? "دُفعت الفاتورة INV-031" : "Invoice INV-031 was paid", time: ago(70), unread: true },
    {
      id: "3",
      actor: { name: ar ? "نورة السبيعي" : "Noura Alsubaie" },
      title: ar ? "علّقت على تصميم صفحة الدخول" : "Commented on the sign-in design",
      time: ago(60 * 26),
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const b = base[i % 3] as NotificationCenterItem;
    return i < 3 ? b : { ...b, id: String(i + 1), unread: true };
  });
}

function Demo({ count = 3 }: { count?: number }) {
  const ar = useNasaq().locale.startsWith("ar");
  const [items, setItems] = useState(() => makeItems(ar, count));
  return (
    <div className="flex justify-end">
      <NotificationCenter
        items={items}
        onItemClick={(item) => setItems((all) => all.map((i) => (i.id === item.id ? { ...i, unread: false } : i)))}
        onMarkAllRead={() => setItems((all) => all.map((i) => ({ ...i, unread: false })))}
      />
    </div>
  );
}

/** Click the bell. Pressing a row marks it read; "Mark all read" clears the badge. */
export const Default: Story = { render: () => <Demo /> };

/** More than 99 unread shows "99+". */
export const Capped: Story = { render: () => <Demo count={120} /> };

/** No items: the popover shows the empty state. */
export const Empty: Story = {
  render: () => (
    <div className="flex justify-end">
      <NotificationCenter items={[]} />
    </div>
  ),
};

/** The same demo forced to Arabic (RTL). */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };

function ActionsDemo() {
  const ar = useNasaq().locale.startsWith("ar");
  const [items, setItems] = useState(() => makeItems(ar, 4));
  return (
    <div className="flex justify-end">
      <NotificationCenter
        items={items}
        defaultOpen
        onItemClick={(item) => setItems((all) => all.map((i) => (i.id === item.id ? { ...i, unread: false } : i)))}
        itemActions={(item) => [
          {
            id: "read",
            label: item.unread ? (ar ? "تعليم كمقروء" : "Mark as read") : ar ? "تعليم كغير مقروء" : "Mark as unread",
            onSelect: () => setItems((all) => all.map((i) => (i.id === item.id ? { ...i, unread: !i.unread } : i))),
          },
          { id: "remove", label: ar ? "إزالة" : "Remove", danger: true, group: "danger", onSelect: () => setItems((all) => all.filter((i) => i.id !== item.id)) },
        ]}
      />
    </div>
  );
}

/** Right-click a row (or Shift+F10 on it) for read/unread and remove. */
export const ContextMenu: Story = { render: () => <ActionsDemo /> };
export const ContextMenuArabic: Story = { globals: { locale: "ar" }, render: () => <ActionsDemo /> };
