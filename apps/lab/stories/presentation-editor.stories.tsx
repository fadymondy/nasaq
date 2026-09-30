import { DeckPlayer, PresentationEditor, SlideView } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { deck, fakeSave } from "./_editors-demo";
import { useAr } from "./_profile-demo";

const meta = { title: "Components/Editors/Presentation Editor", component: PresentationEditor, parameters: { layout: "padded" } } satisfies Meta<typeof PresentationEditor>;
export default meta;
type Story = StoryObj;

function Demo({ save = false, readOnly = false }: { save?: boolean; readOnly?: boolean }) {
  const ar = useAr();
  return <PresentationEditor defaultValue={deck(ar)} onSave={save ? fakeSave(ar) : undefined} readOnly={readOnly} />;
}

export const Default: Story = { render: () => <Demo /> };
export const WithSave: Story = { render: () => <Demo save /> };
export const ReadOnly: Story = { render: () => <Demo readOnly /> };
export const Empty: Story = { render: () => <PresentationEditor defaultValue={{ title: "", slides: [] }} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo save /> };

function Player({ notes = false }: { notes?: boolean }) {
  const ar = useAr();
  const [open, setOpen] = useState(false);
  const d = deck(ar);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <button type="button" className="h-control rounded-control bg-primary px-4 text-label text-primary-foreground" onClick={() => setOpen(true)}>
        {ar ? "ابدأ العرض" : "Start the presentation"}
      </button>
      <SlideView slide={d.slides[0]!} className="rounded-card border border-border" />
      <DeckPlayer deck={d} open={open} onOpenChange={setOpen} defaultShowNotes={notes} fullscreen={false} />
    </div>
  );
}

/** The player on its own. It asks for full screen by default; the stories turn that off so the lab stays usable. */
export const PlayerOnly: Story = { render: () => <Player /> };
export const PlayerWithNotes: Story = { render: () => <Player notes /> };
export const PlayerArabic: Story = { globals: { locale: "ar" }, render: () => <Player notes /> };
