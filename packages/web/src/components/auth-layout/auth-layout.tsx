import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Card } from "../card";
import { ProductLogo } from "../product-mark";

export interface AuthLayoutProps extends Omit<ComponentProps<"div">, "title"> {
  /** `card`: one centred card on the page. `split`: a brand panel on the inline start, the form on the other side. Default `card`. */
  variant?: "card" | "split";
  /** The product mark above the form. Default: the provider brand's `ProductLogo`. Pass `null` to hide it. */
  mark?: ReactNode;
  /** The page heading (an `h1`). */
  title?: ReactNode;
  /** One line under the heading. */
  description?: ReactNode;
  /** Brand or illustration content for the split panel. Hidden below the `lg` breakpoint. */
  panel?: ReactNode;
  /** Legal links, a locale switch or any small print below the form. See `AuthFooter`. */
  footer?: ReactNode;
}

/**
 * The page frame for sign-in, sign-up and recovery screens. It owns the page structure (`<main>`, the
 * `h1`, the footer) and leaves the form itself to `children`, so every auth form drops into either variant.
 */
export function AuthLayout({ variant = "card", mark, title, description, panel, footer, className, children, ...props }: AuthLayoutProps) {
  const markNode = mark === undefined ? <ProductLogo size={28} /> : mark;
  const heading =
    title || description ? (
      <header data-slot="auth-layout-header" className="flex flex-col gap-1.5 text-start">
        {title ? (
          <h1 data-slot="auth-layout-title" className="text-h2 text-foreground">
            {title}
          </h1>
        ) : null}
        {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
      </header>
    ) : null;
  const footerNode = footer ? (
    <footer data-slot="auth-layout-footer" className="text-caption text-muted-foreground">
      {footer}
    </footer>
  ) : null;

  if (variant === "split") {
    return (
      <div data-slot="auth-layout" data-variant="split" className={cn("grid min-h-dvh bg-background text-foreground lg:grid-cols-2", className)} {...props}>
        <aside
          data-slot="auth-layout-panel"
          className="relative hidden flex-col justify-between gap-8 border-e border-border bg-muted p-10 text-foreground lg:flex"
        >
          {panel ?? <div className="flex flex-1 items-center justify-center">{markNode ? <ProductLogo size={56} /> : null}</div>}
        </aside>
        <div className="flex min-w-0 flex-col p-6 sm:p-10">
          <div className="flex items-center justify-between lg:hidden">{markNode}</div>
          <main data-slot="auth-layout-main" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-8">
            {markNode ? <div className="hidden lg:block">{markNode}</div> : null}
            {heading}
            {children}
          </main>
          {footerNode ? <div className="mx-auto w-full max-w-sm">{footerNode}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div data-slot="auth-layout" data-variant="card" className={cn("flex min-h-dvh flex-col items-center bg-muted p-4 text-foreground sm:p-6", className)} {...props}>
      <main data-slot="auth-layout-main" className="flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-8">
        {markNode ? <div className="flex justify-center">{markNode}</div> : null}
        <Card className="gap-6 p-6 sm:p-8">
          {heading}
          {children}
        </Card>
      </main>
      {footerNode ? <div className="w-full max-w-md">{footerNode}</div> : null}
    </div>
  );
}

export interface AuthFooterLink {
  label: ReactNode;
  href: string;
  /** Open in a new tab (adds `rel="noreferrer"`). */
  external?: boolean;
}

export interface AuthFooterProps extends ComponentProps<"div"> {
  links?: AuthFooterLink[];
  /** Trailing slot at the inline end, usually a `LocaleSwitcher`. */
  end?: ReactNode;
}

/** Small print row for `AuthLayout`'s `footer`: legal links at the inline start, a slot (locale switch) at the end. */
export function AuthFooter({ links, end, className, children, ...props }: AuthFooterProps) {
  return (
    <div data-slot="auth-footer" className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)} {...props}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {links?.map((link) => (
          <a
            key={link.href}
            href={link.href}
            {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          >
            {link.label}
          </a>
        ))}
        {children}
      </div>
      {end ? <div className="flex items-center">{end}</div> : null}
    </div>
  );
}
