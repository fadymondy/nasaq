{{-- <x-nq::inbox :conversations="$conversations" :agents="$agents" current-agent-id="a1" @nq-inbox-send="send($event.detail)" @nq-inbox-update="update($event.detail)" />
     The unified inbox for chat, email and WhatsApp (React Inbox): a filterable conversation list (search, Open / Unread / Snoozed / Closed / Archived, channel and
     assignment filters, a row menu and a context menu), the thread with find, replies and internal notes, the contact panel and new-message toasts. Under compact-below px
     wide it shows one pane at a time. You own the data: nothing is stored here. Every change fires an event on the root, the page saves it and answers through detail.wait(promise)
     (resolve { error: "message" } to put the change back); the UI applies the change at once.
     conversations: [{ id, channel: chat|email|whatsapp, status: open|closed|snoozed, contact: { id, name, email?, phone?, avatar?, company?, location?, timezone?, tags?, notes?, firstSeen? },
       subject?, assigneeId?, unread?, pinned?, archived?, muted?, color?, snoozedUntil?, typing?, messages: [{ id, direction: in|out, kind: text|voice|location|note|system, body?, at, author?: { id, name, avatar? },
       status?: sending|sent|error, subject?, to?, cc?, attachments?, linkPreview?, reactions?, replyTo?, voice?, location? }] }]. x-model="conversations" binds the list (wire:model works).
     agents: [{ id, name, email?, avatar? }]. current-agent-id: the signed-in agent. selected: the open conversation id. snippets: [{ id, shortcut, title, body }] (type "/" in the box).
     toasts (true), compact-below (820), context-menu (true), pop-out (false: adds the pop-out button), loading (false), labels: partial overrides of the words (keys of nq_ib_words).
     Events, bubbling from the root:
       nq-inbox-update { conversationId, patch, wait }   pin, archive, mute, colour, status, assignee, snooze, unread
       nq-inbox-send { draft, wait }                     a reply or note; without a listener the send fails and the draft stays
       nq-inbox-react { conversationId, messageId, emoji }   nq-inbox-retry { conversationId, message }   nq-inbox-popout { conversationId }   nq-inbox-select { conversationId }
     Cuts from React: no voice recorder and no location picker (voice notes and locations in a thread still show); email is plain text sent as simple HTML.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.inbox._words')
@props(['conversations' => [], 'agents' => [], 'currentAgentId' => null, 'selected' => null, 'snippets' => [], 'toasts' => true, 'compactBelow' => 820, 'contextMenu' => true,
    'popOut' => false, 'loading' => false, 'labels' => []])
@php
    $locale = str_replace('_', '-', app()->getLocale());
    $t = nq_ib_words($locale, $labels);
    $arr = fn ($v) => array_values($v instanceof \Illuminate\Support\Collection ? $v->all() : (array) $v);
    $me = $currentAgentId ?? ($arr($agents)[0]['id'] ?? 'me');
    $opts = \Illuminate\Support\Js::from([
        'conversations' => $arr($conversations),
        'agents' => $arr($agents),
        'me' => $me,
        'snippets' => $arr($snippets),
        'selected' => $selected,
        'toasts' => (bool) $toasts,
        'compactBelow' => (int) $compactBelow,
        'contextMenu' => (bool) $contextMenu,
        'popOut' => (bool) $popOut,
        'loading' => (bool) $loading,
        'now' => (int) now()->getTimestampMs(),
        'locale' => $locale,
        't' => $t,
    ])->toHtml();
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'inbox') }}" x-data="nqInbox({!! $opts !!})" x-modelable="conversations" x-bind:data-compact="compact ? `` : null"
    {{ $attributes->except('data-slot')->cn('relative flex h-[40rem] min-h-0 w-full overflow-hidden rounded-card border border-border bg-card') }}>
    @include('nasaq::components.inbox._list')
    @include('nasaq::components.inbox._thread')

    <template x-if="contactColumn">
        <aside data-slot="contact-info" aria-label="{{ $t['contact'] }}" class="flex min-h-0 w-80 shrink-0 flex-col overflow-y-auto border-s border-border bg-card">
            @include('nasaq::components.inbox._contact')
        </aside>
    </template>
    <x-nq::sheet x-model="contactSheet">
        <x-nq::sheet.content side="end" :show-close="false" class="w-[min(24rem,100vw)] p-0">
            <h2 class="sr-only">{{ $t['openContact'] }}</h2>
            <aside data-slot="contact-info" aria-label="{{ $t['contact'] }}" class="flex h-full min-h-0 flex-col overflow-y-auto bg-card">
                <template x-if="conv">
                    <div class="flex flex-col">
                        @include('nasaq::components.inbox._contact')
                    </div>
                </template>
            </aside>
        </x-nq::sheet.content>
    </x-nq::sheet>

    <x-nq::dialog x-model="lightboxOpen">
        <x-nq::dialog.content class="max-w-3xl">
            <h2 data-slot="dialog-title" class="truncate text-body-sm font-medium text-foreground" x-text="lightbox?.name"></h2>
            <img x-show="lightbox?.url" style="display: none" x-bind:src="lightbox?.url" x-bind:alt="lightbox?.name" class="max-h-[70dvh] w-full rounded-control object-contain">
            <a x-show="lightbox?.url" style="display: none" x-bind:href="lightbox?.url" x-bind:download="lightbox?.name" class="self-start text-body-sm text-foreground underline decoration-nq-line underline-offset-4">{{ $t['download'] }}</a>
        </x-nq::dialog.content>
    </x-nq::dialog>

    <div x-show="toastList.length" style="display: none" class="pointer-events-none absolute bottom-4 end-4 z-30 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2">
        <template x-for="n in toastList" x-bind:key="n.key">
            <div role="status" data-slot="new-message-toast" x-on:mouseenter="holdToast(n.key, true)" x-on:mouseleave="holdToast(n.key, false)" x-on:focusin="holdToast(n.key, true)" x-on:focusout="holdToast(n.key, false)"
                class="pointer-events-auto relative w-80 max-w-full overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating">
                <button type="button" data-slot="notification-item" data-unread x-on:click="openToast(n)" x-bind:aria-label="`{{ $t['newMessage'] }}: ` + (toastConv(n)?.contact.name ?? ``) + `. {{ $t['openConversation'] }}`"
                    class="flex w-full items-start gap-3 px-4 py-3 pe-10 text-start no-underline outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                    <span class="relative mt-0.5 shrink-0">
                        @include('nasaq::components.inbox._avatar', ['name' => 'toastConv(n)?.contact.name ?? ``', 'src' => 'toastConv(n)?.contact.avatar', 'size' => 'md'])
                    </span>
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span dir="auto" class="text-body-sm font-medium text-foreground" x-text="toastConv(n)?.contact.name"></span>
                        <span dir="auto" class="line-clamp-2 text-caption text-muted-foreground" x-text="toastPreview(n)"></span>
                    </span>
                    <span class="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                        <time class="text-caption tabular-nums text-muted-foreground" x-text="relative(n.message.at)"></time>
                        <span class="size-2 rounded-full bg-nq-accent"><span class="sr-only">{{ $t['newMessage'] }}</span></span>
                    </span>
                </button>
                <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['dismiss'] }}" class="absolute end-1.5 top-1.5" x-on:click="dismissToast(n.key)"><x-lucide-x aria-hidden="true" /></x-nq::button>
            </div>
        </template>
    </div>

    <p x-show="notice" style="display: none" role="alert" x-text="notice" class="absolute start-4 top-3 z-30 rounded-control border border-nq-danger bg-popover px-3 py-1.5 text-caption text-nq-danger-text shadow-floating"></p>
</div>
