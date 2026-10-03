import { computed, ref, watch, type Ref } from "vue";
import { diffRules } from "./format";

/** Staged copy of a rule list: edits, additions, removals and reordering stay local until applied. */
export function useStagedRules<R extends { id: string }>(applied: () => readonly R[]) {
  const staged = ref([...applied()]) as Ref<R[]>;
  const removed = ref<Set<string>>(new Set());
  watch(applied, (a) => {
    staged.value = [...a];
    removed.value = new Set();
  });
  const diff = computed(() => diffRules(applied(), staged.value, removed.value));
  return {
    staged,
    removed,
    diff,
    upsert(rule: R) {
      staged.value = staged.value.some((r) => r.id === rule.id) ? staged.value.map((r) => (r.id === rule.id ? rule : r)) : [...staged.value, rule];
    },
    remove(id: string) {
      if (applied().some((r) => r.id === id)) removed.value = new Set(removed.value).add(id);
      else staged.value = staged.value.filter((r) => r.id !== id);
    },
    restore(id: string) {
      const n = new Set(removed.value);
      n.delete(id);
      removed.value = n;
    },
    move(id: string, by: -1 | 1) {
      const s = staged.value;
      const i = s.findIndex((r) => r.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= s.length) return;
      const n = [...s];
      [n[i], n[j]] = [n[j] as R, n[i] as R];
      staged.value = n;
    },
    discard() {
      staged.value = [...applied()];
      removed.value = new Set();
    },
  };
}
