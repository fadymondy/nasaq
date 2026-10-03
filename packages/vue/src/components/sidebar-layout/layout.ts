import { computed, onMounted, reactive, ref, watch } from "vue";

export interface SidebarLayout {
  /** Every id, in the user's order. */
  order: string[];
  /** Ids the user switched off. */
  hidden: string[];
  /** `order` without the hidden ids: what the sidebar renders. */
  visible: string[];
  move: (activeId: string, overId: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  reset: () => void;
  isDefault: boolean;
}

export interface SidebarLayoutOptions {
  /** Ids that start switched off, e.g. products the user hasn't pinned. They stay available in SidebarCustomize. */
  defaultHidden?: readonly string[];
}

interface Stored {
  order: string[];
  hidden: string[];
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Keeps saved state valid when the product adds or removes items: unknown ids drop, new ones append (hidden if hidden by default). */
function normalise(saved: Stored, ids: readonly string[], defaultHidden: readonly string[]): Stored {
  const known = new Set(ids);
  const order = saved.order.filter((id) => known.has(id));
  const hidden = saved.hidden.filter((id) => known.has(id));
  for (const id of ids) {
    if (order.includes(id)) continue;
    order.push(id);
    if (defaultHidden.includes(id)) hidden.push(id);
  }
  return { order, hidden };
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/**
 * Order and visibility of one list of sidebar items, persisted in localStorage under `storageKey`.
 * Pass the default order; the composable returns what to render. `ids` may be an array or a getter.
 */
export function useSidebarLayout(
  storageKey: string,
  ids: readonly string[] | (() => readonly string[]),
  options: SidebarLayoutOptions = {},
): SidebarLayout {
  const getIds = () => (typeof ids === "function" ? ids() : ids);
  const getHidden = () => options.defaultHidden ?? [];
  const defaults = (): Stored => ({ order: [...getIds()], hidden: getIds().filter((id) => getHidden().includes(id)) });
  const state = ref<Stored>(defaults());

  // Read after mount so server and first client render agree.
  const load = () => {
    let saved: Stored = defaults();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const shape = JSON.parse(raw) as Partial<Stored> | null;
        // Wrong shape (older version, hand-edited): keep the defaults.
        if (shape && typeof shape === "object" && isStringArray(shape.order) && isStringArray(shape.hidden)) saved = { order: shape.order, hidden: shape.hidden };
      }
    } catch {
      /* corrupt or blocked storage: fall back to the defaults */
    }
    state.value = normalise(saved, getIds(), getHidden());
  };
  onMounted(() => {
    load();
    watch(() => getIds().join("\u0000") + "|" + getHidden().join("\u0000"), load);
  });

  const commit = (next: Stored) => {
    state.value = next;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep the in-memory layout */
    }
  };

  return reactive({
    order: computed(() => state.value.order),
    hidden: computed(() => state.value.hidden),
    visible: computed(() => {
      const hidden = new Set(state.value.hidden);
      return state.value.order.filter((id) => !hidden.has(id));
    }),
    move: (activeId: string, overId: string) => {
      const from = state.value.order.indexOf(activeId);
      const to = state.value.order.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return;
      commit({ ...state.value, order: arrayMove(state.value.order, from, to) });
    },
    setVisible: (id: string, visible: boolean) =>
      commit({ ...state.value, hidden: visible ? state.value.hidden.filter((h) => h !== id) : [...new Set([...state.value.hidden, id])] }),
    reset: () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      state.value = defaults();
    },
    isDefault: computed(() => sameSet(state.value.hidden, defaults().hidden) && state.value.order.join("\u0000") === getIds().join("\u0000")),
  }) as unknown as SidebarLayout;
}
