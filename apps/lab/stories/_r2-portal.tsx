import { ClientPortal, type PortalRequest } from "@nasaq/web";
import { useState } from "react";
import { portalActivity, portalInvoices, portalProject, portalRequests, portalTasks, portalWeeks, useAr, wait } from "./_r2-demo";

export function PortalDemo({ empty = false }: { empty?: boolean }) {
  const ar = useAr();
  const [requests, setRequests] = useState<PortalRequest[]>(() => (empty ? [] : portalRequests(ar)));
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex w-full flex-col gap-3">
      <ClientPortal
        project={portalProject(ar)}
        tasks={empty ? [] : portalTasks(ar)}
        openIssues={empty ? 0 : 4}
        requests={requests}
        weeks={empty ? [] : portalWeeks}
        budgetHours={empty ? 0 : 240}
        invoices={empty ? [] : portalInvoices}
        currency="SAR"
        activity={empty ? [] : portalActivity(ar)}
        onRequest={async ({ title, description }) => {
          await wait(500);
          setRequests((l) => [{ id: `r${l.length + 10}`, title, description: description || undefined, status: "pending", createdAt: new Date().toISOString(), by: ar ? "أنت" : "You" }, ...l]);
        }}
        onOpenInvoice={(i) => setNote(`${ar ? "فتح" : "Open"} ${i.number}`)}
        onPayInvoice={(i) => setNote(`${ar ? "دفع" : "Pay"} ${i.number}`)}
        onDownloadInvoice={async () => {
          await wait(400);
        }}
        taskActions={(task) => [{ id: "comment", label: ar ? "اطرح سؤالًا" : "Ask a question", onSelect: () => setNote(`${ar ? "سؤال عن" : "Question about"}: ${task.title}`) }]}
        requestActions={(r) => [
          { id: "copy", label: ar ? "نسخ العنوان" : "Copy title", onSelect: () => setNote(r.title) },
          { id: "reopen", label: ar ? "أعد الفتح" : "Reopen", disabled: r.status === "pending", onSelect: () => setRequests((l) => l.map((x) => (x.id === r.id ? { ...x, status: "pending" } : x))), group: "more" },
        ]}
        weekActions={(w) => [{ id: "export", label: ar ? "تصدير الأسبوع" : "Export week", onSelect: () => setNote(`${ar ? "تصدير" : "Export"} ${w.week}`) }]}
        activityActions={(a) => [{ id: "share", label: ar ? "مشاركة" : "Share", onSelect: () => setNote(String(a.title)) }]}
      />
      {note ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}
