"use client";

import { ArrowRight, Briefcase, Download, ExternalLink, Mail, MapPin, Quote } from "lucide-react";
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
import { formatDateRange, formatNumber } from "../numeric";
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
  headline: string;
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
}

/** A titled block of the profile: `SectionHeader` plus content, labelled by its heading. */
export function ProfileSection({ title, description, action, className, children, ...props }: ProfileSectionProps) {
  const id = useId();
  return (
    <section data-slot="profile-section" aria-labelledby={id} className={cn("flex flex-col gap-4", className)} {...props}>
      <SectionHeader headingId={id} title={title} description={description} action={action} />
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
    <ProfileSection title={t.projects} description={t.projectsHint} {...props}>
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
    <ProfileSection title={t.testimonials} description={t.testimonialsHint} {...props}>
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

/* ------------------------------------------------------------ page */

export interface ProfilePageProps extends Omit<ComponentProps<"div">, "title"> {
  profile: ProfileData;
  onContact?: () => void;
  postHref?: (post: BlogPostSummary) => string;
  /** Link to the blog archive, shown next to the latest writing. */
  blogHref?: string;
  /** Fixed "now" for the clock and tenure, for stories and tests. */
  now?: Date | number;
  /** Show the widgets column (clock, weather, numbers, now). Default true. */
  widgets?: boolean;
  labels?: Partial<ProfilePageLabels>;
}

/**
 * A public profile page: hero, about, experience timeline, skills, projects with a featured story and category tabs,
 * latest writing, testimonials and a contact call to action, with a side column of personal widgets (local time, weather,
 * numbers, "now"). Every block is also exported to compose your own layout. Sections without data are left out.
 * The widgets column is shown beside the content from 64rem of width and above it on narrower ones.
 */
export function ProfilePage({ profile, onContact, postHref, blogHref, now, widgets = true, labels, className, ...props }: ProfilePageProps) {
  const p = profile;
  const hasWidgets = widgets && Boolean(p.timeZone || p.weather || p.stats?.length || p.now?.length);
  return (
    <div data-slot="profile-page" className={cn("@container mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 @2xl:px-6 @2xl:py-12", className)} {...props}>
      <ProfileHero profile={p} onContact={onContact} labels={labels} />
      <div className={cn("grid grid-cols-1 gap-x-10 gap-y-10", hasWidgets && "@4xl:grid-cols-[minmax(0,1fr)_18rem]")}>
        <div className="flex min-w-0 flex-col gap-12">
          {p.about && <ProfileAbout about={p.about} labels={labels} />}
          {p.experience && p.experience.length > 0 && <ProfileExperience experience={p.experience} now={now} labels={labels} />}
          {p.skills && p.skills.length > 0 && <ProfileSkills skills={p.skills} labels={labels} />}
          {p.projects && p.projects.length > 0 && <ProfileProjects projects={p.projects} labels={labels} />}
          {p.posts && p.posts.length > 0 && <ProfileWriting posts={p.posts} postHref={postHref} allHref={blogHref} labels={labels} />}
          {p.testimonials && p.testimonials.length > 0 && <ProfileTestimonials testimonials={p.testimonials} labels={labels} />}
        </div>
        {hasWidgets && (
          <aside aria-label={STRINGS.en.sections} className="order-first flex flex-col gap-4 @4xl:order-last @4xl:self-start @4xl:sticky @4xl:top-6">
            <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-1">
              {p.timeZone && <LocalClock timeZone={p.timeZone} city={p.location} workingHours={p.workingHours} now={now} />}
              {p.weather && <WeatherWidget {...p.weather} />}
              {p.stats && p.stats.length > 0 && <StatsWidget stats={p.stats} />}
              {p.now && p.now.length > 0 && <NowWidget items={p.now} updated={p.nowUpdated} />}
            </div>
          </aside>
        )}
      </div>
      <ProfileContact email={p.email} availability={p.availability} availabilityNote={p.availabilityNote} onContact={onContact} labels={labels} />
    </div>
  );
}
