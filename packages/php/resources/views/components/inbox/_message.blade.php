{{-- Internal: one message of the thread of x-nq::inbox, by kind (event line, internal note, email card, chat bubble). Runs in the thread's x-for (row = { m, day, html, who, out, current }). --}}
<div class="flex flex-col gap-3" x-bind:data-message-id="row.m.id">
    <div x-show="row.day" style="display: none" class="flex items-center gap-3 text-caption text-muted-foreground">
        <span class="h-px flex-1 bg-border"></span>
        <span x-text="row.day"></span>
        <span class="h-px flex-1 bg-border"></span>
    </div>

    <template x-if="row.m.kind == `system`">
        <div data-slot="inbox-event" class="flex items-center gap-3 text-caption text-muted-foreground">
            <span aria-hidden="true" class="h-px flex-1 bg-border"></span>
            <span dir="auto" class="text-center" x-text="row.m.body"></span>
            <time x-text="when(row.m.at, { timeStyle: `short` })"></time>
            <span aria-hidden="true" class="h-px flex-1 bg-border"></span>
        </div>
    </template>

    <template x-if="row.m.kind == `note`">
        <div data-slot="inbox-note" class="flex flex-col gap-1 rounded-card border border-dashed border-nq-warning/50 bg-nq-warning-soft p-3">
            <div class="flex items-center gap-2 text-caption text-muted-foreground">
                <span data-slot="badge" class="inline-flex h-5 items-center gap-1 rounded-full border border-transparent bg-nq-warning-soft px-2 text-caption text-nq-warning-text [&_svg]:size-3"><x-lucide-lock aria-hidden="true" />{{ $t['noteBadge'] }}</span>
                <span class="text-label text-foreground" x-text="row.who"></span>
                <time x-text="when(row.m.at, { timeStyle: `short` })"></time>
            </div>
            <p dir="auto" class="whitespace-pre-wrap text-start text-body text-nq-fg-body [overflow-wrap:anywhere]" x-html="row.html"></p>
        </div>
    </template>

    <template x-if="row.m.kind != `system` &amp;&amp; row.m.kind != `note` &amp;&amp; isEmail">
        <article data-slot="inbox-email" x-bind:data-direction="row.m.direction" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
            <header class="flex items-start gap-3">
                @include('nasaq::components.inbox._avatar', ['name' => 'row.who', 'src' => 'row.out ? row.m.author?.avatar : conv.contact.avatar', 'size' => 'md'])
                <div class="flex min-w-0 flex-1 flex-col">
                    <span class="flex flex-wrap items-center gap-x-2 text-label text-foreground">
                        <span dir="auto" x-text="row.who"></span>
                        <span x-show="row.out" style="display: none" data-slot="badge" class="inline-flex h-5 items-center rounded-full border border-border px-2 text-caption text-muted-foreground">{{ $t['reply'] }}</span>
                    </span>
                    <span x-show="row.m.to?.length" style="display: none" class="truncate text-caption text-muted-foreground">
                        {{ $t['to'] }}: <bdi dir="ltr" x-text="(row.m.to ?? []).join(`, `)"></bdi>
                        <span x-show="row.m.cc?.length" style="display: none"> · {{ $t['cc'] }}: <bdi dir="ltr" x-text="(row.m.cc ?? []).join(`, `)"></bdi></span>
                    </span>
                </div>
                <time class="shrink-0 text-caption text-muted-foreground" x-text="when(row.m.at, { dateStyle: `medium`, timeStyle: `short` })"></time>
            </header>
            <h3 x-show="row.m.subject" style="display: none" dir="auto" class="text-h3 text-foreground" x-text="row.m.subject"></h3>
            <p dir="auto" class="whitespace-pre-wrap text-start text-body text-nq-fg-body [overflow-wrap:anywhere]" x-html="row.html"></p>
            @include('nasaq::components.inbox._extras')
            <span x-show="row.m.status == `sending`" style="display: none" role="status" class="text-caption text-muted-foreground">{{ $t['sending'] }}</span>
            <span x-show="row.m.status == `error`" style="display: none" class="flex items-center gap-2 text-caption text-nq-danger-text">
                <span role="alert">{{ $t['failed'] }}</span>
                <x-nq::button type="button" variant="link" size="sm" x-on:click="retry(row.m)">{{ $t['retry'] }}</x-nq::button>
            </span>
            <footer>
                <x-nq::button type="button" variant="secondary" size="sm" data-action="reply" x-on:click="startReply(row.m)"><x-lucide-corner-up-left aria-hidden="true" class="rtl:-scale-x-100" />{{ $t['replyAction'] }}</x-nq::button>
            </footer>
        </article>
    </template>

    <template x-if="row.m.kind != `system` &amp;&amp; row.m.kind != `note` &amp;&amp; !isEmail">
        <div data-slot="inbox-message" x-bind:data-direction="row.m.direction" x-bind:class="row.out ? `flex-row-reverse self-end` : `self-start`" class="group flex max-w-[88%] items-start gap-1">
            <div class="flex min-w-0 flex-col gap-1">
                <div data-slot="chat-message" x-bind:data-side="row.out ? `user` : `assistant`" x-bind:data-status="row.m.status == `sending` || row.m.status == `error` ? row.m.status : null"
                    x-bind:class="row.out ? `flex-row-reverse self-end` : `self-start`" class="flex max-w-full items-start gap-2">
                    @include('nasaq::components.inbox._avatar', ['name' => 'row.who', 'src' => 'row.out ? row.m.author?.avatar : conv.contact.avatar', 'size' => 'sm', 'class' => 'mt-0.5'])
                    <div x-bind:class="row.out ? `items-end` : `items-start`" class="flex min-w-0 flex-col gap-1">
                        <div class="flex items-center gap-2 text-caption text-muted-foreground">
                            <span class="text-label text-foreground" x-text="row.who"></span>
                            <time x-text="when(row.m.at, { timeStyle: `short` })"></time>
                        </div>
                        <div data-slot="chat-bubble" x-bind:class="(row.out ? `bg-secondary text-secondary-foreground` : `border border-border bg-card text-nq-fg-body`) + (row.m.status == `error` ? ` border border-nq-danger` : ``)" class="min-w-0 rounded-card px-3 py-2 text-body">
                            <div class="flex flex-col">
                                <div x-show="row.m.replyTo" style="display: none" data-slot="reply-quote" class="mb-1.5 rounded-[4px] border-s-2 border-nq-accent bg-background/60 py-1 ps-2 pe-2 text-start">
                                    <button type="button" x-bind:aria-label="`{{ $t['quoteJump'] }}: ` + (row.m.replyTo?.author ?? ``)" x-on:click="jump(row.m.replyTo.id)" class="block w-full text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                        <span dir="auto" class="block truncate text-caption font-medium text-foreground" x-text="row.m.replyTo?.author"></span>
                                        <span dir="auto" class="line-clamp-2 block text-caption text-muted-foreground" x-text="row.m.replyTo?.excerpt"></span>
                                    </button>
                                </div>
                                <div x-show="row.m.kind == `voice` &amp;&amp; row.m.voice" style="display: none" data-slot="voice-player" class="flex w-56 max-w-full items-center gap-2 py-1">
                                    <button type="button" x-bind:aria-label="playing[row.m.id] ? `{{ $t['pause'] }}` : `{{ $t['play'] }}`" x-on:click="playVoice(row.m)"
                                        class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4">
                                        <x-lucide-pause x-show="playing[row.m.id]" aria-hidden="true" style="display: none" />
                                        <x-lucide-play x-show="!playing[row.m.id]" aria-hidden="true" class="rtl:-scale-x-100" />
                                    </button>
                                    <span aria-hidden="true" dir="ltr" class="flex h-6 flex-1 items-center gap-px">
                                        <template x-for="(h, i) in (row.m.voice ? bars(row.m) : [])" x-bind:key="i">
                                            <span class="w-0.5 flex-1 rounded-full bg-muted-foreground/60" x-bind:style="`height: ` + Math.round(h * 100) + `%`"></span>
                                        </template>
                                    </span>
                                    <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground" x-text="row.m.voice ? duration(row.m.voice.duration) : ``"></bdi>
                                </div>
                                <div x-show="row.m.kind == `location` &amp;&amp; row.m.location" style="display: none" data-slot="location-card" class="my-1 w-60 max-w-full overflow-hidden rounded-control border border-border bg-card">
                                    <div aria-hidden="true" dir="ltr" class="relative grid h-24 place-items-center bg-secondary [background-image:linear-gradient(var(--nq-line)_1px,transparent_1px),linear-gradient(90deg,var(--nq-line)_1px,transparent_1px)] [background-size:2rem_2rem]">
                                        <x-lucide-map-pin class="size-7 -translate-y-2 fill-current stroke-background text-nq-danger-text" />
                                    </div>
                                    <div class="flex flex-col gap-0.5 p-2.5">
                                        <span dir="auto" class="text-label text-foreground" x-text="row.m.location?.label ?? t.locationMessage"></span>
                                        <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground" x-text="row.m.location ? coords(row.m.location) : ``"></bdi>
                                        <a x-bind:href="row.m.location ? mapsLink(row.m.location) : `#`" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex items-center gap-1 self-start text-caption text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">{{ $t['openInMaps'] }}<x-lucide-external-link aria-hidden="true" class="size-3" /></a>
                                    </div>
                                </div>
                                @include('nasaq::components.inbox._extras', ['attachClass' => 'my-1'])
                                <p x-show="row.html &amp;&amp; row.m.kind != `voice`" style="display: none" dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]" x-html="row.html"></p>
                            </div>
                        </div>
                        <div x-show="row.m.status == `sending`" style="display: none" class="flex items-center gap-1.5 text-caption text-muted-foreground"><x-nq::spinner class="size-3" /><span role="status">{{ $t['sending'] }}</span></div>
                        <div x-show="row.m.status == `error`" style="display: none" class="flex items-center gap-1.5 text-caption text-muted-foreground">
                            <x-lucide-circle-alert aria-hidden="true" class="size-3 text-nq-danger-text" />
                            <span role="alert" class="text-nq-danger-text">{{ $t['failed'] }}</span>
                            <x-nq::button type="button" variant="link" size="sm" x-on:click="retry(row.m)">{{ $t['retry'] }}</x-nq::button>
                        </div>
                    </div>
                </div>
                <div x-show="row.m.reactions?.length" style="display: none" data-slot="message-reactions" role="group" aria-label="{{ $t['reactions'] }}" x-bind:class="row.out ? `justify-end` : `ms-8 justify-start`" class="flex flex-wrap gap-1">
                    <template x-for="r in (row.m.reactions ?? [])" x-bind:key="r.emoji">
                        <button type="button" x-bind:aria-pressed="reacted(r)" x-bind:aria-label="say(`reactedWith`, { emoji: r.emoji, n: num(r.by.length) })" x-on:click="react(row.m, r.emoji)"
                            x-bind:class="reacted(r) ? `border-nq-accent bg-nq-accent/15 text-foreground` : `border-border bg-card text-muted-foreground hover:bg-nq-hover`"
                            class="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption tabular-nums outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <span aria-hidden="true" x-text="r.emoji"></span>
                            <span x-text="num(r.by.length)"></span>
                        </button>
                    </template>
                </div>
            </div>
            <div data-slot="message-actions" class="flex shrink-0 items-center self-center opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                <x-nq::popover>
                    <x-nq::popover.trigger variant="ghost" size="icon-sm" aria-label="{{ $t['react'] }}"><x-lucide-smile aria-hidden="true" /></x-nq::popover.trigger>
                    <x-nq::popover.content side="top" align="center" class="flex w-auto gap-0.5 p-1">
                        <template x-for="e in quick" x-bind:key="e">
                            <button type="button" x-bind:aria-label="e" x-on:click="react(row.m, e); close()" x-text="e"
                                class="grid size-8 place-items-center rounded-control text-lg outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"></button>
                        </template>
                    </x-nq::popover.content>
                </x-nq::popover>
                <x-nq::button type="button" variant="ghost" size="icon-sm" data-action="reply" aria-label="{{ $t['replyAction'] }}" x-on:click="startReply(row.m)"><x-lucide-corner-up-left aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
            </div>
        </div>
    </template>
</div>
