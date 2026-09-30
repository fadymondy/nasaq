"use client";

import { Archive, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { Status } from "../status";
import { Switch } from "../switch";
import type { ExtraText } from "./project-strings";

type Result = void | { error?: string } | undefined;
type SettingsText = ExtraText & { cancel: string };

/** A tool the project can be connected to: GitHub, Slack, a calendar. */
export interface ProjectIntegration {
  id: string;
  name: string;
  description?: string;
  connected: boolean;
  icon?: ReactNode;
}

export interface ProjectIntegrationsProps {
  integrations: readonly ProjectIntegration[];
  /** Connect or disconnect. Return `{ error }` to keep the switch where it was. */
  onToggle?: (id: string, connected: boolean) => Promise<Result>;
  t: SettingsText;
}

/** The settings page of connected tools, one switch each. */
export function IntegrationsPage({ integrations, onToggle, t }: ProjectIntegrationsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toggle = async (item: ProjectIntegration, next: boolean) => {
    if (!onToggle) return;
    setBusy(item.id);
    const result = await onToggle(item.id, next);
    setBusy(null);
    setError(result && "error" in result && result.error ? result.error : null);
  };
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {error ? (
        <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {integrations.map((i) => (
          <li key={i.id}>
            <Card>
              <CardContent className="flex min-w-0 items-center justify-between gap-3 pt-4">
                <div className="flex min-w-0 items-center gap-3">
                  {i.icon ? (
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground [&_svg]:size-5">
                      {i.icon}
                    </span>
                  ) : null}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 text-label">
                      {i.name}
                      <Status tone={i.connected ? "success" : "neutral"}>{i.connected ? t.connected : t.notConnected}</Status>
                    </span>
                    {i.description ? <span className="text-body-sm text-muted-foreground">{i.description}</span> : null}
                  </div>
                </div>
                <Switch aria-label={`${i.connected ? t.disconnect : t.connect}: ${i.name}`} checked={i.connected} disabled={!onToggle || busy === i.id} onCheckedChange={(v) => void toggle(i, Boolean(v))} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ProjectDangerProps {
  /** Typed to confirm a delete. */
  projectKey: string;
  archived: boolean;
  onArchive?: () => Promise<Result>;
  onDelete?: () => Promise<Result>;
  t: SettingsText;
}

/** Archive and delete, each behind a confirm. Delete asks for the project key. */
export function DangerPage({ projectKey, archived, onArchive, onDelete, t }: ProjectDangerProps) {
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setConfirm(null);
    setTyped("");
    setError(null);
  };
  const run = async () => {
    const action = confirm === "archive" ? onArchive : onDelete;
    if (!action) return;
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    close();
  };
  const needsKey = confirm === "delete";
  const ready = !needsKey || typed.trim().toLowerCase() === projectKey.toLowerCase();

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {onArchive && !archived ? (
        <Card>
          <CardContent className="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label">{t.archiveTitle}</span>
              <span className="text-body-sm text-muted-foreground">{t.archiveBody}</span>
            </div>
            <Button variant="secondary" onClick={() => setConfirm("archive")}>
              <Archive aria-hidden />
              {t.archiveAction}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {onDelete ? (
        <Card className="border-nq-danger/40">
          <CardContent className="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label">{t.deleteTitle}</span>
              <span className="text-body-sm text-muted-foreground">{t.deleteBody}</span>
            </div>
            <Button variant="danger" onClick={() => setConfirm("delete")}>
              <Trash2 aria-hidden />
              {t.deleteAction}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (ready) void run();
            }}
          >
            <DialogHeader>
              <DialogTitle>{confirm === "delete" ? t.deleteConfirmTitle : t.archiveConfirmTitle}</DialogTitle>
              <DialogDescription>{confirm === "delete" ? t.deleteConfirmBody : t.archiveConfirmBody}</DialogDescription>
            </DialogHeader>
            {needsKey ? (
              <Field>
                <FieldLabel>{t.deleteConfirmField}</FieldLabel>
                <Input ltr autoFocus autoComplete="off" placeholder={projectKey} value={typed} onChange={(e) => setTyped(e.target.value)} />
              </Field>
            ) : null}
            {error ? (
              <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close} disabled={busy}>
                {t.cancel}
              </Button>
              <Button type="submit" variant={needsKey ? "danger" : "primary"} loading={busy} disabled={!ready}>
                {needsKey ? t.deleteAction : t.archiveAction}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
