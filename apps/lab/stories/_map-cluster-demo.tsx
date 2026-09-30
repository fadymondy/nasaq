/*
 * Demo pins for clustered maps: a few hundred vehicles, couriers and hubs around Riyadh, with invented names.
 * Deterministic (no Math.random), so stories and screenshots are stable. A few pins share one exact spot to show the
 * list you get at the max cluster zoom.
 */
import type { MapPin } from "@nasaq/web";
import { Bike, Truck } from "lucide-react";
import { FLEET_PINS } from "./_w2-demo";

const DISTRICTS: readonly { en: string; ar: string; lat: number; lng: number }[] = [
  { en: "Olaya", ar: "العليا", lat: 24.7136, lng: 46.6753 },
  { en: "Al Malaz", ar: "الملز", lat: 24.6877, lng: 46.7219 },
  { en: "Al Sulimaniyah", ar: "السليمانية", lat: 24.7521, lng: 46.6249 },
  { en: "King Fahd Rd", ar: "طريق الملك فهد", lat: 24.7742, lng: 46.7386 },
  { en: "Diplomatic Quarter", ar: "الحي الدبلوماسي", lat: 24.6741, lng: 46.6235 },
  { en: "Al Nakheel", ar: "النخيل", lat: 24.7745, lng: 46.6512 },
  { en: "Al Yasmin", ar: "الياسمين", lat: 24.8231, lng: 46.6362 },
  { en: "Al Rawdah", ar: "الروضة", lat: 24.7331, lng: 46.7788 },
];

// A small linear congruential generator: same numbers every render.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const STATUS = [
  { en: "Moving", ar: "تتحرك", tone: "info" as const },
  { en: "Idle", ar: "متوقف", tone: "neutral" as const },
  { en: "Delivering", ar: "توصيل", tone: "success" as const },
  { en: "Delayed", ar: "متأخرة", tone: "danger" as const },
];

/** `count` extra pins in the layers of `FLEET_LAYERS`, spread around the districts, plus a few at exactly one spot. */
export function clusteredFleetPins(count = 220): MapPin[] {
  const next = rng(965);
  const pins: MapPin[] = [];
  for (let i = 0; i < count; i++) {
    const d = DISTRICTS[Math.floor(next() * DISTRICTS.length)] ?? DISTRICTS[0]!;
    const van = next() < 0.55;
    const st = STATUS[Math.floor(next() * STATUS.length)] ?? STATUS[0]!;
    const n = String(i + 20).padStart(3, "0");
    pins.push({
      id: `x${n}`,
      lat: d.lat + (next() - 0.5) * 0.07,
      lng: d.lng + (next() - 0.5) * 0.07,
      label: van ? `Van ${n}` : `Courier ${n}`,
      labelAr: van ? `شاحنة ${n}` : `مندوب ${n}`,
      layer: van ? "vans" : "bikes",
      tone: st.tone,
      icon: van ? Truck : Bike,
      status: st.en,
      statusAr: st.ar,
      detail: d.en,
      detailAr: d.ar,
    });
  }
  // Five couriers waiting at one loading bay: no zoom will ever pull them apart.
  for (let i = 0; i < 5; i++) {
    pins.push({ id: `bay${i + 1}`, lat: 24.7004, lng: 46.7113, label: `Courier bay ${i + 1}`, labelAr: `مندوب الرصيف ${i + 1}`, layer: "bikes", tone: "neutral", icon: Bike, status: "Idle", statusAr: "متوقف", detail: "Loading bay A", detailAr: "رصيف التحميل أ" });
  }
  return pins;
}

/** The five hand-written fleet pins first (so `v12` and `v07` exist), then the generated crowd. */
export const CLUSTERED_PINS: MapPin[] = [...FLEET_PINS, ...clusteredFleetPins()];
