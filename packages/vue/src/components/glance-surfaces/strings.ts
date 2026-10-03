export const STRINGS = {
  en: { add: "Add widget", added: "Added", remove: "Remove", size: "Size", sizes: "Widget size", gallery: "Widget gallery", small: "Small", medium: "Medium", large: "Large", circular: "Circular", inline: "Inline", empty: "No widgets match" },
  ar: { add: "إضافة الودجت", added: "تمت الإضافة", remove: "إزالة", size: "الحجم", sizes: "حجم الودجت", gallery: "معرض الودجت", small: "صغير", medium: "متوسط", large: "كبير", circular: "دائري", inline: "سطري", empty: "لا توجد ودجات مطابقة" },
};

export type GlanceLabels = Partial<(typeof STRINGS)["en"]>;
export type GlanceTone = "neutral" | "success" | "warning" | "danger" | "info";
export type WidgetSize = "circular" | "inline" | "small" | "medium" | "large";

export const toneText: Record<GlanceTone, string> = {
  neutral: "text-foreground",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
  info: "text-nq-info-text",
};

export const toneFill: Record<GlanceTone, string> = {
  neutral: "bg-primary",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
  info: "bg-nq-info",
};

export const toneStroke: Record<GlanceTone, string> = {
  neutral: "stroke-primary",
  success: "stroke-nq-success",
  warning: "stroke-nq-warning",
  danger: "stroke-nq-danger",
  info: "stroke-nq-info",
};

export const SIZE_CLASS: Record<WidgetSize, string> = {
  circular: "size-16 rounded-full p-0",
  inline: "h-8 w-56 rounded-full px-3",
  small: "size-38 rounded-3xl p-4",
  medium: "h-38 w-80 rounded-3xl p-4",
  large: "size-80 rounded-3xl p-5",
};
