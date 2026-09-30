/* Fake data and helpers shared by the app-lifecycle stories (feedback, error pages, update, install, progress). Nothing here talks to a server. */
import { type AppRelease, type FeedbackHubIssue, type ManagedRelease, type PushDevice, useNasaq } from "@nasaq/web";
import { useEffect, useRef, useState } from "react";

export const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useAr = () => useNasaq().locale.startsWith("ar");

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const latestRelease = (ar: boolean): AppRelease => ({
  version: "2.4.0",
  build: 240,
  date: Date.now() - 2 * HOUR,
  size: 84.6 * 1024 * 1024,
  channel: "stable",
  notes: ar
    ? [
        { type: "new", text: "لوحة جديدة للمهام تعمل دون اتصال" },
        { type: "improved", text: "بحث أسرع بثلاث مرات في المشاريع الكبيرة" },
        { type: "improved", text: "تحسينات في القراءة من اليمين إلى اليسار" },
        { type: "fixed", text: "إصلاح انقطاع المزامنة بعد وضع السكون" },
      ]
    : [
        { type: "new", text: "A new task board that works offline" },
        { type: "improved", text: "Search is three times faster in large projects" },
        { type: "improved", text: "Better reading order in right-to-left layouts" },
        { type: "fixed", text: "Sync no longer stops after the computer sleeps" },
      ],
});

export const managedReleases = (ar: boolean): ManagedRelease[] => [
  { id: "r240", version: "2.4.0", build: 240, date: Date.now() - 2 * HOUR, channel: "stable", status: "draft", rollout: 0, notes: latestRelease(ar).notes },
  { id: "r231", version: "2.3.1", build: 231, date: Date.now() - 6 * DAY, channel: "stable", status: "live", rollout: 100 },
  { id: "r230b", version: "2.3.0-beta", build: 228, date: Date.now() - 12 * DAY, channel: "beta", status: "live", rollout: 20 },
  { id: "r220", version: "2.2.0", build: 220, date: Date.now() - 40 * DAY, channel: "stable", status: "rolled-back", rollout: 0 },
  { id: "r210", version: "2.1.0", build: 210, date: Date.now() - 75 * DAY, channel: "stable", status: "live", rollout: 100 },
];

/** How many people run each build, for the "this will block N people" warning. */
export const buildUsage = [
  { build: 210, users: 42 },
  { build: 220, users: 17 },
  { build: 231, users: 812 },
  { build: 240, users: 96 },
];

export const pageIssues = (ar: boolean): FeedbackHubIssue[] => [
  {
    id: "i1",
    title: ar ? "زر الحفظ لا يستجيب على الجوال" : "Save button does not respond on mobile",
    status: "in-progress",
    votes: 14,
    author: ar ? "سارة" : "Sara",
    createdAt: Date.now() - 2 * DAY,
  },
  {
    id: "i2",
    title: ar ? "الجدول يقص العمود الأخير" : "The table cuts off the last column",
    status: "open",
    votes: 6,
    createdAt: Date.now() - 5 * HOUR,
    author: ar ? "خالد" : "Khaled",
  },
  {
    id: "i3",
    title: ar ? "الأرقام تظهر بالإنجليزية في التقرير" : "Numbers show in the wrong script in the report",
    status: "open",
    votes: 3,
    voted: true,
    createdAt: Date.now() - 3 * DAY,
  },
  {
    id: "i4",
    title: ar ? "خطأ عند رفع صورة كبيرة" : "Error when uploading a large image",
    status: "resolved",
    votes: 9,
    createdAt: Date.now() - 9 * DAY,
    author: ar ? "منى" : "Mona",
  },
];

export const pushDevices = (ar: boolean): PushDevice[] => [
  { id: "d1", name: ar ? "آيفون سارة" : "Sara's iPhone", kind: "phone", current: true, lastSeen: Date.now() - 60_000 },
  { id: "d2", name: ar ? "حاسوب المكتب" : "Office laptop", kind: "computer", lastSeen: Date.now() - 3 * HOUR },
  { id: "d3", name: ar ? "آيباد المنزل" : "iPad at home", kind: "tablet", lastSeen: Date.now() - 4 * DAY },
];

/** Simulates a download: progress 0 to 100 with a wobbling speed, over about `seconds`. */
export function useFakeDownload(totalBytes: number, seconds = 8) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  const start = () => {
    if (timer.current) clearInterval(timer.current);
    setProgress(0);
    setRunning(true);
    const step = 100 / (seconds * 5);
    timer.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + step);
        if (next >= 100 && timer.current) {
          clearInterval(timer.current);
          setRunning(false);
        }
        return next;
      });
      setSpeed((totalBytes / seconds) * (0.8 + Math.random() * 0.4));
    }, 200);
  };
  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setProgress(0);
    setRunning(false);
    setSpeed(0);
  };
  return { progress, running, speed, done: progress >= 100, start, reset };
}
