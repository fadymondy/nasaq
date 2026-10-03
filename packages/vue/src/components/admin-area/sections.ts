import { Activity, Building2, CreditCard, FileClock, KeyRound, LayoutDashboard, Mail, Settings, ShieldCheck, ShieldUser, Ticket, UserCog, Users } from "lucide-vue-next";
import type { RailSection } from "../icon-rail-sidebar";
import { adminStrings } from "./strings";

/**
 * The default admin navigation: Overview, People (users, roles, invitations), Tenants (workspaces, plans,
 * billing), Security (audit log, sessions, API keys) and Settings. Item ids: `dashboard`, `users`, `roles`,
 * `invitations`, `workspaces`, `plans`, `invoices`, `coupons`, `audit`, `sessions`, `api-keys`, `settings`.
 */
export function defaultAdminSections(locale = "en"): RailSection[] {
  const t = adminStrings(locale);
  return [
    {
      id: "overview",
      label: t.overview,
      icon: LayoutDashboard,
      groups: [
        {
          id: "overview",
          items: [
            { id: "dashboard", label: t.dashboard, icon: LayoutDashboard },
            { id: "activity", label: t.activity, icon: Activity },
          ],
        },
      ],
    },
    {
      id: "people",
      label: t.people,
      icon: Users,
      groups: [
        {
          id: "people",
          items: [
            { id: "users", label: t.users, icon: Users },
            { id: "roles", label: t.roles, icon: UserCog },
            { id: "invitations", label: t.invitations, icon: Mail },
          ],
        },
      ],
    },
    {
      id: "tenants",
      label: t.tenants,
      icon: Building2,
      groups: [
        {
          id: "tenants",
          items: [
            { id: "workspaces", label: t.workspaces, icon: Building2 },
            { id: "plans", label: t.plans, icon: CreditCard },
            {
              id: "billing",
              label: t.billing,
              icon: Ticket,
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
      icon: ShieldCheck,
      groups: [
        {
          id: "security",
          items: [
            { id: "audit", label: t.audit, icon: FileClock },
            { id: "sessions", label: t.sessions, icon: ShieldUser },
            { id: "api-keys", label: t.apiKeys, icon: KeyRound },
          ],
        },
      ],
    },
    { id: "settings", label: t.settings, icon: Settings },
  ];
}
