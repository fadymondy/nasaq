---
name: profile-page
title: Profile page
category: website
status: beta
summary: "A two-column profile page: an identity column (avatar, name, handle, links, one action, bio, widgets) beside about, experience, skills, projects, writing and testimonials. The owner also sees their apps and account details."
exports: [ProfilePageLabels, ProfileJob, ProfileProject, ProfileTestimonial, ProfileWeather, ProfileData, ProfileSectionProps, ProfileSection, ProfileHeroProps, ProfileHero, ProfileSidebarProps, ProfileSidebar, ProfileApp, ProfileAccountDetail, ProfileAppsProps, ProfileApps, ProfileAccountProps, ProfileAccount, ProfileAboutProps, ProfileAbout, ProfileExperienceProps, ProfileExperience, ProfileSkillsProps, ProfileSkills, ProfileProjectsProps, ProfileProjects, ProfileWritingProps, ProfileWriting, ProfileTestimonialsProps, ProfileTestimonials, ProfileContactProps, ProfileContact, ProfilePageProps, ProfilePage]
related: [personal-widgets, profile-form, product-switcher, blog-index, timeline, feature-story, avatar]
story: components-website-profile-page
base-ui: []
keywords: [profile, portfolio, cv, resume, about, experience, projects, personal-site]
---

# Profile page

A page about a person, in two columns. The identity column holds the avatar, name, `@handle`, headline, location, availability and links, one full-width action, the bio and the join date, with personal widgets below it (local clock, weather, numbers, now). The content column holds your own sections first, then about, experience (with an overlap-aware total), grouped skills, projects (a featured story, then a grid with category tabs), latest writing and testimonials. Sections that list things show a count. Sections without data are left out.

The columns sit side by side from 64rem of container width. On narrower containers the identity comes first and the widgets last.

**Owner view.** Pass `onEdit` or `editHref` when the member is looking at their own page. "Edit profile" replaces the contact button, the closing call to action is left out, and two private sections appear: **Apps** (the products they use, with the official mark, plan, role, organisation and last use) and **Account** (email, language, time zone, member since, whatever details you pass). A member with no apps sees an empty state with one "Browse apps" action, never an empty grid.

## When to use

- A portfolio, a personal site or a team-member page.

## When not to use

- An in-app user card: use `ProfileCard`.
- A company landing page: use the marketing blocks.

## Import

```tsx
import { ProfilePage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ProfilePage profile={profile} blogHref="/blog" postHref={(p) => `/blog/${p.slug}`} onContact={openForm} />
```

The owner's view of the same page:

```tsx
<ProfilePage
  profile={profile}
  editHref="/settings/profile"
  apps={[{ id: "mahaam", name: "Mahaam", icon: mahaamMark, href: "https://mahaam.app", plan: "Pro", role: "Owner", org: "3x1", lastUsed: "2026-09-28" }]}
  appsHref="/apps"
  account={[
    { label: "Email", value: "laylah@example.com" },
    { label: "Member since", value: "March 2024" },
  ]}
/>
```

## Anatomy

```
ProfilePage           data-slot="profile-page"
├─ ProfileSidebar     Avatar, name, @handle, headline, details, one action, SocialLinks, bio, joined
├─ content column     children, ProfileApps*, ProfileAccount*, ProfileAbout, ProfileExperience,
│                     ProfileSkills, ProfileProjects, ProfileWriting, ProfileTestimonials
├─ aside              LocalClock, WeatherWidget, StatsWidget, NowWidget (under the sidebar)
└─ ProfileContact     visitors only
                      * owner only
```

## API

### `ProfilePage`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `profile` | `ProfileData` | required | All content. |
| `onContact?` | `() => void` | mailto | Contact button handler. Without it the button opens `mailto:` to `profile.email`. |
| `onEdit?` / `editHref?` | `() => void` / `string` | none | Either one turns on the owner view: "Edit profile" replaces contact, apps and account show, the closing call to action is left out. |
| `apps?` | `ProfileApp[]` | none | Owner only. The products they use. An empty array shows the empty state. |
| `appsHref?` | `string` | none | Owner only. Where "Browse apps" goes. |
| `account?` | `ProfileAccountDetail[]` | none | Owner only. `{ label, value }` rows for the account section. |
| `children?` | `ReactNode` | none | Your own sections, shown first in the content column. Use `ProfileSection`. |
| `postHref?` / `blogHref?` | function / string | none | Links for the writing section. |
| `now?` | `Date \| number` | real time | Freeze the clock and tenure. |
| `widgets?` | `boolean` | `true` | Show the widgets column. |
| `labels?` | `Partial<ProfilePageLabels>` | locale | Override strings. |

`ProfileData` fields: `name`, `handle`, `headline`, `bio`, `joined` (ISO date), `avatar`, `location`, `timeZone`, `workingHours`, `availability` (`open`, `limited`, `closed`), `availabilityNote`, `about` (Markdown), `email`, `links`, `experience` (`ProfileJob[]`), `skills`, `projects` (`ProfileProject[]`), `posts`, `testimonials`, `stats`, `now`, `nowUpdated`, `weather`, `cvHref`.

### Sections

`ProfileSection` takes `title`, `description`, `action` and `count` (shown as a badge beside the title). `ProfileApp` is a `Product` (from product switcher) plus `role`, `org`, `plan` and `lastUsed`. `ProfileAccountDetail` is `{ label, value }`.

`ProfileSidebar` (the identity column; takes `profile`, `onContact`, `onEdit`, `editHref`, `action` to replace the button, and children below the bio), `ProfileApps` (`apps`, `browseHref`), `ProfileAccount` (`details`, `description`), `ProfileHero` (the older single-column header), `ProfileSection`, `ProfileAbout`, `ProfileExperience`, `ProfileSkills`, `ProfileProjects`, `ProfileWriting`, `ProfileTestimonials` and `ProfileContact` are exported so you can compose your own order. Each takes its data, optional `labels` and section props.

### Model helpers

Exported from `personal-widgets`: `tenureBetween`, `totalExperience` (merges overlapping roles), `groupSkills`, `distinct`, `isWorkingNow`, `offsetHours`, `partsIn`, `isKnownTimeZone`.

## Accessibility

Each section is a `<section>` labelled by its heading; there is one h1, the name in the sidebar. Counts are part of the heading text for screen readers. Each app card is one link. Project tabs follow the tabs pattern. The project cards use one link each. Availability is text, the dot is decoration.

## RTL & i18n

English and Arabic strings, overridable. Names and companies are wrapped in `<bdi>` so mixed-script text does not reorder. Latin digits.

## Styling

Container queries, tokens only. Avatar size is a class on `Avatar`.

## Do / Don't

- Do give `timeZone` if you want the clock; leave it out to hide it.
- Do keep the headline to one sentence.
- Do show app marks as they are: `ProductIcon` renders the official mark, never a generic icon or a recoloured one.
- Don't show apps or account details to visitors. They only render in the owner view.
- Don't put more than about five links in the hero.
- The page does not generate a PDF. The CV button links to a file you provide with `cvHref`.

## Related

[`PersonalWidgets`](../personal-widgets/README.md), [`BlogIndex`](../blog-index/README.md), [`Timeline`](../timeline/README.md), [`FeatureStory`](../feature-story/README.md).

## Lab

Story `Components/Website/Profile Page` (Default, Owner View, Owner View Arabic, Owner View New) and page story `Pages/Public/Profile`.
