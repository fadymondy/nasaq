"use client";

import { BookMarked, Gavel, Lightbulb, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "../field";
import { DateTime, Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { filterMemories, memoryTags, parseTags } from "./project-logic";
import type { ExtraText } from "./project-strings";

type MemText = ExtraText & { cancel: string; save: string };

export type MemoryKind = "fact" | "decision";

/** One thing the project remembers: a fact or a decision, with where it came from. */
export interface ProjectMemoryItem {
  id: string;
  kind?: MemoryKind;
  text: string;
  tags?: string[];
  /** Where it came from: a call, a document, a person. */
  source?: string;
  at: Date | string | number;
}

export interface ProjectMemoryInput {
  kind: MemoryKind;
  text: string;
  tags: string[];
  source?: string;
}

type Result = void | { error?: string } | undefined;

export interface ProjectMemoryProps {
  items: readonly ProjectMemoryItem[];
  /** Add (`id` undefined) or edit. Return `{ error }` to keep the dialog open. Omit to make the list read-only. */
  onSave?: (input: ProjectMemoryInput, id?: string) => Promise<Result>;
  /** Forget one, after the confirm. Omit to hide it. */
  onForget?: (id: string) => Promise<Result>;
  t: MemText;
}

function MemoryDialog({ item, onClose, onSave, t }: { item: ProjectMemoryItem | "new"; onClose: () => void; onSave: NonNullable<ProjectMemoryProps["onSave"]>; t: MemText }) {
  const id = useId();
  const existing = item === "new" ? null : item;
  const [text, setText] = useState(existing?.text ?? "");
  const [kind, setKind] = useState<MemoryKind>(existing?.kind ?? "fact");
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [source, setSource] = useState(existing?.source ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) return setError(t.memoryText);
    setBusy(true);
    const result = await onSave({ kind, text: text.trim(), tags: parseTags(tags), source: source.trim() || undefined }, existing?.id);
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{existing ? t.memoryEditTitle : t.memoryAddTitle}</DialogTitle>
          </DialogHeader>
          <Field invalid={error === t.memoryText}>
            <FieldLabel>{t.memoryText}</FieldLabel>
            <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} dir="auto" autoFocus />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span id={`${id}-kind`} className="text-label">
              {t.memoryKind}
            </span>
            <Select items={(["fact", "decision"] as const).map((k) => ({ value: k, label: t.memoryKinds[k] }))} value={kind} onValueChange={(v) => v && setKind(v as MemoryKind)}>
              <SelectTrigger aria-labelledby={`${id}-kind`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["fact", "decision"] as const).map((k) => (
                  <SelectItem key={k} value={k}>
                    {t.memoryKinds[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field>
            <FieldLabel>{t.memoryTags}</FieldLabel>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            <FieldDescription>{t.memoryTagsHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{t.memorySource}</FieldLabel>
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
            <FieldDescription>{t.memorySourceHint}</FieldDescription>
          </Field>
          {error && error !== t.memoryText ? (
            <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              {t.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Remembered facts and decisions for one project: search, tag and kind filters, add, edit and forget with confirm. */
export function ProjectMemory({ items, onSave, onForget, t }: ProjectMemoryProps) {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [kind, setKind] = useState<"all" | MemoryKind>("all");
  const [editing, setEditing] = useState<ProjectMemoryItem | "new" | null>(null);
  const [forgetting, setForgetting] = useState<ProjectMemoryItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTags = useMemo(() => memoryTags(items), [items]);
  const shown = useMemo(() => filterMemories(items, { query, tags, kind }), [items, query, tags, kind]);
  const filtered = query.trim() !== "" || tags.length > 0 || kind !== "all";
  const toggleTag = (tag: string) => setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));
  const clear = () => {
    setQuery("");
    setTags([]);
    setKind("all");
  };

  const forget = async () => {
    if (!forgetting || !onForget) return;
    setBusy(true);
    const result = await onForget(forgetting.id);
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setError(null);
    setForgetting(null);
  };

  return (
    <div data-slot="project-memory" className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 text-h3">{t.memoryTitle}</h2>
          <p className="m-0 text-body-sm text-muted-foreground">
            {t.memoryHint} <span>{t.memoryCount(String(items.length))}</span>
          </p>
        </div>
        {onSave ? (
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            {t.memoryAdd}
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input type="search" aria-label={t.memorySearch} placeholder={t.memorySearch} value={query} onChange={(e) => setQuery(e.target.value)} className="ps-9" />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div role="group" aria-label={t.memoryKindFilter} className="flex flex-wrap gap-1.5">
            {(["all", "fact", "decision"] as const).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? "primary" : "secondary"} aria-pressed={kind === k} onClick={() => setKind(k)}>
                {k === "all" ? t.memoryAllKinds : t.memoryKindsPlural[k]}
              </Button>
            ))}
          </div>
          {allTags.length ? (
            <div role="group" aria-label={t.memoryTagFilter} className="flex flex-wrap gap-1.5">
              {allTags.map(({ tag, count }) => (
                <Button key={tag} size="sm" variant={tags.includes(tag) ? "primary" : "secondary"} aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  <bdi>#{tag}</bdi>
                  <span className="opacity-70">
                    <Num value={count} />
                  </span>
                </Button>
              ))}
            </div>
          ) : null}
          {filtered ? (
            <Button size="sm" variant="ghost" onClick={clear}>
              <X aria-hidden />
              {t.memoryClear}
            </Button>
          ) : null}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={BookMarked} title={filtered ? t.memoryNoMatch : t.memoryEmpty} description={filtered ? t.memoryNoMatchHint : t.memoryEmptyHint} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label={t.memoryTitle}>
          {shown.map((m) => {
            const k = m.kind ?? "fact";
            return (
              <li key={m.id}>
                <Card>
                  <CardContent className="flex min-w-0 flex-col gap-2 pt-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                          {k === "decision" ? <Gavel /> : <Lightbulb />}
                        </span>
                        <p dir="auto" className="m-0 min-w-0 whitespace-pre-wrap break-words text-body">
                          {m.text}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {onSave ? (
                          <Button size="icon-sm" variant="ghost" aria-label={`${t.memoryEdit}: ${m.text.slice(0, 40)}`} onClick={() => setEditing(m)}>
                            <Pencil aria-hidden />
                          </Button>
                        ) : null}
                        {onForget ? (
                          <Button size="icon-sm" variant="ghost" aria-label={`${t.memoryForget}: ${m.text.slice(0, 40)}`} onClick={() => setForgetting(m)}>
                            <Trash2 aria-hidden />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 ps-11 text-caption text-muted-foreground">
                      <Badge variant={k === "decision" ? "info" : "outline"}>{t.memoryKinds[k]}</Badge>
                      {(m.tags ?? []).map((tag) => (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)} className="cursor-pointer rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                          <bdi>#{tag}</bdi>
                        </button>
                      ))}
                      {m.source ? (
                        <span>
                          {t.memoryFrom} <span className="text-foreground">{m.source}</span>
                        </span>
                      ) : null}
                      <DateTime value={m.at} format={{ day: "numeric", month: "short", year: "numeric" }} />
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {editing && onSave ? <MemoryDialog key={editing === "new" ? "new" : editing.id} item={editing} onClose={() => setEditing(null)} onSave={onSave} t={t} /> : null}
      <Dialog open={forgetting !== null} onOpenChange={(o) => !o && setForgetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.memoryForgetTitle}</DialogTitle>
            <DialogDescription>{t.memoryForgetBody}</DialogDescription>
          </DialogHeader>
          {forgetting ? (
            <p dir="auto" className="m-0 rounded-md border border-border bg-secondary px-3 py-2 text-body-sm">
              {forgetting.text}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForgetting(null)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void forget()}>
              {t.memoryForget}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
