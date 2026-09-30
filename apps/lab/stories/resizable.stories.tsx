import { NasaqProvider, ResizableHandle, ResizablePanel, ResizablePanelGroup, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = { title: "Components/Layout/Resizable", component: ResizablePanelGroup } satisfies Meta<typeof ResizablePanelGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Forces Arabic (RTL) regardless of the toolbar locale, so both directions are one click apart. */
function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

function Pane({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="text-label text-foreground">{title}</div>
      <div className="text-body-sm text-muted-foreground">{body}</div>
    </div>
  );
}

const frame = "h-72 w-full max-w-3xl overflow-hidden rounded-card border border-border bg-card";

function Split({ ar, grip }: { ar: boolean; grip?: boolean }) {
  return (
    <div className={frame}>
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="nav" defaultSize="28%" minSize="15%" maxSize="50%">
          <Pane title={ar ? "التنقل" : "Navigation"} body={ar ? "اللوحة الأولى. تقع على اليمين في العربية." : "First panel. Sits on the right in Arabic."} />
        </ResizablePanel>
        <ResizableHandle withGrip={grip} />
        <ResizablePanel id="main" defaultSize="47%" minSize="20%">
          <Pane title={ar ? "المحتوى" : "Content"} body={ar ? "اسحب المقبض أو استخدم مفاتيح الأسهم." : "Drag the handle or use the arrow keys."} />
        </ResizablePanel>
        <ResizableHandle withGrip={grip} />
        <ResizablePanel id="aside" defaultSize="25%" minSize="15%">
          <Pane title={ar ? "التفاصيل" : "Details"} body={ar ? "اللوحة الأخيرة." : "Last panel."} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/** Three panels with limits. Tab to a handle, then use Left/Right, Home/End. Follows the toolbar locale. */
export const Default: Story = {
  render: () => <Split ar={useNasaq().locale.startsWith("ar")} />,
};

/** The handle with a grip. */
export const WithGrip: Story = {
  render: () => <Split ar={useNasaq().locale.startsWith("ar")} grip />,
};

/** English (LTR) above, Arabic (RTL) below: in Arabic the first panel is on the right and dragging follows the pointer. */
export const EnglishAndArabic: Story = {
  render: () => (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Split ar={false} grip />
      <ArabicScope>
        <Split ar grip />
      </ArabicScope>
    </div>
  ),
};

/** A vertical group nested in a horizontal one: the classic editor layout. */
export const Nested: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className={cn2("h-96")}>
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="files" defaultSize="30%" minSize="20%" collapsible collapsedSize="0%">
            <Pane title={ar ? "الملفات" : "Files"} body={ar ? "اضغط Enter على المقبض للطي." : "Press Enter on the handle to collapse."} />
          </ResizablePanel>
          <ResizableHandle withGrip />
          <ResizablePanel id="work" defaultSize="70%">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel id="editor" defaultSize="65%" minSize="25%">
                <Pane title={ar ? "المحرر" : "Editor"} body={ar ? "المنطقة الرئيسية." : "The main area."} />
              </ResizablePanel>
              <ResizableHandle withGrip />
              <ResizablePanel id="terminal" defaultSize="35%" minSize="15%">
                <Pane title={ar ? "الطرفية" : "Terminal"} body={ar ? "اسحب للأعلى أو للأسفل." : "Drag up or down."} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
};

function cn2(h: string) {
  return `${h} w-full max-w-3xl overflow-hidden rounded-card border border-border bg-card`;
}
