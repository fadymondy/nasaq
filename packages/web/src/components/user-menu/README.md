---
name: user-menu
title: UserMenu
category: navigation
status: stable
summary: Avatar menu at the bottom of the sidebar - identity, your account items, theme and language submenus, and sign out.
exports: [UserMenu, UserMenuProps, UserMenuUser]
related: [profile-card, app-shell, workspace-switcher, switchers, sidebar-layout]
story: components-navigation-user-menu
base-ui: [menu]
keywords: [user, account, profile, avatar, menu, sign out, theme, language, sidebar]
---

# UserMenu

The current user's menu, placed in `SidebarFooter`. The trigger shows avatar, name and email (avatar only
on the collapsed rail). The menu shows the identity, then **your** items (Account, Billing…), then Theme
and Language submenus, then Sign out. Nasaq supplies the frame and preferences; the product supplies the items.

## When to use

- The bottom of an [`AppShell`](../app-shell/README.md) sidebar, or (`variant="avatar"`) the end of the header in a top-navigation app.
- You want theme and language switching next to account actions without a separate settings screen.

## When not to use

- Switching organisations: use [`WorkspaceSwitcher`](../workspace-switcher/README.md).
- A theme or language control on its own (login page, header): use [`ThemeSwitcher` / `LocaleSwitcher`](../switchers/README.md).
- Showing a user inline (comments, tables): use `Avatar`.

## Import

```tsx
import { UserMenu, type UserMenuUser } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DropdownMenuItem, SidebarFooter, UserMenu } from "@fadymondy/nasaq/web";
import { CreditCard, UserRound } from "lucide-react";

export function Footer() {
  return (
    <SidebarFooter>
      <UserMenu user={{ name: "Fady Mondy", email: "hello@example.com" }} onSignOut={() => console.log("sign out")}>
        <DropdownMenuItem>
          <UserRound />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard />
          Billing
        </DropdownMenuItem>
      </UserMenu>
    </SidebarFooter>
  );
}
```

## Anatomy

```
UserMenu
├─ trigger                     data-slot="user-menu"  (data-popup-open)
│  ├─ Avatar                   name, optional image
│  ├─ name + email             hidden on the rail; email wrapped in <bdi dir="ltr">
│  └─ chevrons-up-down         hidden on the rail
└─ menu
   ├─ identity header          avatar, name, email
   ├─ children group           your DropdownMenuItems
   ├─ Theme submenu            ThemeMenuItems (Light / Dark / System)      when preferences
   ├─ Language submenu         LocaleMenuItems, only with 2+ locales       when preferences
   └─ Sign out                 only with onSignOut
```

## API

### `UserMenuUser`

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Display name. Also drives the avatar initials. |
| `email` | `string` | Shown under the name, isolated as LTR. |
| `avatar?` | `string` | Image URL. |

### `UserMenu`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `user` | `UserMenuUser` | required | The signed-in user. |
| `children?` | `ReactNode` | none | Product items (`DropdownMenuItem`s) above the preferences. |
| `preferences?` | `boolean` | `true` | Adds the Theme and Language submenus. Language shows only when the provider has more than one locale. |
| `profile?` | `PersonProfile` | none | Turns the menu header into a profile card (role, presence, local time, team) and the trigger avatar into one with a presence dot. |
| `onViewProfile?` | `(person) => void` | none | Adds View profile to that card. |
| `onSignOut?` | `() => void` | none | Adds a "Sign out" item. Without it there is no sign-out item and no trailing separator. |
| `variant?` | `"sidebar" \| "avatar"` | `"sidebar"` | `"sidebar"`: a full-width row with name and email at the foot of the sidebar. `"avatar"`: only the round avatar, for the header of a top-navigation app; the menu opens below it. |
| `className?` | `string` | none | Classes for the trigger. |
| `labels?` | `{ theme?: string; language?: string; signOut?: string }` | EN/AR built in | Theme ("Theme"/"المظهر"), Language ("Language"/"اللغة"), Sign out ("Sign out"/"تسجيل الخروج"). |

It needs `NasaqProvider` (theme, locale, locales) and reads the rail state from `AppShell`.

## Examples

### Product items including "Customize sidebar"

```tsx
import { DropdownMenuItem, UserMenu } from "@fadymondy/nasaq/web";
import { Bell, Settings, SlidersHorizontal } from "lucide-react";

export const Menu = ({ onCustomize }: { onCustomize: () => void }) => (
  <UserMenu user={{ name: "Fady Mondy", email: "hello@example.com", avatar: "/me.png" }} onSignOut={() => {}}>
    <DropdownMenuItem><Bell />Notifications</DropdownMenuItem>
    <DropdownMenuItem onClick={onCustomize}><SlidersHorizontal />Customize sidebar</DropdownMenuItem>
    <DropdownMenuItem><Settings />Settings</DropdownMenuItem>
  </UserMenu>
);
```

### Arabic labels, no preferences

```tsx
import { UserMenu } from "@fadymondy/nasaq/web";

export const Ar = () => (
  <UserMenu
    user={{ name: "فادي مندي", email: "hello@example.com" }}
    preferences={false}
    onSignOut={() => {}}
    labels={{ signOut: "تسجيل الخروج" }}
  />
);
```

## Accessibility

| Key | Action |
| --- | --- |
| `Enter` / `Space` / `↓` on trigger | Opens the menu. |
| `↑` `↓` / `Home` `End` | Move through items. |
| `→` (LTR) / `←` (RTL) on a submenu row | Opens Theme or Language. `←`/`→` reverse to close. |
| `Enter` / `Space` | Activates the item (radio items for theme and language are single choice). |
| `Esc` | Closes the menu (or submenu) and returns focus. |

- Trigger: menu button; on the rail `aria-label` is the user's name.
- Theme and language options are radio items, so the current choice is exposed to assistive tech.
- **Localise:** `labels` and your own item text.

## RTL & i18n

- The email is wrapped in `<bdi dir="ltr">` so it stays readable in Arabic, while the line stays aligned to the reading start.
- On the rail the menu opens to the inline end and aligns to the end; expanded it opens upward (`top`).
- The language list shows each language in its own script with `lang`/`dir` set.
- Built-in labels switch on the provider locale.

## Styling & tokens

- Same trigger treatment as the workspace switcher: `border-border`, hover `bg-nq-hover`, open `bg-nq-selected`, focus `nq-focus`.
- Target `[data-slot=user-menu]`. Extend the trigger with `className`.

## Do / Don't

- **Do** keep Settings in this menu instead of the sidebar footer. Support, docs and `SidebarStatus` may sit above the trigger.
- **Do** use `variant="avatar"` at the end of `AppHeader` when the app has no sidebar.
- **Do** pass `onSignOut` when the product has sessions; without it the menu simply ends after the preferences.
- **Don't** put navigation to core pages here; those are sidebar items.
- **Don't** hard-code the theme list; use the built-in submenu.

## Related

- [app-shell](../app-shell/README.md) · [workspace-switcher](../workspace-switcher/README.md)
- [switchers](../switchers/README.md) · [sidebar-layout](../sidebar-layout/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-user-menu--docs
