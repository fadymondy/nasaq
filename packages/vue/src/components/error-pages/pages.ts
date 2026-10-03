import { defineComponent, h, onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import NqErrorPage from "./NqErrorPage.vue";
import type { ErrorPageKind } from "./strings";

/** Online or not, from `navigator.onLine` and the `online` / `offline` events. Safe on the server. */
export function useOnlineStatus(): Ref<boolean> {
  const online = ref(true);
  const up = () => (online.value = true);
  const down = () => (online.value = false);
  onMounted(() => {
    online.value = navigator.onLine;
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("online", up);
    window.removeEventListener("offline", down);
  });
  return online;
}

const named = (name: string, kind: ErrorPageKind) =>
  defineComponent({
    name,
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => h(NqErrorPage, { ...attrs, kind }, slots),
  });

/** 404: the address does not exist. */
export const NqNotFoundPage = named("NqNotFoundPage", "not-found");
/** 500: our side failed. Pass `errorId` so people can quote it to support. */
export const NqServerErrorPage = named("NqServerErrorPage", "server-error");
/** No connection. Pass `:online` from `useOnlineStatus()` to turn it into a "back online, reload" prompt. */
export const NqOfflinePage = named("NqOfflinePage", "offline");
/** 503: planned downtime, with an optional `eta`. */
export const NqMaintenancePage = named("NqMaintenancePage", "maintenance");
/** 403: signed in, but not allowed. */
export const NqForbiddenPage = named("NqForbiddenPage", "forbidden");
/** The workspace address does not match a workspace the person can open. */
export const NqUnknownWorkspacePage = named("NqUnknownWorkspacePage", "unknown-workspace");
/** A module that is planned but not built. */
export const NqComingSoonPage = named("NqComingSoonPage", "coming-soon");
