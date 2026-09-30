"use client";

import { Check, Cloud, FingerprintPattern, KeyRound, type LucideIcon, Pencil, Plus, Smartphone, Trash2, Usb, X } from "lucide-react";
import { type ComponentProps, type FormEvent, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Input } from "../field";
import { DateTime } from "../numeric";
import { EmptyState } from "../states";

const STRINGS = {
  en: {
    title: "Passkeys",
    description: "Sign in with your fingerprint, face or screen lock instead of a password.",
    add: "Add a passkey",
    unsupportedTitle: "Passkeys are not available in this browser",
    unsupported: "Use a recent version of Chrome, Safari, Edge or Firefox, on a device with a screen lock, to add a passkey.",
    emptyTitle: "No passkeys yet",
    emptyBody: "Add one to sign in faster and safer than with a password.",
    list: "Your passkeys",
    added: "Added",
    lastUsed: "Last used",
    neverUsed: "Never used",
    device: "This device",
    synced: "Synced passkey",
    securityKey: "Security key",
    rename: "Rename",
    renameLabel: "Passkey name",
    save: "Save name",
    cancel: "Cancel",
    remove: "Remove",
    removeTitle: (name: string) => `Remove "${name}"?`,
    removeBody: "You will no longer be able to sign in with this passkey. This cannot be undone.",
    removeConfirm: "Remove passkey",
    addFailed: "Could not add the passkey. Try again.",
    addCancelled: "Adding the passkey was cancelled.",
    renameFailed: "Could not rename the passkey. Try again.",
    removeFailed: "Could not remove the passkey. Try again.",
  },
  ar: {
    title: "مفاتيح المرور",
    description: "سجّل الدخول ببصمتك أو وجهك أو قفل الشاشة بدلًا من كلمة المرور.",
    add: "إضافة مفتاح مرور",
    unsupportedTitle: "مفاتيح المرور غير متاحة في هذا المتصفح",
    unsupported: "استخدم إصدارًا حديثًا من Chrome أو Safari أو Edge أو Firefox على جهاز به قفل شاشة لإضافة مفتاح مرور.",
    emptyTitle: "لا توجد مفاتيح مرور بعد",
    emptyBody: "أضف واحدًا لتسجيل دخول أسرع وأكثر أمانًا من كلمة المرور.",
    list: "مفاتيح المرور الخاصة بك",
    added: "أُضيف",
    lastUsed: "آخر استخدام",
    neverUsed: "لم يُستخدم قط",
    device: "هذا الجهاز",
    synced: "مفتاح مرور متزامن",
    securityKey: "مفتاح أمان",
    rename: "إعادة تسمية",
    renameLabel: "اسم مفتاح المرور",
    save: "حفظ الاسم",
    cancel: "إلغاء",
    remove: "إزالة",
    removeTitle: (name: string) => `إزالة «${name}»؟`,
    removeBody: "لن تتمكن بعد ذلك من تسجيل الدخول بهذا المفتاح. لا يمكن التراجع عن ذلك.",
    removeConfirm: "إزالة مفتاح المرور",
    addFailed: "تعذرت إضافة مفتاح المرور. حاول مرة أخرى.",
    addCancelled: "أُلغيت إضافة مفتاح المرور.",
    renameFailed: "تعذرت إعادة تسمية مفتاح المرور. حاول مرة أخرى.",
    removeFailed: "تعذرت إزالة مفتاح المرور. حاول مرة أخرى.",
  },
};

export type PasskeyLabels = (typeof STRINGS)["en"];

/** True when this browser can create and use passkeys (`window.PublicKeyCredential` exists). False on the server. */
export function isPasskeySupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

type DateInput = Date | number | string;

export type PasskeyKind = "device" | "synced" | "security-key";

export interface Passkey {
  id: string;
  /** The name the user sees and can change, such as "MacBook Pro". */
  name: string;
  /** Where it lives: "This device" (`device`), a cloud keychain (`synced`) or a hardware key (`security-key`). Picks the icon. */
  kind?: PasskeyKind;
  /** A hint about the authenticator, such as "iCloud Keychain" or "YubiKey 5C". */
  authenticator?: string;
  createdAt: DateInput;
  lastUsedAt?: DateInput | null;
}

const KIND_ICON: Record<PasskeyKind, LucideIcon> = { device: Smartphone, synced: Cloud, "security-key": Usb };

export interface PasskeyListProps extends Omit<ComponentProps<"div">, "children"> {
  passkeys: readonly Passkey[];
  /** Start the WebAuthn ceremony (`navigator.credentials.create`) and save the result. Reject or throw when it fails. */
  onAdd: () => Promise<void>;
  /** Save a new name. Resolve, or resolve `{ error }` to keep the field open with a message. */
  onRename?: (id: string, name: string) => Promise<void | { error?: string }>;
  /** Delete the passkey. The confirm dialog closes when this resolves. */
  onRemove?: (id: string) => Promise<void | { error?: string }>;
  /** Override the browser check. Default: `isPasskeySupported()`, read after mount. */
  supported?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<PasskeyLabels>;
}

function Row({
  passkey,
  t,
  busy,
  onRename,
  onRemove,
  onError,
}: {
  passkey: Passkey;
  t: PasskeyLabels;
  busy: boolean;
  onRename?: PasskeyListProps["onRename"];
  onRemove?: PasskeyListProps["onRemove"];
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(passkey.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const Icon = KIND_ICON[passkey.kind ?? "device"] ?? KeyRound;
  const kindLabel = passkey.kind === "synced" ? t.synced : passkey.kind === "security-key" ? t.securityKey : t.device;

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (!next || pending) return;
    if (next === passkey.name) return setEditing(false);
    setPending(true);
    setError(null);
    try {
      const result = await onRename?.(passkey.id, next);
      if (result && result.error) setError(result.error);
      else setEditing(false);
    } catch {
      setError(t.renameFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <li data-slot="passkey-row" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
        <Icon aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
        {editing ? (
          <form onSubmit={save} className="flex items-center gap-1.5">
            <Input
              autoFocus
              aria-label={t.renameLabel}
              aria-invalid={error ? true : undefined}
              value={name}
              maxLength={64}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setName(passkey.name);
                  setError(null);
                  setEditing(false);
                }
              }}
              className="h-control-sm"
            />
            <Button type="submit" variant="primary" size="icon-sm" aria-label={t.save} loading={pending} disabled={!name.trim()}>
              <Check aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.cancel}
              disabled={pending}
              onClick={() => {
                setName(passkey.name);
                setError(null);
                setEditing(false);
              }}
            >
              <X aria-hidden />
            </Button>
          </form>
        ) : (
          <p className="truncate text-label text-foreground" title={passkey.name}>
            {passkey.name}
          </p>
        )}
        {error ? (
          <p role="alert" className="text-caption text-nq-danger-text">
            {error}
          </p>
        ) : null}
        <p className="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
          <span>{passkey.authenticator ?? kindLabel}</span>
          <span>
            {t.added} <DateTime value={passkey.createdAt} />
          </span>
          <span>
            {passkey.lastUsedAt ? (
              <>
                {t.lastUsed} <DateTime value={passkey.lastUsedAt} relative />
              </>
            ) : (
              t.neverUsed
            )}
          </span>
        </p>
      </div>
      {editing ? null : (
        <div className="flex items-center gap-1">
          {onRename ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`${t.rename}: ${passkey.name}`} disabled={busy} onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
            </Button>
          ) : null}
          {onRemove ? (
            <ConfirmButton
              variant="ghost"
              size="icon-sm"
              aria-label={`${t.remove}: ${passkey.name}`}
              disabled={busy}
              title={t.removeTitle(passkey.name)}
              description={t.removeBody}
              confirmLabel={t.removeConfirm}
              onConfirm={async () => {
                try {
                  const result = await onRemove(passkey.id);
                  if (result && result.error) onError(result.error);
                } catch {
                  onError(t.removeFailed);
                }
              }}
            >
              <Trash2 aria-hidden />
            </ConfirmButton>
          ) : null}
        </div>
      )}
    </li>
  );
}

/**
 * Manage the passkeys on an account: list, add, rename in place and remove with confirmation. It draws
 * the list only. Your `onAdd` runs the WebAuthn ceremony and saves the credential. Shows a notice when
 * the browser has no passkey support and an empty state when there are none.
 */
export function PasskeyList({ passkeys, onAdd, onRename, onRemove, supported, labels, className, ...props }: PasskeyListProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [detected, setDetected] = useState(true);
  useEffect(() => setDetected(isPasskeySupported()), []);
  const ok = supported ?? detected;
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      await onAdd();
    } catch (e) {
      setError((e as { name?: string } | null)?.name === "NotAllowedError" ? t.addCancelled : t.addFailed);
    } finally {
      setAdding(false);
    }
  }

  const addButton = (
    <Button type="button" variant={passkeys.length ? "secondary" : "primary"} size="sm" loading={adding} disabled={!ok} onClick={add}>
      <Plus aria-hidden />
      {t.add}
    </Button>
  );

  return (
    <Card data-slot="passkey-list" className={cn("w-full max-w-2xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
        {passkeys.length ? <CardAction>{addButton}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!ok ? (
          <Alert tone="warning" title={t.unsupportedTitle}>
            {t.unsupported}
          </Alert>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {passkeys.length ? (
          <ul aria-label={t.list} className="overflow-hidden rounded-card border border-border">
            {passkeys.map((p) => (
              <Row key={p.id} passkey={p} t={t} busy={adding} onRename={onRename} onRemove={onRemove} onError={setError} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={FingerprintPattern} title={t.emptyTitle} description={t.emptyBody} actions={addButton} />
        )}
      </CardContent>
    </Card>
  );
}
