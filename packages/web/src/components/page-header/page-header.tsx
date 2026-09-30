"use client";

import { ArrowLeft } from "lucide-react";
import { Fragment, type ComponentProps, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../breadcrumb";
import { Icon } from "../icon";

const STRINGS = {
  en: { back: "Back" },
  ar: { back: "رجوع" },
};

export type PageHeaderLabels = (typeof STRINGS)["en"];

export interface PageHeaderCrumb {
  label: ReactNode;
  /** Leave out on the last crumb: it is the current page. */
  href?: string;
}

export interface PageHeaderProps extends Omit<ComponentProps<"header">, "title"> {
  title: ReactNode;
  /** One or two lines under the title. */
  description?: ReactNode;
  /** The trail above the title. The last crumb without an `href` is marked as the current page. */
  breadcrumbs?: readonly PageHeaderCrumb[];
  /** A "Back" link above the title, for detail pages reached from a list. */
  backHref?: string;
  /** Called instead of following `backHref`, for client-side routers. */
  onBack?: () => void;
  /** Small facts under the title: a status, an owner, an updated-at date. */
  meta?: ReactNode;
  /** Inline-end slot: usually `PageActions` or one or two buttons. */
  actions?: ReactNode;
  /** Heading element. Default "h1". */
  as?: "h1" | "h2";
  labels?: Partial<PageHeaderLabels>;
}

/**
 * The top of a page: an optional back link or breadcrumb trail, the page title, a line of description,
 * small meta facts and the page's actions at the inline end. The actions wrap under the title on narrow screens.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  backHref,
  onBack,
  meta,
  actions,
  as: Heading = "h1",
  labels,
  className,
  ...props
}: PageHeaderProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const hasBack = backHref !== undefined || onBack !== undefined;

  return (
    <header data-slot="page-header" className={cn("flex flex-col gap-3", className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb data-slot="page-header-breadcrumbs">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <Fragment key={i}>
                  <BreadcrumbItem>
                    {crumb.href && !last ? <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink> : <BreadcrumbPage>{crumb.label}</BreadcrumbPage>}
                  </BreadcrumbItem>
                  {!last && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {hasBack && (
        <a
          data-slot="page-header-back"
          href={backHref ?? "#"}
          onClick={
            onBack
              ? (event) => {
                  event.preventDefault();
                  onBack();
                }
              : undefined
          }
          className="inline-flex w-fit items-center gap-1.5 rounded-control text-body-sm text-muted-foreground transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4"
        >
          <Icon icon={ArrowLeft} directional />
          {t.back}
        </a>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
          <Heading data-slot="page-header-title" className="text-h1 text-balance text-foreground">
            {title}
          </Heading>
          {description && (
            <p data-slot="page-header-description" className="max-w-prose text-pretty text-body-sm text-muted-foreground">
              {description}
            </p>
          )}
          {meta && (
            <div data-slot="page-header-meta" className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div data-slot="page-header-actions" className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
