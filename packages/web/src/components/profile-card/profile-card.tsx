"use client";

import { AtSign, MessageSquare, UserRound, Users } from "lucide-react";
import { cloneElement, type ComponentProps, isValidElement, type ReactElement, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";
import { type MentionKind, type MentionRange, splitMentions } from "../mention-textarea/mention-model";
import { describeOffset, isNightIn, isTimeZone, localTimeLabel, offsetFrom, type Presence } from "./profile-model";

const STRINGS = {
  en: {
    online: "Online",
    away: "Away",
    busy: "Busy",
    offline: "Offline",
    localTime: "Local time",
    sameTime: "Same time as you",
    ahead: "{time} ahead of you",
    behind: "{time} behind you",
    night: "It is night there",
    team: "Team",
    teams: "Teams",
    email: "Email",
    message: "Message",
    mention: "Mention",
    viewProfile: "View profile",
    hours: "{n}h",
    hoursMinutes: "{h}h {m}m",
    minutes: "{m}m",
    profileOf: "Profile of {name}",
  },
  ar: {
    online: "متصل",
    away: "بعيد",
    busy: "مشغول",
    offline: "غير متصل",
    localTime: "الوقت المحلي",
    sameTime: "نفس توقيتك",
    ahead: "يسبقك بـ {time}",
    behind: "يتأخر عنك بـ {time}",
    night: "الوقت ليلًا عنده",
    team: "الفريق",
    teams: "الفرق",
    email: "البريد الإلكتروني",
    message: "مراسلة",
    mention: "إشارة",
    viewProfile: "عرض الملف",
    hours: "{n} س",
    hoursMinutes: "{h} س {m} د",
    minutes: "{m} د",
    profileOf: "ملف {name}",
  },
};

export type ProfileCardLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** A person as the cards show them. Everything but `id` and `name` is optional. */
export interface PersonProfile {
  id: string;
  name: string;
  /** Without the `@`. Shown under the name. */
  handle?: string;
  email?: string;
  avatar?: string;
  /** Job title or workspace role. */
  role?: string;
  presence?: Presence;
  /** A custom status, such as "In a meeting until 3". */
  statusText?: string;
  /** IANA time zone (`Asia/Riyadh`). Enables the local time line. */
  timeZone?: string;
  /** Teams the person is in. */
  teams?: readonly string[];
  location?: string;
}

const dotClass: Record<Presence, string> = {
  online: "bg-nq-success",
  away: "bg-nq-warning",
  busy: "bg-nq-danger",
  offline: "bg-popover ring-1 ring-inset ring-muted-foreground",
};

export interface PresenceDotProps extends Omit<ComponentProps<"span">, "children"> {
  presence: Presence;
  /** Hides the state from assistive tech when it is already written next to the dot. */
  decorative?: boolean;
  labels?: Partial<ProfileCardLabels>;
}

/** A small status dot. Not colour alone: offline is a hollow ring, and the state is spoken. */
export function PresenceDot({ presence, decorative = false, labels, className, ...props }: PresenceDotProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  return (
    <span
      data-slot="presence-dot"
      data-presence={presence}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : t[presence]}
      aria-hidden={decorative || undefined}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", dotClass[presence], className)}
      {...props}
    />
  );
}

/** An avatar with its presence dot at the corner. */
export function PresenceAvatar({ person, size = "md" }: { person: Pick<PersonProfile, "name" | "avatar" | "presence">; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <span data-slot="presence-avatar" className="relative inline-flex shrink-0">
      <Avatar name={person.name} src={person.avatar} size={size} />
      {person.presence ? <PresenceDot presence={person.presence} className="absolute -end-0.5 -bottom-0.5 border-2 border-popover" /> : null}
    </span>
  );
}

export interface ProfileCardProps extends Omit<ComponentProps<"div">, "children"> {
  person: PersonProfile;
  /** Your own time zone, to say how far apart you are. Default: the browser's. */
  viewerTimeZone?: string;
  /** Freeze the moment the local time is read at (docs, tests). Default: now. */
  now?: Date | number;
  /** Adds Message. */
  onMessage?: (person: PersonProfile) => void;
  /** Adds Mention: put `@name` in the box you are writing in. */
  onMention?: (person: PersonProfile) => void;
  /** Adds View profile. */
  onViewProfile?: (person: PersonProfile) => void;
  /** More content under the details, such as a shared-projects list. */
  children?: ReactNode;
  labels?: Partial<ProfileCardLabels>;
}

function offsetText(t: ProfileCardLabels, minutes: number) {
  const o = describeOffset(minutes);
  if (o.direction === "same") return t.sameTime;
  const time = o.minutes === 0 ? fill(t.hours, { n: o.hours }) : o.hours === 0 ? fill(t.minutes, { m: o.minutes }) : fill(t.hoursMinutes, { h: o.hours, m: o.minutes });
  return fill(o.direction === "ahead" ? t.ahead : t.behind, { time });
}

/**
 * The account card: avatar with presence, name, role, custom status, local time (and how far it is from
 * yours), teams and quick actions. It is the body of `ProfileHoverCard` and also stands alone in the user
 * menu, member lists and profile pages.
 */
export function ProfileCard({ person, viewerTimeZone, now, onMessage, onMention, onViewProfile, children, labels, className, ...props }: ProfileCardProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const [tick, setTick] = useState<number | null>(now === undefined ? null : new Date(now).getTime());
  useEffect(() => {
    if (now !== undefined) {
      setTick(new Date(now).getTime());
      return;
    }
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [now]);

  const zone = person.timeZone && isTimeZone(person.timeZone) ? person.timeZone : undefined;
  const yours = viewerTimeZone && isTimeZone(viewerTimeZone) ? viewerTimeZone : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = zone && tick !== null ? localTimeLabel(zone, tick, locale) : "";
  const diff = zone && tick !== null ? offsetFrom(zone, yours, tick) : null;
  const night = zone && tick !== null ? isNightIn(zone, tick) : false;
  const teams = person.teams ?? [];
  const actions = Boolean(onMessage || onMention || onViewProfile);

  return (
    <div data-slot="profile-card" data-presence={person.presence} className={cn("flex min-w-0 flex-col gap-3 text-start", className)} {...props}>
      <div className="flex items-start gap-3">
        <PresenceAvatar person={person} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-label text-foreground">{person.name}</p>
          {person.handle ? (
            <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
              @{person.handle}
            </bdi>
          ) : null}
          {person.role ? <p className="truncate text-caption text-muted-foreground">{person.role}</p> : null}
        </div>
      </div>

      <dl className="m-0 flex flex-col gap-1.5 text-caption text-muted-foreground">
        {person.presence ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">{t[person.presence]}</dt>
            <dd className="m-0 flex min-w-0 items-center gap-2">
              <PresenceDot presence={person.presence} decorative />
              <span className="truncate text-foreground">{person.statusText ?? t[person.presence]}</span>
            </dd>
          </div>
        ) : null}
        {zone && time && diff !== null ? (
          <div className="flex items-baseline gap-2">
            <dt className="sr-only">{t.localTime}</dt>
            <dd className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span dir="ltr" className="text-foreground tabular-nums">
                {time}
              </span>
              <span>{night ? `${offsetText(t, diff)} · ${t.night}` : offsetText(t, diff)}</span>
            </dd>
          </div>
        ) : null}
        {teams.length ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">{teams.length > 1 ? t.teams : t.team}</dt>
            <dd className="m-0 flex min-w-0 items-center gap-2">
              <Users aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{teams.join(" · ")}</span>
            </dd>
          </div>
        ) : null}
        {person.email ? (
          <div>
            <dt className="sr-only">{t.email}</dt>
            <dd className="m-0 truncate">
              <bdi dir="ltr">{person.email}</bdi>
            </dd>
          </div>
        ) : null}
      </dl>

      {children}

      {actions ? (
        <div data-slot="profile-card-actions" className="flex flex-wrap gap-2">
          {onMessage ? (
            <Button size="sm" variant="primary" onClick={() => onMessage(person)}>
              <MessageSquare aria-hidden="true" />
              {t.message}
            </Button>
          ) : null}
          {onMention ? (
            <Button size="sm" onClick={() => onMention(person)}>
              <AtSign aria-hidden="true" />
              {t.mention}
            </Button>
          ) : null}
          {onViewProfile ? (
            <Button size="sm" variant="ghost" onClick={() => onViewProfile(person)}>
              <UserRound aria-hidden="true" />
              {t.viewProfile}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- hover card */

export interface ProfileHoverCardProps extends Omit<ProfileCardProps, "children" | "className"> {
  /** The trigger: an avatar, a name or a mention chip. An element becomes the trigger itself (a link stays a link); text is wrapped in a button. */
  children: ReactNode;
  /** Ms before it opens on hover. Default 300. */
  delay?: number;
  closeDelay?: number;
  side?: ComponentProps<typeof HoverCardContent>["side"];
  align?: ComponentProps<typeof HoverCardContent>["align"];
  /** Class of the card. */
  className?: string;
}

/**
 * Wraps any avatar, name or @mention so a profile card opens from it: on hover, on keyboard focus, and on
 * tap for touch (where there is no hover). Escape closes it. Message, Mention and View profile are inside.
 */
export function ProfileHoverCard({ children, delay = 300, closeDelay = 150, side = "bottom", align = "start", className, ...card }: ProfileHoverCardProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...card.labels };
  const [open, setOpen] = useState(false);
  const touched = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  // A tap opened it, so a tap outside closes it (hover cards have no outside press of their own).
  useEffect(() => {
    if (!open || !touched.current) return;
    const close = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-slot="hover-card-content"]') || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    touched.current = e.pointerType === "touch" || e.pointerType === "pen";
  };
  const onClick = (e: React.MouseEvent) => {
    if (!touched.current) return;
    e.preventDefault();
    setOpen((o) => !o);
  };

  const trigger = isValidElement(children) ? (
    cloneElement(children as ReactElement<Record<string, unknown>>, { ref: triggerRef, onPointerDown, onClick, "aria-haspopup": "dialog" })
  ) : (
    <button
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      type="button"
      onPointerDown={onPointerDown}
      onClick={onClick}
      className="rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
    >
      {children}
    </button>
  );

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger delay={delay} closeDelay={closeDelay} render={trigger} />
      <HoverCardContent side={side} align={align} className={cn("w-80", className)} role="dialog" aria-label={fill(t.profileOf, { name: card.person.name })}>
        <ProfileCard {...card} />
      </HoverCardContent>
    </HoverCard>
  );
}

/* ------------------------------------------------------------ mention chip */

export interface MentionChipProps extends Omit<ComponentProps<"span">, "children"> {
  /** The name after the `@`. */
  name: string;
  /** Teams and groups get an icon and no profile card. Default `person`. */
  kind?: MentionKind;
  /** Passing the person opens their profile card from the chip. */
  person?: PersonProfile;
  onMessage?: ProfileCardProps["onMessage"];
  onMention?: ProfileCardProps["onMention"];
  onViewProfile?: ProfileCardProps["onViewProfile"];
  viewerTimeZone?: string;
  now?: Date | number;
  labels?: Partial<ProfileCardLabels>;
}

const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-control bg-nq-selected px-1.5 py-px align-baseline text-body-sm font-medium text-foreground outline-none [&_svg]:size-3.5 [&_svg]:shrink-0";

/** An inline `@name` in a comment or message. With `person` it opens their profile card on hover, focus and tap. */
export function MentionChip({ name, kind = "person", person, onMessage, onMention, onViewProfile, viewerTimeZone, now, labels, className, ...props }: MentionChipProps) {
  const label = (
    <>
      {kind === "person" ? null : <Users aria-hidden="true" />}
      <span className="truncate">@{name}</span>
    </>
  );
  if (!person || kind !== "person") {
    return (
      <span data-slot="mention-chip" data-kind={kind} className={cn(chipClass, className)} {...props}>
        {label}
      </span>
    );
  }
  return (
    <ProfileHoverCard person={person} onMessage={onMessage} onMention={onMention} onViewProfile={onViewProfile} viewerTimeZone={viewerTimeZone} now={now} labels={labels}>
      <span
        data-slot="mention-chip"
        data-kind={kind}
        tabIndex={0}
        role="button"
        className={cn(chipClass, "cursor-pointer hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus", className)}
        {...props}
      >
        {label}
      </span>
    </ProfileHoverCard>
  );
}

export interface MentionTextProps extends Omit<ComponentProps<"p">, "children"> {
  /** The text a `MentionTextarea` produced. */
  text: string;
  /** Its `mentions` array. */
  mentions: readonly MentionRange[];
  /** Finds the person behind a mention id, to give the chip a profile card. Teams and groups return their kind. */
  resolve?: (id: string) => { person?: PersonProfile; kind?: MentionKind } | undefined;
  onMessage?: ProfileCardProps["onMessage"];
  onMention?: ProfileCardProps["onMention"];
  onViewProfile?: ProfileCardProps["onViewProfile"];
  viewerTimeZone?: string;
  now?: Date | number;
}

/** Shows saved text with its mentions as chips. */
export function MentionText({ text, mentions, resolve, onMessage, onMention, onViewProfile, viewerTimeZone, now, className, ...props }: MentionTextProps) {
  const segments = useMemo(() => splitMentions(text, mentions), [text, mentions]);
  return (
    <p data-slot="mention-text" className={cn("whitespace-pre-wrap text-body text-foreground", className)} {...props}>
      {segments.map((s, i) => {
        if (s.type === "text") return <span key={i}>{s.text}</span>;
        const found = resolve?.(s.mention.id);
        return (
          <MentionChip key={i} name={s.mention.name} kind={found?.kind} person={found?.person} onMessage={onMessage} onMention={onMention} onViewProfile={onViewProfile} viewerTimeZone={viewerTimeZone} now={now} />
        );
      })}
    </p>
  );
}
