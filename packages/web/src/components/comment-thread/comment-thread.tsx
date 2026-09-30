"use client";

import { Bot, Check, CornerDownRight, LogIn, MessageSquare, Pencil, Trash2, UserRound } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Markdown } from "../markdown";
import { type Mention, type MentionOption, MentionTextarea } from "../mention-textarea";
import { DateTime, Num } from "../numeric";
import { EmptyState } from "../states";
import { ActionsMenu } from "./actions-menu";
import { buildThread, type CommentAuthor, type CommentAuthorKind, type CommentMention, linkMentions, mentionIdFromHref, type ThreadComment } from "./comment-thread-logic";

export {
  buildThread,
  type CommentAuthor,
  type CommentAuthorKind,
  type CommentMention,
  countComments,
  linkMentions,
  mentionIdFromHref,
  type ThreadComment,
  type ThreadNode,
} from "./comment-thread-logic";

const STRINGS = {
  en: {
    title: "Comments",
    empty: "No comments yet",
    emptyHint: "Start the conversation. Use @ to mention someone.",
    write: "Write a comment…",
    writeReply: "Write a reply…",
    send: "Comment",
    reply: "Reply",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Delete this comment?",
    approve: "Approve",
    edited: "edited",
    pending: "Awaiting review",
    pendingHint: "Only you and moderators can see this until it is approved.",
    actions: (name: string) => `Actions for the comment by ${name}`,
    replies: (n: string) => `${n} replies`,
    kinds: { human: "Member", agent: "Agent", client: "Client", bot: "Bot" } satisfies Record<CommentAuthorKind, string>,
    signIn: "Sign in to comment",
    signInHint: "You need an account to join this conversation.",
    signInAction: "Sign in",
    threadLabel: "Comment thread",
  },
  ar: {
    title: "التعليقات",
    empty: "لا توجد تعليقات بعد",
    emptyHint: "ابدأ النقاش. استخدم @ للإشارة إلى شخص.",
    write: "اكتب تعليقًا…",
    writeReply: "اكتب ردًا…",
    send: "تعليق",
    reply: "رد",
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    confirmDelete: "حذف هذا التعليق؟",
    approve: "اعتماد",
    edited: "معدّل",
    pending: "بانتظار المراجعة",
    pendingHint: "لا يراه غيرك والمشرفون إلى أن يُعتمد.",
    actions: (name: string) => `إجراءات تعليق ${name}`,
    replies: (n: string) => `${n} ردود`,
    kinds: { human: "عضو", agent: "وكيل", client: "عميل", bot: "روبوت" } satisfies Record<CommentAuthorKind, string>,
    signIn: "سجّل الدخول للتعليق",
    signInHint: "تحتاج إلى حساب للمشاركة في هذا النقاش.",
    signInAction: "تسجيل الدخول",
    threadLabel: "سلسلة التعليقات",
  },
};

export type CommentThreadLabels = Partial<typeof STRINGS.en>;
type Result = void | { error?: string };
const errorOf = (r: Result) => (r && "error" in r && r.error ? r.error : null);

function useT(labels?: CommentThreadLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

export interface CommentInput {
  body: string;
  mentions: CommentMention[];
  /** Set when replying. */
  parentId?: string;
}

/* ------------------------------------------------------------------ body */

const KIND_VIEW: Record<Exclude<CommentAuthorKind, "human">, { variant: "info" | "accent" | "neutral"; icon: typeof Bot }> = {
  agent: { variant: "accent", icon: Bot },
  client: { variant: "info", icon: UserRound },
  bot: { variant: "neutral", icon: Bot },
};

/** A comment's Markdown with `@name` shown as chips. Wrap the chip with `renderMention` (a hover card, a link). */
export function CommentBody({
  body,
  mentions,
  renderMention,
  className,
}: {
  body: string;
  mentions?: readonly CommentMention[] | undefined;
  renderMention?: ((mention: CommentMention, chip: ReactNode) => ReactNode) | undefined;
  className?: string;
}) {
  const source = useMemo(() => linkMentions(body, mentions), [body, mentions]);
  const byId = useMemo(() => new Map((mentions ?? []).map((m) => [m.id, m])), [mentions]);
  return (
    <Markdown
      className={cn("gap-2 text-body-sm", className)}
      components={{
        a: ({ node: _n, href, children, className: cls, ...props }: ComponentProps<"a"> & { node?: unknown }) => {
          const id = mentionIdFromHref(href);
          const mention = id ? byId.get(id) : undefined;
          if (mention) {
            const chip = (
              <span data-slot="comment-mention" className="rounded-[4px] bg-nq-info-soft px-1 font-medium text-nq-info-text">
                {children}
              </span>
            );
            return <>{renderMention ? renderMention(mention, chip) : chip}</>;
          }
          const external = typeof href === "string" && /^https?:\/\//i.test(href);
          return (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn("text-foreground underline decoration-nq-line-strong underline-offset-4 hover:decoration-current", cls)}
              {...props}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {source}
    </Markdown>
  );
}

/* ------------------------------------------------------------------ composer */

export interface CommentComposerProps {
  suggestions?: MentionOption[];
  /** Post it. Return `{ error }` to keep the text and show the message. */
  onSubmit: (body: string, mentions: Mention[]) => Promise<Result>;
  placeholder?: string;
  submitLabel?: string;
  initialValue?: string;
  /** Shows a Cancel button (replies and edits) and keeps the text after sending. */
  onCancel?: () => void;
  autoFocus?: boolean;
  /** Who is writing, for the avatar. */
  author?: CommentAuthor | undefined;
  labels?: CommentThreadLabels | undefined;
  className?: string;
}

/** The text box and button of a comment: mentions with @, Ctrl or Cmd + Enter to send. */
export function CommentComposer({ suggestions = [], onSubmit, placeholder, submitLabel, initialValue = "", onCancel, autoFocus, author, labels, className }: CommentComposerProps) {
  const { t } = useT(labels);
  const [value, setValue] = useState(initialValue);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = value.trim() === "";
  const send = async () => {
    if (empty || busy) return;
    setBusy(true);
    setError(null);
    const result = await onSubmit(value.trim(), mentions);
    setBusy(false);
    const message = errorOf(result);
    if (message) return setError(message);
    if (!onCancel) {
      setValue("");
      setMentions([]);
    }
  };
  return (
    <form
      data-slot="comment-composer"
      className={cn("flex min-w-0 gap-3", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {author ? <Avatar name={author.name} src={author.avatar} size="md" className="mt-0.5" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <MentionTextarea
          aria-label={placeholder ?? t.write}
          placeholder={placeholder ?? t.write}
          value={value}
          onValueChange={(v, m) => {
            setValue(v);
            setMentions(m);
          }}
          suggestions={suggestions}
          autoFocus={autoFocus}
          rows={2}
          disabled={busy}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
        />
        {error ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
              {t.cancel}
            </Button>
          ) : null}
          <Button type="submit" variant="primary" size="sm" loading={busy} disabled={empty}>
            {submitLabel ?? t.send}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ thread */

export interface CommentThreadProps extends Omit<ComponentProps<"section">, "title" | "onSubmit"> {
  /** Flat list. `parentId` makes a reply. Any order: threads are built oldest first. */
  comments: ThreadComment[];
  /** The signed-in user. Their comments can be edited and deleted. */
  currentUser?: CommentAuthor;
  /** False shows a sign-in prompt instead of the composer. Default true. */
  signedIn?: boolean;
  /** People offered by @ in the composer. */
  suggestions?: MentionOption[];
  /** Post a comment or a reply. Return `{ error }` to keep the text and show the message. */
  onSubmit?: (input: CommentInput) => Promise<Result>;
  /** Save an edit. Omit to hide Edit. */
  onEdit?: (id: string, body: string, mentions: Mention[]) => Promise<Result>;
  /** Delete a comment. Omit to hide Delete. */
  onDelete?: (id: string) => Promise<Result>;
  /** Approve a comment awaiting review. Only shown when `canModerate` is set. */
  onApprove?: (id: string) => Promise<Result>;
  /** Moderators get Approve on pending comments and may edit or delete any comment. */
  canModerate?: boolean;
  onSignIn?: () => void;
  /** Wrap a mention chip, for example in a hover card. */
  renderMention?: (mention: CommentMention, chip: ReactNode) => ReactNode;
  /** Hide the heading with the count. */
  hideHeader?: boolean;
  labels?: CommentThreadLabels;
}

type ItemProps = Pick<CommentThreadProps, "currentUser" | "canModerate" | "onEdit" | "onDelete" | "onApprove" | "suggestions" | "renderMention" | "signedIn" | "onSubmit" | "labels">;

function CommentItem({ comment, reply, shared, t, onReply }: { comment: ThreadComment; reply: boolean; shared: ItemProps; t: ReturnType<typeof useT>["t"]; onReply: () => void }) {
  const { currentUser, canModerate, onEdit, onDelete, onApprove, suggestions = [], renderMention, signedIn = true, onSubmit, labels } = shared;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const own = !!currentUser && currentUser.id === comment.author.id;
  const kind = comment.author.kind && comment.author.kind !== "human" ? KIND_VIEW[comment.author.kind] : null;
  const canReply = signedIn && !!onSubmit && !reply;

  const run = async (fn: () => Promise<Result>) => {
    setError(null);
    const message = errorOf(await fn());
    if (message) setError(message);
    return !message;
  };

  const menu: ContextMenuAction[] = [];
  if (comment.pending && canModerate && onApprove) menu.push({ id: "approve", label: t.approve, icon: Check, group: "review", onSelect: () => void run(() => onApprove(comment.id)) });
  if (onEdit && (own || canModerate)) menu.push({ id: "edit", label: t.edit, icon: Pencil, group: "manage", onSelect: () => setEditing(true) });
  if (onDelete && (own || canModerate)) menu.push({ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => setConfirming(true) });
  const actions: ContextMenuAction[] = canReply ? [{ id: "reply", label: t.reply, icon: CornerDownRight, onSelect: onReply }, ...menu] : menu;

  const article = (
    <article
      data-slot="comment"
      data-pending={comment.pending ? "" : undefined}
      aria-label={comment.author.name}
      className={cn("-m-2 flex min-w-0 gap-3 rounded-card p-2", comment.pending && "bg-nq-warning-soft/40")}
    >
      <Avatar name={comment.author.name} src={comment.author.avatar} size={reply ? "sm" : "md"} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-label text-foreground">{comment.author.name}</span>
          {kind ? (
            <Badge variant={kind.variant}>
              <kind.icon aria-hidden />
              {t.kinds[comment.author.kind as CommentAuthorKind]}
            </Badge>
          ) : null}
          {comment.pending ? <Badge variant="warning">{t.pending}</Badge> : null}
          <DateTime value={comment.createdAt} relative className="text-caption text-muted-foreground" />
          {comment.editedAt ? <span className="text-caption text-muted-foreground">({t.edited})</span> : null}
          <span className="ms-auto">
            <ActionsMenu actions={menu} label={t.actions(comment.author.name)} />
          </span>
        </header>
        {editing ? (
          <CommentComposer
            suggestions={suggestions}
            initialValue={comment.body}
            submitLabel={t.save}
            autoFocus
            onCancel={() => setEditing(false)}
            labels={labels}
            onSubmit={async (body, mentions) => {
              const result = await (onEdit?.(comment.id, body, mentions) ?? Promise.resolve());
              if (!errorOf(result)) setEditing(false);
              return result;
            }}
          />
        ) : (
          <CommentBody body={comment.body} mentions={comment.mentions} renderMention={renderMention} />
        )}
        {comment.pending && !editing ? <p className="text-caption text-muted-foreground">{t.pendingHint}</p> : null}
        {error ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {error}
          </p>
        ) : null}
        {confirming ? (
          <div role="alertdialog" aria-label={t.confirmDelete} className="flex flex-wrap items-center gap-2 text-body-sm">
            <span className="text-foreground">{t.confirmDelete}</span>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                if (await run(() => onDelete?.(comment.id) ?? Promise.resolve())) setConfirming(false);
              }}
            >
              {t.delete}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t.cancel}
            </Button>
          </div>
        ) : null}
        {!editing && canReply ? (
          <div>
            <Button variant="ghost" size="sm" className="-ms-2 text-muted-foreground" onClick={onReply}>
              <CornerDownRight aria-hidden className="rtl:-scale-x-100" />
              {t.reply}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
  return <ContextMenuActions actions={actions} render={article} />;
}

/**
 * A conversation: comments with one level of replies, @mentions shown as chips, author-kind badges (agent, client,
 * bot), a "pending review" state with Approve for moderators, edit and delete on your own comments, and a sign-in
 * prompt when signed out. Every comment action is also on its context menu (context-click, Shift+F10).
 */
export function CommentThread({
  comments,
  currentUser,
  signedIn = true,
  suggestions = [],
  onSubmit,
  onEdit,
  onDelete,
  onApprove,
  canModerate,
  onSignIn,
  renderMention,
  hideHeader,
  labels,
  className,
  ...props
}: CommentThreadProps) {
  const { t, locale } = useT(labels);
  const threads = useMemo(() => buildThread(comments), [comments]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const shared: ItemProps = { currentUser, canModerate, onEdit, onDelete, onApprove, suggestions, renderMention, signedIn, onSubmit, labels };
  const strip = (mentions: Mention[]) => mentions.map(({ id, name }) => ({ id, name }));

  return (
    <section data-slot="comment-thread" aria-label={t.threadLabel} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      {hideHeader ? null : (
        <h3 className="flex items-center gap-2 text-label text-foreground">
          <MessageSquare aria-hidden className="size-4 text-muted-foreground" />
          {t.title}
          <Badge variant="outline">
            <Num value={comments.length} />
          </Badge>
        </h3>
      )}
      {threads.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t.empty} description={t.emptyHint} />
      ) : (
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {threads.map(({ comment, replies }) => (
            <li key={comment.id} className="flex min-w-0 flex-col gap-3">
              <CommentItem comment={comment} reply={false} shared={shared} t={t} onReply={() => setReplyTo(comment.id)} />
              {replies.length > 0 || replyTo === comment.id ? (
                <ol aria-label={t.replies(new Intl.NumberFormat(locale).format(replies.length))} className="m-0 ms-4 flex list-none flex-col gap-3 border-s border-border p-0 ps-4">
                  {replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem comment={r} reply shared={shared} t={t} onReply={() => setReplyTo(comment.id)} />
                    </li>
                  ))}
                  {replyTo === comment.id && onSubmit ? (
                    <li>
                      <CommentComposer
                        autoFocus
                        author={currentUser}
                        suggestions={suggestions}
                        placeholder={t.writeReply}
                        submitLabel={t.reply}
                        labels={labels}
                        onCancel={() => setReplyTo(null)}
                        onSubmit={async (body, mentions) => {
                          const result = await onSubmit({ body, mentions: strip(mentions), parentId: comment.id });
                          if (!errorOf(result)) setReplyTo(null);
                          return result;
                        }}
                      />
                    </li>
                  ) : null}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {onSubmit ? (
        signedIn ? (
          <CommentComposer author={currentUser} suggestions={suggestions} labels={labels} onSubmit={(body, mentions) => onSubmit({ body, mentions: strip(mentions) })} />
        ) : (
          <div data-slot="comment-signin" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border p-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label text-foreground">{t.signIn}</span>
              <span className="text-body-sm text-muted-foreground">{t.signInHint}</span>
            </div>
            <Button variant="primary" onClick={onSignIn}>
              <LogIn aria-hidden className="rtl:-scale-x-100" />
              {t.signInAction}
            </Button>
          </div>
        )
      ) : null}
    </section>
  );
}
