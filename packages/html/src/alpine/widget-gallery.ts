// nqWidgetGallery: which widgets are on the screen. The markup is the React WidgetGallery's, the state lives here.
//
//   <div x-data="nqWidgetGallery(['steps'])" role="list" data-slot="widget-gallery" class="grid gap-6 …">
//     <article x-data="{ size: 'small' }" role="listitem">
//       <button type="button" role="radio" x-on:click="size = 'medium'" x-bind:aria-checked="size === 'medium'">Medium</button>
//       <button x-show="isAdded('steps')" x-on:click="remove('steps')">Remove</button>
//       <button x-show="! isAdded('steps')" x-on:click="add('steps', size)">Add widget</button>
//     </article>
//   </div>
//
// add() and remove() update `added` (x-modelable) and dispatch bubbling "nq-add" ({ id, size }) and "nq-remove" ({ id })
// events, so the page (Alpine, Livewire) can persist the change.

import type { Magics, Register } from "./types";

interface GalleryState extends Magics {
  added: string[];
  isAdded(id: string): boolean;
  add(id: string, size: string): void;
  remove(id: string): void;
}

export const widgetGallery: Register = (Alpine) => {
  Alpine.data("nqWidgetGallery", (initial: string[] = []) => ({
    added: [...initial],
    isAdded(this: GalleryState, id: string) {
      return this.added.includes(id);
    },
    add(this: GalleryState, id: string, size: string) {
      if (!this.added.includes(id)) this.added = [...this.added, id];
      this.$dispatch("nq-add", { id, size });
    },
    remove(this: GalleryState, id: string) {
      this.added = this.added.filter((x) => x !== id);
      this.$dispatch("nq-remove", { id });
    },
  }));
};
