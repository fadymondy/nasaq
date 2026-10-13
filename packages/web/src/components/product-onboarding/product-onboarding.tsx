"use client";

import { CircleCheck, Database } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Alert } from "../alert";
import { type AuthSubmitResult, useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Field, FieldDescription, FieldLabel, Textarea } from "../field";
import { McpConnectApps, type McpConnectAppsProps } from "../mcp-connect";
import { NativeSelect } from "../native-select";
import { SetupWizard, type SetupStep, type SetupWizardLabels } from "../setup-wizard";
import { PRODUCT_ONBOARDING_STEPS, type OnboardingAction, type ProductOnboardingState, type ProductOnboardingStepId, isOptionalStep, onboardingResumeIndex } from "./onboarding-model";
import { parseInviteEmails } from "../onboarding-flow/onboarding-model";

const STRINGS = {
  en: {
    title: "Set up {product}",
    description: "A few steps and you are ready. You can skip any optional step and come back later.",
    workspace: "Your workspace",
    workspaceHint: "Check the name and address people will see.",
    business: "Business basics",
    businessHint: "The details {product} needs to work for you.",
    sampleData: "Sample data",
    sampleDataHint: "Fill {product} with example records to try it out. You can remove them later.",
    loadSample: "Load sample data",
    sampleLoaded: "Sample data is loaded.",
    connect: "Connect your AI",
    connectHint: "Let Claude, ChatGPT or your editor work with {product} for you.",
    invite: "Invite your team",
    inviteHint: "Add the people who work with you. They get an email to join.",
    emails: "Email addresses",
    emailsHint: "Separate addresses with commas or new lines.",
    role: "Role",
    sendInvites: "Send invites",
    invited: "Invites sent to {count}.",
    invalidEmails: "These do not look like email addresses: {list}",
    skipSetup: "Skip setup",
    doneTitle: "{product} is ready",
    doneDescription: "Everything you skipped stays on your dashboard until you finish it.",
    openDashboard: "Open dashboard",
  },
  ar: {
    title: "إعداد {product}",
    description: "خطوات قليلة وتكون جاهزًا. يمكنك تخطّي أي خطوة اختيارية والعودة إليها لاحقًا.",
    workspace: "مساحة العمل",
    workspaceHint: "راجع الاسم والعنوان اللذين سيراهما الناس.",
    business: "أساسيات النشاط",
    businessHint: "البيانات التي يحتاجها {product} ليعمل لك.",
    sampleData: "بيانات تجريبية",
    sampleDataHint: "املأ {product} بسجلات تجريبية لتجربته. يمكنك حذفها لاحقًا.",
    loadSample: "تحميل البيانات التجريبية",
    sampleLoaded: "تم تحميل البيانات التجريبية.",
    connect: "اربط الذكاء الاصطناعي",
    connectHint: "دع Claude أو ChatGPT أو محرّرك يعمل على {product} نيابةً عنك.",
    invite: "ادعُ فريقك",
    inviteHint: "أضف من يعملون معك. ستصلهم رسالة للانضمام.",
    emails: "عناوين البريد",
    emailsHint: "افصل بين العناوين بفاصلة أو سطر جديد.",
    role: "الدور",
    sendInvites: "إرسال الدعوات",
    invited: "أُرسلت الدعوات إلى {count}.",
    invalidEmails: "هذه لا تبدو عناوين بريد: {list}",
    skipSetup: "تخطَّ الإعداد",
    doneTitle: "{product} جاهز",
    doneDescription: "ما تخطّيته يبقى في لوحة التحكم حتى تكمله.",
    openDashboard: "افتح لوحة التحكم",
  },
};

export type ProductOnboardingLabels = (typeof STRINGS)["en"];

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => String(v[k] ?? m));

export interface ProductOnboardingStepBody {
  /** The step's form. */
  content: ReactNode;
  /** `false` holds Continue until the form is valid. */
  ready?: boolean;
  title?: string;
  description?: string;
}

export interface ProductOnboardingProps {
  /** The product name in the current language, used in every sentence. */
  product: string;
  /** Server state from `GET /api/onboarding`. The wizard opens at the first step not completed or skipped. */
  state: ProductOnboardingState;
  /** Step 1: confirm the workspace name, address and language. */
  workspace: ProductOnboardingStepBody;
  /** Step 2: the product's business basics (at most six fields). */
  business: ProductOnboardingStepBody;
  /** Step 3: loads the product's demo records for this workspace. Omit to drop the step. */
  onLoadSampleData?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Step 4: the same props as the AI & MCP settings page. Omit to drop the step. */
  mcp?: Omit<McpConnectAppsProps, "product">;
  /** Step 5: sends invites. Omit to drop the step. */
  onInvite?: (emails: string[], role: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Roles offered in the invite step. The first is the default. */
  roles?: { value: string; label: string }[];
  /** Records progress: `POST /api/onboarding { step, action }`. Resolve `{ error }` to stay on the step. */
  onAction: (step: ProductOnboardingStepId | undefined, action: OnboardingAction) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Where "Open dashboard" and "Skip setup" go. Usually `router.push(dashboardHref)`. */
  onExit: () => void;
  labels?: Partial<ProductOnboardingLabels>;
  wizardLabels?: Partial<SetupWizardLabels>;
  className?: string;
}

/**
 * The first-run flow every Nasaq product shares: workspace → business basics → sample data → connect your AI →
 * invite your team → done. The first two are required, the rest skippable, and progress is saved on the server
 * so people resume where they left. "Skip setup" leaves at any point; the dashboard card brings them back.
 */
export function ProductOnboarding({
  product,
  state,
  workspace,
  business,
  onLoadSampleData,
  mcp,
  onInvite,
  roles,
  onAction,
  onExit,
  labels,
  wizardLabels,
  className,
}: ProductOnboardingProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labels };
  const f = (s: string, v: Record<string, string | number> = {}) => fill(s, { product, ...v });
  const [sampleLoaded, setSampleLoaded] = useState(state.completed.includes("sample-data"));

  const all: (SetupStep & { id: ProductOnboardingStepId })[] = [
    { id: "workspace", title: workspace.title ?? t.workspace, description: workspace.description ?? f(t.workspaceHint), ready: workspace.ready, content: workspace.content },
    { id: "business", title: business.title ?? t.business, description: business.description ?? f(t.businessHint), ready: business.ready, content: business.content },
  ];
  if (onLoadSampleData) {
    all.push({
      id: "sample-data",
      title: t.sampleData,
      description: f(t.sampleDataHint),
      optional: true,
      content: <SampleData loaded={sampleLoaded} label={t.loadSample} loadedLabel={t.sampleLoaded} onLoad={async () => {
        const result = await onLoadSampleData();
        if (!result?.error) setSampleLoaded(true);
        return result;
      }} />,
    });
  }
  if (mcp) all.push({ id: "connect-mcp", title: t.connect, description: f(t.connectHint), optional: true, content: <McpConnectApps product={product} {...mcp} /> });
  if (onInvite) all.push({ id: "invite", title: t.invite, description: t.inviteHint, optional: true, content: <Invite roles={roles} onInvite={onInvite} t={t} /> });
  const steps = all.sort((a, b) => PRODUCT_ONBOARDING_STEPS.indexOf(a.id) - PRODUCT_ONBOARDING_STEPS.indexOf(b.id));
  const ids = steps.map((s) => s.id);

  return (
    <div data-slot="product-onboarding" className={className}>
      <SetupWizard
        steps={steps}
        defaultCurrent={onboardingResumeIndex(ids, state)}
        completed={state.completed.filter((id) => !isOptionalStep(id))}
        onStepComplete={(id) => onAction(id as ProductOnboardingStepId, "complete")}
        onStepSkip={(id) => void onAction(id as ProductOnboardingStepId, "skip")}
        onFinish={() => onAction(undefined, "finish")}
        title={f(t.title)}
        description={t.description}
        doneTitle={f(t.doneTitle)}
        doneDescription={t.doneDescription}
        doneAction={
          <Button variant="primary" onClick={onExit}>
            {t.openDashboard}
          </Button>
        }
        labels={wizardLabels}
      />
      <div className="mx-auto mt-3 flex w-full max-w-4xl justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await onAction(undefined, "dismiss");
            onExit();
          }}
        >
          {t.skipSetup}
        </Button>
      </div>
    </div>
  );
}

function SampleData({ loaded, label, loadedLabel, onLoad }: { loaded: boolean; label: string; loadedLabel: string; onLoad: () => Promise<AuthSubmitResult> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  if (loaded) {
    return (
      <Alert tone="success" icon={CircleCheck}>
        {loadedLabel}
      </Alert>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="secondary"
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          try {
            const result = await onLoad();
            if (result?.error) setError(result.error);
          } finally {
            setPending(false);
          }
        }}
      >
        <Database aria-hidden="true" />
        {label}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}

function Invite({ roles, onInvite, t }: { roles?: { value: string; label: string }[]; onInvite: NonNullable<ProductOnboardingProps["onInvite"]>; t: ProductOnboardingLabels }) {
  const [text, setText] = useState("");
  const [role, setRole] = useState(roles?.[0]?.value ?? "member");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string }>();
  const send = async () => {
    const { valid, invalid } = parseInviteEmails(text);
    if (invalid.length) return setMessage({ tone: "danger", text: fill(t.invalidEmails, { list: invalid.join(", ") }) });
    if (!valid.length) return;
    setPending(true);
    setMessage(undefined);
    try {
      const result = await onInvite(valid, role);
      if (result?.error) setMessage({ tone: "danger", text: result.error });
      else {
        setText("");
        setMessage({ tone: "success", text: fill(t.invited, { count: valid.length }) });
      }
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>{t.emails}</FieldLabel>
        <Textarea dir="ltr" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="name@example.com" />
        <FieldDescription>{t.emailsHint}</FieldDescription>
      </Field>
      {roles && roles.length > 1 ? (
        <Field>
          <FieldLabel>{t.role}</FieldLabel>
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} options={roles} />
        </Field>
      ) : null}
      <div>
        <Button variant="secondary" loading={pending} disabled={!text.trim()} onClick={send}>
          {t.sendInvites}
        </Button>
      </div>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
    </div>
  );
}

export {
  PRODUCT_ONBOARDING_STEPS,
  REQUIRED_ONBOARDING_STEPS,
  type ProductOnboardingStepId,
  type ProductOnboardingState,
  type OnboardingAction,
  isOptionalStep,
  onboardingResumeIndex,
  onboardingOpen,
  applyOnboardingAction,
  onboardingProgress,
} from "./onboarding-model";
