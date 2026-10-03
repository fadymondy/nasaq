// Shapes shared by the storefront header, mega menu and footer.
export interface StoreNavLink {
  label: string;
  href: string;
  /** Small tag such as "New" or "Sale". */
  badge?: string;
}
export interface StoreNavColumn {
  title: string;
  links: readonly StoreNavLink[];
  /** A "View all" link under the column. */
  viewAll?: StoreNavLink;
}
export interface StoreNavFeatured {
  title: string;
  description?: string;
  href: string;
  image?: string;
}
export interface StoreNavItem {
  id: string;
  label: string;
  /** The item's own page. */
  href?: string;
  /** Link columns of the mega menu panel. */
  columns?: readonly StoreNavColumn[];
  featured?: StoreNavFeatured;
  /** Draw the label in the sale colour. */
  highlight?: boolean;
}
export interface StoreFooterColumn {
  title: string;
  links: readonly StoreNavLink[];
}
export interface StoreFooterSocial {
  /** Text name of the network. Text only, so there is no logo to get wrong. */
  label: string;
  href: string;
}
export interface StoreFooterOption {
  value: string;
  label: string;
}
