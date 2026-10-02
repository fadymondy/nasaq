import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { ActivityKind, DeploymentStatus, PullState, RunStatus } from "./github-activity-format";

export const GITHUB_ACTIVITY_STRINGS = {
  en: {
    title: "GitHub activity",
    description: "Commits, pull requests, workflow runs and deployments for this repository.",
    openOnGithub: "Open on GitHub",
    refresh: "Refresh",
    deploy: "Deploy",
    search: "Filter by title, author or branch",
    tabs: { activity: "Activity", commits: "Commits", pulls: "Pull requests", runs: "Workflow runs", deployments: "Deployments" },
    emptyTitle: "Nothing here yet",
    emptyBody: "New activity shows up as soon as GitHub reports it.",
    noMatchTitle: "No matches",
    noMatchBody: "Nothing matches that filter. Clear it to see everything.",
    committed: (who: string) => `${who} committed`,
    openedBy: (who: string) => `opened by ${who}`,
    mergedBy: (who: string) => `merged by ${who}`,
    startedBy: (who: string) => `started by ${who}`,
    deployedBy: (who: string) => `deployed by ${who}`,
    comments: (n: number) => (n === 1 ? "1 comment" : `${n} comments`),
    pullState: { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" } satisfies Record<PullState, string>,
    runStatus: {
      queued: "Queued",
      in_progress: "Running",
      success: "Passed",
      failure: "Failed",
      cancelled: "Cancelled",
      skipped: "Skipped",
    } satisfies Record<RunStatus, string>,
    deploymentStatus: {
      pending: "Pending",
      in_progress: "Deploying",
      success: "Live",
      failure: "Failed",
      inactive: "Replaced",
    } satisfies Record<DeploymentStatus, string>,
    checks: { success: "Checks passed", failure: "Checks failed", pending: "Checks running" },
    rerun: "Re-run",
    rerunFor: (name: string) => `Re-run ${name}`,
    viewSite: "Open site",
    duration: { ms: "ms", s: "s", m: "m", h: "h" },
    kind: { commit: "Commit", pull: "Pull request", run: "Workflow run", deployment: "Deployment" } satisfies Record<ActivityKind, string>,
    genericError: "Something went wrong. Try again.",
    loading: "Loading activity",
  },
  ar: {
    title: "نشاط GitHub",
    description: "الإيداعات وطلبات الدمج وتشغيلات سير العمل وعمليات النشر لهذا المستودع.",
    openOnGithub: "افتح على GitHub",
    refresh: "تحديث",
    deploy: "نشر",
    search: "تصفية بالعنوان أو المؤلف أو الفرع",
    tabs: { activity: "النشاط", commits: "الإيداعات", pulls: "طلبات الدمج", runs: "تشغيلات سير العمل", deployments: "عمليات النشر" },
    emptyTitle: "لا يوجد شيء بعد",
    emptyBody: "يظهر النشاط الجديد فور أن يبلّغ عنه GitHub.",
    noMatchTitle: "لا نتائج",
    noMatchBody: "لا شيء يطابق هذه التصفية. امسحها لرؤية كل شيء.",
    committed: (who: string) => `أودع ${who}`,
    openedBy: (who: string) => `فتحه ${who}`,
    mergedBy: (who: string) => `دمجه ${who}`,
    startedBy: (who: string) => `بدأه ${who}`,
    deployedBy: (who: string) => `نشره ${who}`,
    comments: (n: number) => (n === 1 ? "تعليق واحد" : n === 2 ? "تعليقان" : `${n} تعليقات`),
    pullState: { open: "مفتوح", draft: "مسودة", merged: "مدموج", closed: "مغلق" } satisfies Record<PullState, string>,
    runStatus: {
      queued: "في الانتظار",
      in_progress: "قيد التشغيل",
      success: "نجح",
      failure: "فشل",
      cancelled: "أُلغي",
      skipped: "تم تخطيه",
    } satisfies Record<RunStatus, string>,
    deploymentStatus: {
      pending: "معلّق",
      in_progress: "قيد النشر",
      success: "مباشر",
      failure: "فشل",
      inactive: "استُبدل",
    } satisfies Record<DeploymentStatus, string>,
    checks: { success: "نجحت الفحوصات", failure: "فشلت الفحوصات", pending: "الفحوصات قيد التشغيل" },
    rerun: "إعادة التشغيل",
    rerunFor: (name: string) => `إعادة تشغيل ${name}`,
    viewSite: "افتح الموقع",
    duration: { ms: "ملي ث", s: "ث", m: "د", h: "س" },
    kind: { commit: "إيداع", pull: "طلب دمج", run: "تشغيل سير عمل", deployment: "نشر" } satisfies Record<ActivityKind, string>,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    loading: "جارٍ تحميل النشاط",
  },
};

export type GithubActivityLabels = (typeof GITHUB_ACTIVITY_STRINGS)["en"];

export function useGithubActivityLabels(override?: () => Partial<GithubActivityLabels> | undefined): ComputedRef<GithubActivityLabels> {
  const nq = useNasaq();
  return computed(() => ({ ...GITHUB_ACTIVITY_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as GithubActivityLabels);
}
