/* The four Health page screens, shared by their Default, Arabic and Mobile stories. */
import { DailySummary, type DailySummaryData, EngineCard, EngineCardGrid, EngineDetails, type EngineSnapshot, HealthReport, type HistoryDay, Vitals } from "@nasaq/web";
import { useState } from "react";
import { demoVitals, engineReports, historyFor, NOW, recordsFor, reportDays, summaryFor, TODAY, useAr, useEngines, wait } from "./_health-demo";

const Frame = ({ children }: { children: React.ReactNode }) => <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">{children}</div>;

export function EnginesPage() {
  const { snapshots, onAction, ar } = useEngines(undefined);
  return (
    <Frame>
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-h1 text-foreground">{ar ? "محرّكات البروتوكول" : "Protocol engines"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "حالة كل محرّك الآن. اضغط على البطاقة لفتح صفحته." : "Where each engine stands right now. Open a card for its own page."}</p>
      </header>
      <EngineCardGrid>
        {snapshots.map((s) => (
          <EngineCard key={s.engine} snapshot={s} onAction={onAction(s.engine)} detailHref={`#${s.engine}`} />
        ))}
      </EngineCardGrid>
    </Frame>
  );
}

export function EngineDetailsPage({ engine = "hydration" }: { engine?: "hydration" | "caffeine" | "gerd" }) {
  const ar = useAr();
  const { snapshots, onAction } = useEngines(undefined);
  const snapshot = snapshots.find((s) => s.engine === engine) as EngineSnapshot;
  const [days, setDays] = useState(30);
  const [history, setHistory] = useState<HistoryDay[]>(() => historyFor(engine, 30));
  const [loading, setLoading] = useState(false);
  return (
    <Frame>
      <EngineDetails
        snapshot={snapshot}
        onAction={onAction(engine)}
        history={history}
        historyLoading={loading}
        windowDays={days}
        onWindowChange={async (n) => {
          setDays(n);
          setLoading(true);
          await wait(600);
          setHistory(historyFor(engine, n));
          setLoading(false);
        }}
        records={recordsFor(engine, NOW, ar)}
        backHref="#today"
      />
    </Frame>
  );
}

export function DailySummaryPage() {
  const [date, setDate] = useState(TODAY);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DailySummaryData>(() => summaryFor(TODAY));
  const change = async (next: string) => {
    setDate(next);
    setLoading(true);
    await wait(450);
    setSummary(summaryFor(next));
    setLoading(false);
  };
  return (
    <Frame>
      <div className="flex flex-col gap-10">
        <DailySummary summary={summary} date={date} loading={loading} maxDate={TODAY} waterGoalMl={3000} onDateChange={change} />
        <Vitals vitals={demoVitals()} />
      </div>
    </Frame>
  );
}

export function ReportsPage() {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(() => reportDays(30));
  const [engines, setEngines] = useState(() => engineReports(30));
  return (
    <Frame>
      <HealthReport
        days={days}
        engines={engines}
        period={period}
        loading={loading}
        onPeriodChange={async (n) => {
          setPeriod(n);
          setLoading(true);
          await wait(600);
          setDays(reportDays(n));
          setEngines(engineReports(n));
          setLoading(false);
        }}
        onExport={async () => {
          await wait(800);
        }}
      />
    </Frame>
  );
}

