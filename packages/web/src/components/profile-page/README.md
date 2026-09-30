---
name: profile-page
title: Profile page
category: brand
status: beta
summary: "A public profile page: hero, about, experience timeline, skills, projects with a featured story and category tabs, latest writing, testimonials and a contact call to action, with a personal widgets column."
exports: [ProfilePageLabels, ProfileJob, ProfileProject, ProfileTestimonial, ProfileWeather, ProfileData, ProfileSectionProps, ProfileSection, ProfileHeroProps, ProfileHero, ProfileAboutProps, ProfileAbout, ProfileExperienceProps, ProfileExperience, ProfileSkillsProps, ProfileSkills, ProfileProjectsProps, ProfileProjects, ProfileWritingProps, ProfileWriting, ProfileTestimonialsProps, ProfileTestimonials, ProfileContactProps, ProfileContact, ProfilePageProps, ProfilePage]
related: [personal-widgets, blog-index, timeline, feature-story, avatar]
story: components-brand-profile-page
base-ui: []
keywords: [profile, portfolio, cv, resume, about, experience, projects, personal-site]
---

# Profile page

A public page about a person. Hero (avatar, name, headline, location, availability, contact and CV buttons, social links), about, an experience timeline with an overlap-aware total, grouped skills, projects (a featured story, then a grid with category tabs), latest writing, testimonials and a closing call to action. A side column of personal widgets (local clock, weather, numbers, now) sits beside the content on wide containers and above it on narrow ones. Sections without data are left out.

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

## Anatomy

```
ProfilePage           data-slot="profile-page"
├─ ProfileHero        Avatar, availability, name, headline, buttons, SocialLinks
├─ main column        ProfileAbout, ProfileExperience, ProfileSkills, ProfileProjects, ProfileWriting, ProfileTestimonials
├─ aside              LocalClock, WeatherWidget, StatsWidget, NowWidget
└─ ProfileContact
```

## API

### `ProfilePage`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `profile` | `ProfileData` | required | All content. |
| `onContact?` | `() => void` | mailto | Contact button handler. Without it the button opens `mailto:` to `profile.email`. |
| `postHref?` / `blogHref?` | function / string | none | Links for the writing section. |
| `now?` | `Date \| number` | real time | Freeze the clock and tenure. |
| `widgets?` | `boolean` | `true` | Show the widgets column. |
| `labels?` | `Partial<ProfilePageLabels>` | locale | Override strings. |

`ProfileData` fields: `name`, `headline`, `avatar`, `location`, `timeZone`, `workingHours`, `availability` (`open`, `limited`, `closed`), `availabilityNote`, `about` (Markdown), `email`, `links`, `experience` (`ProfileJob[]`), `skills`, `projects` (`ProfileProject[]`), `posts`, `testimonials`, `stats`, `now`, `nowUpdated`, `weather`, `cvHref`.

### Sections

`ProfileSection`, `ProfileHero`, `ProfileAbout`, `ProfileExperience`, `ProfileSkills`, `ProfileProjects`, `ProfileWriting`, `ProfileTestimonials` and `ProfileContact` are exported so you can compose your own order. Each takes its data, optional `labels` and section props.

### Model helpers

Exported from `personal-widgets`: `tenureBetween`, `totalExperience` (merges overlapping roles), `groupSkills`, `distinct`, `isWorkingNow`, `offsetHours`, `partsIn`, `isKnownTimeZone`.

## Accessibility

Each section is a `<section>` labelled by its heading; there is one h1. Project tabs follow the tabs pattern. The project cards use one link each. Availability is text, the dot is decoration.

## RTL & i18n

English and Arabic strings, overridable. Names and companies are wrapped in `<bdi>` so mixed-script text does not reorder. Latin digits.

## Styling

Container queries, tokens only. Avatar size is a class on `Avatar`.

## Do / Don't

- Do give `timeZone` if you want the clock; leave it out to hide it.
- Do keep the headline to one sentence.
- Don't put more than about five links in the hero.
- The page does not generate a PDF. The CV button links to a file you provide with `cvHref`.

## Related

[`PersonalWidgets`](../personal-widgets/README.md), [`BlogIndex`](../blog-index/README.md), [`Timeline`](../timeline/README.md), [`FeatureStory`](../feature-story/README.md).

## Lab

Story `Components/Brand/Profile Page` and page story `Pages/Public/Profile`.
