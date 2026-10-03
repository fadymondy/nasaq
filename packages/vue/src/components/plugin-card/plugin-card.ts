import type { TagHue } from "../badge";

export interface PluginCardItem {
  id: string;
  name: string;
  description?: string;
  /** What the plugin is: `source`, `capability`, `ai_provider`, `tool`... Known kinds are translated; others are spelled out. */
  kind?: string;
  version?: string;
  /** An icon name (`"database"`, `"bx-bot"`) or an image URL. Use the `icon` slot for anything else. */
  icon?: string;
  /** The plugin's colour for its icon tile and sparkline. Default `"gray"`. */
  hue?: TagHue;
  /** `false` shows Disabled; `undefined` shows nothing. */
  enabled?: boolean;
  lastActiveAt?: number | string | Date | null;
  /** The headline figure, e.g. 12400 records. */
  count?: number;
  /** The words under the figure, e.g. "records", "tokens", "invocations". */
  countLabel?: string;
  /** Recent activity, oldest first, for the sparkline. */
  series?: readonly number[];
  /** Shown in the footer, monospaced. Default `id`. */
  slug?: string;
}

export const PLUGIN_CARD_STRINGS = {
  en: {
    enabled: "Enabled",
    disabled: "Disabled",
    never: "No activity",
    lastActive: "Last active",
    details: "Details",
    page: "Page",
    openDetails: "Open {name} details",
    openPage: "Open {name} page",
    select: "Select {name}",
    noDescription: "No description.",
    activity: "{name} activity",
    kinds: {
      capability: "Capability",
      source: "Source",
      ai_provider: "AI provider",
      pipeline: "Pipeline",
      enrichment: "Enrichment",
      copilot: "Copilot",
      tool: "Tool",
      skill: "Skill",
      agent: "Agent",
      mcp: "MCP",
      memory: "Memory",
      persona: "Persona",
      core: "Core",
      system: "System",
    } as Record<string, string>,
  },
  ar: {
    enabled: "مفعّلة",
    disabled: "معطّلة",
    never: "لا نشاط",
    lastActive: "آخر نشاط",
    details: "التفاصيل",
    page: "الصفحة",
    openDetails: "فتح تفاصيل {name}",
    openPage: "فتح صفحة {name}",
    select: "تحديد {name}",
    noDescription: "لا يوجد وصف.",
    activity: "نشاط {name}",
    kinds: {
      capability: "قدرة",
      source: "مصدر",
      ai_provider: "مزوّد ذكاء",
      pipeline: "خط معالجة",
      enrichment: "إثراء",
      copilot: "مساعد",
      tool: "أداة",
      skill: "مهارة",
      agent: "وكيل",
      mcp: "MCP",
      memory: "ذاكرة",
      persona: "شخصية",
      core: "أساس",
      system: "نظام",
    } as Record<string, string>,
  },
};

export type PluginCardLabels = (typeof PLUGIN_CARD_STRINGS)["en"];

export const pluginCardFill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
