"use client";

import { ChevronsUpDown, Languages, LogOut, Palette } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider/nasaq-provider";
import { useSidebarCollapsed } from "../app-shell";
import { Avatar } from "../avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { type PersonProfile, PresenceAvatar, ProfileCard } from "../profile-card/profile-card";
import { LocaleMenuItems, ThemeMenuItems, useThemeLabels } from "../switchers";

export interface UserMenuUser {
  name: string;
  email: string;
  avatar?: string;
}

export interface UserMenuProps {
  user: UserMenuUser;
  /** Product items (Account, Billing, Notifications…) placed above the preferences. */
  children?: ReactNode;
  /** Adds the Theme and Language submenus. Default true. */
  preferences?: boolean;
  onSignOut?: () => void;
  /** The account card: passing the person swaps the plain name and email header for a profile card (presence, role, status, local time, teams) and puts a presence dot on the avatar. */
  profile?: PersonProfile;
  /** Adds "View profile" to the profile card. */
  onViewProfile?: (person: PersonProfile) => void;
  labels?: { theme?: string; language?: string; signOut?: string };
  /** `sidebar` (default): the name and email card at the bottom of the sidebar. `avatar`: just the avatar, for a top bar; the menu opens below it. */
  variant?: "sidebar" | "avatar";
  className?: string;
}

/** Avatar menu at the bottom of the sidebar (shadcn NavUser): account items, theme, language, sign out. */
export function UserMenu({ user, children, preferences = true, onSignOut, profile, onViewProfile, labels, variant = "sidebar", className }: UserMenuProps) {
  const rail = useSidebarCollapsed();
  const top = variant === "avatar";
  const collapsed = rail || top;
  const { locale, locales } = useNasaq();
  const ar = locale.startsWith("ar");
  const themeLabels = useThemeLabels();
  const t = {
    theme: labels?.theme ?? themeLabels.group,
    language: labels?.language ?? (ar ? "اللغة" : "Language"),
    signOut: labels?.signOut ?? (ar ? "تسجيل الخروج" : "Sign out"),
  };
  const identity = (
    <span className="grid min-w-0 flex-1 text-start">
      {/* leading-snug on each line: the type roles carry their own (taller, Arabic) line height, which a parent leading can't override. */}
      <span className="truncate text-label leading-snug text-foreground">{user.name}</span>
      {/* Isolate the address (LTR) but keep the line aligned to the reading start. */}
      <span className="truncate text-caption leading-snug text-muted-foreground">
        <bdi dir="ltr">{user.email}</bdi>
      </span>
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="user-menu"
        aria-label={collapsed ? user.name : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-control px-1.5 outline-none",
          "transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          // Expanded: a bordered surface so the switcher reads as a control, not a nav row. A minimum
          // height, not a fixed one, so the two lines keep their padding in Arabic's larger type.
          top
            ? "size-control justify-center rounded-full px-0"
            : collapsed
            ? "size-control justify-center px-0"
            : "min-h-[calc(var(--spacing-nav-row)+12px)] border border-border bg-background/60 py-1 shadow-xs hover:border-nq-line-strong",
          className,
        )}
      >
        {profile?.presence ? <PresenceAvatar person={{ ...profile, name: user.name, avatar: user.avatar ?? profile.avatar }} size={collapsed ? "sm" : "md"} /> : <Avatar name={user.name} src={user.avatar} size={collapsed ? "sm" : "md"} />}
        {collapsed ? null : (
          <>
            {identity}
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={top ? "bottom" : collapsed ? "inline-end" : "top"}
        align={collapsed ? "end" : "start"}
        className={cn("w-60", !collapsed && "w-[max(15rem,var(--anchor-width))]")}
      >
        {profile ? (
          <ProfileCard data-slot="user-menu-profile" person={{ ...profile, email: profile.email ?? user.email, avatar: profile.avatar ?? user.avatar }} onViewProfile={onViewProfile} className="p-2" />
        ) : (
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar name={user.name} src={user.avatar} />
            {identity}
          </div>
        )}
        <DropdownMenuSeparator />
        {children ? (
          <>
            <DropdownMenuGroup>{children}</DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {preferences ? (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette />
                {t.theme}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <ThemeMenuItems />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {locales.length > 1 ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages />
                  {t.language}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <LocaleMenuItems />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            {onSignOut ? <DropdownMenuSeparator /> : null}
          </>
        ) : null}
        {onSignOut ? (
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut />
            {t.signOut}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
