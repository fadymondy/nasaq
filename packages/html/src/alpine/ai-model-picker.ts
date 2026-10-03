// nqAiModelPicker / nqPersonaPicker: the state behind the AI model picker. The markup is the React component's.
//
//   <div data-slot="ai-model-picker" x-data="nqAiModelPicker({ models: [{ id: 'opus', efforts: ['low', 'high'] }], value: { model: 'opus', effort: 'high' }, agentRequired: false, effortNames: { low: 'Low' }, agents: {} })" x-modelable="sel">
//     <div role="radiogroup" x-model="sel.model" …>…model cards (nqRadioGroup)…</div>
//     <div role="group"><template x-for="e in efforts()"><button x-bind="effortToggle(e)"></button></template></div>
//     <div x-model="sel.agent" …>…agent select (nqSelect)…</div>
//     <span role="alert" x-show="agentInvalid()">…</span>
//   </div>
//
//   <div data-slot="persona-picker" x-data="nqPersonaPicker({ value: 'coach', personas: { coach: { id: 'coach', name: 'Coach', starters: ['Plan my week'] } } })" x-modelable="selected">
//     <div role="radiogroup" x-model="selected" …>…persona cards…</div>
//     <template x-for="s in starters()"><button x-on:click="start(s)" x-text="s"></button></template>
//   </div>
//
// Changing the model keeps the effort when the new model supports it, else medium, else the first (the effort can never be
// pressed off). The agent select reads as invalid (data-invalid + an alert) once the user has opened and left it empty.
// A persona starter dispatches a bubbling "nq-starter" event with detail { prompt, persona }. sel / selected are x-modelable.

import type { Magics, Register } from "./types";

interface Selection {
  model: string | null;
  effort: string | null;
  agent: string | null;
}

interface PickerConfig {
  models: { id: string; efforts: string[] }[];
  value: Selection;
  agentRequired: boolean;
  effortNames: Record<string, string>;
  agents: Record<string, string>;
}

interface PickerState extends Magics {
  sel: Selection;
  cfg: PickerConfig;
  touched: boolean;
  started: boolean;
  efforts(): string[];
  agentInvalid(): boolean;
  agentDescription(): string;
  effortToggle(effort: string): Record<string, unknown>;
  settle(): void;
}

/** Same as the React `resolveEffort`: keep the current effort if supported, else "medium", else the first. */
function resolveEffort(efforts: string[], current: string | null): string | null {
  if (!efforts.length) return null;
  if (current && efforts.includes(current)) return current;
  return efforts.includes("medium") ? "medium" : (efforts[0] ?? null);
}

export const aiModelPicker: Register = (Alpine) => {
  Alpine.data("nqAiModelPicker", (cfg: PickerConfig) => ({
    cfg,
    sel: { model: cfg.value.model ?? null, effort: cfg.value.effort ?? null, agent: cfg.value.agent ?? null } as Selection,
    touched: false,
    started: false,
    init(this: PickerState) {
      this.settle();
      // Whoever changes the model (a card, the compact select, x-model from outside) lands on a supported effort.
      this.$watch("sel.model", () => this.settle());
    },
    settle(this: PickerState) {
      const effort = resolveEffort(this.efforts(), this.sel.effort);
      if (effort !== this.sel.effort) this.sel = { ...this.sel, effort };
    },
    efforts(this: PickerState) {
      return this.cfg.models.find((m) => m.id === this.sel.model)?.efforts ?? [];
    },
    agentInvalid(this: PickerState) {
      return this.cfg.agentRequired && this.touched && !this.sel.agent;
    },
    agentDescription(this: PickerState) {
      return (this.sel.agent && this.cfg.agents[this.sel.agent]) || "";
    },
    /** Bind on one effort button: the label, the pressed state and the click. */
    effortToggle(this: PickerState, effort: string) {
      return {
        "x-text"(this: PickerState) {
          return this.cfg.effortNames[effort] ?? effort;
        },
        ":aria-pressed"(this: PickerState) {
          return String(this.sel.effort === effort);
        },
        ":data-pressed"(this: PickerState) {
          return this.sel.effort === effort ? "" : undefined;
        },
        "x-on:click"(this: PickerState) {
          this.sel = { ...this.sel, effort };
        },
      };
    },
  }));

  Alpine.data("nqPersonaPicker", (cfg: { value: string | null; personas: Record<string, { id: string; name: string; starters: string[] }> }) => ({
    selected: cfg.value ?? null,
    personas: cfg.personas,
    starters(this: Magics & { selected: string | null; personas: typeof cfg.personas }) {
      return (this.selected && this.personas[this.selected]?.starters) || [];
    },
    start(this: Magics & { selected: string | null; personas: typeof cfg.personas }, prompt: string) {
      const persona = this.selected ? this.personas[this.selected] : undefined;
      this.$dispatch("nq-starter", { prompt, persona });
    },
  }));
};
