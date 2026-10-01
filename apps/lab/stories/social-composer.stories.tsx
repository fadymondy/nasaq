import { SocialComposer, SocialMetricsTable, NasaqProvider, useNasaq, type SocialMedia, type SocialPost } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { socialAccounts, socialMetrics, socialPost, useAr, wait } from "./_r2-demo";

const meta = { title: "Components/Marketing/Social composer", component: SocialComposer } satisfies Meta<typeof SocialComposer>;
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

let fileCounter = 0;
const pickFile = (kind: "image" | "video"): SocialMedia => {
  fileCounter += 1;
  return { id: `f${fileCounter}`, kind, name: kind === "image" ? `photo-${fileCounter}.jpg` : `clip-${fileCounter}.mp4` };
};

function Demo() {
  const ar = useAr();
  const [post, setPost] = useState<SocialPost>(() => socialPost(ar));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [assisting, setAssisting] = useState(false);
  return (
    <div className="flex w-full flex-col gap-3">
      <SocialComposer
        accounts={socialAccounts}
        value={post}
        onValueChange={setPost}
        onAttach={(kind) => pickFile(kind)}
        assistActions={[
          { id: "shorten", label: ar ? "اختصر" : "Shorten" },
          { id: "hashtags", label: ar ? "أضف وسومًا" : "Add hashtags" },
        ]}
        assisting={assisting}
        onAssist={async (id, p) => {
          setAssisting(true);
          await wait(600);
          setPost(id === "shorten" ? { ...p, body: p.body.slice(0, 120) } : { ...p, body: `${p.body} #${ar ? "إطلاق" : "launch"}` });
          setAssisting(false);
        }}
        submitting={busy}
        onSubmit={async (_p, checks) => {
          setBusy(true);
          await wait();
          setBusy(false);
          setSent(`${checks.length} ${ar ? "وجهات" : "targets"}`);
        }}
        onSaveDraft={() => setSent(ar ? "حُفظت المسودة" : "Draft saved")}
      />
      {sent ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          {sent}
        </p>
      ) : null}
    </div>
  );
}

/** Pick accounts; each shows its own counter. X counts the link as 23, Instagram wants an image. Add one to clear it. */
export const Default: Story = { parameters: { layout: "padded" }, render: () => <Demo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};

function Over() {
  const [post, setPost] = useState<SocialPost>({
    body: "This post is far too long for X and Bluesky. ".repeat(9),
    variants: {},
    accountIds: ["x1", "bs1", "th1", "li1"],
    media: [],
    scheduledAt: null,
  });
  return <SocialComposer accounts={socialAccounts} value={post} onValueChange={setPost} />;
}

/** Over the limit on X and Bluesky: the counters turn red and Publish stays off. Write a shorter version for each. */
export const OverLimit: Story = { render: () => <Over /> };

function Metrics() {
  const ar = useAr();
  return (
    <SocialMetricsTable
      rows={socialMetrics(ar)}
      rowActions={(r) => [
        { id: "open", label: ar ? "فتح المنشور" : "Open post", onSelect: () => undefined },
        { id: "dup", label: ar ? "نسخ كمسودة" : "Duplicate as draft", onSelect: () => undefined },
        { id: "retry", label: ar ? "إعادة المحاولة" : "Retry", onSelect: () => undefined, disabled: r.status !== "failed", group: "more" },
      ]}
    />
  );
}

/** Totals and a sortable table. Row actions open with the menu and on context-click. */
export const Metrics_: Story = { name: "Metrics", render: () => <Metrics /> };

export const MetricsArabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <Metrics />
    </ArabicScope>
  ),
};
