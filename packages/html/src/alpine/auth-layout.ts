// nqAuthBackdrop and nqAuthOrigin: the two live bits of the auth layout. The markup is the Blade auth-layout.* parts'.
//
//   <div data-slot="auth-backdrop" x-data="nqAuthBackdrop()"><div data-auth-layer="cubes"></div><div data-auth-layer="pointer"></div></div>
//   <p data-slot="auth-origin" x-data="nqAuthOrigin()" x-show="host" :data-secure="secure ? '' : null"> … <bdi x-text="host"></bdi></p>
//
// nqAuthBackdrop sets --nq-auth-x / --nq-auth-y and data-pointer on the root while a mouse or pen moves (not touch, not with reduced
// motion); data-pointer goes away when the pointer leaves the page. nqAuthOrigin reads location.host and isSecureContext after mount.

import type { Magics, Register } from "./types";

interface BackdropState extends Magics {
  frame: number;
  off: (() => void) | undefined;
}

export const authLayout: Register = (Alpine) => {
  Alpine.data("nqAuthBackdrop", () => ({
    frame: 0,
    off: undefined as (() => void) | undefined,
    init(this: BackdropState) {
      const node = this.$el;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const move = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => {
          const rect = node.getBoundingClientRect();
          node.style.setProperty("--nq-auth-x", `${event.clientX - rect.left}px`);
          node.style.setProperty("--nq-auth-y", `${event.clientY - rect.top}px`);
          node.setAttribute("data-pointer", "");
        });
      };
      const leave = () => node.removeAttribute("data-pointer");
      window.addEventListener("pointermove", move, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      this.off = () => {
        cancelAnimationFrame(this.frame);
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", leave);
      };
    },
    destroy(this: BackdropState) {
      this.off?.();
    },
  }));

  Alpine.data("nqAuthOrigin", () => ({
    host: "",
    secure: true,
    init(this: { host: string; secure: boolean }) {
      this.host = window.location.host;
      this.secure = Boolean(window.isSecureContext);
    },
  }));
};
