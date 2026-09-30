"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";

export interface NotificationItemProps extends Omit<ComponentProps<"button">, "title" | "type"> {
  /** Renders an `<a>` instead of a `<button>` (open in a new tab, real navigation). */
  href?: string;
  target?: ComponentProps<"a">["target"];
  rel?: string;
  /** Who acted. Renders an avatar unless `icon` is given. */
  actor?: { name: string; avatar?: string };
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Pre-formatted relative time ("2m", "منذ ساعة"). */
  time?: ReactNode;
  /** Machine-readable value for the `<time>` element (ISO 8601), e.g. "2026-09-29T10:15:00Z". */
  dateTime?: string;
  unread?: boolean;
  /** Screen-reader text for the unread dot. Defaults to "Unread" / "غير مقروء" by locale. */
  unreadLabel?: string;
}

/** One row of the notifications side-over. Unread = accent dot + stronger title, never colour alone. */
export function NotificationItem({
  actor,
  icon,
  title,
  description,
  time,
  dateTime,
  unread = false,
  unreadLabel,
  href,
  target,
  rel,
  className,
  ...props
}: NotificationItemProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const unreadText = unreadLabel ?? (ar ? "غير مقروء" : "Unread");
  const Root = href !== undefined ? "a" : "button";
  const rootProps = (
    href !== undefined ? { href, target, rel: rel ?? (target === "_blank" ? "noopener noreferrer" : undefined) } : { type: "button" }
  ) as Record<string, unknown>;
  return (
    <Root
      {...rootProps}
      data-slot="notification-item"
      data-unread={unread || undefined}
      className={cn(
        "flex w-full items-start no-underline gap-3 px-4 py-3 text-start outline-none",
        "transition-colors duration-150 ease-nq hover:bg-nq-hover",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
        className,
      )}
      {...(props as Record<string, unknown>)}
    >
      <span className="relative mt-0.5 shrink-0">
        {icon ? (
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        ) : actor ? (
          <Avatar name={actor.name} src={actor.avatar} size="md" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-body-sm", unread ? "font-medium text-foreground" : "text-muted-foreground")}>{title}</span>
        {description ? <span className="line-clamp-2 text-caption text-muted-foreground">{description}</span> : null}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        {time ? (
          <time dateTime={dateTime} className="text-caption text-muted-foreground tabular-nums">
            {time}
          </time>
        ) : null}
        {unread ? (
          <span className="size-2 rounded-full bg-nq-accent">
            <span className="sr-only">{unreadText}</span>
          </span>
        ) : null}
      </span>
    </Root>
  );
}
