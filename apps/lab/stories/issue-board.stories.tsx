import { Button, IssueBoard, type IssueBoardItem, IssueCard, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useAr } from "./_auth";
import { issues as seedIssues, labels, people, statuses } from "./_mahaam-demo";

const meta = { title: "Components/Projects & Work/Issue Board", component: IssueBoard, parameters: { layout: "padded" } } satisfies Meta<typeof IssueBoard>;
export default meta;
type Story = StoryObj;

function useBoard(ar: boolean, withVotes: boolean) {
  const team = useMemo(() => people(ar), [ar]);
  const [items, setItems] = useState<IssueBoardItem[]>(() =>
    seedIssues(ar).map((i, n) => ({
      ...i,
      reporterId: team[(n + 1) % team.length]!.id,
      votes: withVotes ? (n * 7) % 19 : undefined,
      voted: withVotes ? n % 4 === 0 : undefined,
      comments: (n * 3) % 6,
      attachments: n % 3 === 0 ? (n % 4) + 1 : 0,
    })),
  );
  const move = (id: string, statusId: string, index: number) =>
    setItems((list) => {
      const moved = list.find((i) => i.id === id);
      if (!moved) return list;
      const rest = list.filter((i) => i.id !== id);
      const column = rest.filter((i) => i.statusId === statusId);
      const before = column[index];
      const at = before ? rest.indexOf(before) : column.length ? rest.indexOf(column[column.length - 1]!) + 1 : rest.length;
      rest.splice(at, 0, { ...moved, statusId });
      return rest;
    });
  const vote = (issue: IssueBoardItem, voted: boolean) =>
    setItems((list) => list.map((i) => (i.id === issue.id ? { ...i, voted, votes: (i.votes ?? 0) + (voted ? 1 : -1) } : i)));
  return { items, team, move, vote };
}

/** Search, assignee and reporter filters, New issue, and a drag between columns. Click a card to open it. */
export const Default: Story = {
  render: function Render() {
    const ar = useAr();
    const { items, team, move } = useBoard(ar, false);
    return (
      <IssueBoard
        issues={items}
        statuses={statuses(ar)}
        labels={labels(ar)}
        people={team}
        onMove={move}
        onOpen={(i) => toast(`${i.key}: ${i.title}`)}
        onCreate={() => toast(ar ? "مهمة جديدة" : "New issue")}
        toolbar={
          <Button size="sm" variant="ghost">
            <Download aria-hidden />
            {ar ? "تصدير" : "Export"}
          </Button>
        }
      />
    );
  },
};

/** A feedback board: each card has a vote toggle with its count. */
export const FeedbackVotes: Story = {
  render: function Render() {
    const ar = useAr();
    const { items, team, move, vote } = useBoard(ar, true);
    return (
      <IssueBoard
        title={ar ? "طلبات الميزات" : "Feature requests"}
        issues={items}
        statuses={statuses(ar)}
        labels={labels(ar)}
        people={team}
        onMove={move}
        onVote={vote}
      />
    );
  },
};

/** Starts filtered to one assignee; drops still land in the right place among the hidden cards. */
export const Filtered: Story = {
  render: function Render() {
    const ar = useAr();
    const { items, team, move } = useBoard(ar, false);
    return (
      <IssueBoard
        issues={items}
        statuses={statuses(ar)}
        labels={labels(ar)}
        people={team}
        onMove={move}
        defaultFilter={{ assigneeId: team[0]!.id }}
        onFilterChange={(f) => toast(JSON.stringify(f))}
      />
    );
  },
};

/** The card on its own: votes, comments, attachments, an overdue date and the assignee. */
export const Card: Story = {
  render: function Render() {
    const ar = useAr();
    const [voted, setVoted] = useState(false);
    const issue = seedIssues(ar)[0]!;
    return (
      <div className="w-72">
        <IssueCard
          issue={{ ...issue, dueDate: "2020-01-01" }}
          labels={labels(ar)}
          people={people(ar)}
          votes={12 + (voted ? 1 : 0)}
          voted={voted}
          onVote={setVoted}
          comments={4}
          attachments={2}
        />
      </div>
    );
  },
};

export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
export const FeedbackVotesArabic: Story = { ...FeedbackVotes, globals: { locale: "ar" } };
