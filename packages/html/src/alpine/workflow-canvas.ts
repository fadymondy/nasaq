// nqWorkflowCanvas: an editable workflow drawn by hand (SVG edges, absolutely positioned nodes, native pointer events;
// there is no graph library). The markup is <x-nq::workflow-canvas>'s; the server renders the toolbar, the panels and the
// icons, this holds the graph, the viewport and the gestures and fills the nodes, edges and panels in.
//
//   <div x-data="nqWorkflowCanvas({ graph, types, categories, runs, versions, direction, saveable, runnable, … })"
//        x-on:nq-workflow-save="$event.detail.waitUntil(fetch('/api/flows', { method: 'PUT', body: JSON.stringify($event.detail.graph) }))">…</div>
//
// Events, all dispatched from the root and bubbling:
//   nq-workflow-change   detail: { graph }                    after every edit
//   nq-workflow-save     detail: { graph, waitUntil(promise) } resolve { error } or reject to show the message
//   nq-workflow-run      detail: { graph, waitUntil(promise) } the same
//   nq-workflow-restore  detail: { version, waitUntil(promise) } restoring a version; on success the canvas adopts its graph
//
// The canvas is always left-to-right (it is a diagram); the toolbar, panels and node text follow the page direction.

import type { Magics, Register } from "./types";
import {
  addStep,
  autoLayout,
  canConnect,
  clampZoom,
  edgeGeometry,
  fieldText,
  firstFilled,
  fitTransform,
  inputPoint,
  minimapColor,
  nodeBounds,
  nodeHeight,
  NODE_WIDTH,
  outputPoint,
  pickerGroups,
  removeNodes,
  runAtStep,
  runOrder,
  typeMap,
  uid,
  validateWorkflow,
  withPositions,
  zoomAt,
  type Bounds,
  type Pt,
  type ViewTransform,
  type WorkflowDirection,
  type WorkflowGraph,
  type WorkflowIssue,
  type WorkflowRun,
  type WorkflowStepType,
  type WorkflowVersion,
} from "./workflow-canvas-logic";

interface Config {
  graph?: WorkflowGraph;
  types?: WorkflowStepType[];
  categories?: { id: string; label: string }[];
  runs?: (WorkflowRun & { dateHtml?: string })[];
  versions?: (WorkflowVersion & { dateHtml?: string })[];
  currentVersion?: number;
  direction?: WorkflowDirection;
  readOnly?: boolean;
  saveable?: boolean;
  runnable?: boolean;
  restorable?: boolean;
  defaultRunId?: string | null;
  rtl?: boolean;
  /** type id (and "__unknown") to the rendered icon. */
  icons?: Record<string, string>;
  /** Rendered status glyphs by status. */
  glyphs?: Record<string, string>;
  /** Border classes by status (listed in the Blade file so Tailwind sees them). */
  border?: Record<string, string>;
  tone?: Record<string, string>;
  t?: Record<string, unknown>;
}
interface PanelState {
  kind: "" | "picker" | "config" | "runs" | "versions";
  id?: string;
  after?: { sourceId: string; sourceHandle?: string | null };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = Magics & Record<string, any>;

const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fill = (s: unknown, vars: Record<string, string | number>) => Object.entries(vars).reduce((out, [k, v]) => out.split(`:${k}`).join(String(v)), String(s ?? ""));
const THRESHOLD = 4;
const MINI_W = 160;
const STROKE = { ran: "var(--nq-success)", dim: "var(--nq-line)", plain: "var(--nq-line-strong)" } as const;

export const workflowCanvas: Register = (Alpine) => {
  Alpine.data("nqWorkflowCanvas", (cfg: Config = {}) => {
    const types = cfg.types ?? [];
    const typeById = typeMap(types);
    const t = (cfg.t ?? {}) as Record<string, string> & { issue: Record<string, string>; status: Record<string, string> };
    const unknownType = String(t.unknownType ?? "");
    const direction: WorkflowDirection = cfg.direction === "vertical" ? "vertical" : "horizontal";
    const horizontal = direction === "horizontal";
    const marker = `nq-wf-arrow-${Math.random().toString(36).slice(2, 8)}`;
    const nf = new Intl.NumberFormat(cfg.rtl ? "ar" : "en", { maximumFractionDigits: 1 });
    const num = (n: number) => nf.format(n);
    const outputsOf = (typeId: string) => (typeById.get(typeId)?.outputs?.length ? typeById.get(typeId)!.outputs! : [{ id: "", label: "" }]);
    const duration = (ms: number) => (ms < 1000 ? fill(t.milliseconds, { n: num(Math.round(ms)) }) : ms < 60_000 ? fill(t.seconds, { n: num(ms / 1000) }) : fill(t.minutes, { n: num(ms / 60_000) }));

    // Kept out of the reactive state: timers, listeners and what is being dragged.
    let stopGesture: (() => void) | undefined;
    let suppressClick = false;
    let replayTimer: ReturnType<typeof setTimeout> | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let lastShown: WorkflowGraph = { nodes: [], edges: [] };
    let lastRun: WorkflowRun | undefined;
    let lastOrder: string[] = [];

    return {
      root: null as unknown as HTMLElement,
      graph: withPositions(cfg.graph ?? { nodes: [], edges: [] }, direction) as WorkflowGraph,
      dirty: false,
      panelState: { kind: "" } as PanelState,
      panelKind: "",
      cfgTab: "settings",
      selectedEdge: null as string | null,
      hoverEdge: null as string | null,
      locked: false,
      busy: "",
      message: "",
      runId: cfg.defaultRunId ?? null,
      cursor: null as number | null,
      previewV: null as (WorkflowVersion & { dateHtml?: string }) | null,
      view: { x: 0, y: 0, k: 1 } as ViewTransform,
      size: { w: 0, h: 0 },
      animate: false,
      dragPos: {} as Record<string, Pt>,
      connecting: null as { sourceId: string; handle: string | null; from: Pt; to: Pt } | null,
      q: "",
      active: 0,
      drafts: {} as Record<string, string>,
      confirmV: null as (WorkflowVersion & { dateHtml?: string }) | null,
      confirmOpen: false,
      restoreBusy: false,
      restoreError: "",
      cfg,
      t,
      rtl: Boolean(cfg.rtl),
      horizontal,
      // ---- derived, set by recompute() ----
      editable: !cfg.readOnly,
      nodes: [] as unknown[],
      edgeLabels: [] as unknown[],
      edgeSvg: "",
      miniSvg: "",
      miniView: "0 0 1 1",
      problems: [] as { key: string; text: string; nodeId?: string; error: boolean }[],
      errorCount: 0,
      zoomPct: "100",
      canvasStyle: "",
      surfaceStyle: "",
      worldStyle: "",
      empty: true,
      version: cfg.currentVersion ?? (cfg.versions?.length ? Math.max(...cfg.versions.map((v) => v.version)) : 0),
      pickerTypesCount: 0,
      pickerHint: "",
      pickerGroupsVm: [] as unknown[],
      pickerEmpty: false,
      cfgVm: null as Record<string, unknown> | null,
      fields: [] as unknown[],
      otherIssues: [] as string[],
      runsVm: [] as unknown[],
      versionsVm: [] as unknown[],
      replayLabel: "",
      runBar: null as null | { status: string; tone: string; glyph: string; label: string; duration: string; progress: string },
      previewText: "",
      previewing: false,
      pickerNone: "",
      problemsText: "",
      saveDisabled: false,
      runDisabled: false,
      nextHandle: null as string | null,
      confirmTitle: "",

      init(this: S) {
        this.root = this.$el;
        this.recompute();
        this.$nextTick(() => {
          this.fit(0.25, false);
          const surface = this.$refs.surface;
          if (surface && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => this.measureSize());
            resizeObserver.observe(surface);
          }
        });
      },
      destroy() {
        clearTimeout(replayTimer);
        resizeObserver?.disconnect();
        stopGesture?.();
      },

      /* ---- view model ---- */
      recompute(this: S) {
        const shown: WorkflowGraph = this.previewV ? withPositions(this.previewV.graph, direction) : this.graph;
        lastShown = shown;
        this.previewing = this.previewV !== null;
        this.editable = !cfg.readOnly && !this.previewing;
        const issues = validateWorkflow(shown, typeById);
        this.errorCount = issues.filter((i) => i.level === "error").length;
        this.saveDisabled = !this.dirty || this.busy !== "";
        this.runDisabled = this.errorCount > 0 || this.busy !== "";
        const nameOf = (i: WorkflowIssue) => {
          const n = shown.nodes.find((x) => x.id === i.nodeId);
          return n ? n.label?.trim() || typeById.get(n.type)?.label || unknownType : "";
        };
        const fieldLabel = (i: WorkflowIssue) => {
          const n = shown.nodes.find((x) => x.id === i.nodeId);
          return typeById.get(n?.type ?? "")?.fields?.find((f) => f.name === i.field)?.label ?? String(i.field ?? "");
        };
        const say = (i: WorkflowIssue, node: string, field: string) => fill(t.issue[i.code], { node, field });
        this.problems = issues
          .filter((i) => i.level === "error" || i.level === "warning")
          .map((i, k) => ({ key: `${i.code}-${i.nodeId ?? ""}-${k}`, text: say(i, nameOf(i), fieldLabel(i)), nodeId: i.nodeId, error: i.level === "error" }));

        this.problemsText = fill(t.problems, { n: num(this.problems.length) });
        const baseRun = this.runId ? cfg.runs?.find((r) => r.id === this.runId) : undefined;
        const run: WorkflowRun | undefined = baseRun && this.cursor !== null ? runAtStep(shown, baseRun, this.cursor) : baseRun;
        const order = baseRun ? runOrder(shown, baseRun) : [];
        lastRun = run;
        lastOrder = order;
        this.runBar = run
          ? {
              status: run.status,
              tone: cfg.tone?.[run.status] ?? "",
              glyph: cfg.glyphs?.[run.status] ?? "",
              label: t.status[run.status] ?? "",
              duration: baseRun?.durationMs !== undefined && this.cursor === null ? duration(baseRun.durationMs) : "",
              progress: this.cursor !== null ? `${num(Math.min(this.cursor + 1, order.length))} / ${num(order.length)}` : "",
            }
          : null;
        this.previewText = this.previewV ? fill(t.previewing, { v: num(this.previewV.version) }) : "";

        const posOf = (id: string, fallback?: Pt): Pt => this.dragPos[id] ?? fallback ?? { x: 0, y: 0 };
        const boxes = shown.nodes.map((n) => ({ id: n.id, ...posOf(n.id, n.position), w: NODE_WIDTH, h: nodeHeight(outputsOf(n.type).length), status: run?.nodes[n.id]?.status as string | undefined }));

        // nodes
        const hasTrigger = shown.nodes.some((n) => typeById.get(n.type)?.role === "trigger");
        this.nodes = shown.nodes.map((n) => {
          const type = typeById.get(n.type);
          const outs = outputsOf(n.type);
          const nr = run?.nodes[n.id];
          const status = nr?.status ?? "idle";
          const mine = issues.filter((i) => i.nodeId === n.id);
          const errs = mine.filter((i) => i.level === "error");
          const title = n.label?.trim() || type?.label || unknownType;
          const first = errs[0] ?? mine[0];
          const detail = nr ? [nr.durationMs !== undefined ? duration(nr.durationMs) : null, nr.items !== undefined ? `${num(nr.items)} ${String(t.items).toLowerCase()}` : null].filter(Boolean).join(" · ") : "";
          const used = shown.edges.filter((e) => e.source === n.id).map((e) => e.sourceHandle ?? "");
          const p = posOf(n.id, n.position);
          const frac = (i: number) => ((i + 1) / (outs.length + 1)) * 100;
          return {
            id: n.id,
            type: n.type,
            left: `${p.x}px`,
            top: `${p.y}px`,
            size: `width:${NODE_WIDTH}px;height:${nodeHeight(outs.length)}px`,
            trigger: type?.role === "trigger",
            status,
            statusLabel: t.status[status] ?? "",
            border: cfg.border?.[status] ?? "",
            tone: cfg.tone?.[status] ?? "",
            hasRun: Boolean(nr),
            glyph: cfg.glyphs?.[status] ?? "",
            selected: this.panelState.kind === "config" && this.panelState.id === n.id,
            editable: this.editable,
            title,
            subtitle: firstFilled(n, type) ?? (n.label ? type?.label : type?.description) ?? "",
            detail,
            icon: cfg.icons?.[n.type] ?? cfg.icons?.__unknown ?? "",
            issueCount: mine.length,
            showIssue: !nr && mine.length > 0,
            hasError: errs.length > 0,
            errorIdle: errs.length > 0 && status === "idle",
            issueLabel: first ? say(first, title, String(first.field ?? "")) : "",
            branching: outs.length > 1,
            horizontal,
            outputs: outs.map((o, i) => ({
              id: o.id,
              label: o.label,
              used: used.includes(o.id),
              handleStyle: horizontal ? `top:${frac(i)}%;left:100%;transform:translate(-50%,-50%)` : `left:${frac(i)}%;top:100%;transform:translate(-50%,-50%)`,
              labelStyle: horizontal ? `top:${frac(i)}%` : `left:${frac(i)}%`,
              addStyle: horizontal ? `top:${frac(i)}%;left:calc(100% + 14px)` : `left:${frac(i)}%;top:calc(100% + 14px)`,
              addLabel: fill(t.addAfter, { name: title }),
            })),
          };
        });
        this.empty = shown.nodes.length === 0;

        // edges: the SVG is one string (a <template x-for> cannot live inside an <svg>), the labels and "+" buttons are HTML
        const drawn = shown.edges.flatMap((e) => {
          const sNode = shown.nodes.find((n) => n.id === e.source);
          const tNode = shown.nodes.find((n) => n.id === e.target);
          if (!sNode || !tNode) return [];
          const outs = outputsOf(sNode.type);
          const i = Math.max(0, outs.findIndex((o) => o.id === (e.sourceHandle ?? "")));
          const g = edgeGeometry(
            outputPoint(posOf(sNode.id, sNode.position), nodeHeight(outs.length), direction, i, outs.length),
            inputPoint(posOf(tNode.id, tNode.position), nodeHeight(outputsOf(tNode.type).length), direction),
            direction,
          );
          const src = run?.nodes[e.source];
          const dst = run?.nodes[e.target];
          const ran = Boolean(src && dst);
          const named = typeById.get(sNode.type)?.outputs?.find((o) => o.id === (e.sourceHandle ?? ""))?.label || undefined;
          return [
            {
              id: e.id,
              ...g,
              text: run && src?.items !== undefined && ran ? num(src.items) : (e.label ?? named),
              live: Boolean(run && src?.status === "success" && dst?.status === "running"),
              tone: (run ? (ran ? "ran" : "dim") : "plain") as keyof typeof STROKE,
              selected: this.selectedEdge === e.id,
              showInsert: this.editable && (this.hoverEdge === e.id || this.selectedEdge === e.id),
            },
          ];
        });
        const defs = (Object.keys(STROKE) as (keyof typeof STROKE)[])
          .map((tone) => `<marker id="${marker}-${tone}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="16" markerHeight="16" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${STROKE[tone]}"/></marker>`)
          .join("");
        const paths = drawn
          .map(
            (e) =>
              `<g data-slot="workflow-edge" data-edge-id="${esc(e.id)}"${e.selected ? ' data-selected="true"' : ""}>` +
              `<path d="${e.path}" fill="none" stroke="${e.selected ? "var(--nq-focus)" : STROKE[e.tone]}" stroke-width="1.5"${e.live ? ' stroke-dasharray="6 4" class="nq-edge-live"' : ""} marker-end="url(#${marker}-${e.tone})"/>` +
              `<path d="${e.path}" fill="none" stroke="transparent" stroke-width="24" style="pointer-events:stroke;cursor:pointer"/></g>`,
          )
          .join("");
        const c = this.connecting as { from: Pt; to: Pt } | null;
        const live = c ? `<path d="${edgeGeometry(c.from, c.to, direction).path}" fill="none" stroke="var(--nq-focus)" stroke-width="1.5" stroke-dasharray="4 3"/>` : "";
        this.edgeSvg = `<defs>${defs}</defs>${paths}${live}`;
        this.edgeLabels = drawn
          .filter((e) => e.text || e.showInsert)
          .map((e) => ({ id: e.id, style: `left:${e.mid.x}px;top:${e.mid.y}px;transform:translate(-50%,-50%);pointer-events:${e.showInsert ? "auto" : "none"}`, text: e.text ?? "", showText: Boolean(e.text) && !e.showInsert, showInsert: e.showInsert }));

        // minimap
        const vp: Bounds = { x: -this.view.x / this.view.k, y: -this.view.y / this.view.k, w: this.size.w / this.view.k, h: this.size.h / this.view.k };
        const all = nodeBounds([...boxes, ...(this.size.w > 0 ? [vp] : [])]) ?? { x: 0, y: 0, w: 1, h: 1 };
        const pad = Math.max(all.w, all.h) * 0.08;
        const mb = { x: all.x - pad, y: all.y - pad, w: all.w + pad * 2, h: all.h + pad * 2 };
        this.miniView = `${mb.x} ${mb.y} ${mb.w} ${mb.h}`;
        this.miniSvg =
          boxes.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${minimapColor(b.status)}"/>`).join("") +
          (this.size.w > 0 ? `<rect x="${vp.x}" y="${vp.y}" width="${vp.w}" height="${vp.h}" fill="color-mix(in oklab, var(--nq-bg) 70%, transparent)" stroke="var(--nq-focus)" stroke-width="${mb.w / MINI_W}"/>` : "");

        // viewport
        this.zoomPct = num(Math.round(this.view.k * 100));
        this.surfaceStyle = `background-image:radial-gradient(circle, var(--nq-line) 1.2px, transparent 1.2px);background-size:${20 * this.view.k}px ${20 * this.view.k}px;background-position:${this.view.x}px ${this.view.y}px`;
        this.worldStyle = `transform:translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.k})`;

        // panels
        const kind = this.panelState.kind as string;
        this.panelKind = kind === "config" && !shown.nodes.some((n) => n.id === this.panelState.id) ? "" : kind;
        const pickerTypes = types.filter((s) => (hasTrigger ? s.role !== "trigger" : s.role === "trigger"));
        this.pickerTypesCount = pickerTypes.length;
        const after = this.panelState.kind === "picker" ? this.panelState.after : undefined;
        const afterNode = after ? shown.nodes.find((n) => n.id === after.sourceId) : undefined;
        const afterName = afterNode ? afterNode.label?.trim() || typeById.get(afterNode.type)?.label : undefined;
        this.pickerHint = afterName ? fill(t.pickerAfter, { name: afterName }) : t.pickerStart;
        let idx = 0;
        const groups = pickerGroups(pickerTypes, cfg.categories, this.q).map((g) => ({
          id: g.id,
          label: g.label,
          steps: g.steps.map((s) => ({ id: s.id, label: s.label, description: s.description ?? "", icon: cfg.icons?.[s.id] ?? cfg.icons?.__unknown ?? "", idx: idx++, active: false })),
        }));
        const flat = groups.flatMap((g) => g.steps);
        this.active = Math.max(0, Math.min(this.active, flat.length - 1));
        for (const s of flat) s.active = s.idx === this.active;
        this.pickerGroupsVm = groups;
        this.pickerEmpty = groups.length === 0;
        this.pickerNone = fill(t.pickerNone, { q: this.q });

        const node = this.panelState.kind === "config" ? shown.nodes.find((n) => n.id === this.panelState.id) : undefined;
        if (node) {
          const type = typeById.get(node.type);
          const mine = issues.filter((i) => i.nodeId === node.id);
          const missing = new Set(mine.filter((i) => i.code === "missing-field").map((i) => i.field));
          const title = node.label?.trim() || type?.label || unknownType;
          const nr = run?.nodes[node.id];
          const nextHandle = type?.outputs?.find((o) => !shown.edges.some((e) => e.source === node.id && (e.sourceHandle ?? "") === o.id))?.id ?? null;
          this.nextHandle = nextHandle;
          this.cfgVm = {
            title,
            hint: type?.description ?? "",
            icon: cfg.icons?.[node.type] ?? cfg.icons?.__unknown ?? "",
            name: node.label ?? "",
            namePlaceholder: type?.label ?? "",
            readOnly: !this.editable,
            canRemove: this.editable,
            canAddNext: this.editable,
            noFields: Boolean(type) && (type?.fields?.length ?? 0) === 0,
            hasRun: Boolean(nr),
            status: nr?.status ?? "idle",
            statusLabel: nr ? (t.status[nr.status] ?? "") : "",
            tone: cfg.tone?.[nr?.status ?? "idle"] ?? "",
            glyph: nr ? (cfg.glyphs?.[nr.status] ?? "") : "",
            duration: nr?.durationMs !== undefined ? duration(nr.durationMs) : "",
            items: nr?.items !== undefined ? num(nr.items) : "",
            error: nr?.error ?? "",
            output: nr && nr.output !== undefined ? JSON.stringify(nr.output, null, 2) : "",
          };
          this.fields = (type?.fields ?? []).map((f) => {
            const raw = node.config[f.name];
            const text = this.drafts[`${node.id}:${f.name}`] ?? fieldText(raw);
            return {
              name: f.name,
              label: f.label,
              kind: f.kind,
              required: Boolean(f.required),
              placeholder: f.placeholder ?? "",
              help: f.help ?? "",
              options: f.options ?? [],
              invalid: missing.has(f.name),
              text,
              checked: Boolean(raw),
              disabled: !this.editable,
              isBool: f.kind === "boolean",
              isSelect: f.kind === "select",
              isArea: f.kind === "textarea" || f.kind === "code",
              isCode: f.kind === "code",
              isInput: !["boolean", "select", "textarea", "code"].includes(f.kind),
              inputType: f.kind === "number" ? "number" : "text",
              inputMode: f.kind === "number" ? "decimal" : f.kind === "url" ? "url" : "",
              ltr: f.kind === "url" || f.kind === "number",
            };
          });
          this.otherIssues = mine.filter((i) => i.code !== "missing-field").map((i) => say(i, title, ""));
        } else {
          this.cfgVm = null;
          this.fields = [];
          this.otherIssues = [];
        }

        const runs = [...(cfg.runs ?? [])].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        this.runsVm = runs.map((r) => ({
          id: r.id,
          status: r.status,
          statusLabel: t.status[r.status] ?? "",
          tone: cfg.tone?.[r.status] ?? "",
          glyph: cfg.glyphs?.[r.status] ?? "",
          dateHtml: r.dateHtml ?? "",
          trigger: r.trigger ?? "",
          duration: r.durationMs !== undefined ? duration(r.durationMs) : "",
          selected: r.id === this.runId,
        }));
        this.replayLabel = this.cursor !== null ? t.stopReplay : t.replay;

        const versions = [...(cfg.versions ?? [])].sort((a, b) => b.version - a.version);
        this.versionsVm = versions.map((v) => ({
          version: v.version,
          label: fill(t.versionLabel, { v: num(v.version) }),
          current: v.version === this.version,
          previewing: this.previewV?.version === v.version,
          dateHtml: v.dateHtml ?? "",
          by: v.author ? fill(t.by, { name: v.author }) : "",
          note: v.note ?? "",
          canRestore: v.version !== this.version && Boolean(cfg.restorable),
        }));
        this.confirmTitle = this.confirmV ? fill(t.restoreTitle, { v: num(this.confirmV.version) }) : "";
      },

      /* ---- viewport ---- */
      measureSize(this: S) {
        const el = this.$refs.surface;
        if (!el) return;
        this.size = { w: el.clientWidth, h: el.clientHeight };
        this.recompute();
      },
      boxesNow(this: S): Bounds[] {
        return lastShown.nodes.map((n) => ({ x: (this.dragPos[n.id] ?? n.position ?? { x: 0, y: 0 }).x, y: (this.dragPos[n.id] ?? n.position ?? { x: 0, y: 0 }).y, w: NODE_WIDTH, h: nodeHeight(outputsOf(n.type).length) }));
      },
      fit(this: S, padding = 0.25, withAnimation = true) {
        const el = this.$refs.surface;
        if (el) this.size = { w: el.clientWidth, h: el.clientHeight };
        this.animate = withAnimation;
        this.view = fitTransform(nodeBounds(this.boxesNow()), this.size.w, this.size.h, padding, 1);
        this.recompute();
        if (withAnimation) setTimeout(() => (this.animate = false), 320);
      },
      zoomBy(this: S, factor: number) {
        const el = this.$refs.surface;
        if (el) this.size = { w: el.clientWidth, h: el.clientHeight };
        this.animate = true;
        this.view = zoomAt(this.view, this.view.k * factor, this.size.w / 2, this.size.h / 2);
        this.recompute();
        setTimeout(() => (this.animate = false), 200);
      },
      toggleLock(this: S) {
        this.locked = !this.locked;
      },
      clientToWorld(this: S, cx: number, cy: number): Pt {
        const r = this.$refs.surface?.getBoundingClientRect();
        return { x: (cx - (r?.left ?? 0) - this.view.x) / this.view.k, y: (cy - (r?.top ?? 0) - this.view.y) / this.view.k };
      },
      onWheel(this: S, e: WheelEvent) {
        if (this.locked) return;
        e.preventDefault();
        const r = this.$refs.surface!.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        this.view = zoomAt(this.view, this.view.k * factor, e.clientX - r.left, e.clientY - r.top);
        this.recompute();
      },

      /* ---- pointer gestures: pan, drag a node, draw a connection ---- */
      track(this: S, start: PointerEvent, onMove: (dx: number, dy: number, e: PointerEvent) => void, onEnd: (moved: boolean, e: PointerEvent) => void) {
        stopGesture?.();
        let moved = false;
        const move = (e: PointerEvent) => {
          const dx = e.clientX - start.clientX;
          const dy = e.clientY - start.clientY;
          if (!moved && Math.hypot(dx, dy) < THRESHOLD) return;
          moved = true;
          onMove(dx, dy, e);
        };
        const up = (e: PointerEvent) => {
          stopGesture?.();
          if (moved) {
            suppressClick = true;
            setTimeout(() => (suppressClick = false), 0);
          }
          onEnd(moved, e);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        stopGesture = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          stopGesture = undefined;
        };
      },
      panDown(this: S, e: PointerEvent) {
        if (e.button !== 0 || this.locked) return;
        if ((e.target as HTMLElement).closest("[data-slot=workflow-node],[data-flow-ui]")) return;
        const origin = { ...this.view };
        this.track(
          e,
          (dx: number, dy: number) => {
            this.view = { ...origin, x: origin.x + dx, y: origin.y + dy };
            this.recompute();
          },
          () => undefined,
        );
      },
      nodeDown(this: S, id: string, e: PointerEvent) {
        if (e.button !== 0 || !this.editable || this.locked) return;
        const n = lastShown.nodes.find((x) => x.id === id);
        if (!n) return;
        const origin = this.dragPos[id] ?? n.position ?? { x: 0, y: 0 };
        this.track(
          e,
          (dx: number, dy: number) => {
            this.dragPos = { ...this.dragPos, [id]: { x: origin.x + dx / this.view.k, y: origin.y + dy / this.view.k } };
            this.recompute();
          },
          (moved: boolean) => {
            const dropped = this.dragPos[id];
            if (moved && dropped) this.commit({ ...this.graph, nodes: this.graph.nodes.map((x: WorkflowGraph["nodes"][number]) => (x.id === id ? { ...x, position: { ...dropped } } : x)) });
            this.dragPos = {};
            this.recompute();
          },
        );
      },
      connectDown(this: S, sourceId: string, handle: string | null, e: PointerEvent) {
        if (e.button !== 0 || !this.editable) return;
        const n = lastShown.nodes.find((x) => x.id === sourceId);
        if (!n) return;
        const outs = outputsOf(n.type);
        const i = Math.max(0, outs.findIndex((o) => o.id === (handle ?? "")));
        const from = outputPoint(this.dragPos[sourceId] ?? n.position ?? { x: 0, y: 0 }, nodeHeight(outs.length), direction, i, outs.length);
        this.connecting = { sourceId, handle, from, to: from };
        this.track(
          e,
          (_dx: number, _dy: number, ev: PointerEvent) => {
            if (this.connecting) this.connecting = { ...this.connecting, to: this.clientToWorld(ev.clientX, ev.clientY) };
            this.recompute();
          },
          (moved: boolean, ev: PointerEvent) => {
            this.connecting = null;
            this.recompute();
            if (!moved) return;
            const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-node-id]")?.dataset.nodeId;
            if (target) this.connect(sourceId, target, handle);
          },
        );
      },
      connect(this: S, source: string, target: string, handle: string | null) {
        if (!this.editable) return;
        if (!canConnect(this.graph, typeById, source, target, handle)) return;
        if (this.graph.edges.some((e: { source: string; target: string; sourceHandle?: string | null }) => e.source === source && e.target === target && (e.sourceHandle ?? null) === handle)) return;
        this.commit({ ...this.graph, edges: [...this.graph.edges, { id: uid("e"), source, target, sourceHandle: handle }] });
      },
      miniDown(this: S, e: PointerEvent) {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const [bx, by, bw, bh] = String(this.miniView).split(" ").map(Number) as [number, number, number, number];
        const s = Math.max(bw / r.width, bh / r.height);
        const cx = bx + bw / 2 + (e.clientX - r.left - r.width / 2) * s;
        const cy = by + bh / 2 + (e.clientY - r.top - r.height / 2) * s;
        this.view = { ...this.view, x: this.size.w / 2 - cx * this.view.k, y: this.size.h / 2 - cy * this.view.k };
        this.recompute();
      },

      /* ---- editing ---- */
      commit(this: S, next: WorkflowGraph) {
        this.graph = next;
        this.dirty = true;
        this.message = "";
        this.recompute();
        this.root.dispatchEvent(new CustomEvent("nq-workflow-change", { bubbles: true, detail: { graph: JSON.parse(JSON.stringify(next)) } }));
      },
      setPanel(this: S, p: PanelState) {
        this.panelState = p;
        this.panelKind = p.kind;
        this.recompute();
      },
      togglePanel(this: S, kind: PanelState["kind"]) {
        this.q = "";
        this.setPanel(this.panelState.kind === kind ? { kind: "" } : { kind });
      },
      closePanel(this: S) {
        this.setPanel({ kind: "" });
      },
      openPicker(this: S, after?: { sourceId: string; sourceHandle?: string | null }) {
        this.q = "";
        this.active = 0;
        this.setPanel(after ? { kind: "picker", after: { ...after } } : { kind: "picker" });
      },
      selectNode(this: S, id: string) {
        this.cfgTab = lastRun?.nodes[id] ? "output" : "settings";
        this.drafts = {};
        this.selectedEdge = null;
        this.setPanel({ kind: "config", id });
      },
      goIssue(this: S, p: { nodeId?: string }) {
        if (p.nodeId) this.selectNode(p.nodeId);
      },
      nodeClick(this: S, id: string) {
        if (suppressClick) return;
        this.selectNode(id);
      },
      nodeKey(this: S, id: string, e: KeyboardEvent) {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.selectNode(id);
        }
      },
      edgeClick(this: S, e: MouseEvent) {
        if (suppressClick) return;
        const id = (e.target as Element).closest<HTMLElement | SVGElement>("[data-edge-id]")?.getAttribute("data-edge-id");
        if (!id) return;
        this.selectedEdge = id;
        this.recompute();
      },
      edgeOver(this: S, e: Event, over: boolean) {
        const id = (e.target as Element).closest?.("[data-edge-id]")?.getAttribute("data-edge-id") ?? null;
        if (over && id) this.hoverEdge = id;
        else if (!over && id && this.hoverEdge === id) this.hoverEdge = null;
        else return;
        this.recompute();
      },
      setHover(this: S, id: string | null) {
        this.hoverEdge = id;
        this.recompute();
      },
      paneClick(this: S, e: MouseEvent) {
        if (suppressClick) return;
        if ((e.target as HTMLElement).closest("[data-slot=workflow-node],[data-flow-ui],[data-edge-id]")) return;
        this.selectedEdge = null;
        if (this.panelState.kind === "config") this.panelState = { kind: "" };
        this.recompute();
      },
      insertOnEdge(this: S, id: string) {
        const ed = this.graph.edges.find((x: { id: string }) => x.id === id);
        if (ed) this.openPicker({ sourceId: ed.source, sourceHandle: ed.sourceHandle ?? null });
      },
      pick(this: S, typeId: string) {
        const after = this.panelState.kind === "picker" ? this.panelState.after : undefined;
        const res = addStep(this.graph, typeById, typeId, after, direction);
        this.commit(res.graph);
        this.selectNode(res.id);
        setTimeout(() => this.fit(0.3), 60);
      },
      pickerKey(this: S, e: KeyboardEvent) {
        const flat = (this.pickerGroupsVm as { steps: { id: string; idx: number }[] }[]).flatMap((g) => g.steps);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this.active = Math.min(this.active + 1, flat.length - 1);
          this.recompute();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          this.active = Math.max(this.active - 1, 0);
          this.recompute();
        } else if (e.key === "Enter" && flat[this.active]) {
          e.preventDefault();
          this.pick(flat[this.active]!.id);
        }
      },
      setQuery(this: S, value: string) {
        this.q = value;
        this.active = 0;
        this.recompute();
      },
      hoverStep(this: S, idx: number) {
        this.active = idx;
        this.recompute();
      },
      patchNode(this: S, patch: { label?: string; config?: Record<string, unknown> }) {
        const id = this.panelState.id;
        this.commit({ ...this.graph, nodes: this.graph.nodes.map((n: WorkflowGraph["nodes"][number]) => (n.id === id ? { ...n, ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.config ? { config: patch.config } : {}) } : n)) });
      },
      setLabel(this: S, value: string) {
        this.patchNode({ label: value });
      },
      setField(this: S, name: string, value: unknown, kind?: string) {
        const node = this.graph.nodes.find((n: { id: string }) => n.id === this.panelState.id);
        if (!node) return;
        let next = value;
        if (kind === "number") {
          this.drafts[`${node.id}:${name}`] = String(value);
          next = value === "" || value === undefined ? "" : Number(value);
        }
        if (JSON.stringify(node.config[name]) === JSON.stringify(next) && kind !== "number") return;
        this.patchNode({ config: { ...node.config, [name]: next } });
      },
      toggleField(this: S, name: string) {
        const node = this.graph.nodes.find((n: { id: string }) => n.id === this.panelState.id);
        if (node && this.editable) this.setField(name, !node.config[name]);
      },
      removeNode(this: S, id: string) {
        this.commit(removeNodes(this.graph, [id]));
        this.setPanel({ kind: "" });
      },
      removeEdge(this: S, id: string) {
        this.commit({ ...this.graph, edges: this.graph.edges.filter((e: { id: string }) => e.id !== id) });
        this.selectedEdge = null;
        this.recompute();
      },
      addNext(this: S) {
        this.openPicker({ sourceId: this.panelState.id, sourceHandle: this.nextHandle ?? null });
      },
      tidy(this: S) {
        const laid = autoLayout(this.graph, direction);
        this.commit({ ...this.graph, nodes: this.graph.nodes.map((n: WorkflowGraph["nodes"][number]) => ({ ...n, position: laid.get(n.id) ?? n.position ?? { x: 0, y: 0 } })) });
        setTimeout(() => this.fit(0.25), 60);
      },
      async request(this: S, kind: "save" | "run") {
        this.busy = kind;
        this.message = "";
        this.recompute();
        const pending: unknown[] = [];
        const graph = JSON.parse(JSON.stringify(this.graph));
        this.root.dispatchEvent(new CustomEvent(`nq-workflow-${kind}`, { bubbles: true, detail: { graph, waitUntil: (p: unknown) => void pending.push(p) } }));
        let error = "";
        try {
          const results = await Promise.all(pending);
          const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
          if (failed) error = failed.error;
        } catch (e) {
          error = e instanceof Error && e.message ? e.message : String(t.failed);
        } finally {
          this.busy = "";
        }
        if (error) this.message = error;
        else if (kind === "save") this.dirty = false;
        this.recompute();
      },
      save(this: S) {
        return this.request("save");
      },
      startRun(this: S) {
        return this.request("run");
      },
      onKey(this: S, e: KeyboardEvent) {
        if (!this.editable || (e.key !== "Delete" && e.key !== "Backspace")) return;
        if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable=true], [role=combobox], [data-slot=workflow-side-panel]")) return;
        if (this.selectedEdge) this.removeEdge(this.selectedEdge);
        else if (this.panelState.kind === "config") this.removeNode(this.panelState.id);
      },

      /* ---- executions and versions ---- */
      selectRun(this: S, id: string | null) {
        this.runId = id === this.runId ? null : id;
        this.cursor = null;
        clearTimeout(replayTimer);
        this.recompute();
      },
      clearRun(this: S) {
        this.runId = null;
        this.cursor = null;
        clearTimeout(replayTimer);
        this.recompute();
      },
      toggleReplay(this: S) {
        if (this.cursor !== null) {
          this.cursor = null;
          clearTimeout(replayTimer);
          this.recompute();
        } else {
          this.cursor = 0;
          this.recompute();
          this.scheduleReplay();
        }
      },
      scheduleReplay(this: S) {
        clearTimeout(replayTimer);
        if (this.cursor === null) return;
        if (this.cursor > lastOrder.length) {
          this.cursor = null;
          this.recompute();
          return;
        }
        replayTimer = setTimeout(() => {
          if (this.cursor === null) return;
          this.cursor += 1;
          this.recompute();
          this.scheduleReplay();
        }, 650);
      },
      previewVersion(this: S, version: number) {
        const v = cfg.versions?.find((x) => x.version === version);
        const clear = !v || version === this.version || this.previewV?.version === version;
        this.previewV = clear ? null : v;
        this.recompute();
        setTimeout(() => this.fit(0.25), 80);
      },
      exitPreview(this: S) {
        this.previewV = null;
        this.recompute();
        setTimeout(() => this.fit(0.25), 80);
      },
      askRestore(this: S, version: number) {
        this.confirmV = cfg.versions?.find((x) => x.version === version) ?? null;
        this.restoreError = "";
        this.recompute();
        this.confirmOpen = this.confirmV !== null;
      },
      async doRestore(this: S) {
        const v = this.confirmV;
        if (!v || this.restoreBusy) return;
        this.restoreBusy = true;
        this.restoreError = "";
        const pending: unknown[] = [];
        this.root.dispatchEvent(new CustomEvent("nq-workflow-restore", { bubbles: true, detail: { version: JSON.parse(JSON.stringify(v)), waitUntil: (p: unknown) => void pending.push(p) } }));
        try {
          const results = await Promise.all(pending);
          const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
          if (failed) this.restoreError = failed.error;
        } catch (e) {
          this.restoreError = e instanceof Error && e.message ? e.message : String(t.failed);
        } finally {
          this.restoreBusy = false;
          this.confirmOpen = false;
        }
        if (!this.restoreError) {
          this.graph = withPositions(JSON.parse(JSON.stringify(v.graph)), direction);
          this.previewV = null;
          this.dirty = false;
          this.recompute();
          setTimeout(() => this.fit(0.25), 80);
        } else this.recompute();
      },
      clamp: clampZoom,
    };
  });
};
