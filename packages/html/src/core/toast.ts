// Toasts: toast({ title, description, tone }) from anywhere. Creates the polite live region on first use.

export type Tone = "success" | "warning" | "danger" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  /** Milliseconds before it leaves; 0 keeps it until closed. Default 5000. */
  duration?: number;
  /** Label for the close button; defaults to "Close" ("إغلاق" in Arabic). */
  closeLabel?: string;
}

const ICONS: Record<Tone, string> = {
  success: '<path d="M20 6 9 17l-5-5"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  danger: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

function svg(tone: Tone): SVGSVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) {
    el.setAttribute(k, v);
  }
  el.innerHTML = ICONS[tone];
  return el;
}

export function toaster(): HTMLElement {
  let region = document.querySelector<HTMLElement>(".nq-toaster");
  if (!region) {
    region = document.createElement("section");
    region.className = "nq-toaster";
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-label", "Notifications");
    document.body.append(region);
  }
  return region;
}

/** Shows a toast and returns a function that dismisses it. */
export function toast(options: ToastOptions | string): () => void {
  const o: ToastOptions = typeof options === "string" ? { title: options } : options;
  const ar = /^ar\b/i.test(document.documentElement.lang);
  const el = document.createElement("div");
  el.className = "nq-toast";
  el.setAttribute("role", o.tone === "danger" ? "alert" : "status");
  if (o.tone) {
    el.dataset.tone = o.tone;
    el.append(svg(o.tone));
  }
  const body = document.createElement("div");
  const title = document.createElement("p");
  title.className = "nq-toast-title";
  title.textContent = o.title;
  body.append(title);
  if (o.description) {
    const d = document.createElement("p");
    d.className = "nq-toast-description";
    d.textContent = o.description;
    body.append(d);
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "nq-toast-close";
  close.setAttribute("aria-label", o.closeLabel ?? (ar ? "إغلاق" : "Close"));
  close.textContent = "×";
  el.append(body, close);

  const dismiss = () => {
    clearTimeout(timer);
    el.remove();
  };
  close.addEventListener("click", dismiss);
  const duration = o.duration ?? 5000;
  const timer = duration > 0 ? setTimeout(dismiss, duration) : undefined;
  toaster().append(el);
  return dismiss;
}
