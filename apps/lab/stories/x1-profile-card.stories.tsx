import { Avatar, Field, FieldDescription, FieldLabel, type Mention, MentionChip, MentionText, MentionTextarea, PresenceAvatar, PresenceDot, ProfileCard, ProfileHoverCard, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { mentionOptions, people, resolveMention, useAr, VIEWER_ZONE, X1_NOW } from "./_x1-demo";

const meta = { title: "Components/Account/Profile Card", component: ProfileCard } satisfies Meta<typeof ProfileCard>;
export default meta;
type Story = StoryObj;

const useActions = () => ({
  onMessage: (p: { name: string }) => toast(`Message ${p.name}`),
  onMention: (p: { name: string }) => toast(`Mention ${p.name}`),
  onViewProfile: (p: { name: string }) => toast(`Open ${p.name}`),
});

function CardDemo() {
  const ar = useAr();
  const a = useActions();
  return (
    <div className="flex flex-wrap items-start gap-4">
      {people(ar)
        .slice(0, 3)
        .map((p) => (
          <ProfileCard key={p.id} person={p} now={X1_NOW} viewerTimeZone={VIEWER_ZONE} className="w-72 rounded-card border border-border bg-card" {...a} />
        ))}
    </div>
  );
}

/** The card on its own: presence, local time and how far apart you are, team, and the quick actions you pass. */
export const Default: Story = { render: () => <CardDemo /> };

function HoverDemo() {
  const ar = useAr();
  const a = useActions();
  const [sara, omar] = people(ar);
  return (
    <div className="flex flex-col gap-4 text-body text-foreground">
      <p>{ar ? "مرّر أو ركّز أو المس أي اسم أو صورة أو إشارة." : "Hover, focus or tap any name, avatar or mention."}</p>
      <div className="flex items-center gap-3">
        <ProfileHoverCard person={sara!} now={X1_NOW} viewerTimeZone={VIEWER_ZONE} {...a}>
          <button type="button" aria-label={sara!.name} className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
            <PresenceAvatar person={sara!} />
          </button>
        </ProfileHoverCard>
        <ProfileHoverCard person={omar!} now={X1_NOW} viewerTimeZone={VIEWER_ZONE} {...a}>
          {omar!.name}
        </ProfileHoverCard>
      </div>
      <p>
        {ar ? "شكرًا " : "Thanks "}
        <MentionChip name={sara!.name} person={sara} now={X1_NOW} viewerTimeZone={VIEWER_ZONE} {...a} />
        {ar ? " وأخبر " : " and tell "}
        <MentionChip name={ar ? "التصميم" : "Design"} kind="team" />
        {ar ? " و " : " and "}
        <MentionChip name={ar ? "الجميع" : "everyone"} kind="group" />
      </p>
    </div>
  );
}

/** From an avatar, a name or an @mention. Opens on hover and keyboard focus, and on tap for touch. Escape closes. */
export const HoverCard: Story = { render: () => <HoverDemo /> };

function PresenceDemo() {
  const ar = useAr();
  return (
    <div className="flex flex-wrap items-center gap-6">
      {(["online", "away", "busy", "offline"] as const).map((presence) => (
        <div key={presence} className="flex items-center gap-2 text-body text-foreground">
          <PresenceAvatar person={{ name: people(ar)[0]!.name, presence }} size="lg" />
          <span className="flex items-center gap-1.5">
            <PresenceDot presence={presence} />
            {presence}
          </span>
        </div>
      ))}
      <Avatar name="No dot" />
    </div>
  );
}

/** Each state has its own shape, so it does not rely on colour: offline is a hollow ring. */
export const Presence: Story = { render: () => <PresenceDemo /> };

function PickerDemo() {
  const ar = useAr();
  const a = useActions();
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "تعليق" : "Comment"}</FieldLabel>
        <MentionTextarea
          rows={3}
          suggestions={mentionOptions(ar)}
          placeholder={ar ? "اكتب @ لذكر شخص أو فريق أو مجموعة" : "Type @ to mention a person, team or group"}
          onValueChange={(v, m) => {
            setText(v);
            setMentions(m);
          }}
        />
        <FieldDescription>{ar ? "ابحث بالاسم أو المعرّف أو الفريق. الأسهم للتنقل وEnter للاختيار." : "Search by name, handle or team. Arrows to move, Enter to pick."}</FieldDescription>
      </Field>
      <div className="rounded-card border border-border bg-card p-3">
        <MentionText text={text || (ar ? "معاينة التعليق" : "Comment preview")} mentions={mentions} resolve={resolveMention(ar)} now={X1_NOW} viewerTimeZone={VIEWER_ZONE} {...a} />
      </div>
    </div>
  );
}

/** Type @ to search people, teams and groups. Sections, presence dots, keyboard navigation. The preview turns mentions into chips. */
export const MentionPicker: Story = { render: () => <PickerDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <HoverDemo /> };
export const ArabicPicker: Story = { name: "Arabic mention picker", globals: { locale: "ar" }, render: () => <PickerDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <HoverDemo /> };
