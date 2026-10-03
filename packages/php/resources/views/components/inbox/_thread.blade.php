{{-- Internal: the thread pane of x-nq::inbox (header, find bar, messages, composer). Runs in the inbox's Alpine scope. --}}
<template x-if="showThread">
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <template x-if="conv">
            <section x-bind:aria-label="conv.contact.name" class="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
                <header class="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
                    <x-nq::button x-show="compact" style="display: none" type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['back'] }}" x-on:click="pick(null)"><x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
                    @include('nasaq::components.inbox._avatar', ['name' => 'conv.contact.name', 'src' => 'conv.contact.avatar', 'size' => 'md'])
                    <div class="flex min-w-0 flex-1 flex-col">
                        <h2 dir="auto" class="truncate text-label text-foreground" x-text="conv.contact.name"></h2>
                        <span class="flex items-center gap-2 truncate text-caption text-muted-foreground">
                            <span class="inline-flex items-center gap-1 text-caption text-muted-foreground">
                                <x-lucide-message-circle x-show="conv.channel == `chat`" style="display: none" aria-hidden="true" class="size-3" />
                                <x-lucide-mail x-show="conv.channel == `email`" style="display: none" aria-hidden="true" class="size-3" />
                                <span x-text="channelLabel(conv.channel)"></span>
                            </span>
                            <span x-show="conv.status == `closed`" style="display: none">{{ $t['closed'] }}</span>
                        </span>
                    </div>

                    <x-nq::dropdown-menu>
                        <x-nq::dropdown-menu.trigger variant="ghost" size="sm" aria-label="{{ $t['assignTo'] }}" data-action="assign">
                            <span x-show="assignee" style="display: none">@include('nasaq::components.inbox._avatar', ['name' => 'assignee?.name ?? ``', 'src' => 'assignee?.avatar', 'size' => 'xs'])</span>
                            <x-lucide-circle-user x-show="!assignee" aria-hidden="true" />
                            <span class="hidden max-w-24 truncate sm:inline" x-text="assignee ? assignee.name : t.unassigned">{{ $t['unassigned'] }}</span>
                        </x-nq::dropdown-menu.trigger>
                        <x-nq::dropdown-menu.content align="end" class="min-w-52">
                            <x-nq::dropdown-menu.label>{{ $t['assignTo'] }}</x-nq::dropdown-menu.label>
                            <x-nq::dropdown-menu.item data-action="assign-me" x-on:click="patch(conv.id, { assigneeId: cfg.me })">{{ $t['assignToMe'] }}</x-nq::dropdown-menu.item>
                            <template x-for="a in agents" x-bind:key="a.id">
                                <x-nq::dropdown-menu.item data-action="assign-agent" x-on:click="patch(conv.id, { assigneeId: a.id })">
                                    @include('nasaq::components.inbox._avatar', ['name' => 'a.name', 'src' => 'a.avatar', 'size' => 'xs'])
                                    <span class="flex-1 truncate" x-text="a.name"></span>
                                    <x-lucide-check x-show="a.id == conv.assigneeId" style="display: none" aria-hidden="true" class="size-4" />
                                </x-nq::dropdown-menu.item>
                            </template>
                            <x-nq::dropdown-menu.item data-action="unassign" x-on:click="patch(conv.id, { assigneeId: null })">{{ $t['unassigned'] }}</x-nq::dropdown-menu.item>
                        </x-nq::dropdown-menu.content>
                    </x-nq::dropdown-menu>

                    <x-nq::dropdown-menu>
                        <x-nq::dropdown-menu.trigger variant="ghost" size="icon" aria-label="{{ $t['snooze'] }}" data-action="snooze-menu"><x-lucide-clock aria-hidden="true" /></x-nq::dropdown-menu.trigger>
                        <x-nq::dropdown-menu.content align="end" class="min-w-56">
                            <x-nq::dropdown-menu.label>{{ $t['snooze'] }}</x-nq::dropdown-menu.label>
                            <template x-for="p in snoozeOptions" x-bind:key="p.id">
                                <x-nq::dropdown-menu.item data-action="snooze" x-on:click="snoozeTo(conv.id, p.at)">
                                    <span class="flex-1" x-text="p.label"></span>
                                    <span class="text-caption text-muted-foreground" x-text="p.hint"></span>
                                </x-nq::dropdown-menu.item>
                            </template>
                            <x-nq::dropdown-menu.item data-action="snooze-custom" x-on:click="openSnoozeDialog()">{{ $t['snoozeCustom'] }}</x-nq::dropdown-menu.item>
                            <template x-if="conv.status == `snoozed`">
                                <div>
                                    <x-nq::dropdown-menu.separator />
                                    <x-nq::dropdown-menu.item data-action="unsnooze" x-on:click="snoozeTo(conv.id, null)">{{ $t['unsnooze'] }}</x-nq::dropdown-menu.item>
                                </div>
                            </template>
                        </x-nq::dropdown-menu.content>
                    </x-nq::dropdown-menu>

                    <x-nq::button x-show="conv.status == `closed`" style="display: none" type="button" variant="ghost" size="icon" data-action="reopen" aria-label="{{ $t['reopen'] }}" x-on:click="patch(conv.id, { status: `open` })"><x-lucide-undo-2 aria-hidden="true" /></x-nq::button>
                    <x-nq::button x-show="conv.status != `closed`" type="button" variant="ghost" size="icon" data-action="close" aria-label="{{ $t['close'] }}" x-on:click="patch(conv.id, { status: `closed` })"><x-lucide-check aria-hidden="true" /></x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon" data-action="find" aria-label="{{ $t['find'] }}" x-bind:aria-pressed="finding" x-on:click="toggleFind()"><x-lucide-search aria-hidden="true" /></x-nq::button>
                    @if ($popOut)
                        <x-nq::button type="button" variant="ghost" size="icon" data-action="pop-out" aria-label="{{ $t['popOut'] }}" x-on:click="popOut()"><x-lucide-square-arrow-out-up-right aria-hidden="true" /></x-nq::button>
                    @endif
                    <x-nq::button type="button" variant="ghost" size="icon" data-action="contact" x-bind:aria-label="contactOpen ? t.hideContact : t.openContact" x-bind:aria-pressed="contactOpen" x-on:click="contactOpen = !contactOpen">
                        <x-lucide-panel-right aria-hidden="true" class="rtl:-scale-x-100" />
                    </x-nq::button>
                </header>

                <div x-show="finding" style="display: none" data-slot="thread-search" role="search" aria-label="{{ $t['find'] }}" class="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
                    <x-lucide-search aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
                    <x-nq::field.input type="search" class="h-8 flex-1" placeholder="{{ $t['findPlaceholder'] }}" aria-label="{{ $t['findPlaceholder'] }}" x-bind:value="findQuery" x-on:input="typeFind($event.target.value)" x-on:keydown="onFindKey($event)" />
                    <span role="status" class="min-w-16 text-center text-caption tabular-nums text-muted-foreground" x-text="findLabel"></span>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['findPrev'] }}" x-bind:disabled="matches.length == 0 ? true : null" x-on:click="stepFind(-1)"><x-lucide-chevron-up aria-hidden="true" /></x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['findNext'] }}" x-bind:disabled="matches.length == 0 ? true : null" x-on:click="stepFind(1)"><x-lucide-chevron-down aria-hidden="true" /></x-nq::button>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['findClose'] }}" x-on:click="closeFind()"><x-lucide-x aria-hidden="true" /></x-nq::button>
                </div>

                <x-nq::chat label="{{ $t['thread'] }}" content-class="gap-3 p-4" class="flex-1">
                    <template x-for="row in thread" x-bind:key="row.key">
                        @include('nasaq::components.inbox._message')
                    </template>
                    <div x-show="conv.typing" style="display: none" class="flex items-center gap-2 text-caption text-muted-foreground">
                        <x-nq::chat.typing-indicator x-bind:aria-label="conv.contact.name + ` ` + t.typing" />
                    </div>
                </x-nq::chat>

                @include('nasaq::components.inbox._composer')
            </section>
        </template>
        <div x-show="!conv" style="display: none" class="flex min-w-0 flex-1 items-center justify-center bg-background p-6">
            <x-nq::states :title="$t['noSelection']" :description="$t['noSelectionHint']" class="max-w-sm border-0" />
        </div>
    </div>
</template>

<x-nq::dialog x-model="snoozeDialog">
    <x-nq::dialog.content class="max-w-sm">
        <x-nq::dialog.header>
            <x-nq::dialog.title>{{ $t['snoozeCustom'] }}</x-nq::dialog.title>
        </x-nq::dialog.header>
        <label class="flex flex-col gap-1.5 text-label text-foreground">
            {{ $t['snoozeCustomLabel'] }}
            <x-nq::field.input ltr type="datetime-local" x-model="snoozeValue" x-bind:min="snoozeMin" />
        </label>
        <x-nq::dialog.footer>
            <x-nq::button type="button" variant="secondary" x-on:click="snoozeDialog = false">{{ $t['cancel'] }}</x-nq::button>
            <x-nq::button type="button" variant="primary" data-action="snooze-confirm" x-bind:disabled="Number.isFinite(snoozeAt) ? null : true" x-on:click="confirmSnooze()">{{ $t['snoozeConfirm'] }}</x-nq::button>
        </x-nq::dialog.footer>
    </x-nq::dialog.content>
</x-nq::dialog>
