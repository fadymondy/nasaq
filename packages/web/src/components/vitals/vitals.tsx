"use client";

import { Activity, CircleAlert, CircleCheck, CircleDot, CircleX, Droplet, Dumbbell, Flame, Heart, Hourglass, Scale, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import type { HealthDateInput } from "../engine-card/health-engines";
import { Measure, useHealthDate, useHealthLabels } from "../engine-card/health-format";
import { Meter } from "../progress";
import { StatCard, StatGrid } from "../stat-card";
import { Skeleton } from "../states";
import { Status } from "../status";
import { type BmiCategory, type VitalTarget, bmiCategory, bmiTone, clampPercent, computeBmi, distanceToTarget } from "./vitals-math";

const STRINGS = {
  en: {
    title: "Vitals",
    measuredOn: (date: string) => `Measured ${date}`,
    weight: "Weight",
    bmi: "Body mass index",
    bodyWater: "Body water",
    visceralFat: "Visceral fat",
    muscleMass: "Muscle mass",
    metabolicAge: "Metabolic age",
    restingHeartRate: "Resting heart rate",
    categories: { underweight: "Underweight", normal: "Normal range", overweight: "Overweight", obese: "Obese" } as Record<BmiCategory, string>,
    bmiNote: "Body mass index is a rough screening figure, not a diagnosis.",
    trendLabel: (label: string) => `${label}, recent trend`,
    targets: "Targets",
    targetsDescription: "How far each figure is from the target you set.",
    noBaseline: "Targets appear once a baseline measurement is set.",
    onTarget: "On target",
    inProgress: "In progress",
    toGo: "To go",
    empty: "No measurements yet.",
    notMeasured: "Not measured",
  },
  ar: {
    title: "المؤشرات الحيوية",
    measuredOn: (date: string) => `قيس في ${date}`,
    weight: "الوزن",
    bmi: "مؤشر كتلة الجسم",
    bodyWater: "ماء الجسم",
    visceralFat: "الدهون الحشوية",
    muscleMass: "الكتلة العضلية",
    metabolicAge: "العمر الأيضي",
    restingHeartRate: "نبض الراحة",
    categories: { underweight: "نحافة", normal: "ضمن المعدل", overweight: "وزن زائد", obese: "سمنة" } as Record<BmiCategory, string>,
    bmiNote: "مؤشر كتلة الجسم رقم تقريبي للفرز، وليس تشخيصًا.",
    trendLabel: (label: string) => `${label}، الاتجاه الأخير`,
    targets: "الأهداف",
    targetsDescription: "بُعد كل رقم عن الهدف الذي حددته.",
    noBaseline: "تظهر الأهداف بعد تسجيل قياس أساسي.",
    onTarget: "عند الهدف",
    inProgress: "قيد التقدّم",
    toGo: "المتبقي",
    empty: "لا قياسات بعد.",
    notMeasured: "لم يُقس",
  },
};

export type VitalsLabels = typeof STRINGS.en;

export type VitalTargetKey = "weight" | "visceralFat" | "bodyWater" | "metabolicAge";

export interface VitalsData {
  weightKg?: number;
  /** With `weightKg`, lets the panel compute BMI when `bmi` is not sent. */
  heightCm?: number;
  /** As the server computed it. Wins over the panel's own computation. */
  bmi?: number;
  bodyWaterPercent?: number;
  /** The scale's visceral fat level. A bare number with no unit. */
  visceralFat?: number;
  muscleMassKg?: number;
  metabolicAge?: number;
  restingHeartRate?: number;
  measuredAt?: HealthDateInput;
  /** False until a baseline measurement is set. Targets are hidden without one. */
  hasBaseline?: boolean;
  targets?: Partial<Record<VitalTargetKey, VitalTarget>>;
  /** Recent readings, oldest first, drawn as a sparkline on the tile. */
  trends?: Partial<Record<"weight" | "restingHeartRate", readonly number[]>>;
}

export interface VitalsProps extends Omit<ComponentProps<"section">, "children"> {
  vitals?: VitalsData;
  loading?: boolean;
  /** Skip the heading (for use inside a page that has its own). */
  hideHeading?: boolean;
  labels?: Partial<VitalsLabels>;
}

type TargetUnit = "kilogram" | "percent" | "level" | "year";
type TargetLabelKey = "weight" | "visceralFat" | "bodyWater" | "metabolicAge";

const TARGET_META: Record<VitalTargetKey, { unit: TargetUnit; label: TargetLabelKey; digits: number }> = {
  weight: { unit: "kilogram", label: "weight", digits: 1 },
  visceralFat: { unit: "level", label: "visceralFat", digits: 0 },
  bodyWater: { unit: "percent", label: "bodyWater", digits: 1 },
  metabolicAge: { unit: "year", label: "metabolicAge", digits: 0 },
};

const BMI_ICON: Record<BmiCategory, LucideIcon> = { underweight: CircleAlert, normal: CircleCheck, overweight: CircleAlert, obese: CircleX };

/**
 * Body readings from a scale or a wearable: weight, BMI with its category, body water, visceral fat, muscle mass,
 * metabolic age and resting heart rate, plus progress towards the targets the person set. A missing reading says
 * "Not measured"; it is never shown as zero.
 */
export function Vitals({ vitals, loading = false, hideHeading = false, labels, className, ...props }: VitalsProps) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  const d = useHealthDate();

  if (loading) {
    return (
      <section aria-busy data-slot="vitals" className={cn("flex flex-col gap-4", className)} {...props}>
        <StatGrid>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </StatGrid>
      </section>
    );
  }

  const v = vitals ?? {};
  const bmi = v.bmi ?? computeBmi(v.weightKg, v.heightCm);
  const category = bmi === null ? undefined : bmiCategory(bmi);
  const anything = [v.weightKg, bmi, v.bodyWaterPercent, v.visceralFat, v.muscleMassKg, v.metabolicAge, v.restingHeartRate].some((x) => x !== undefined && x !== null);
  const missing = <span className="text-body-sm font-normal text-muted-foreground">{t.notMeasured}</span>;
  const measure = (value: number | undefined | null, node: (n: number) => ReactNode) => (value === undefined || value === null ? missing : node(value));
  const BmiGlyph = category ? BMI_ICON[category] : null;
  const bmiVariant = category ? bmiTone(category) : "neutral";

  return (
    <section data-slot="vitals" aria-label={hideHeading ? t.title : undefined} className={cn("flex flex-col gap-4", className)} {...props}>
      {hideHeading ? null : (
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-h3 text-foreground">{t.title}</h2>
          {v.measuredAt ? <span className="text-caption text-muted-foreground">{t.measuredOn(d.date(v.measuredAt, { dateStyle: "medium" }))}</span> : null}
        </header>
      )}

      {!anything ? (
        <p className="rounded-card border border-dashed border-border p-6 text-center text-body-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <StatGrid>
          <StatCard
            label={t.weight}
            icon={<Scale />}
            value={measure(v.weightKg, (n) => <Measure value={n} unit="kilogram" format={{ maximumFractionDigits: 1 }} />)}
            sparkline={v.trends?.weight}
            sparklineLabel={t.trendLabel(t.weight)}
          />
          <StatCard
            label={t.bmi}
            icon={<Activity />}
            value={measure(bmi, (n) => (
              <span className="flex flex-wrap items-center gap-2">
                <Measure value={n} unit="bmi" format={{ maximumFractionDigits: 1 }} />
                {category && BmiGlyph ? (
                  <Badge variant={bmiVariant === "neutral" || bmiVariant === "info" ? "neutral" : bmiVariant}>
                    <BmiGlyph aria-hidden />
                    {t.categories[category]}
                  </Badge>
                ) : null}
              </span>
            ))}
          />
          <StatCard label={t.bodyWater} icon={<Droplet />} value={measure(v.bodyWaterPercent, (n) => <Measure value={n} unit="percent" format={{ maximumFractionDigits: 1 }} />)} />
          <StatCard label={t.visceralFat} icon={<Flame />} value={measure(v.visceralFat, (n) => <Measure value={n} unit="level" format={{ maximumFractionDigits: 0 }} />)} />
          <StatCard label={t.muscleMass} icon={<Dumbbell />} value={measure(v.muscleMassKg, (n) => <Measure value={n} unit="kilogram" format={{ maximumFractionDigits: 1 }} />)} />
          <StatCard label={t.metabolicAge} icon={<Hourglass />} value={measure(v.metabolicAge, (n) => <Measure value={n} unit="year" format={{ unitDisplay: "long", maximumFractionDigits: 0 }} />)} />
          <StatCard
            label={t.restingHeartRate}
            icon={<Heart />}
            value={measure(v.restingHeartRate, (n) => <Measure value={n} unit="bpm" format={{ maximumFractionDigits: 0 }} />)}
            sparkline={v.trends?.restingHeartRate}
            sparklineLabel={t.trendLabel(t.restingHeartRate)}
          />
        </StatGrid>
      )}

      {category ? <p className="text-caption text-muted-foreground">{t.bmiNote}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle as="h3" className="text-h3">
            {t.targets}
          </CardTitle>
          <CardDescription>{t.targetsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {v.hasBaseline === false || !v.targets || Object.keys(v.targets).length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.noBaseline}</p>
          ) : (
            <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
              {(Object.keys(TARGET_META) as VitalTargetKey[]).map((key) => {
                const target = v.targets?.[key];
                if (!target) return null;
                const meta = TARGET_META[key];
                const label = t[meta.label];
                const fmt = { maximumFractionDigits: meta.digits };
                const togo = Math.abs(distanceToTarget(target));
                return (
                  <li key={key} data-slot="vitals-target" data-on-target={target.onTarget || undefined} className="flex flex-col gap-2">
                    <div className="flex items-center justify-end gap-2">
                      <Status tone={target.onTarget ? "success" : "info"} icon={target.onTarget ? CircleCheck : CircleDot}>
                        {target.onTarget ? t.onTarget : t.inProgress}
                      </Status>
                    </div>
                    <Meter
                      label={label}
                      value={clampPercent(target.percent)}
                      max={100}
                      tone={target.onTarget ? "success" : "default"}
                      showValue
                      valueText={
                        <>
                          <Measure value={target.current} unit={meta.unit} format={fmt} /> / <Measure value={target.target} unit={meta.unit} format={fmt} />
                        </>
                      }
                    />
                    {!target.onTarget ? (
                      <span className="text-caption text-muted-foreground">
                        {t.toGo} <Measure value={togo} unit={meta.unit} format={fmt} />
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
