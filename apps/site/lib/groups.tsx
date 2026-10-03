import {
  Activity, AppWindow, Bell, Blocks, Bot, CalendarCheck, CalendarDays, ChartLine, ChartPie, Code, Compass, Component, Contact,
  CreditCard, Flag, FolderKanban, FolderOpen, Globe, HeartPulse, KeyRound, Keyboard, Layers, LayoutDashboard, ListTodo, Loader,
  Lock, type LucideIcon, Megaphone, MessageSquareText, MessagesSquare, MousePointerClick, Package, Palette, PenLine, Plug, Search,
  Server, ShieldCheck, Sparkles, Stethoscope, Store, Table, Tag, TextCursorInput, Trophy, Truck, Type, UserCog, Users, Workflow,
  Wrench,
} from "lucide-react";
import groups from "./groups.generated.json";

export interface Group {
  key: string;
  label: string;
  names: string[];
  items: { name: string; title: string; summary: string }[];
}

/** The component groups in sidebar order, written by scripts/sync-docs.mjs from each README's category. */
export const GROUPS: Group[] = groups;

const ICONS: Record<string, LucideIcon> = {
  account: UserCog,
  actions: MousePointerClick,
  admin: ShieldCheck,
  ai: Sparkles,
  "ai-agents": Bot,
  alerts: Bell,
  analytics: ChartLine,
  auth: KeyRound,
  billing: CreditCard,
  bookings: CalendarCheck,
  brand: Palette,
  charts: ChartPie,
  chat: MessagesSquare,
  collaboration: Users,
  crm: Contact,
  "data-display": Table,
  delivery: Truck,
  "developer-tools": Code,
  editors: PenLine,
  feedback: Loader,
  "feedback-sdk": MessageSquareText,
  files: FolderOpen,
  "form-builders": Blocks,
  forms: TextCursorInput,
  gamification: Trophy,
  healthcare: Stethoscope,
  integrations: Plug,
  keyboard: Keyboard,
  layout: LayoutDashboard,
  marketing: Megaphone,
  monitoring: Activity,
  navigation: Compass,
  onboarding: Flag,
  overlays: Layers,
  pickers: CalendarDays,
  platforms: AppWindow,
  pricing: Tag,
  productivity: ListTodo,
  security: Lock,
  seo: Search,
  "server-tools": Server,
  store: Store,
  "store-admin": Package,
  typography: Type,
  utilities: Wrench,
  website: Globe,
  wellness: HeartPulse,
  work: FolderKanban,
  workflow: Workflow,
};

export const groupIcon = (key: string): LucideIcon => ICONS[key] ?? Component;
