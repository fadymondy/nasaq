{{-- <x-nq::copilot-chat :messages="$messages" :starters="['Summarise this week', 'What is overdue?']" @nq-send="send($event.detail)" />
     An AI assistant chat (React CopilotChat): streamed Markdown answers with tool-call steps, artifacts and sources, starter prompts and follow-ups, context
     chips, attachments, "/" commands, toggles, history, a model picker and copy-for-AI code blocks. A side panel or a full page. You own `messages` and render
     them again as the answer grows (Livewire, or a fresh response); a new message of the visitor shows at once and the server list takes over.
     messages: [{ id, role: user|assistant, text (Markdown for the assistant), at?, steps?: [{ id, label, tool?, status: running|done|error, detail? }],
       sources?: [{ id, title, url?, snippet? }], followUps?: [..], streaming?, error? ("" for the default words), feedback?: up|down, attachments?: [{ id, name,
       type?, size?, url? }], artifacts?: [..], hidden? }].
     mode: panel (default) | page. title. starters: [..]. context: [{ id, label, kind? }]; context-options: more items for Add context.
     models: [{ id, label }] with model (the selected id). mentions: [{ id, name, description?, avatar? ..}] for @. commands: [{ id, label, description?, kind? }] for "/".
     toggles: [{ id, label, description?, icon? (a Lucide name) }] with active-toggles: [ids]. sessions: [{ id, title, at? }] with active-session-id.
     Buttons turn on with their flag, as the React callbacks do: closable, new-chat, attachable (with accept="image/*,.pdf"), stoppable, regenerate, feedback, share.
     copy-targets (the copy menu of code blocks), allow-html (artifacts), disclaimer, labels: partial overrides of the words (keys of nq_cc_words), header-actions slot.
     Events, bubbling from the root. nq-send carries detail.waitUntil(promise): resolve { error: "message" } to keep the text of the visitor.
       nq-send { text, mentions, context, model, attachments (File[]), commands, toggles }   nq-attach { files }
       nq-stop, nq-new-chat, nq-close, nq-regenerate { id }, nq-feedback { id, value }, nq-context-change { items }, nq-model-change { id },
       nq-toggles-change { ids }, nq-attachments-change { items }, nq-session-select { id }, nq-session-delete { id }.
     Dispatch nq-copilot-synced on the root once the server list holds the sent messages: it clears the "just sent" ones. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.copilot-chat._logic')
@props(['messages' => [], 'mode' => 'panel', 'title' => null, 'starters' => [], 'context' => [], 'contextOptions' => [], 'models' => [], 'model' => null, 'mentions' => [], 'commands' => [],
    'toggles' => [], 'activeToggles' => [], 'sessions' => null, 'activeSessionId' => null, 'closable' => false, 'newChat' => false, 'attachable' => false, 'accept' => null, 'stoppable' => false,
    'regenerate' => false, 'feedback' => false, 'share' => false, 'copyTargets' => ['claude', 'chatgpt', 'cursor'], 'allowHtml' => false, 'disclaimer' => null, 'labels' => [], 'headerActions' => null])
@php
    $t = nq_cc_words($labels);
    $page = $mode === 'page';
    $visible = array_values(array_filter($messages, fn ($m) => empty($m['hidden'])));
    $lastId = $visible ? ($visible[count($visible) - 1]['id'] ?? null) : null;
    $busy = (bool) collect($messages)->contains(fn ($m) => ! empty($m['streaming']));
    $heading = $title ?? $t['title'];
    $model ??= $models[0]['id'] ?? null;
    $given = [];
    foreach ($visible as $m) {
        if (! empty($m['feedback'])) {
            $given[(string) $m['id']] = $m['feedback'];
        }
    }
    $opts = \Illuminate\Support\Js::from([
        'commands' => array_values($commands),
        'context' => array_values($context),
        'contextOptions' => array_values($contextOptions),
        'toggles' => array_values($activeToggles),
        'model' => $model,
        'feedback' => (object) $given,
        'busy' => $busy,
        'stoppable' => (bool) $stoppable,
        'count' => count($visible),
        'transcript' => nq_cc_transcript($visible, ['user' => $t['you'], 'assistant' => $t['assistant']]),
        'words' => [
            'commands' => $t['commands'], 'noCommands' => $t['noCommands'], 'removeContext' => $t['removeContext'], 'removeCommand' => $t['removeCommand'],
            'removeAttachment' => $t['removeAttachment'], 'copied' => $t['copied'], 'copy' => $t['copy'], 'copyChat' => $t['copyChat'], 'sendFailed' => $t['sendFailed'],
            'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en',
        ],
    ])->toHtml();
    $hasHistory = $sessions !== null;
    $contextIds = array_map(fn ($c) => (string) ($c['id'] ?? ''), array_values($context));
    $availableCount = count(array_filter(array_values($contextOptions), fn ($o) => ! in_array((string) ($o['id'] ?? ''), $contextIds, true)));
    $iconBtn = 'outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus';
    $chipX = 'grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground '.$iconBtn;
    $copyChatJs = \Illuminate\Support\Js::from($t['copyChat'])->toHtml();
    $hide = 'display: none';
@endphp
<section aria-label="{{ $title ?? $t['conversation'] }}" data-slot="{{ $attributes->get('data-slot', 'copilot-chat') }}" data-mode="{{ $mode }}" x-data="nqCopilotChat({!! $opts !!})"
    x-on:nq-copilot-synced="outbox = []"
    {{ $attributes->except('data-slot')->cn(['flex min-h-0 flex-col bg-background text-foreground', $page ? 'h-full w-full' : 'h-full w-full border-border']) }}>
    <header class="{{ \Nasaq\Cn::merge('flex items-center gap-2 border-b border-border px-4 py-2.5', $page ? 'justify-center' : '') }}">
        <span aria-hidden="true" class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><x-lucide-sparkles class="size-3.5" /></span>
        <h2 class="min-w-0 flex-1 truncate text-label">{{ $heading }}</h2>
        @if ($hasHistory)
            <x-nq::popover>
                <x-nq::popover.trigger variant="ghost" size="icon-sm" aria-label="{{ $t['history'] }}" title="{{ $t['history'] }}"><x-lucide-history aria-hidden="true" class="size-4" /></x-nq::popover.trigger>
                <x-nq::popover.content align="end" class="w-72 p-1">
                    @if (count($sessions) === 0)
                        <p class="px-3 py-4 text-center text-caption text-muted-foreground">{{ $t['noHistory'] }}</p>
                    @else
                        <ul aria-label="{{ $t['history'] }}" data-slot="copilot-history" class="flex max-h-80 flex-col overflow-y-auto">
                            @foreach ($sessions as $s)
                                @php($sid = \Illuminate\Support\Js::from((string) $s['id'])->toHtml())
                                <li class="group flex items-center gap-1">
                                    <button type="button" x-on:click="pickSession({!! $sid !!}); close()" @if (($s['id'] ?? null) === $activeSessionId) aria-current="true" @endif
                                        class="flex min-w-0 flex-1 flex-col rounded-control px-2.5 py-1.5 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-[current]:bg-nq-selected">
                                        <span dir="auto" class="truncate text-body-sm text-foreground">{{ $s['title'] }}</span>
                                        @if (isset($s['at']))<x-nq::numeric.date-time :value="$s['at']" date-style="medium" time-style="short" class="text-[11px] text-muted-foreground" />@endif
                                    </button>
                                    <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="dropSession({!! $sid !!})" aria-label="{{ nq_cc_fill($t['deleteSession'], ['name' => $s['title']]) }}" title="{{ nq_cc_fill($t['deleteSession'], ['name' => $s['title']]) }}">
                                        <x-lucide-trash-2 aria-hidden="true" class="size-3.5" />
                                    </x-nq::button>
                                </li>
                            @endforeach
                        </ul>
                    @endif
                </x-nq::popover.content>
            </x-nq::popover>
        @endif
        @if ($newChat)
            <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="$dispatch('nq-new-chat')" aria-label="{{ $t['newChat'] }}" title="{{ $t['newChat'] }}"><x-lucide-plus aria-hidden="true" class="size-4" /></x-nq::button>
        @endif
        @if (count($visible) > 0)
            <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="copyAll()" x-bind:aria-label="copyLabel('all', {!! $copyChatJs !!})" x-bind:title="copyLabel('all', {!! $copyChatJs !!})">
                <x-lucide-check x-show="isCopied('all')" style="display: none" aria-hidden="true" class="size-4" />
                <x-lucide-copy x-show="! isCopied('all')" aria-hidden="true" class="size-4" />
            </x-nq::button>
        @endif
        @if ($headerActions && ! $headerActions->isEmpty()){{ $headerActions }}@endif
        @if ($closable)
            <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="$dispatch('nq-close')" aria-label="{{ $t['close'] }}" title="{{ $t['close'] }}"><x-lucide-x aria-hidden="true" class="size-4" /></x-nq::button>
        @endif
    </header>

    @if (count($visible) === 0)
        <div x-show="! started()" class="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
            <span aria-hidden="true" class="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><x-lucide-sparkles class="size-6" /></span>
            <div class="flex flex-col gap-1">
                <h3 class="text-h3">{{ $t['emptyTitle'] }}</h3>
                <p class="text-body-sm text-muted-foreground">{{ $t['emptyBody'] }}</p>
            </div>
            @if (count($starters))
                <ul aria-label="{{ $t['starters'] }}" class="{{ \Nasaq\Cn::merge('grid w-full gap-2', $page ? 'max-w-2xl sm:grid-cols-2' : 'max-w-sm') }}">
                    @foreach ($starters as $s)
                        <li><button type="button" dir="auto" x-on:click="send({!! \Illuminate\Support\Js::from((string) $s) !!})"
                            class="w-full rounded-card border border-border bg-card px-4 py-3 text-start text-body-sm outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $s }}</button></li>
                    @endforeach
                </ul>
            @endif
        </div>
    @endif
    <x-nq::chat :label="$t['conversation']" class="min-h-0 flex-1" :content-class="\Nasaq\Cn::merge('gap-5 p-4', $page ? 'mx-auto w-full max-w-3xl' : '')"
        x-show="threadShown()" :style="count($visible) ? '' : $hide">
        @foreach ($visible as $m)
            @if (($m['role'] ?? 'user') === 'user')
                <x-nq::chat.message side="user" :name="$t['you']" :time="$m['at'] ?? null" data-id="{{ $m['id'] ?? '' }}">
                    @if (! empty($m['attachments']))
                        <span class="flex flex-col gap-2">
                            <span role="list" aria-label="{{ $t['attachments'] }}" class="flex flex-wrap gap-1.5">
                                @foreach ($m['attachments'] as $a)<x-nq::copilot-chat.attachment role="listitem" :attachment="$a" :t="$t" />@endforeach
                            </span>
                            @if (($m['text'] ?? '') !== '')<span class="whitespace-pre-wrap">{{ $m['text'] }}</span>@endif
                        </span>
                    @else
                        <p dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]">{{ $m['text'] ?? '' }}</p>
                    @endif
                </x-nq::chat.message>
            @else
                <x-nq::copilot-chat.answer :message="$m" :last="($m['id'] ?? null) === $lastId" :t="$t" :regenerate="$regenerate" :feedback="$feedback" :share="$share" :copy-targets="$copyTargets" :allow-html="$allowHtml" />
            @endif
        @endforeach
        {{-- Messages sent in this page: shown at once, kept unless the host refuses them. --}}
        <template x-for="m in outbox" x-bind:key="m.id">
            <div data-slot="chat-message" data-side="user" class="flex max-w-[85%] items-start gap-2 flex-row-reverse self-end">
                <x-nq::avatar :name="$t['you']" size="sm" class="mt-0.5" />
                <div class="flex min-w-0 flex-col gap-1 items-end">
                    <div class="flex items-center gap-2 text-caption text-muted-foreground"><span class="text-label text-foreground">{{ $t['you'] }}</span></div>
                    <div data-slot="chat-bubble" class="min-w-0 rounded-card px-3 py-2 text-body bg-secondary text-secondary-foreground">
                        <span x-show="m.files.length" class="flex flex-wrap gap-1.5" role="list" aria-label="{{ $t['attachments'] }}">
                            <template x-for="f in m.files" x-bind:key="f.id">
                                <span role="listitem" data-slot="copilot-attachment" class="inline-flex max-w-56 items-center gap-2 rounded-control border border-border bg-card p-1 pe-1.5 text-caption">
                                    <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-sm bg-secondary text-muted-foreground"><x-lucide-file-text class="size-4" /></span>
                                    <span class="flex min-w-0 flex-col"><span dir="auto" class="truncate text-foreground" x-text="f.name"></span><span class="truncate text-[11px] tabular-nums text-muted-foreground" x-text="fileDetail(f)"></span></span>
                                </span>
                            </template>
                        </span>
                        <p x-show="m.text" x-text="m.text" dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]"></p>
                    </div>
                </div>
            </div>
        </template>
    </x-nq::chat>

    <div class="{{ \Nasaq\Cn::merge('flex flex-col gap-2 border-t border-border p-3', $page ? 'items-center' : '') }}">
        <div class="{{ \Nasaq\Cn::merge('relative flex w-full flex-col gap-2', $page ? 'max-w-3xl' : '') }}">
            <div x-show="showContext()" @if (! count($context) && ! count($contextOptions)) style="display: none" @endif role="group" aria-label="{{ $t['context'] }}" data-slot="copilot-context" class="flex flex-wrap items-center gap-1.5">
                <template x-for="i in ctx" x-bind:key="i.id">
                    <span class="inline-flex max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
                        <span x-show="i.kind" class="text-muted-foreground" x-text="i.kind"></span>
                        <span dir="auto" class="truncate" x-text="i.label"></span>
                        <button type="button" x-bind:aria-label="removeContextLabel(i)" x-on:click="dropContext(i.id)" class="{{ $chipX }}"><x-lucide-x aria-hidden="true" class="size-3" /></button>
                    </span>
                </template>
                <x-nq::dropdown-menu x-show="available().length" :style="$availableCount ? null : 'display: none'">
                    <button type="button" x-bind="trigger" aria-label="{{ $t['addContext'] }}"
                        class="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-border px-2 text-caption text-muted-foreground {{ $iconBtn }}">
                        <x-lucide-plus aria-hidden="true" class="size-3" />{{ $t['addContext'] }}
                    </button>
                    <x-nq::dropdown-menu.content>
                        <template x-for="o in available()" x-bind:key="o.id">
                            <x-nq::dropdown-menu.item x-on:click="addContext(o)">
                                <span x-show="o.kind" class="text-muted-foreground" x-text="o.kind"></span><span dir="auto" x-text="o.label"></span>
                            </x-nq::dropdown-menu.item>
                        </template>
                    </x-nq::dropdown-menu.content>
                </x-nq::dropdown-menu>
            </div>
            @if (count($commands))
                <div x-show="slashOpen()" style="display: none" data-slot="copilot-commands" class="absolute inset-x-0 bottom-full z-10 mb-2 overflow-hidden rounded-card border border-border bg-popover text-popover-foreground">
                    <p class="border-b border-border px-3 py-1.5 text-caption text-muted-foreground">{{ $t['commands'] }}</p>
                    <p x-show="matches().length === 0" style="display: none" class="px-3 py-3 text-caption text-muted-foreground">{{ $t['noCommands'] }}</p>
                    <ul role="listbox" aria-label="{{ $t['commands'] }}" class="max-h-60 overflow-y-auto p-1">
                        <template x-for="(c, i) in matches()" x-bind:key="c.id">
                            <li role="option" x-bind:aria-selected="i === activeIndex() ? 'true' : 'false'" x-on:mousedown.prevent x-on:click="choose(c)" x-on:mouseenter="slashIndex = i"
                                class="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 aria-selected:bg-nq-selected">
                                <x-lucide-slash aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
                                <span class="flex min-w-0 flex-1 flex-col">
                                    <span dir="auto" class="truncate text-body-sm text-foreground" x-text="c.label"></span>
                                    <span x-show="c.description" dir="auto" class="truncate text-caption text-muted-foreground" x-text="c.description"></span>
                                </span>
                                <span x-show="c.kind" class="inline-flex items-center rounded-full bg-secondary px-2 text-caption text-secondary-foreground" x-text="c.kind"></span>
                            </li>
                        </template>
                    </ul>
                </div>
            @endif
            <span aria-live="polite" class="sr-only" x-text="announce()"></span>
            <div data-slot="copilot-composer" x-bind:data-dragging="dragging ? '' : null" x-on:dragover="onDragOver($event)" x-on:dragleave="onDragLeave($event)" x-on:drop="onDrop($event)"
                class="relative flex flex-col gap-2 rounded-card border border-border bg-card p-2 focus-within:outline-2 focus-within:outline-nq-focus data-[dragging]:border-dashed data-[dragging]:border-primary">
                <div x-show="dragging" style="display: none" aria-hidden="true" class="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-card bg-card/90 text-body-sm text-foreground">{{ $t['dropFiles'] }}</div>
                <div x-show="files.length + chosen.length > 0" style="display: none" class="flex flex-wrap items-center gap-1.5">
                    <template x-for="c in chosenCommands()" x-bind:key="c.id">
                        <span data-slot="copilot-command-chip" class="inline-flex max-w-48 items-center gap-1 rounded-full bg-nq-selected ps-2 pe-1 text-caption text-foreground">
                            <x-lucide-slash aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
                            <span dir="auto" class="truncate" x-text="c.label"></span>
                            <button type="button" x-bind:aria-label="removeCommandLabel(c)" x-on:click="unchoose(c.id)" class="{{ $chipX }}"><x-lucide-x aria-hidden="true" class="size-3" /></button>
                        </span>
                    </template>
                    <template x-for="f in files" x-bind:key="f.id">
                        <span data-slot="copilot-attachment" x-bind:title="f.error || f.name" class="inline-flex max-w-56 items-center gap-2 rounded-control border border-border bg-card p-1 pe-1.5 text-caption">
                            <img x-show="isImage(f)" style="display: none" x-bind:src="isImage(f) ? f.url : null" alt="" class="size-8 shrink-0 rounded-sm object-cover" />
                            <span x-show="! isImage(f)" aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-sm bg-secondary text-muted-foreground"><x-lucide-file-text class="size-4" /></span>
                            <span class="flex min-w-0 flex-col"><span dir="auto" class="truncate text-foreground" x-text="f.name"></span><span class="truncate text-[11px] tabular-nums text-muted-foreground" x-text="fileDetail(f)"></span></span>
                            <button type="button" x-bind:aria-label="removeFileLabel(f)" x-on:click="removeFile(f.id)" class="{{ $chipX }}"><x-lucide-x aria-hidden="true" class="size-3" /></button>
                        </span>
                    </template>
                </div>
                <x-nq::mention-textarea x-model="draft" :suggestions="$mentions" :list-label="$t['mentions']" :rows="2" wrapper-class="w-full" aria-label="{{ $t['message'] }}"
                    placeholder="{{ count($commands) ? $t['placeholder'].' '.$t['commandHint'].'.' : $t['placeholder'] }}"
                    x-on:nq-mentions-change="setFound($event)" x-on:keyup="onCaret($event)" x-on:click="onCaret($event)" x-on:paste="onPaste($event)" x-on:keydown="onKey($event)"
                    class="max-h-40 min-h-12 w-full resize-none border-0 bg-transparent p-1 shadow-none outline-none focus-visible:outline-none" />
                <div class="flex flex-wrap items-center gap-1">
                    @if ($attachable)
                        <input type="file" multiple hidden @if ($accept) accept="{{ $accept }}" @endif x-on:change="onPick($event)" />
                        <x-nq::button type="button" variant="ghost" size="icon-sm" x-on:click="pick()" aria-label="{{ $t['attach'] }}" title="{{ $t['attach'] }}"><x-lucide-paperclip aria-hidden="true" class="size-4" /></x-nq::button>
                    @endif
                    @if (count($toggles))
                        <div role="group" aria-label="{{ $t['options'] }}" class="flex flex-wrap items-center gap-1">
                            @foreach ($toggles as $g)
                                @php($gid = \Illuminate\Support\Js::from((string) $g['id'])->toHtml())
                                <x-nq::button type="button" variant="ghost" size="sm" x-on:click="flip({!! $gid !!})" x-bind:aria-pressed="isOn({!! $gid !!})" title="{{ $g['description'] ?? '' }}"
                                    class="h-control-sm gap-1.5 px-2 text-caption text-muted-foreground aria-pressed:bg-nq-selected aria-pressed:text-foreground">
                                    @if (! empty($g['icon']))<x-dynamic-component :component="'lucide-'.$g['icon']" aria-hidden="true" />@endif
                                    {{ $g['label'] }}
                                </x-nq::button>
                            @endforeach
                        </div>
                    @endif
                    @if (count($models) > 0)
                        <x-nq::ai-model-picker.select :models="$models" :value="$model" x-model="modelId" :label="$t['model']" class="h-control-sm w-auto min-w-0 max-w-44 border-0 bg-transparent text-caption" />
                    @endif
                    <span class="flex-1"></span>
                    @if ($stoppable)
                        <x-nq::button type="button" variant="primary" size="icon-sm" x-show="busy" :style="$busy ? '' : $hide" x-on:click="stop()" aria-label="{{ $t['stop'] }}" title="{{ $t['stop'] }}">
                            <x-lucide-square aria-hidden="true" class="size-3.5 fill-current" />
                        </x-nq::button>
                    @endif
                    <x-nq::button type="button" variant="primary" size="icon-sm" x-show="sendShown()" :style="($stoppable && $busy) ? $hide : ''" x-on:click="send()" x-bind:disabled="! canSend()" aria-label="{{ $t['send'] }}" title="{{ $t['send'] }}">
                        <x-lucide-send aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
                    </x-nq::button>
                </div>
            </div>
            <p role="alert" x-show="error" x-text="error" style="display: none" class="text-caption text-nq-danger-text"></p>
            @if ($disclaimer)<p class="text-center text-[11px] text-muted-foreground">{{ $disclaimer }}</p>@endif
        </div>
    </div>
</section>
