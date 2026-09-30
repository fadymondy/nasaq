"use client";

import { Ellipsis, type LucideIcon } from "lucide-react";
import { type ComponentProps, Fragment, isValidElement, type ReactElement, useMemo, useRef } from "react";
import { cn } from "../../lib/cn";
import { useShortcutKeys } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button, buttonVariants } from "../button";
import { type Command, useRegisterCommands } from "../commands";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Kbd } from "../text";
import { Tooltip } from "../tooltip";

export interface PageAction {
  /** Unique across the command registry. Prefix with your product: "mahaam.issue.archive". */
  id: string;
  label: string;
  icon?: LucideIcon | ReactElement;
  onSelect?: () => void;
  /** Navigates instead of running `onSelect`. */
  href?: string;
  /** Bound globally and shown in the menu, tooltip and palette: "C", "Mod Shift D", "G S". */
  shortcut?: string;
  /** Extra palette search words: synonyms, the other language's name. */
  keywords?: string[];
  disabled?: boolean;
  /** Destructive. Red in the menu, and only listed in the palette once the user types. */
  danger?: boolean;
  /** Menu group. A separator is drawn between groups, in first-seen order. */
  group?: string;
}

export interface PageActionsProps extends ComponentProps<"div"> {
  /** The one action that stays visible, at the inline end. Label hides below `sm`. */
  primary?: PageAction;
  /** Everything else: behind a "More actions" (⋯) menu. The menu is omitted when empty. */
  actions?: PageAction[];
  /** Register all actions in the command palette under "This page". Default true. */
  commands?: boolean;
  /** Accessible name of the ⋯ trigger. Default "More actions" / "إجراءات أخرى". */
  moreLabel?: string;
}

function run(action: PageAction | undefined) {
  if (!action || action.disabled) return;
  if (action.href) window.location.assign(action.href);
  else action.onSelect?.();
}

function ActionIcon({ icon }: { icon: PageAction["icon"] }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Glyph = icon as LucideIcon;
  return <Glyph aria-hidden />;
}

function ShortcutHint({ shortcut, className }: { shortcut?: string; className?: string }) {
  const keys = useShortcutKeys(shortcut);
  if (!keys.length) return null;
  return (
    <span dir="ltr" className={cn("flex gap-1", className)}>
      {keys.map((k, i) => (
        <Kbd key={`${k}${i}`}>{k}</Kbd>
      ))}
    </span>
  );
}

/**
 * The header's action area: at most one visible primary action, the rest behind ⋯, and all of them in
 * the command palette ("This page") with their shortcuts bound. Keeps the top bar calm without hiding
 * anything from keyboard users. Place other always-visible controls (notifications) as children.
 */
export function PageActions({ primary, actions = [], commands = true, moreLabel, className, children, ...props }: PageActionsProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const all = primary ? [primary, ...actions] : actions;

  // Hosts usually pass fresh arrays and callbacks; register again only when what the palette shows changes.
  const latest = useRef(all);
  latest.current = all;
  const signature = all.map((a) => [a.id, a.label, a.shortcut, a.disabled, a.danger, a.keywords?.join(",")].join("|")).join("\n");
  const registered = useMemo<Command[] | null>(
    () =>
      commands
        ? latest.current.map((a) => ({
            id: a.id,
            label: a.label,
            section: "context",
            icon: a.icon,
            shortcut: a.shortcut,
            keywords: a.keywords,
            disabled: a.disabled,
            searchOnly: a.danger,
            priority: a === primary ? 1 : 0,
            perform: () => run(latest.current.find((x) => x.id === a.id)),
          }))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` stands for `all`
    [signature, commands],
  );
  useRegisterCommands(registered);

  const groups = new Map<string, PageAction[]>();
  for (const a of actions) groups.set(a.group ?? "", [...(groups.get(a.group ?? "") ?? []), a]);
  const more = moreLabel ?? (ar ? "إجراءات أخرى" : "More actions");

  return (
    <div data-slot="page-actions" className={cn("flex items-center gap-1.5", className)} {...props}>
      {children}
      {actions.length ? (
        <DropdownMenu>
          <Tooltip content={more}>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={more} className="text-muted-foreground" />}>
              <Ellipsis aria-hidden />
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="end" className="min-w-52">
            {[...groups.values()].map((items, i) => (
              <Fragment key={i}>
                {i > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuGroup>
                  {items.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      variant={a.danger ? "danger" : "default"}
                      disabled={a.disabled}
                      render={a.href ? <a href={a.href} /> : undefined}
                      onClick={a.href ? undefined : a.onSelect}
                      shortcut={a.shortcut ? <ShortcutHint shortcut={a.shortcut} className="[&_kbd]:h-4.5 [&_kbd]:min-w-4.5" /> : undefined}
                    >
                      <ActionIcon icon={a.icon} />
                      <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {primary ? <PrimaryAction action={primary} /> : null}
    </div>
  );
}

function PrimaryAction({ action }: { action: PageAction }) {
  const keys = useShortcutKeys(action.shortcut);
  const content = (
    <>
      <ActionIcon icon={action.icon} />
      <span className={cn(action.icon && "hidden sm:inline")}>{action.label}</span>
    </>
  );
  const shared = {
    "aria-label": action.icon ? action.label : undefined,
    "aria-keyshortcuts": action.shortcut ? keys.join("+") : undefined,
  };
  const button = action.href ? (
    <a href={action.href} className={buttonVariants({ variant: action.danger ? "danger" : "primary", size: "sm" })} {...shared}>
      {content}
    </a>
  ) : (
    <Button variant={action.danger ? "danger" : "primary"} size="sm" disabled={action.disabled} onClick={action.onSelect} {...shared}>
      {content}
    </Button>
  );
  if (!action.shortcut) return button;
  return (
    <Tooltip
      content={
        <span className="flex items-center gap-2">
          {action.label}
          <ShortcutHint shortcut={action.shortcut} />
        </span>
      }
    >
      {button}
    </Tooltip>
  );
}
