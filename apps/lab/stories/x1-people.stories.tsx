/*
 * The People page: a member list whose names open account cards, a comment box with the @ picker (people, teams, groups),
 * saved comments with mention chips, and the user menu with its profile card. Hover, focus or tap any name.
 */
import { Button, Card, DropdownMenuItem, type Mention, MembersManager, MentionText, MentionTextarea, toast, UserMenu } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Settings } from "lucide-react";
import { useState } from "react";
import { useMembersDemo } from "./_team-demo";
import { PageShell } from "./_team-pages";
import { mentionOptions, people, resolveMention, useAr, VIEWER_ZONE, X1_NOW } from "./_x1-demo";

const meta = { title: "Pages/App/People", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

type Comment = { id: number; text: string; mentions: Mention[] };

function Page() {
  const ar = useAr();
  const d = useMembersDemo(ar);
  const all = people(ar);
  const actions = {
    onMessage: (p: { name: string }) => toast(ar ? `رسالة إلى ${p.name}` : `Message ${p.name}`),
    onMention: (p: { name: string }) => toast(ar ? `ذكر ${p.name}` : `Mention ${p.name}`),
    onViewProfile: (p: { name: string }) => toast(ar ? `فتح ملف ${p.name}` : `Open ${p.name}`),
    viewerTimeZone: VIEWER_ZONE,
  };
  const seedText = ar ? "شكرًا @سارة الناصر، سأعرض التصميم على @الهندسة" : "Thanks @Sara Nasser, I will show the design to @Engineering";
  const range = (name: string, id: string): Mention[] => {
    const at = seedText.indexOf(`@${name}`);
    return at < 0 ? [] : [{ id, name, start: at, end: at + name.length + 1 }];
  };
  const [comments, setComments] = useState<Comment[]>([{ id: 1, text: seedText, mentions: [...range(all[0]!.name, "u1"), ...range(ar ? "الهندسة" : "Engineering", "t-eng")] }]);
  const [draft, setDraft] = useState<{ text: string; mentions: Mention[] }>({ text: "", mentions: [] });
  const [box, setBox] = useState(0);

  const post = () => {
    if (!draft.text.trim()) return;
    setComments((l) => [...l, { id: Date.now(), text: draft.text, mentions: draft.mentions }]);
    setDraft({ text: "", mentions: [] });
    setBox((b) => b + 1);
  };

  return (
    <PageShell title={ar ? "الأشخاص" : "People"} description={ar ? "الفريق وأحاديثه. مرّر على أي اسم لترى بطاقته." : "The team and what they say. Hover any name to see their card."}>
      <MembersManager
        members={d.members}
        invites={d.invites}
        roles={d.roles}
        currentUserId={d.currentUserId}
        grantableRoles={d.grantableRoles}
        profile={(m) => all.find((p) => p.name === m.name) ?? { id: m.id, name: m.name, email: m.email, role: m.role }}
        profileActions={actions}
        {...d.handlers}
      />
      <section className="flex flex-col gap-3" aria-label={ar ? "التعليقات" : "Comments"}>
        <h2 className="text-h3 text-foreground">{ar ? "التعليقات" : "Comments"}</h2>
        {comments.map((c) => (
          <Card key={c.id} className="p-3">
            <MentionText text={c.text} mentions={c.mentions} resolve={resolveMention(ar)} now={X1_NOW} {...actions} />
          </Card>
        ))}
        <MentionTextarea
          key={box}
          rows={3}
          suggestions={mentionOptions(ar)}
          placeholder={ar ? "اكتب @ لذكر شخص أو فريق" : "Write a comment. Type @ to mention someone"}
          onValueChange={(text, mentions) => setDraft({ text, mentions })}
        />
        <Button variant="primary" className="self-end" disabled={!draft.text.trim()} onClick={post}>
          {ar ? "انشر" : "Post"}
        </Button>
      </section>
      <section className="flex flex-col gap-2" aria-label={ar ? "قائمة المستخدم" : "User menu"}>
        <h2 className="text-h3 text-foreground">{ar ? "قائمة المستخدم" : "User menu"}</h2>
        <div className="flex h-24 w-64 items-end rounded-card border border-border bg-sidebar p-2">
          <UserMenu user={{ name: all[4]!.name, email: all[4]!.email! }} profile={all[4]} onViewProfile={actions.onViewProfile} onSignOut={() => toast(ar ? "تم الخروج" : "Signed out")}>
            <DropdownMenuItem>
              <Settings />
              {ar ? "الإعدادات" : "Settings"}
            </DropdownMenuItem>
          </UserMenu>
        </div>
      </section>
    </PageShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
