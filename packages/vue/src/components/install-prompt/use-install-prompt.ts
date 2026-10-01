import { onBeforeUnmount, onMounted, ref } from "vue";
import { detectInstallPlatform, type InstallPlatform } from "./install-prompt-platform";

/** The event Chrome, Edge and Android fire when the app can be installed. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * The browser's install state. It listens for `beforeinstallprompt` (and keeps the event), detects an already
 * installed app and iOS Safari. `install()` opens the browser's own dialog. Safe on the server: the platform reads
 * `unsupported` until the client mounts.
 */
export function useInstallPrompt() {
  const platform = ref<InstallPlatform>("unsupported");
  let event: BeforeInstallPromptEvent | null = null;

  const onPrompt = (e: Event) => {
    e.preventDefault();
    event = e as BeforeInstallPromptEvent;
    platform.value = "prompt";
  };
  const onInstalled = () => {
    event = null;
    platform.value = "installed";
  };

  onMounted(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    platform.value = detectInstallPlatform(navigator.userAgent, Boolean(standalone), false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  });

  async function install(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!event) return "unavailable";
    const current = event;
    await current.prompt();
    const { outcome } = await current.userChoice;
    event = null;
    if (outcome === "accepted") platform.value = "installed";
    return outcome;
  }

  return { platform, install };
}
