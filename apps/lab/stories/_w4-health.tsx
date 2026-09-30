/* Health tracker demos, shared by the component story and the Trackers page story. */
import { CupTracker, FlaggedEntries, FoodCatalogue, FoodItemBuilder, QuickLogStrip } from "@nasaq/web";
import { useState } from "react";
import { catalogue, families, flagged, flaggedAr, quickItems, useAr, wait } from "./_w4-demo";

export function Cups() {
  const [n, setN] = useState(7);
  return (
    <CupTracker
      filled={n}
      total={20}
      unitLabel="250 ml"
      onLog={async () => {
        await wait(350);
        setN((v) => v + 1);
      }}
    />
  );
}

export function Strip() {
  return (
    <QuickLogStrip
      items={quickItems}
      onUnpin={async () => void (await wait(200))}
      onLog={async (item, { override }) => {
        await wait(300);
        if (item.id === "q2") return { flagged: true, message: "Recorded. This is a second caffeine entry before the cut-off." };
        if (item.id === "q6" && !override) return { error: "Citrus is a trigger for you.", canOverride: true };
        return undefined;
      }}
    />
  );
}

export function Catalogue() {
  const [items, setItems] = useState(catalogue);
  return (
    <FoodCatalogue
      items={items}
      families={families}
      onAdd={() => undefined}
      onEdit={() => undefined}
      onPin={async (item, pinned) => {
        await wait(200);
        setItems((all) => all.map((i) => (i.id === item.id ? { ...i, pinned } : i)));
      }}
      onDelete={async (item) => {
        await wait(300);
        setItems((all) => all.filter((i) => i.id !== item.id));
      }}
    />
  );
}

export function Builder() {
  return <FoodItemBuilder families={families} onSave={async () => void (await wait(400))} onCancel={() => undefined} />;
}

export function Flagged() {
  const ar = useAr();
  return (
    <FlaggedEntries
      count={2}
      onLoad={async () => {
        await wait(500);
        return ar ? flaggedAr : flagged;
      }}
    />
  );
}

export function TrackersPage() {
  const ar = useAr();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-foreground">{ar ? "المتتبعات" : "Trackers"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "سجّل ما تتناوله وراجع التصنيفات." : "Log what you take and review the catalogue."}</p>
      </header>
      <Cups />
      <Strip />
      <Flagged />
      <Catalogue />
      <div className="max-w-lg">
        <Builder />
      </div>
    </div>
  );
}
