"use client";

import {
  Activity,
  Building2,
  CreditCard,
  FileClock,
  KeyRound,
  LayoutDashboard,
  Mail,
  Settings,
  ShieldCheck,
  ShieldUser,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";
import { type ComponentProps, Fragment, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../breadcrumb";
import { ImpersonationBanner } from "../impersonation-banner";
import { IconRailSidebar, type IconRailSidebarProps, type RailSection } from "../icon-rail-sidebar";
import { Tooltip } from "../tooltip";

const STRINGS = {
  en: {
    overview: "Overview",
    dashboard: "Dashboard",
    activity: "Activity",
    people: "People",
    users: "Users",
    roles: "Roles",
    invitations: "Invitations",
    tenants: "Tenants",
    workspaces: "Workspaces",
    plans: "Plans",
    billing: "Billing",
    invoices: "Invoices",
    coupons: "Coupons",
    security: "Security",
    audit: "Audit log",
    sessions: "Sessions",
    apiKeys: "API keys",
    settings: "Settings",
    impersonating: (name: string) => `You are viewing the app as ${name}.`,
    impersonatingHint: "Actions you take count as this user.",
    stop: "Exit impersonation",
    account: "Your account",
    admin: "Admin",
    breadcrumb: "Breadcrumb",
  },
  ar: {
    overview: "نظرة عامة",
    dashboard: "لوحة التحكم",
    activity: "النشاط",
    people: "الأشخاص",
    users: "المستخدمون",
    roles: "الأدوار",
    invitations: "الدعوات",
    tenants: "المستأجرون",
    workspaces: "مساحات العمل",
    plans: "الباقات",
    billing: "الفوترة",
    invoices: "الفواتير",
    coupons: "القسائم",
    security: "الأمان",
    audit: "سجل التدقيق",
    sessions: "الجلسات",
    apiKeys: "مفاتيح API",
    settings: "الإعدادات",
    impersonating: (name: string) => `أنت تتصفح التطبيق بصفة ${name}.`,
    impersonatingHint: "الإجراءات التي تنفذها تُنسب إلى هذا المستخدم.",
    stop: "إنهاء انتحال الصفة",
    account: "حسابك",
    admin: "الإدارة",
    breadcrumb: "مسار التنقل",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type AdminAreaLabels = Partial<typeof STRINGS.en>;

/**
 * The default admin navigation: Overview, People (users, roles, invitations), Tenants (workspaces, plans,
 * billing), Security (audit log, sessions, API keys) and Settings. Item ids: `dashboard`, `users`, `roles`,
 * `invitations`, `workspaces`, `plans`, `invoices`, `coupons`, `audit`, `sessions`, `api-keys`, `settings`.
 */
export function defaultAdminSections(locale = "en"): RailSection[] {
  const t = strings(locale);
  return [
    {
      id: "overview",
      label: t.overview,
      icon: <LayoutDashboard aria-hidden />,
      groups: [
        {
          id: "overview",
          items: [
            { id: "dashboard", label: t.dashboard, icon: <LayoutDashboard aria-hidden /> },
            { id: "activity", label: t.activity, icon: <Activity aria-hidden /> },
          ],
        },
      ],
    },
    {
      id: "people",
      label: t.people,
      icon: <Users aria-hidden />,
      groups: [
        {
          id: "people",
          items: [
            { id: "users", label: t.users, icon: <Users aria-hidden /> },
            { id: "roles", label: t.roles, icon: <UserCog aria-hidden /> },
            { id: "invitations", label: t.invitations, icon: <Mail aria-hidden /> },
          ],
        },
      ],
    },
    {
      id: "tenants",
      label: t.tenants,
      icon: <Building2 aria-hidden />,
      groups: [
        {
          id: "tenants",
          items: [
            { id: "workspaces", label: t.workspaces, icon: <Building2 aria-hidden /> },
            { id: "plans", label: t.plans, icon: <CreditCard aria-hidden /> },
            {
              id: "billing",
              label: t.billing,
              icon: <Ticket aria-hidden />,
              children: [
                { id: "invoices", label: t.invoices },
                { id: "coupons", label: t.coupons },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "security",
      label: t.security,
      icon: <ShieldCheck aria-hidden />,
      groups: [
        {
          id: "security",
          items: [
            { id: "audit", label: t.audit, icon: <FileClock aria-hidden /> },
            { id: "sessions", label: t.sessions, icon: <ShieldUser aria-hidden /> },
            { id: "api-keys", label: t.apiKeys, icon: <KeyRound aria-hidden /> },
          ],
        },
      ],
    },
    { id: "settings", label: t.settings, icon: <Settings aria-hidden /> },
  ];
}

export interface AdminUser {
  name: string;
  email: string;
  avatar?: string;
}

export interface AdminAreaProps extends Omit<IconRailSidebarProps, "sections" | "railFooter" | "labels"> {
  /** The rail and its sub-sidebars. Default `defaultAdminSections(locale)`. */
  sections?: readonly RailSection[];
  /** The signed-in admin, shown at the bottom of the rail. */
  user?: AdminUser;
  /** Extra controls at the bottom of the rail, above the user (theme, help). */
  railFooter?: ReactNode;
  /** A short environment tag above the sub-sidebar, such as "Production". */
  environment?: string;
  /** While set, a banner pins to the top: the admin is acting as this user. */
  impersonating?: { name: string; email?: string } | null;
  onStopImpersonating?: () => void | Promise<void>;
  labels?: AdminAreaLabels;
}

/**
 * The admin frame. An icon rail plus sub-sidebar (`IconRailSidebar`) with the admin navigation ready made,
 * an environment tag, an account button, and the impersonation banner. Put `AdminPage` inside.
 */
export function AdminArea({
  sections,
  user,
  railFooter,
  environment,
  impersonating,
  onStopImpersonating,
  brand,
  subHeader,
  labels,
  className,
  children,
  ...props
}: AdminAreaProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  return (
    <div data-slot="admin-area" className={cn("flex h-full min-h-0 w-full flex-col", className)}>
      {impersonating ? (
        <ImpersonationBanner
          as={impersonating}
          sticky={false}
          data-slot="admin-impersonation"
          onExit={() => onStopImpersonating?.()}
          hint={t.impersonatingHint}
          labels={{ impersonating: t.impersonating, exit: t.stop }}
        />
      ) : null}
      <IconRailSidebar
        {...props}
        className="min-h-0 flex-1"
        sections={sections ?? defaultAdminSections(locale)}
        brand={
          brand ?? (
            <span className="flex size-9 items-center justify-center rounded-control bg-primary text-primary-foreground [&_svg]:size-5">
              <ShieldCheck aria-hidden />
            </span>
          )
        }
        subHeader={
          <>
            {environment ? (
              <Badge variant="warning" className="self-start">
                {environment}
              </Badge>
            ) : null}
            {subHeader}
          </>
        }
        railFooter={
          <>
            {railFooter}
            {user ? (
              <Tooltip content={`${user.name} · ${user.email}`} side="inline-end">
                <button
                  type="button"
                  aria-label={`${t.account}: ${user.name}`}
                  className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                >
                  <Avatar name={user.name} src={user.avatar} size="sm" />
                </button>
              </Tooltip>
            ) : null}
          </>
        }
      >
        {children}
      </IconRailSidebar>
    </div>
  );
}

/* ------------------------------------------------------------------ AdminPage */

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

export interface AdminPageProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: readonly AdminBreadcrumb[];
  /** Buttons at the inline end of the title. */
  actions?: ReactNode;
  breadcrumbLabel?: string;
}

/** The body of an admin screen: breadcrumb, title, description, page actions, then your content. */
export function AdminPage({ title, description, breadcrumbs, actions, breadcrumbLabel, className, children, ...props }: AdminPageProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = strings(locale);
  return (
    <div data-slot="admin-page" className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6", className)} {...props}>
      <header className="flex flex-col gap-3">
        {breadcrumbs?.length ? (
          <Breadcrumb aria-label={breadcrumbLabel ?? t.breadcrumb}>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {i === breadcrumbs.length - 1 || !crumb.href ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage> : <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-h1 text-foreground">{title}</h1>
            {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      {children}
    </div>
  );
}
