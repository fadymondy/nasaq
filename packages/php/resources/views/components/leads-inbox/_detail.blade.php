{{-- Internal: the side panel of one lead. Runs in the scope of x-nq::leads-inbox (cur, detail, snipOpen ...). --}}
<x-nq::sheet x-model="detail.open">
    <x-nq::sheet.content side="end" class="w-[min(34rem,100vw)]">
        <x-nq::sheet.header>
            <x-nq::sheet.title dir="auto"><span x-text="cur.name"></span></x-nq::sheet.title>
            <x-nq::sheet.description>
                <span class="inline-flex flex-wrap items-center gap-2">
                    @include('nasaq::components.leads-inbox._status', ['field' => 'cur.status'])
                    <span class="text-body-sm text-muted-foreground" x-text="cur.receivedText"></span>
                </span>
            </x-nq::sheet.description>
        </x-nq::sheet.header>
        <x-nq::sheet.body class="flex flex-col gap-5">
            <ol aria-label="{{ $L['pipeline'] }}" class="flex flex-wrap items-center gap-1.5">
                <template x-for="step in cur.steps" x-bind:key="step.status">
                    <li x-bind:aria-current="step.current ? 'step' : null" class="flex items-center gap-1.5">
                        <span x-bind:class="step.current ? 'border-primary bg-primary text-primary-foreground' : (step.done ? 'border-nq-success/40 bg-nq-success-soft text-nq-success-text' : 'border-border text-muted-foreground')"
                            class="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption">
                            <x-lucide-check aria-hidden="true" class="size-3" x-show="step.done" style="display: none" />
                            <span x-text="step.label"></span>
                        </span>
                        <x-lucide-arrow-right aria-hidden="true" class="size-3 text-muted-foreground rtl:-scale-x-100" x-show="step.arrow" style="display: none" />
                    </li>
                </template>
            </ol>
            <template x-if="detail.moveError"><x-nq::alert tone="danger"><span x-text="detail.moveError"></span></x-nq::alert></template>

            <div class="flex flex-wrap gap-2">
                <template x-if="cur.showConvert">
                    <x-nq::button type="button" variant="primary" size="sm" data-action="convert" x-on:click="startConvertFromDetail()"><x-lucide-user-plus aria-hidden="true" />{{ $L['convert'] }}</x-nq::button>
                </template>
                <template x-for="m in cur.moves" x-bind:key="m.status">
                    <x-nq::button type="button" variant="secondary" size="sm" data-action="move" x-on:click="move(m.status)"><span x-text="m.label"></span></x-nq::button>
                </template>
                <template x-if="cur.showSpam">
                    <x-nq::button type="button" variant="ghost" size="sm" data-action="spam" x-on:click="toggleSpam()"><x-lucide-ban aria-hidden="true" /><span x-text="cur.spamLabel"></span></x-nq::button>
                </template>
            </div>

            <section x-show="cur.showRefs" style="display: none" aria-label="{{ $L['converted'] }}" class="flex flex-col gap-2 rounded-card border border-nq-success/40 bg-nq-success-soft p-3 text-body-sm">
                <span class="text-label text-nq-success-text">{{ $L['converted'] }}</span>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <template x-if="cur.hasContact"><div class="contents"><dt class="text-muted-foreground">{{ $L['contactRef'] }}</dt><dd dir="auto" x-text="cur.contactName"></dd></div></template>
                    <template x-if="cur.hasCompanyRef"><div class="contents"><dt class="text-muted-foreground">{{ $L['companyRef'] }}</dt><dd dir="auto" x-text="cur.companyRefName"></dd></div></template>
                    <template x-if="cur.hasDeal"><div class="contents"><dt class="text-muted-foreground">{{ $L['dealRef'] }}</dt><dd dir="auto" x-text="cur.dealName"></dd></div></template>
                </dl>
            </section>

            <section aria-label="{{ $L['message'] }}" class="flex flex-col gap-2">
                <h3 class="text-label text-foreground">{{ $L['message'] }}</h3>
                <p x-show="cur.hasMessage" style="display: none" dir="auto" class="whitespace-pre-wrap rounded-card border border-border bg-nq-surface-soft p-3 text-body-sm" x-text="cur.message"></p>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
                    <template x-if="cur.hasEmail"><div class="contents"><dt class="text-muted-foreground">{{ $L['email'] }}</dt><dd><bdi dir="ltr" x-text="cur.email"></bdi></dd></div></template>
                    <template x-if="cur.hasPhone"><div class="contents"><dt class="text-muted-foreground">{{ $L['phone'] }}</dt><dd><bdi dir="ltr" x-text="cur.phone"></bdi></dd></div></template>
                    <template x-if="cur.hasCompany"><div class="contents"><dt class="text-muted-foreground">{{ $L['companyRef'] }}</dt><dd dir="auto" x-text="cur.company"></dd></div></template>
                    <template x-if="cur.hasBudget"><div class="contents"><dt class="text-muted-foreground">{{ $L['budget'] }}</dt><dd dir="auto" x-text="cur.budget"></dd></div></template>
                    <template x-if="cur.hasForm"><div class="contents"><dt class="text-muted-foreground">{{ $L['form'] }}</dt><dd dir="auto" x-text="cur.form"></dd></div></template>
                    <template x-if="cur.hasScore"><div class="contents"><dt class="text-muted-foreground">{{ $L['score'] }}</dt><dd x-text="cur.scoreText"></dd></div></template>
                </dl>
            </section>

            <section aria-label="{{ $L['attribution'] }}" class="flex flex-col gap-2">
                <div class="flex flex-col gap-0.5">
                    <h3 class="text-label text-foreground">{{ $L['attribution'] }}</h3>
                    <p class="text-caption text-muted-foreground">{{ $L['attributionHint'] }}</p>
                </div>
                @include('nasaq::components.leads-inbox._source', ['scope' => 'cur'])
                <p x-show="cur.noAttr" style="display: none" class="text-body-sm text-muted-foreground">{{ $L['direct'] }}</p>
                <dl x-show="! cur.noAttr" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
                    <template x-for="entry in cur.attrEntries" x-bind:key="entry.key">
                        <div class="contents">
                            <dt class="text-muted-foreground" x-text="entry.label"></dt>
                            <dd class="flex min-w-0 items-center gap-1.5">
                                <bdi dir="ltr" class="min-w-0 break-all font-mono text-caption text-foreground" x-text="entry.value"></bdi>
                                <template x-if="entry.copy"><x-nq::copy-button value="" value-expr="entry.value" label="{{ $L['copy'] }}" /></template>
                            </dd>
                        </div>
                    </template>
                </dl>
            </section>

            @if ($can['reply'])
                <section aria-label="{{ $L['reply'] }}" class="flex flex-col gap-2">
                    <label for="{{ $uid }}-reply" class="text-label text-foreground">{{ $L['replyLabel'] }}</label>
                    <template x-if="detail.noteTone === 'danger'"><x-nq::alert tone="danger"><span x-text="detail.note"></span></x-nq::alert></template>
                    <template x-if="detail.noteTone === 'success'"><x-nq::alert tone="success"><span x-text="detail.note"></span></x-nq::alert></template>
                    <x-nq::field.textarea id="{{ $uid }}-reply" dir="auto" x-model="detail.text" rows="4" placeholder="{{ $L['replyPlaceholder'] }}" />
                    <div class="flex items-center justify-between gap-2">
                        @if (! empty($canned))
                            <x-nq::popover x-model="snipOpen">
                                <x-nq::popover.trigger variant="ghost" size="icon-sm" data-action="snippets" aria-label="{{ $L['cannedTrigger'] }}"><x-lucide-zap aria-hidden="true" /></x-nq::popover.trigger>
                                <x-nq::popover.content side="bottom" align="start" class="flex w-80 flex-col gap-2 p-2">
                                    <x-nq::field.input data-slot="snippet-search" role="combobox" aria-expanded="true" aria-label="{{ $L['cannedSearch'] }}" placeholder="{{ $L['cannedSearch'] }}"
                                        x-model="snipQuery" x-on:input="snipActive = 0" x-on:keydown="onSnipKey($event)" />
                                    <ul role="listbox" aria-label="{{ $L['cannedTrigger'] }}" class="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                                        <li x-show="snippetList.length == 0" style="display: none" role="presentation" class="px-2 py-3 text-center text-body-sm text-muted-foreground">{{ $L['cannedEmpty'] }}</li>
                                        <template x-for="(s, i) in snippetList" x-bind:key="s.id">
                                            <li role="option" tabindex="-1" data-action="snippet" x-bind:aria-selected="i == snipActive" x-bind:class="i == snipActive ? `bg-nq-hover` : ``" x-on:mouseenter="snipActive = i" x-on:click="pickSnippet(s)"
                                                class="flex cursor-pointer flex-col gap-0.5 rounded-control px-2 py-1.5 text-start">
                                                <span class="flex items-center gap-2">
                                                    <span dir="auto" class="flex-1 truncate text-label text-foreground" x-text="s.title"></span>
                                                    <kbd dir="ltr" class="rounded-[4px] border border-border bg-secondary px-1 font-mono text-caption text-muted-foreground" x-text="`/` + s.shortcut"></kbd>
                                                </span>
                                                <span dir="auto" class="line-clamp-2 text-caption text-muted-foreground" x-text="s.body"></span>
                                            </li>
                                        </template>
                                    </ul>
                                </x-nq::popover.content>
                            </x-nq::popover>
                        @else
                            <span></span>
                        @endif
                        <x-nq::button type="button" variant="primary" size="sm" data-action="send" x-on:click="send()" x-bind:disabled="canSend ? null : ''" x-bind:aria-busy="detail.busy ? 'true' : null">
                            <x-nq::spinner x-show="detail.busy" style="display: none" />
                            <x-lucide-send aria-hidden="true" class="rtl:-scale-x-100" />{{ $L['send'] }}
                        </x-nq::button>
                    </div>
                </section>
            @endif
        </x-nq::sheet.body>
    </x-nq::sheet.content>
</x-nq::sheet>
