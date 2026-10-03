// nqAvatar: the image shows once it has loaded; until then (and on error) the fallback shows.
//
//   <span data-slot="avatar" x-data="nqAvatar(400)" class="...">
//     <img data-slot="avatar-image" src="/a.jpg" alt="Fady" style="display: none" x-bind="image">
//     <span data-slot="avatar-fallback" x-bind="fallback" aria-hidden="true">FM</span>
//   </span>
//
// delay (ms) holds the fallback back while an image is loading, so cached avatars do not flash initials
// (Base UI's Avatar.Fallback delay; the React Avatar uses 400 when it has a src, 0 otherwise).

import type { Magics, Register } from "./types";

interface AvatarState extends Magics {
  loaded: boolean;
  ready: boolean;
}

export const avatar: Register = (Alpine) => {
  Alpine.data("nqAvatar", (delay = 0) => ({
    loaded: false,
    ready: delay <= 0,
    init(this: AvatarState) {
      const img = this.$el.querySelector<HTMLImageElement>('img[data-slot="avatar-image"]');
      if (img?.complete && img.naturalWidth > 0) this.loaded = true;
      if (!this.ready) setTimeout(() => (this.ready = true), delay);
    },
    /** Bind on the img. */
    image: {
      "x-show"(this: AvatarState) {
        return this.loaded;
      },
      "x-on:load"(this: AvatarState) {
        this.loaded = true;
      },
      "x-on:error"(this: AvatarState) {
        this.loaded = false;
      },
    },
    /** Bind on the fallback. */
    fallback: {
      "x-show"(this: AvatarState) {
        return this.ready && !this.loaded;
      },
    },
  }));
};
