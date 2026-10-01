"use client";

import { ArrowRight, Blocks, Briefcase, CalendarDays, Download, ExternalLink, Globe, Lock, Mail, MapPin, Quote, Store } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { hueFor, PostCard, PostCover } from "../blog-index/blog-index";
import type { BlogPostSummary } from "../blog-index/blog-model";
import { Button } from "../button";
import { Card } from "../card";
import { FeatureStory } from "../feature-story";
import { Icon } from "../icon";
import { Markdown } from "../markdown";
import { formatDate, formatDateRange, formatNumber } from "../numeric";
import { GitHubLogo } from "../oauth-buttons";
import { type Product, ProductIcon } from "../product-switcher";
import {
  AvailabilityBadge,
  LocalClock,
  type NowItem,
  NowWidget,
  type ProfileStat,
  type Skill,
  SkillsWidget,
  type SocialLink,
  SocialLinks,
  StatsWidget,
  type WeatherCondition,
  WeatherWidget,
} from "../personal-widgets";
import { SectionHeader } from "../section-header";
import { EmptyState } from "../states";
import { Separator } from "../separator";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Timeline, TimelineItem } from "../timeline";
import { type ProfileAvailability, distinct, tenureBetween, totalExperience, type ProfileWorkingHours } from "../personal-widgets/personal-model";

const STRINGS = {
  en: {
    contact: "Get in touch",
    downloadCv: "Download CV",
    about: "About",
    experience: "Experience",
    experienceHint: "Where I have worked, newest first.",
    present: "Present",
    current: "Current",
    yearsShort: "{n} yr",
    monthsShort: "{n} mo",
    totalExperience: "{time} of experience",
    skills: "Skills",
    skillsHint: "What I use most, strongest first.",
    projects: "Projects",
    projectsHint: "Selected work.",
    featuredProject: "Featured project",
    allProjects: "All",
    viewProject: "View project",
    viewCode: "Source",
    writing: "Latest writing",
    writingHint: "Notes from the last few months.",
    allArticles: "All articles",
    testimonials: "Kind words",
    testimonialsHint: "From people I have worked with.",
    contactTitle: "Let's build something together",
    contactBody: "Tell me about your project. I usually reply within two working days.",
    projectsNav: "Project categories",
    sections: "Profile sections",
    editProfile: "Edit profile",
    joined: "Joined {date}",
    profileDetails: "Profile details",
    apps: "Apps",
    appsHint: "The apps you use with this account.",
    browseApps: "Browse apps",
    noApps: "No apps yet",
    noAppsHint: "Apps you sign in to with this account show up here.",
    lastUsed: "Used {date}",
    account: "Account",
    accountHint: "Only you can see this.",
  },
  ar: {
    contact: "تواصل معي",
    downloadCv: "تنزيل السيرة الذاتية",
    about: "نبذة",
    experience: "الخبرة",
    experienceHint: "أين عملت، من الأحدث.",
    present: "حتى الآن",
    current: "الحالي",
    yearsShort: "{n} سنة",
    monthsShort: "{n} شهر",
    totalExperience: "{time} من الخبرة",
    skills: "المهارات",
    skillsHint: "ما أستخدمه أكثر، الأقوى أولًا.",
    projects: "المشاريع",
    projectsHint: "أعمال مختارة.",
    featuredProject: "مشروع مميز",
    allProjects: "الكل",
    viewProject: "عرض المشروع",
    viewCode: "الشيفرة",
    writing: "أحدث ما كتبت",
    writingHint: "ملاحظات من الأشهر الأخيرة.",
    allArticles: "كل المقالات",
    testimonials: "كلمات طيبة",
    testimonialsHint: "من أشخاص عملت معهم.",
    contactTitle: "لنبنِ شيئًا معًا",
    contactBody: "أخبرني عن مشروعك. أرد عادةً خلال يومي عمل.",
    projectsNav: "تصنيفات المشاريع",
    sections: "أقسام الملف",
    editProfile: "تعديل الملف",
    joined: "انضم في {date}",
    profileDetails: "تفاصيل الملف",
    apps: "التطبيقات",
    appsHint: "التطبيقات التي تستخدمها بهذا الحساب.",
    browseApps: "تصفّح التطبيقات",
    noApps: "لا تطبيقات بعد",
    noAppsHint: "تظهر هنا التطبيقات التي تسجّل الدخول إليها بهذا الحساب.",
    lastUsed: "استُخدم {date}",
    account: "الحساب",
    accountHint: "لا يراه غيرك.",
  },
};

export type ProfilePageLabels = (typeof STRINGS)["en"];

function useProfileStrings(labels?: Partial<ProfilePageLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const lang = locale.startsWith("ar") ? "ar" : "en";
  return { locale, lang, t: { ...STRINGS[lang], ...labels } } as const;
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/* ------------------------------------------------------------ data */

export interface ProfileJob {
  id: string;
  role: string;
  company: string;
  companyHref?: string;
  location?: string;
  /** ISO date. */
  start: string;
  /** ISO date. Missing means current. */
  end?: string | null;
  summary?: string;
  highlights?: string[];
  skills?: string[];
}

export interface ProfileProject {
  slug: string;
  title: string;
  description: string;
  cover?: string;
  coverAlt?: string;
  /** Filter tab: "Product", "Open source". */
  category?: string;
  tags?: string[];
  href?: string;
  repoHref?: string;
  year?: number;
  /** Shown as the feature story above the grid. Only the first one is. */
  featured?: boolean;
  /** Proof points for the featured story. */
  points?: string[];
}

export interface ProfileTestimonial {
  quote: string;
  name: string;
  role?: string;
  avatar?: string;
}

export interface ProfileWeather {
  city: string;
  temperature: number;
  condition: WeatherCondition;
  high?: number;
  low?: number;
}

export interface ProfileData {
  name: string;
  /** "@fadymondy": shown under the name, always left to right. */
  handle?: string;
  headline: string;
  /** A short plain-text bio for the identity column. Falls back to the headline. */
  bio?: string;
  /** ISO date the account was created: "Joined January 2023". */
  joined?: string;
  avatar?: string;
  location?: string;
  /** IANA zone, for the clock. */
  timeZone?: string;
  workingHours?: ProfileWorkingHours;
  availability?: ProfileAvailability;
  availabilityNote?: string;
  /** Markdown. */
  about?: string;
  email?: string;
  links?: SocialLink[];
  experience?: ProfileJob[];
  skills?: Skill[];
  projects?: ProfileProject[];
  posts?: BlogPostSummary[];
  testimonials?: ProfileTestimonial[];
  stats?: ProfileStat[];
  now?: NowItem[];
  nowUpdated?: string;
  weather?: ProfileWeather;
  /** Link to the CV file. */
  cvHref?: string;
}

/* ------------------------------------------------------------ section frame */

export interface ProfileSectionProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** How many items the section holds, shown as a badge beside the title. `0` is shown too. */
  count?: number;
}

/** A titled block of the profile: `SectionHeader` plus content, labelled by its heading. */
export function ProfileSection({ title, description, action, count, className, children, ...props }: ProfileSectionProps) {
  const id = useId();
  const locale = useOptionalNasaq()?.locale ?? "en";
  const heading =
    count === undefined ? (
      title
    ) : (
      <span className="inline-flex items-center gap-2">
        {title}
        <Badge variant="neutral" className="tabular-nums">
          {formatNumber(count, locale)}
        </Badge>
      </span>
    );
  return (
    <section data-slot="profile-section" aria-labelledby={id} className={cn("flex flex-col gap-4", className)} {...props}>
      <SectionHeader headingId={id} title={heading} description={description} action={action} />
      {children}
    </section>
  );
}

/* ------------------------------------------------------------ hero */

export interface ProfileHeroProps extends Omit<ComponentProps<"header">, "title"> {
  profile: Pick<ProfileData, "name" | "headline" | "avatar" | "location" | "availability" | "availabilityNote" | "links" | "cvHref" | "email">;
  /** Called by the contact button. Without it the button opens `mailto:` to `profile.email`. */
  onContact?: () => void;
  labels?: Partial<ProfilePageLabels>;
}

/** Avatar, name, headline, location and availability, the contact button, the CV link and social links. */
export function ProfileHero({ profile, onContact, labels, className, ...props }: ProfileHeroProps) {
  const { t } = useProfileStrings(labels);
  return (
    <header data-slot="profile-hero" className={cn("flex flex-col gap-6 @2xl:flex-row @2xl:items-center @2xl:gap-8", className)} {...props}>
      <Avatar name={profile.name} src={profile.avatar} className="size-24 shrink-0 text-h1 @2xl:size-32 @2xl:text-display" />
      <div className="flex min-w-0 flex-col items-start gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {profile.availability && <AvailabilityBadge status={profile.availability} note={profile.availabilityNote} />}
          {profile.location && (
            <span className="inline-flex items-center gap-1 text-body-sm text-muted-foreground">
              <Icon icon={MapPin} className="size-4" />
              <bdi>{profile.location}</bdi>
            </span>
          )}
        </div>
        <h1 dir="auto" className="text-balance text-display text-foreground">
          {profile.name}
        </h1>
        <p dir="auto" className="max-w-2xl text-pretty text-body text-muted-foreground">
          {profile.headline}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onContact ? (
            <Button variant="primary" onClick={onContact}>
              <Icon icon={Mail} />
              {t.contact}
            </Button>
          ) : profile.email ? (
            <Button variant="primary" nativeButton={false} render={<a href={`mailto:${profile.email}`} />}>
              <Icon icon={Mail} />
              {t.contact}
            </Button>
          ) : null}
          {profile.cvHref && (
            <Button variant="secondary" nativeButton={false} render={<a href={profile.cvHref} download />}>
              <Icon icon={Download} />
              {t.downloadCv}
            </Button>
          )}
        </div>
        {profile.links && profile.links.length > 0 && <SocialLinks links={profile.links} />}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ identity column */

export interface ProfileSidebarProps extends Omit<ComponentProps<"header">, "title"> {
  profile: Pick<
    ProfileData,
    "name" | "handle" | "headline" | "bio" | "joined" | "avatar" | "location" | "availability" | "availabilityNote" | "links" | "cvHref" | "email"
  >;
  /** Called by the contact button. Without it the button opens `mailto:` to `profile.email`. */
  onContact?: () => void;
  /** The owner is looking: an "Edit profile" button replaces contact and CV. */
  onEdit?: () => void;
  /** Same as `onEdit`, as a link to the settings page. */
  editHref?: string;
  /** Replaces the action buttons. */
  action?: ReactNode;
  labels?: Partial<ProfilePageLabels>;
}

const metaRow = "flex min-w-0 items-center gap-2 text-body-sm text-foreground";
const metaIcon = "size-4 shrink-0 text-muted-foreground";

function linkText(l: SocialLink) {
  if (l.handle) return l.handle;
  if (l.kind === "email") return l.href.replace(/^mailto:/i, "");
  if (l.kind === "website") return l.href.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return l.label;
}

/**
 * The identity column of a profile: a large avatar, name and handle, location and links, one full-width action,
 * then the bio and when the member joined. Beside the content from 64rem of container width, above it on narrower ones.
 */
export function ProfileSidebar({ profile, onContact, onEdit, editHref, action, labels, className, children, ...props }: ProfileSidebarProps) {
  const { t, locale } = useProfileStrings(labels);
  const p = profile;
  const bio = p.bio ?? p.headline;
  const owner = Boolean(onEdit || editHref);
  const actions =
    action ??
    (owner ? (
      editHref ? (
        <Button variant="secondary" className="w-full" nativeButton={false} render={<a href={editHref} />}>
          {t.editProfile}
        </Button>
      ) : (
        <Button variant="secondary" className="w-full" onClick={onEdit}>
          {t.editProfile}
        </Button>
      )
    ) : (
      <>
        {onContact ? (
          <Button variant="primary" className="w-full" onClick={onContact}>
            <Icon icon={Mail} />
            {t.contact}
          </Button>
        ) : p.email ? (
          <Button variant="primary" className="w-full" nativeButton={false} render={<a href={`mailto:${p.email}`} />}>
            <Icon icon={Mail} />
            {t.contact}
          </Button>
        ) : null}
        {p.cvHref && (
          <Button variant="secondary" className="w-full" nativeButton={false} render={<a href={p.cvHref} download />}>
            <Icon icon={Download} />
            {t.downloadCv}
          </Button>
        )}
      </>
    ));
  return (
    <header data-slot="profile-sidebar" className={cn("flex min-w-0 flex-col gap-5", className)} {...props}>
      <div className="flex items-center gap-4 @4xl:flex-col @4xl:items-start">
        <Avatar name={p.name} src={p.avatar} className="size-20 shrink-0 text-h1 ring-1 ring-border @2xl:size-28 @4xl:size-56 @4xl:text-display" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 dir="auto" className="text-balance text-h1 text-foreground">
            {p.name}
          </h1>
          {p.handle && (
            <p dir="ltr" className="truncate text-start font-mono text-body-sm text-muted-foreground">
              {p.handle}
            </p>
          )}
        </div>
      </div>
      {(p.availability || p.location || p.links?.length) && (
        <ul aria-label={t.profileDetails} className="flex list-none flex-col gap-2 p-0">
          {p.availability && (
            <li>
              {/* the sidebar is narrow: let the note wrap under the status instead of running out of the column */}
              <AvailabilityBadge status={p.availability} note={p.availabilityNote} className="h-auto min-h-6 max-w-full flex-wrap py-0.5 text-start whitespace-normal" />
            </li>
          )}
          {p.location && (
            <li className={metaRow}>
              <Icon icon={MapPin} className={metaIcon} />
              <bdi className="truncate">{p.location}</bdi>
            </li>
          )}
          {p.links?.map((l) => {
            const external = /^https?:\/\//i.test(l.href);
            return (
              <li key={`${l.kind}-${l.href}`} className={metaRow}>
                {/* GitHub shows its official mark; brands without one show their name, never a stand-in icon. */}
                {l.kind === "github" ? (
                  <GitHubLogo className="size-4 shrink-0" />
                ) : l.kind === "website" ? (
                  <Icon icon={Globe} className={metaIcon} />
                ) : l.kind === "email" ? (
                  <Icon icon={Mail} className={metaIcon} />
                ) : (
                  <span className="shrink-0 text-muted-foreground">{l.label}</span>
                )}
                <a
                  href={l.href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-label={l.kind === "github" || l.kind === "website" || l.kind === "email" ? `${l.label}: ${linkText(l)}` : undefined}
                  dir="ltr"
                  className="truncate rounded-[2px] outline-none hover:underline hover:decoration-nq-line-strong hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                >
                  {linkText(l)}
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {actions && <div className="flex flex-col gap-2">{actions}</div>}
      {(bio || p.joined) && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            {bio && (
              <p dir="auto" className="text-pretty text-body-sm text-nq-fg-body">
                {bio}
              </p>
            )}
            {p.joined && (
              <p className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                <Icon icon={CalendarDays} className="size-3.5" />
                {fill(t.joined, { date: formatDate(p.joined, locale, { month: "long", year: "numeric" }) })}
              </p>
            )}
          </div>
        </>
      )}
      {children}
    </header>
  );
}

/* ------------------------------------------------------------ about, experience, skills */

export interface ProfileAboutProps extends Omit<ComponentProps<"section">, "title"> {
  about: string;
  labels?: Partial<ProfilePageLabels>;
}

export function ProfileAbout({ about, labels, ...props }: ProfileAboutProps) {
  const { t } = useProfileStrings(labels);
  return (
    <ProfileSection title={t.about} {...props}>
      <Markdown className="max-w-prose">{about}</Markdown>
    </ProfileSection>
  );
}

function tenureLabel(tenure: { years: number; months: number }, t: ProfilePageLabels, locale: string) {
  const parts = [];
  if (tenure.years) parts.push(fill(t.yearsShort, { n: formatNumber(tenure.years, locale) }));
  if (tenure.months || !parts.length) parts.push(fill(t.monthsShort, { n: formatNumber(tenure.months, locale) }));
  return parts.join(" ");
}

export interface ProfileExperienceProps extends Omit<ComponentProps<"section">, "title"> {
  experience: ProfileJob[];
  /** Fixed "today", for stories and tests. */
  now?: Date | number;
  labels?: Partial<ProfilePageLabels>;
}

/** Roles on a `Timeline`, newest first: role and company, period and tenure, summary, highlights and skills. The total is counted once where roles overlap. */
export function ProfileExperience({ experience, now, labels, ...props }: ProfileExperienceProps) {
  const { t, locale } = useProfileStrings(labels);
  const sorted = useMemo(() => [...experience].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()), [experience]);
  const total = totalExperience(experience, now);
  return (
    <ProfileSection title={t.experience} description={`${t.experienceHint} ${fill(t.totalExperience, { time: tenureLabel(total, t, locale) })}`} {...props}>
      <Timeline>
        {sorted.map((job) => {
          const tenure = tenureBetween(job.start, job.end ?? now);
          return (
            <TimelineItem
              key={job.id}
              icon={<Icon icon={Briefcase} />}
              title={
                <span dir="auto" className="flex flex-wrap items-center gap-x-2">
                  <bdi>{job.role}</bdi>
                  <span className="font-normal text-muted-foreground">
                    {job.companyHref ? (
                      <a href={job.companyHref} target="_blank" rel="noopener noreferrer" className="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current">
                        <bdi>{job.company}</bdi>
                      </a>
                    ) : (
                      <bdi>{job.company}</bdi>
                    )}
                  </span>
                  {!job.end && <Badge variant="success">{t.current}</Badge>}
                </span>
              }
              description={
                <span className="flex flex-wrap gap-x-2">
                  <span>{formatDateRange(job.start, job.end ?? now ?? Date.now(), locale, { month: "short", year: "numeric" }).replace(!job.end ? /[^–-]+$/ : /$^/, (m) => (!job.end ? ` ${t.present}` : m))}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tenureLabel(tenure, t, locale)}</span>
                  {job.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <bdi>{job.location}</bdi>
                    </>
                  )}
                </span>
              }
            >
              {(job.summary || job.highlights?.length || job.skills?.length) && (
                <div className="mt-2 flex flex-col gap-2 pb-6">
                  {job.summary && (
                    <p dir="auto" className="text-body-sm text-nq-fg-body">
                      {job.summary}
                    </p>
                  )}
                  {job.highlights && job.highlights.length > 0 && (
                    <ul dir="auto" className="list-disc space-y-1 ps-5 text-body-sm text-nq-fg-body marker:text-muted-foreground">
                      {job.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {job.skills && job.skills.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {job.skills.map((s) => (
                        <li key={s}>
                          <Badge variant="outline">
                            <bdi>{s}</bdi>
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </TimelineItem>
          );
        })}
      </Timeline>
    </ProfileSection>
  );
}

export interface ProfileSkillsProps extends Omit<ComponentProps<"section">, "title"> {
  skills: Skill[];
  labels?: Partial<ProfilePageLabels>;
}

export function ProfileSkills({ skills, labels, ...props }: ProfileSkillsProps) {
  const { t } = useProfileStrings(labels);
  return (
    <ProfileSection title={t.skills} description={t.skillsHint} {...props}>
      <SkillsWidget skills={skills} />
    </ProfileSection>
  );
}

/* ------------------------------------------------------------ projects */

function ProjectCard({ project, labels }: { project: ProfileProject; labels?: Partial<ProfilePageLabels> }) {
  const { t } = useProfileStrings(labels);
  return (
    <Card data-slot="project-card" className="group/project relative h-full gap-0 overflow-hidden py-0 transition-colors duration-150 ease-nq hover:bg-nq-hover">
      <PostCover post={project} className="rounded-none border-0 border-b border-border" ratio="aspect-[16/10]" />
      <div className="flex flex-1 flex-col items-start gap-2 p-4">
        {project.category && (
          <Badge variant="tag" hue={hueFor(project.category)}>
            {project.category}
          </Badge>
        )}
        <h3 dir="auto" className="text-h3 text-foreground">
          {project.href ? (
            <a
              href={project.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[2px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-nq-focus"
            >
              {project.title}
            </a>
          ) : (
            project.title
          )}
        </h3>
        <p dir="auto" className="line-clamp-3 text-body-sm text-muted-foreground">
          {project.description}
        </p>
        {project.tags && project.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline">
                  <bdi>{tag}</bdi>
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {project.repoHref && (
          <a href={project.repoHref} target="_blank" rel="noopener noreferrer" className="relative z-10 mt-auto inline-flex items-center gap-1 pt-1 text-body-sm text-muted-foreground underline decoration-nq-line-strong underline-offset-4 hover:text-foreground">
            {t.viewCode}
            <Icon icon={ExternalLink} className="size-3.5" />
          </a>
        )}
      </div>
    </Card>
  );
}

export interface ProfileProjectsProps extends Omit<ComponentProps<"section">, "title"> {
  projects: ProfileProject[];
  labels?: Partial<ProfilePageLabels>;
}

/** The featured project as a `FeatureStory`, then a grid of the rest filtered by category tabs. */
export function ProfileProjects({ projects, labels, ...props }: ProfileProjectsProps) {
  const { t } = useProfileStrings(labels);
  const featured = projects.find((p) => p.featured);
  const rest = projects.filter((p) => p !== featured);
  const categories = distinct(rest, (p) => p.category);
  const [category, setCategory] = useState("");
  const shown = category ? rest.filter((p) => p.category === category) : rest;
  return (
    <ProfileSection title={t.projects} description={t.projectsHint} count={projects.length} {...props}>
      {featured && (
        <FeatureStory
          titleAs="h3"
          eyebrow={t.featuredProject}
          title={featured.title}
          description={featured.description}
          points={featured.points}
          media={<PostCover post={featured} ratio="aspect-[4/3]" />}
          action={
            featured.href ? (
              <Button variant="secondary" nativeButton={false} render={<a href={featured.href} target="_blank" rel="noopener noreferrer" />}>
                {t.viewProject}
                <Icon icon={ArrowRight} />
              </Button>
            ) : undefined
          }
          className="rounded-card border border-border bg-card p-4 @3xl:p-6"
        />
      )}
      <Tabs value={category} onValueChange={(v) => setCategory(String(v))}>
        {categories.length > 1 && (
          <TabsList variant="underline" aria-label={t.projectsNav}>
            <TabsTab value="">{t.allProjects}</TabsTab>
            {categories.map((c) => (
              <TabsTab key={c} value={c}>
                {c}
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>
        )}
        {["", ...categories].map((c) => (
          <TabsPanel key={c || "all"} value={c}>
            <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
              {(c === category ? shown : []).map((p) => (
                <li key={p.slug} className="flex">
                  <div className="min-w-0 flex-1">
                    <ProjectCard project={p} labels={labels} />
                  </div>
                </li>
              ))}
            </ul>
          </TabsPanel>
        ))}
      </Tabs>
    </ProfileSection>
  );
}

/* ------------------------------------------------------------ writing, testimonials, contact */

export interface ProfileWritingProps extends Omit<ComponentProps<"section">, "title"> {
  posts: BlogPostSummary[];
  /** How many to show. Default 3. */
  limit?: number;
  postHref?: (post: BlogPostSummary) => string;
  /** Link to the full archive. */
  allHref?: string;
  labels?: Partial<ProfilePageLabels>;
}

/** The latest articles as `PostCard`s with a link to the whole blog. */
export function ProfileWriting({ posts, limit = 3, postHref, allHref, labels, ...props }: ProfileWritingProps) {
  const { t } = useProfileStrings(labels);
  return (
    <ProfileSection
      title={t.writing}
      description={t.writingHint}
      count={posts.length}
      action={
        allHref ? (
          <Button variant="link" nativeButton={false} render={<a href={allHref} />}>
            {t.allArticles}
            <Icon icon={ArrowRight} />
          </Button>
        ) : undefined
      }
      {...props}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {posts.slice(0, limit).map((p) => (
          <PostCard key={p.slug} post={p} href={postHref?.(p)} />
        ))}
      </div>
    </ProfileSection>
  );
}

export interface ProfileTestimonialsProps extends Omit<ComponentProps<"section">, "title"> {
  testimonials: ProfileTestimonial[];
  labels?: Partial<ProfilePageLabels>;
}

export function ProfileTestimonials({ testimonials, labels, ...props }: ProfileTestimonialsProps) {
  const { t } = useProfileStrings(labels);
  return (
    <ProfileSection title={t.testimonials} description={t.testimonialsHint} count={testimonials.length} {...props}>
      <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        {testimonials.map((q) => (
          <li key={q.name} className="flex">
            <Card className="w-full gap-3 p-4">
              <Icon icon={Quote} className="size-5 text-nq-accent-text" />
              <blockquote dir="auto" className="text-pretty text-body text-foreground">
                {q.quote}
              </blockquote>
              <footer className="mt-auto flex items-center gap-2.5">
                <Avatar name={q.name} src={q.avatar} />
                <div className="flex flex-col leading-tight">
                  <bdi className="text-label text-foreground">{q.name}</bdi>
                  {q.role && <span className="text-caption text-muted-foreground">{q.role}</span>}
                </div>
              </footer>
            </Card>
          </li>
        ))}
      </ul>
    </ProfileSection>
  );
}

export interface ProfileContactProps extends Omit<ComponentProps<"section">, "title"> {
  email?: string;
  availability?: ProfileAvailability;
  availabilityNote?: string;
  onContact?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  labels?: Partial<ProfilePageLabels>;
}

/** The closing call to action: a headline, one sentence, the availability and a contact button. */
export function ProfileContact({ email, availability, availabilityNote, onContact, title, description, labels, className, ...props }: ProfileContactProps) {
  const { t } = useProfileStrings(labels);
  const id = useId();
  return (
    <section data-slot="profile-contact" aria-labelledby={id} className={cn("flex flex-col items-start gap-4 rounded-card border border-border bg-card p-6 @2xl:flex-row @2xl:items-center @2xl:justify-between", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-2">
        {availability && <AvailabilityBadge status={availability} note={availabilityNote} />}
        <h2 id={id} className="text-balance text-h1 text-foreground">
          {title ?? t.contactTitle}
        </h2>
        <p className="max-w-xl text-pretty text-body text-muted-foreground">{description ?? t.contactBody}</p>
      </div>
      {onContact ? (
        <Button variant="primary" size="lg" onClick={onContact}>
          <Icon icon={Mail} />
          {t.contact}
        </Button>
      ) : email ? (
        <Button variant="primary" size="lg" nativeButton={false} render={<a href={`mailto:${email}`} />}>
          <Icon icon={Mail} />
          {t.contact}
        </Button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------ owner: apps, account */

/** An app the member uses with this account: a `Product` (official mark, localised name) plus how they use it. */
export interface ProfileApp extends Product {
  /** Their role in it: "Owner", "Admin", "Member". */
  role?: string;
  /** The organisation it is installed for. */
  org?: string;
  /** The plan, e.g. "Pro". */
  plan?: string;
  /** ISO date. */
  lastUsed?: string;
}

/** One line of the owner's account details. */
export interface ProfileAccountDetail {
  label: ReactNode;
  value: ReactNode;
}

export interface ProfileAppsProps extends Omit<ProfileSectionProps, "title" | "children"> {
  apps: ProfileApp[];
  /** Where to find more apps: shown in the header and in the empty state. */
  browseHref?: string;
  labels?: Partial<ProfilePageLabels>;
}

/** The apps the member uses, with their official marks, role, organisation and when they last opened each one. */
export function ProfileApps({ apps, browseHref, labels, ...props }: ProfileAppsProps) {
  const { t, locale } = useProfileStrings(labels);
  const browse = browseHref ? (
    <Button variant="ghost" size="sm" nativeButton={false} render={<a href={browseHref} />}>
      <Icon icon={Store} />
      {t.browseApps}
    </Button>
  ) : undefined;
  return (
    <ProfileSection title={t.apps} description={t.appsHint} count={apps.length} action={apps.length ? browse : undefined} {...props}>
      {apps.length ? (
        <ul className="grid list-none grid-cols-1 gap-3 p-0 @2xl:grid-cols-2">
          {apps.map((app) => {
            const meta = [app.org, app.lastUsed && fill(t.lastUsed, { date: formatDate(app.lastUsed, locale, { day: "numeric", month: "short" }) })].filter(Boolean);
            const body = (
              <>
                <ProductIcon product={app} size={36} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-label text-foreground">{app.name}</span>
                    {app.plan && <Badge variant="accent">{app.plan}</Badge>}
                    {app.role && <Badge variant="neutral">{app.role}</Badge>}
                  </span>
                  {app.description && <span className="truncate text-body-sm text-muted-foreground">{app.description}</span>}
                  {meta.length > 0 && <span className="truncate text-caption text-muted-foreground">{meta.join(" · ")}</span>}
                </span>
                {app.badge !== undefined && app.badge !== null && (
                  <Badge variant="neutral" className="shrink-0 tabular-nums">
                    {app.badge}
                  </Badge>
                )}
              </>
            );
            const cls = "flex min-w-0 flex-1 items-start gap-3 rounded-card border border-border bg-card p-4";
            return (
              <li key={app.id} className="flex">
                {app.href ? (
                  <a href={app.href} className={cn(cls, "transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus")}>
                    {body}
                  </a>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Blocks} title={t.noApps} description={t.noAppsHint} actions={browse} className="rounded-card border border-border bg-card py-12" />
      )}
    </ProfileSection>
  );
}

export interface ProfileAccountProps extends Omit<ProfileSectionProps, "title" | "children"> {
  details: ProfileAccountDetail[];
  /** Replaces the default "Only you can see this." */
  description?: ReactNode;
  labels?: Partial<ProfilePageLabels>;
}

/** The owner's account at a glance: email, language, time zone, organisations, member since. Only shown to them. */
export function ProfileAccount({ details, description, labels, ...props }: ProfileAccountProps) {
  const { t } = useProfileStrings(labels);
  return (
    <ProfileSection
      title={t.account}
      description={
        description ?? (
          <span className="inline-flex items-center gap-1.5">
            <Icon icon={Lock} className="size-3.5" />
            {t.accountHint}
          </span>
        )
      }
      {...props}
    >
      <dl className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        {details.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
            <dt className="text-body-sm text-muted-foreground">{d.label}</dt>
            <dd className="min-w-0 text-body-sm text-foreground">{d.value}</dd>
          </div>
        ))}
      </dl>
    </ProfileSection>
  );
}

/* ------------------------------------------------------------ page */

export interface ProfilePageProps extends Omit<ComponentProps<"div">, "title"> {
  profile: ProfileData;
  onContact?: () => void;
  /** The owner is looking at their own page: "Edit profile" replaces contact, and the closing call to action is left out. */
  onEdit?: () => void;
  /** Same as `onEdit`, as a link to the settings page. */
  editHref?: string;
  postHref?: (post: BlogPostSummary) => string;
  /** Link to the blog archive, shown next to the latest writing. */
  blogHref?: string;
  /** Fixed "now" for the clock and tenure, for stories and tests. */
  now?: Date | number;
  /** Show the personal widgets under the identity column (clock, weather, numbers, now). Default true. */
  widgets?: boolean;
  /** The owner's apps, shown first to them only (needs `onEdit` or `editHref`). An empty list shows an empty state. */
  apps?: ProfileApp[];
  /** Where to find more apps, for the apps section. */
  appsHref?: string;
  /** The owner's account details (email, language, time zone…), shown to them only after the apps. */
  account?: ProfileAccountDetail[];
  /** Your own sections, shown first in the content column: `<ProfileSection title="Orders" count={3}>`. */
  children?: ReactNode;
  labels?: Partial<ProfilePageLabels>;
}

/**
 * A public profile page in two columns. The identity column holds the avatar, name, handle, location and links, one
 * full-width action, the bio and the join date, with personal widgets below (local time, weather, numbers, "now").
 * The content column holds your own sections, then about, experience, skills, projects, writing and testimonials, each
 * with a count where it lists things. Sections without data are left out. Every block is also exported. The columns sit
 * side by side from 64rem of container width; on narrower ones the identity comes first and the widgets last.
 */
export function ProfilePage({ profile, onContact, onEdit, editHref, postHref, blogHref, now, widgets = true, apps, appsHref, account, children, labels, className, ...props }: ProfilePageProps) {
  const { t } = useProfileStrings(labels);
  const p = profile;
  const owner = Boolean(onEdit || editHref);
  const hasWidgets = widgets && Boolean(p.timeZone || p.weather || p.stats?.length || p.now?.length);
  return (
    <div data-slot="profile-page" className={cn("@container mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 @2xl:px-6 @2xl:py-12", className)} {...props}>
      <div className="grid grid-cols-1 gap-10 @4xl:grid-cols-[17rem_minmax(0,1fr)] @4xl:grid-rows-[auto_1fr] @4xl:gap-x-12">
        <ProfileSidebar profile={p} onContact={onContact} onEdit={onEdit} editHref={editHref} labels={labels} className="@4xl:col-start-1 @4xl:row-start-1" />
        <div className="flex min-w-0 flex-col gap-12 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
          {children}
          {owner && apps && <ProfileApps apps={apps} browseHref={appsHref} labels={labels} />}
          {owner && account && account.length > 0 && <ProfileAccount details={account} labels={labels} />}
          {p.about && <ProfileAbout about={p.about} labels={labels} />}
          {p.experience && p.experience.length > 0 && <ProfileExperience experience={p.experience} now={now} labels={labels} />}
          {p.skills && p.skills.length > 0 && <ProfileSkills skills={p.skills} labels={labels} />}
          {p.projects && p.projects.length > 0 && <ProfileProjects projects={p.projects} labels={labels} />}
          {p.posts && p.posts.length > 0 && <ProfileWriting posts={p.posts} postHref={postHref} allHref={blogHref} labels={labels} />}
          {p.testimonials && p.testimonials.length > 0 && <ProfileTestimonials testimonials={p.testimonials} labels={labels} />}
        </div>
        {hasWidgets && (
          <aside aria-label={t.sections} className="grid grid-cols-1 content-start gap-4 @xl:grid-cols-2 @4xl:col-start-1 @4xl:row-start-2 @4xl:grid-cols-1">
            {p.timeZone && <LocalClock timeZone={p.timeZone} city={p.location} workingHours={p.workingHours} now={now} />}
            {p.weather && <WeatherWidget {...p.weather} />}
            {p.stats && p.stats.length > 0 && <StatsWidget stats={p.stats} />}
            {p.now && p.now.length > 0 && <NowWidget items={p.now} updated={p.nowUpdated} />}
          </aside>
        )}
      </div>
      {!owner && <ProfileContact email={p.email} availability={p.availability} availabilityNote={p.availabilityNote} onContact={onContact} labels={labels} />}
    </div>
  );
}
