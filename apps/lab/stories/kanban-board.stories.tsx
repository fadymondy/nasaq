import { KanbanBoard, type KanbanCardData, type KanbanColumnData, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Collaboration/Kanban board", component: KanbanBoard } satisfies Meta<typeof KanbanBoard>;
export default meta;
type Story = StoryObj;

/** Forces Arabic (RTL) regardless of the toolbar locale, so both directions are one click apart. */
function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

const EN_COLUMNS: KanbanColumnData[] = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress" },
  { id: "review", title: "In review" },
  { id: "done", title: "Done" },
];
const EN_CARDS: KanbanCardData[] = [
  { id: "c1", columnId: "todo", title: "Draft the onboarding email", labels: [{ label: "Content", hue: "violet" }], assignee: { name: "Sara Ali" } },
  { id: "c2", columnId: "todo", title: "Audit colour contrast", labels: [{ label: "Design", hue: "pink" }, { label: "A11y", hue: "teal" }] },
  { id: "c3", columnId: "doing", title: "Build the billing page", labels: [{ label: "Frontend", hue: "blue" }], assignee: { name: "Omar Nasser" } },
  { id: "c4", columnId: "review", title: "Fix RTL table alignment", labels: [{ label: "Bug", hue: "red" }], assignee: { name: "Lina Haddad" } },
  { id: "c5", columnId: "done", title: "Set up CI", labels: [{ label: "Infra", hue: "gray" }], assignee: { name: "Omar Nasser" } },
];

const AR_COLUMNS: KanbanColumnData[] = [
  { id: "todo", title: "للتنفيذ" },
  { id: "doing", title: "قيد العمل" },
  { id: "review", title: "قيد المراجعة" },
  { id: "done", title: "منجز" },
];
const AR_CARDS: KanbanCardData[] = [
  { id: "c1", columnId: "todo", title: "صياغة بريد الترحيب", labels: [{ label: "محتوى", hue: "violet" }], assignee: { name: "سارة علي" } },
  { id: "c2", columnId: "todo", title: "مراجعة تباين الألوان", labels: [{ label: "تصميم", hue: "pink" }, { label: "الوصول", hue: "teal" }] },
  { id: "c3", columnId: "doing", title: "بناء صفحة الفوترة", labels: [{ label: "واجهة", hue: "blue" }], assignee: { name: "عمر ناصر" } },
  { id: "c4", columnId: "review", title: "إصلاح محاذاة الجدول", labels: [{ label: "خلل", hue: "red" }], assignee: { name: "لينا حداد" } },
  { id: "c5", columnId: "done", title: "إعداد التكامل المستمر", labels: [{ label: "بنية", hue: "gray" }], assignee: { name: "عمر ناصر" } },
];

/** Apply onMove the way a real app would: pull the card out, then insert it at `toIndex` among the destination column's cards. */
function moveCard(cards: KanbanCardData[], columns: KanbanColumnData[], id: string, toColumn: string, toIndex: number) {
  const card = cards.find((c) => c.id === id);
  if (!card) return cards;
  const rest = cards.filter((c) => c.id !== id);
  const byColumn = new Map(columns.map((c) => [c.id, rest.filter((r) => r.columnId === c.id)]));
  const target = byColumn.get(toColumn) ?? [];
  target.splice(toIndex, 0, { ...card, columnId: toColumn });
  return columns.flatMap((c) => byColumn.get(c.id) ?? []);
}

function Board({ ar, empty }: { ar: boolean; empty?: boolean }) {
  const columns = ar ? AR_COLUMNS : EN_COLUMNS;
  const [cards, setCards] = useState<KanbanCardData[]>(() => {
    const all = ar ? AR_CARDS : EN_CARDS;
    return empty ? all.filter((c) => c.columnId !== "done") : all;
  });
  const [last, setLast] = useState("");
  return (
    <div className="flex w-full flex-col gap-2">
      <KanbanBoard
        columns={columns}
        cards={cards}
        onMove={(id, col, index) => {
          setLast(`onMove("${id}", "${col}", ${index})`);
          setCards((prev) => moveCard(prev, columns, id, col, index));
        }}
      />
      <code dir="ltr" className="text-caption text-muted-foreground">
        {last || (ar ? "اسحب بطاقة" : "Drag a card")}
      </code>
    </div>
  );
}

/** Drag cards within and between columns, or Tab to a card, Space to lift, arrows to move, Space to drop. Follows the toolbar locale. */
export const Default: Story = {
  render: () => <Board ar={useNasaq().locale.startsWith("ar")} />,
};

/** English (LTR) above, Arabic (RTL) below: in Arabic the first column is on the right. */
export const EnglishAndArabic: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-8">
      <Board ar={false} />
      <ArabicScope>
        <Board ar />
      </ArabicScope>
    </div>
  ),
};

/** A column with no cards shows a placeholder and still accepts drops. */
export const EmptyColumn: Story = {
  render: () => <Board ar={useNasaq().locale.startsWith("ar")} empty />,
};

/** Replace the card body with `renderCard`; the board still supplies the drag handle. */
export const CustomCard: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const columns = ar ? AR_COLUMNS : EN_COLUMNS;
    const [cards, setCards] = useState(ar ? AR_CARDS : EN_CARDS);
    return (
      <KanbanBoard
        columns={columns}
        cards={cards}
        onMove={(id, col, index) => setCards((prev) => moveCard(prev, columns, id, col, index))}
        renderCard={(card, { overlay }) => (
          <div className={`rounded-control border border-border bg-card px-3 py-2 text-body-sm text-foreground ${overlay ? "shadow-lg" : ""}`}>
            {card.title}
          </div>
        )}
      />
    );
  },
};

function ActionsBoard() {
  const ar = useNasaq().locale.startsWith("ar");
  const columns = ar ? AR_COLUMNS : EN_COLUMNS;
  const [cards, setCards] = useState(ar ? AR_CARDS : EN_CARDS);
  const [last, setLast] = useState("");
  return (
    <div className="flex w-full flex-col gap-2">
      <KanbanBoard
        columns={columns}
        cards={cards}
        onMove={(id, col, index) => setCards((prev) => moveCard(prev, columns, id, col, index))}
        cardActions={(card) => [
          ...columns
            .filter((c) => c.id !== card.columnId)
            .map((c) => ({
              id: `move-${c.id}`,
              label: ar ? `نقل إلى ${c.title}` : `Move to ${c.title}`,
              onSelect: () => setCards((prev) => moveCard(prev, columns, card.id, c.id, 0)),
            })),
          {
            id: "delete",
            label: ar ? "حذف" : "Delete",
            danger: true,
            group: "danger",
            onSelect: () => {
              setLast(`delete ${card.id}`);
              setCards((prev) => prev.filter((c) => c.id !== card.id));
            },
          },
        ]}
      />
      <code dir="ltr" className="text-caption text-muted-foreground">
        {last || (ar ? "انقر بزر الفأرة الأيمن على بطاقة، أو Shift+F10" : "Right-click a card, or focus it and press Shift+F10")}
      </code>
    </div>
  );
}

/** `cardActions` open as a context menu: right-click, or Tab to a card and press Shift+F10 / the Menu key. Dragging still works. */
export const ContextMenu: Story = { render: () => <ActionsBoard /> };
export const ContextMenuArabic: Story = { globals: { locale: "ar" }, render: () => <ActionsBoard /> };
