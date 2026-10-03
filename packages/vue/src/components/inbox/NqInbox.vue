<script setup lang="ts">
import { ArrowLeft, BellOff, Check, CircleUser, Mail, MessageCircle, MoreHorizontal, PanelRight, Pin, Search, SquareArrowOutUpRight, Undo2 } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqChatThread, NqTypingIndicator } from "../chat";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuLabel, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqInput } from "../field";
import { formatRelativeTime, useFormatNumber } from "../numeric";
import { NqSheet, NqSheetContent, NqSheetTitle } from "../sheet";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsList, NqTabsTab } from "../tabs";
import NqColorDot from "./NqColorDot.vue";
import NqContactInfoPanel from "./NqContactInfoPanel.vue";
import NqConversationContextMenu from "./NqConversationContextMenu.vue";
import NqConversationRowMenu from "./NqConversationRowMenu.vue";
import NqInboxComposer from "./NqInboxComposer.vue";
import NqInboxMessageView from "./NqInboxMessageView.vue";
import NqNewMessageToast from "./NqNewMessageToast.vue";
import NqSnoozeMenu from "./NqSnoozeMenu.vue";
import NqThreadSearchBar from "./NqThreadSearchBar.vue";
import {
  countViews,
  filterConversations,
  findMatches,
  lastMessage,
  previewOf,
  toTime,
  type CannedSnippet,
  type ConversationPatch,
  type InboxAgent,
  type InboxChannel,
  type InboxConversation,
  type InboxDraft,
  type InboxMessage,
  type InboxResult,
} from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

type Scope = "all" | "mine" | "unassigned";
type View = "active" | "unread" | "snoozed" | "closed" | "archived";

// The unified inbox for chat, email and WhatsApp: a filterable conversation list, the thread with its composer, and a contact
// panel. Every change goes through your callbacks; nothing is stored here. Under `compactBelow` px wide it shows one pane at a time.
const props = withDefaults(
  defineProps<{
    conversations: readonly InboxConversation[];
    agents: readonly InboxAgent[];
    /** Id of the signed-in agent. */
    currentAgentId: string;
    /** Open conversation. Use `v-model:selected-id`; omit to let the component own it. */
    selectedId?: string | null;
    defaultSelectedId?: string | null;
    /** Sends a reply or note. Resolve with `{ error }` to keep the draft. */
    onSend: (draft: InboxDraft) => Promise<InboxResult>;
    /** Pin, archive, mute, colour, status, assignment, snooze, mark unread. */
    onUpdate: (conversationId: string, patch: ConversationPatch) => void | Promise<void>;
    onReact?: (conversationId: string, messageId: string, emoji: string) => void | Promise<void>;
    onRetry?: (conversationId: string, message: InboxMessage) => void | Promise<void>;
    /** Adds a pop-out button to the thread that hands the conversation to a docked window. */
    onPopOut?: (conversationId: string) => void;
    snippets?: readonly CannedSnippet[];
    loading?: boolean;
    /** Show a toast when a message arrives in a conversation you are not reading. Default true. */
    toasts?: boolean;
    /** Below this width (px) one pane shows at a time. Default 820. */
    compactBelow?: number;
    /** Open a conversation's row menu on context-click, long-press or Shift+F10. Default true. */
    contextMenu?: boolean;
    labels?: Partial<InboxLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { selectedId: undefined, defaultSelectedId: null, loading: false, toasts: true, compactBelow: 820, contextMenu: true },
);
const emit = defineEmits<{ "update:selectedId": [id: string | null] }>();

const t = useInboxLabels(() => props.labels);
const fmt = useFormatNumber();
const nq = useNasaq();
const locale = computed(() => nq.locale.value ?? "en");
const root = ref<HTMLDivElement | null>(null);
const compact = ref(false);
const inner = ref<string | null>(props.defaultSelectedId);
const current = computed(() => (props.selectedId === undefined ? inner.value : props.selectedId));
function select(id: string | null) {
  inner.value = id;
  emit("update:selectedId", id);
}
const query = ref("");
const channel = ref<InboxChannel | "all">("all");
const scope = ref<Scope>("all");
const view = ref<View>("active");
const contactOpen = ref(false);
const finding = ref(false);
const findQuery = ref("");
const findIndex = ref(0);
const replyTo = ref<InboxMessage | null>(null);
const me = computed(() => props.agents.find((a) => a.id === props.currentAgentId) ?? { id: props.currentAgentId, name: t.value.you });

let observer: ResizeObserver | undefined;
onMounted(() => {
  const el = root.value;
  if (!el || typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver((entries) => {
    compact.value = (entries[0]?.contentRect.width ?? 9999) < props.compactBelow;
  });
  observer.observe(el);
});
onBeforeUnmount(() => observer?.disconnect());

const list = computed(() => {
  const base = filterConversations(props.conversations, {
    channel: channel.value,
    scope: scope.value,
    query: query.value,
    me: props.currentAgentId,
    view: view.value === "unread" ? "active" : view.value,
  });
  return view.value === "unread" ? base.filter((c) => (c.unread ?? 0) > 0 && !c.muted) : base;
});
const counts = computed(() => countViews(props.conversations));
const conv = computed(() => props.conversations.find((c) => c.id === current.value) ?? null);
const words = computed(() => ({ voice: t.value.voiceMessage, location: t.value.locationMessage, attachment: t.value.attachmentMessage }));
const assignee = computed(() => (conv.value?.assigneeId ? (props.agents.find((a) => a.id === conv.value?.assigneeId) ?? null) : null));

// Reset thread-local state when the conversation changes.
watch(current, () => {
  replyTo.value = null;
  finding.value = false;
  findQuery.value = "";
  findIndex.value = 0;
});

// Mark as read when opened (and when the open thread gets unread again).
watch(
  () => [current.value, conv.value?.unread ?? 0] as const,
  ([id, unread]) => {
    if (id && unread > 0) void props.onUpdate(id, { unread: false });
  },
  { immediate: true },
);

// ---- New message toasts ------------------------------------------------------------------------------------------
let seen: Map<string, string | undefined> | null = null;
const incoming = ref<{ key: string; conversationId: string; message: InboxMessage }[]>([]);
watch(
  () => [props.conversations, current.value] as const,
  ([conversations, cur]) => {
    const prev = seen;
    const next = new Map<string, string | undefined>();
    const fresh: { key: string; conversationId: string; message: InboxMessage }[] = [];
    for (const c of conversations) {
      const m = lastMessage(c);
      next.set(c.id, m?.id);
      if (prev && m && prev.get(c.id) !== m.id && m.direction === "in" && m.kind !== "system" && m.kind !== "note" && c.id !== cur && !c.muted && !c.archived) {
        fresh.push({ key: `${c.id}:${m.id}`, conversationId: c.id, message: m });
      }
    }
    seen = next;
    if (props.toasts && fresh.length) incoming.value = [...fresh, ...incoming.value].slice(0, 3);
  },
  { immediate: true, deep: true },
);

// ---- Find in thread ----------------------------------------------------------------------------------------------
const matches = computed(() => (conv.value && finding.value && findQuery.value ? findMatches(conv.value.messages, findQuery.value) : []));
const safeIndex = computed(() => (matches.value.length ? Math.min(findIndex.value, matches.value.length - 1) : 0));
const currentMatch = computed(() => matches.value[safeIndex.value]);
watch(
  () => [currentMatch.value?.messageId, currentMatch.value?.nth, safeIndex.value],
  async () => {
    if (!currentMatch.value) return;
    await nextTick();
    root.value?.querySelector<HTMLElement>("[data-find-current]")?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  },
);

function jump(messageId: string) {
  root.value?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
}
const patch = (id: string, p: ConversationPatch) => void props.onUpdate(id, p);
const showList = computed(() => !compact.value || !conv.value);
const showThread = computed(() => !compact.value || !!conv.value);

const views = computed<{ id: View; label: string; n: number }[]>(() => [
  { id: "active", label: t.value.viewActive, n: counts.value.active },
  { id: "unread", label: t.value.viewUnread, n: counts.value.unread },
  { id: "snoozed", label: t.value.viewSnoozed, n: counts.value.snoozed },
  { id: "closed", label: t.value.viewClosed, n: counts.value.closed },
  { id: "archived", label: t.value.viewArchived, n: counts.value.archived },
]);
const channelLabel = (c: InboxChannel) => (c === "chat" ? t.value.channelChat : c === "email" ? t.value.channelEmail : t.value.channelWhatsapp);
const dateOf = (v: Parameters<typeof toTime>[0], style: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale.value, style).format(toTime(v));
const newDay = (c: InboxConversation, i: number) => {
  const prev = c.messages[i - 1];
  const m = c.messages[i] as InboxMessage;
  return !prev || new Date(toTime(prev.at)).toDateString() !== new Date(toTime(m.at)).toDateString();
};
const contactOpenModel = computed({ get: () => contactOpen.value, set: (v: boolean) => (contactOpen.value = v) });
function setFindQuery(q: string) {
  findQuery.value = q;
  findIndex.value = 0;
}
function closeFind() {
  finding.value = false;
  findQuery.value = "";
}
function openToast(n: { key: string; conversationId: string }) {
  select(n.conversationId);
  incoming.value = incoming.value.filter((x) => x.key !== n.key);
}
const dismissToast = (key: string) => (incoming.value = incoming.value.filter((x) => x.key !== key));
const chipClass = "h-7 rounded-full px-2.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-secondary aria-pressed:text-foreground";
</script>

<template>
  <div ref="root" data-slot="inbox" :data-compact="compact || undefined" :class="cn('relative flex h-[40rem] min-h-0 w-full overflow-hidden rounded-card border border-border bg-card', props.class)">
    <section v-if="showList" :aria-label="t.conversations" :class="cn('flex min-h-0 flex-col border-border bg-card', compact ? 'flex-1' : 'w-80 shrink-0 border-e xl:w-96')">
      <div class="flex flex-col gap-2 border-b border-border p-3">
        <div class="relative">
          <Search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <NqInput v-model="query" type="search" dir="auto" :aria-label="t.search" :placeholder="t.searchPlaceholder" class="ps-9" />
        </div>
        <NqTabs v-model="view" class="gap-0">
          <NqTabsList :aria-label="t.views" class="w-full overflow-x-auto">
            <NqTabsTab v-for="v in views" :key="v.id" :value="v.id" class="gap-1.5">
              {{ v.label }}
              <span class="text-caption tabular-nums text-muted-foreground">{{ fmt(v.n) }}</span>
            </NqTabsTab>
          </NqTabsList>
        </NqTabs>
        <div class="flex flex-wrap items-center gap-1.5">
          <div role="group" :aria-label="t.channels" class="flex flex-wrap gap-1">
            <button
              v-for="c in (['all', 'chat', 'email', 'whatsapp'] as const)"
              :key="c"
              type="button"
              :aria-pressed="channel === c"
              :class="cn(chipClass, 'border border-border aria-pressed:border-transparent')"
              @click="channel = c"
            >
              {{ c === "all" ? t.channelAll : channelLabel(c) }}
            </button>
          </div>
          <span class="flex-1" />
          <div role="group" :aria-label="t.scope" class="flex gap-1">
            <button v-for="s in (['all', 'mine', 'unassigned'] as const)" :key="s" type="button" :aria-pressed="scope === s" :class="chipClass" @click="scope = s">
              {{ s === "all" ? t.scopeAll : s === "mine" ? t.scopeMine : t.scopeUnassigned }}
            </button>
          </div>
        </div>
      </div>
      <ul v-if="props.loading" aria-busy="true" :aria-label="t.loading" class="flex flex-col gap-1 p-3">
        <li v-for="i in 5" :key="i" class="flex items-center gap-3 rounded-control p-2">
          <span class="size-10 rounded-full bg-secondary motion-safe:animate-pulse" />
          <span class="flex flex-1 flex-col gap-2">
            <span class="h-3 w-1/2 rounded bg-secondary motion-safe:animate-pulse" />
            <span class="h-3 w-4/5 rounded bg-secondary motion-safe:animate-pulse" />
          </span>
        </li>
      </ul>
      <NqEmptyState v-else-if="list.length === 0" :title="t.empty" :description="t.emptyHint" class="m-3 flex-1 border-0" />
      <ul v-else class="flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5">
        <NqConversationContextMenu v-for="c in list" :key="c.id" :conversation="c" :on-update="(p: ConversationPatch) => patch(c.id, p)" :labels="props.labels" :disabled="!props.contextMenu" class="group/row relative">
          <button
            type="button"
            :aria-current="c.id === current ? 'true' : undefined"
            :data-unread="(c.unread ?? 0) > 0 || undefined"
            class="flex w-full items-start gap-3 rounded-control p-2.5 pe-10 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus aria-[current=true]:bg-secondary"
            @click="select(c.id)"
          >
            <NqAvatar :name="c.contact.name" :src="c.contact.avatar" size="md" />
            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="flex items-center gap-1.5">
                <NqColorDot v-if="c.color" :color="c.color" />
                <span dir="auto" :class="cn('min-w-0 flex-1 truncate text-body-sm text-foreground', (c.unread ?? 0) > 0 ? 'font-semibold' : 'font-medium')">{{ c.contact.name }}</span>
                <Pin v-if="c.pinned" :aria-label="t.pinned" class="size-3 shrink-0 text-muted-foreground" />
                <BellOff v-if="c.muted" :aria-label="t.muted" class="size-3 shrink-0 text-muted-foreground" />
                <span v-if="lastMessage(c)" class="shrink-0 text-caption text-muted-foreground">{{ formatRelativeTime((lastMessage(c) as InboxMessage).at, locale) }}</span>
              </span>
              <span v-if="c.subject" dir="auto" class="truncate text-caption text-foreground">{{ c.subject }}</span>
              <span class="flex items-center gap-1.5">
                <span dir="auto" :class="cn('min-w-0 flex-1 truncate text-caption', (c.unread ?? 0) > 0 ? 'text-foreground' : 'text-muted-foreground')">{{ c.typing ? t.typing : previewOf(lastMessage(c), words) }}</span>
                <span v-if="(c.unread ?? 0) > 0" class="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-nq-accent px-1 text-caption tabular-nums text-foreground">
                  <span aria-hidden="true">{{ fmt(c.unread ?? 0) }}</span>
                  <span class="sr-only">{{ t.unreadCount(fmt(c.unread ?? 0)) }}</span>
                </span>
              </span>
              <span class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
                  <MessageCircle v-if="c.channel === 'chat'" aria-hidden="true" class="size-3" />
                  <Mail v-else-if="c.channel === 'email'" aria-hidden="true" class="size-3" />
                  {{ channelLabel(c.channel) }}
                </span>
                <span v-if="c.status === 'snoozed' && c.snoozedUntil" class="text-caption text-muted-foreground">{{ t.snoozedUntil(dateOf(c.snoozedUntil, { dateStyle: "medium", timeStyle: "short" })) }}</span>
              </span>
            </span>
          </button>
          <div class="absolute end-1.5 top-1.5">
            <NqConversationRowMenu
              :conversation="c"
              :on-update="(p: ConversationPatch) => patch(c.id, p)"
              :labels="props.labels"
              trigger-class="opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100 max-md:opacity-100"
            />
          </div>
        </NqConversationContextMenu>
      </ul>
    </section>

    <template v-if="showThread">
      <section v-if="conv" :aria-label="conv.contact.name" class="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header class="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
          <NqButton v-if="compact" type="button" variant="ghost" size="icon-sm" :aria-label="t.back" @click="select(null)"><ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" /></NqButton>
          <NqAvatar :name="conv.contact.name" :src="conv.contact.avatar" size="md" />
          <div class="flex min-w-0 flex-1 flex-col">
            <h2 dir="auto" class="truncate text-label text-foreground">{{ conv.contact.name }}</h2>
            <span class="flex items-center gap-2 truncate text-caption text-muted-foreground">
              <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
                <MessageCircle v-if="conv.channel === 'chat'" aria-hidden="true" class="size-3" />
                <Mail v-else-if="conv.channel === 'email'" aria-hidden="true" class="size-3" />
                {{ channelLabel(conv.channel) }}
              </span>
              <span v-if="conv.status === 'closed'">{{ t.closed }}</span>
            </span>
          </div>
          <NqDropdownMenu>
            <NqDropdownMenuTrigger as-child>
              <NqButton type="button" variant="ghost" size="sm" :aria-label="t.assignTo">
                <NqAvatar v-if="assignee" :name="assignee.name" :src="assignee.avatar" size="xs" />
                <CircleUser v-else aria-hidden="true" />
                <span class="hidden max-w-24 truncate sm:inline">{{ assignee ? assignee.name : t.unassigned }}</span>
              </NqButton>
            </NqDropdownMenuTrigger>
            <NqDropdownMenuContent align="end" class="min-w-52">
              <NqDropdownMenuLabel>{{ t.assignTo }}</NqDropdownMenuLabel>
              <NqDropdownMenuItem @select="patch(conv.id, { assigneeId: props.currentAgentId })">{{ t.assignToMe }}</NqDropdownMenuItem>
              <NqDropdownMenuItem v-for="a in props.agents" :key="a.id" @select="patch(conv.id, { assigneeId: a.id })">
                <NqAvatar :name="a.name" :src="a.avatar" size="xs" />
                <span class="flex-1 truncate">{{ a.name }}</span>
                <Check v-if="a.id === conv.assigneeId" aria-hidden="true" class="size-4" />
              </NqDropdownMenuItem>
              <NqDropdownMenuItem @select="patch(conv.id, { assigneeId: null })">{{ t.unassigned }}</NqDropdownMenuItem>
            </NqDropdownMenuContent>
          </NqDropdownMenu>
          <NqSnoozeMenu
            :snoozed-until="conv.status === 'snoozed' ? conv.snoozedUntil : null"
            :labels="props.labels"
            :on-snooze="(until: number | null) => patch(conv!.id, until === null ? { status: 'open', snoozedUntil: null } : { status: 'snoozed', snoozedUntil: until })"
          />
          <NqButton v-if="conv.status === 'closed'" type="button" variant="ghost" size="icon" :aria-label="t.reopen" @click="patch(conv.id, { status: 'open' })"><Undo2 aria-hidden="true" /></NqButton>
          <NqButton v-else type="button" variant="ghost" size="icon" :aria-label="t.close" @click="patch(conv.id, { status: 'closed' })"><Check aria-hidden="true" /></NqButton>
          <NqButton type="button" variant="ghost" size="icon" :aria-label="t.find" :aria-pressed="finding" @click="finding = !finding"><Search aria-hidden="true" /></NqButton>
          <NqButton v-if="props.onPopOut" type="button" variant="ghost" size="icon" :aria-label="t.popOut" @click="props.onPopOut(conv.id)"><SquareArrowOutUpRight aria-hidden="true" /></NqButton>
          <NqButton type="button" variant="ghost" size="icon" :aria-label="contactOpen ? t.hideContact : t.openContact" :aria-pressed="contactOpen" @click="contactOpen = !contactOpen">
            <PanelRight aria-hidden="true" class="rtl:-scale-x-100" />
          </NqButton>
        </header>
        <NqThreadSearchBar v-if="finding" :query="findQuery" :total="matches.length" :index="safeIndex" :on-index-change="(i: number) => (findIndex = i)" :on-close="closeFind" :labels="props.labels" @update:query="setFindQuery" />
        <NqChatThread :label="t.thread" class="flex-1" content-class-name="gap-3 p-4">
          <div v-for="(m, i) in conv.messages" :key="m.id" :data-message-id="m.id" class="flex flex-col gap-3">
            <div v-if="newDay(conv, i)" class="flex items-center gap-3 text-caption text-muted-foreground">
              <span class="h-px flex-1 bg-border" />
              <span>{{ dateOf(m.at, { dateStyle: "medium" }) }}</span>
              <span class="h-px flex-1 bg-border" />
            </div>
            <NqInboxMessageView
              :message="m"
              :channel="conv.channel"
              :contact="conv.contact"
              :me="props.currentAgentId"
              :query="finding ? findQuery : undefined"
              :current="currentMatch?.messageId === m.id ? currentMatch.nth : -1"
              :on-reply="(msg: InboxMessage) => (replyTo = msg)"
              :on-react="(msg: InboxMessage, emoji: string) => void props.onReact?.(conv!.id, msg.id, emoji)"
              :on-retry="(msg: InboxMessage) => void props.onRetry?.(conv!.id, msg)"
              :on-jump="jump"
              :labels="props.labels"
            />
          </div>
          <div v-if="conv.typing" class="flex items-center gap-2 text-caption text-muted-foreground">
            <NqTypingIndicator :label="`${conv.contact.name} ${t.typing}`" />
          </div>
        </NqChatThread>
        <NqInboxComposer
          :key="conv.id"
          :conversation="conv"
          :me="me"
          :agents="props.agents"
          :snippets="props.snippets"
          :reply-to="replyTo"
          :on-cancel-reply="() => (replyTo = null)"
          :on-send="props.onSend"
          :labels="props.labels"
        />
      </section>
      <div v-else class="flex min-w-0 flex-1 items-center justify-center bg-background p-6">
        <NqEmptyState :title="t.noSelection" :description="t.noSelectionHint" class="max-w-sm border-0" />
      </div>
    </template>

    <template v-if="conv && contactOpen">
      <NqSheet v-if="compact" v-model:open="contactOpenModel">
        <NqSheetContent side="end" class="w-[min(24rem,100vw)] p-0" :show-close="false">
          <NqSheetTitle class="sr-only">{{ t.openContact }}</NqSheetTitle>
          <NqContactInfoPanel :contact="conv.contact" :messages="conv.messages" :assignee="assignee" :channel-label="channelLabel(conv.channel)" :on-close="() => (contactOpen = false)" :labels="props.labels" class="h-full border-0" />
        </NqSheetContent>
      </NqSheet>
      <NqContactInfoPanel v-else :contact="conv.contact" :messages="conv.messages" :assignee="assignee" :channel-label="channelLabel(conv.channel)" :on-close="() => (contactOpen = false)" :labels="props.labels" class="w-80 shrink-0 border-s" />
    </template>

    <div v-if="incoming.length" class="pointer-events-none absolute bottom-4 end-4 z-30 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2">
      <template v-for="n in incoming" :key="n.key">
        <NqNewMessageToast
          v-if="props.conversations.find((x) => x.id === n.conversationId)"
          class="pointer-events-auto"
          :conversation="props.conversations.find((x) => x.id === n.conversationId)!"
          :message="n.message"
          :labels="props.labels"
          :on-open="() => openToast(n)"
          :on-dismiss="() => dismissToast(n.key)"
        />
      </template>
    </div>
  </div>
</template>
