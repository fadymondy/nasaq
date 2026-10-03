{{-- <x-nq::ask-ai x-on:ask-ai="$event.detail.wait(fetchAnswer($event.detail))"> <article>…</article> </x-nq::ask-ai>
     Wraps read-only content. Select some text inside it and a small "Ask AI" pill appears by the selection. Press it (or Ctrl/Cmd+Shift+Space) for a panel with quick actions and a question box, then read
     the answer in place. Selections inside inputs, editors and [data-ask-ai-ignore] areas are ignored. Needs the Alpine runtime (@nasaqScripts). The insight card is <x-nq::ask-ai.insight-card>.
     It is presentational: asking fires "ask-ai" on the root with detail { prompt, selection, actionId?, wait(promise) }. Resolve the promise with the answer text, { text } or { error }; a rejection, or nobody
     listening, shows the generic failure with Try again. With replace, "Replace selection" fires "ask-ai-replace" { answer, selection }: you change the text, the component never edits the page.
     actions: quick actions [['id' => 'explain', 'label' => 'Explain', 'icon' => 'book-open']] (a Lucide name). Default: explain, summarize, translate, improve, define. Pass [] for none.
     min-length (3): shorter selections are ignored. max-length (2000): longer selections are cut and the panel says so. hotkey: 'mod shift space' (default); false turns it off. disabled. labels: words (see ask-ai/_logic).
     Differences from the React component: the answer is plain text, not Markdown (the browser has no Markdown parser); the popup is placed from the selection rect and flipped to fit the viewport. --}}
@include('nasaq::components.ai-states._logic')
@include('nasaq::components.ask-ai._logic')
@props(['actions' => null, 'minLength' => 3, 'maxLength' => 2000, 'hotkey' => 'mod shift space', 'replace' => false, 'disabled' => false, 'labels' => []])
@php
    $t = nq_askai_words($labels);
    $icons = ['explain' => 'book-open', 'summarize' => 'text-quote', 'translate' => 'languages', 'improve' => 'pen-line', 'define' => 'book-open'];
    $quick = $actions ?? array_map(fn ($id) => ['id' => $id, 'label' => $t[$id], 'icon' => $icons[$id]], ['explain', 'summarize', 'translate', 'improve', 'define']);
    $quick = array_values(array_map(fn ($a) => ['id' => (string) $a['id'], 'label' => (string) $a['label']] + (isset($a['icon']) ? ['icon' => $a['icon']] : []), $quick));
    $keys = $hotkey ? nq_ai_keys($hotkey) : [];
    $config = [
        'min' => (int) $minLength, 'max' => (int) $maxLength, 'hotkey' => $hotkey ?: null, 'disabled' => (bool) $disabled,
        'actions' => array_map(fn ($a) => ['id' => $a['id'], 'label' => $a['label']], $quick), 'failed' => $t['failed'],
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'ask-ai-selection') }}" x-data="nqAskAi(@js($config))" {{ $attributes->except('data-slot')->cn('') }}>
    {{ $slot }}
    <template x-teleport="body">
        <div data-slot="ask-ai-popup" x-init="popupEl = $el" x-nq-presence="shown" x-bind:data-phase="phase" x-bind:style="popStyle" x-bind:class="phase === `pill` ? `p-1` : `w-[22rem] p-3`" role="dialog" aria-label="{{ $t['title'] }}"
            class="z-50 max-w-[var(--available-width)] rounded-floating border border-border bg-popover text-body-sm text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0">
            <x-nq::button type="button" variant="ghost" size="sm" class="gap-1.5" x-show="phase === `pill`" x-on:mousedown.prevent x-on:click="openPanel()">
                <x-lucide-sparkles aria-hidden="true" class="text-nq-accent-text" />
                {{ $t['ask'] }}
                @if (count($keys) > 0)
                    <span dir="ltr" x-data="nqAiKeys" class="ms-1 hidden items-center gap-0.5 sm:inline-flex">@foreach ($keys as $k)<x-nq::text.kbd :data-key="$k['key']">{{ $k['text'] }}</x-nq::text.kbd>@endforeach</span>
                @endif
            </x-nq::button>
            <div data-slot="ask-ai-panel" x-show="phase === `panel`" style="display: none" class="flex flex-col gap-3" x-on:nq-ai-pick="quick($event.detail.id)">
                <div class="flex items-center justify-between gap-2">
                    <span class="flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
                        <x-lucide-sparkles aria-hidden="true" class="size-4 text-nq-accent-text" />
                        {{ $t['ask'] }}
                    </span>
                    <x-nq::button type="button" variant="ghost" size="icon-sm" aria-label="{{ $t['close'] }}" x-on:click="close()"><x-lucide-x aria-hidden="true" /></x-nq::button>
                </div>
                <figure class="flex flex-col gap-1">
                    <figcaption class="sr-only">{{ $t['selected'] }}</figcaption>
                    <blockquote dir="auto" class="line-clamp-3 border-s-2 border-nq-line-strong ps-3 text-caption text-muted-foreground" x-text="selection"></blockquote>
                    <span class="text-caption text-muted-foreground" x-show="truncated" style="display: none">{{ $t['truncated'] }}</span>
                </figure>
                <template x-if="status === `idle` || status === `error`">
                    <div class="flex flex-col gap-3">
                        <template x-if="status === `error`">
                            <x-nq::alert tone="danger">
                                <span x-text="errorText"></span>
                                <x-slot:action><x-nq::button type="button" size="sm" variant="secondary" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button></x-slot:action>
                            </x-nq::alert>
                        </template>
                        @if (count($quick) > 0)<x-nq::ai-states.suggestion-chips :suggestions="$quick" :label="$t['quick']" />@endif
                        <form class="flex items-end gap-2" x-on:submit.prevent="submit()">
                            <x-nq::field.textarea x-model="question" x-on:keydown.enter="enter($event)" rows="1" aria-label="{{ $t['inputLabel'] }}" placeholder="{{ $t['placeholder'] }}" dir="auto" class="min-h-control flex-1 resize-none" />
                            <x-nq::button type="submit" variant="primary" size="icon" aria-label="{{ $t['send'] }}" x-bind:disabled="question.trim() === ``"><x-lucide-send aria-hidden="true" class="rtl:-scale-x-100" /></x-nq::button>
                        </form>
                    </div>
                </template>
                <template x-if="status === `loading`"><x-nq::ai-states.thinking compact :label="$t['thinking']" /></template>
                <template x-if="status === `done`">
                    <div class="flex flex-col gap-2">
                        <div class="max-h-64 overflow-y-auto"><x-nq::ai-states.streaming-text :markdown="false" text-expr="answerText" /></div>
                        <div class="flex flex-wrap items-center gap-1">
                            <x-nq::ai-states.generated-label />
                            <span class="flex-1"></span>
                            <x-nq::copy-button value="" value-expr="answerText" variant="ghost" size="icon-sm" :label="$t['copy']" />
                            @if ($replace)
                                <x-nq::button type="button" variant="ghost" size="sm" x-on:click="replace()"><x-lucide-refresh-cw aria-hidden="true" />{{ $t['replace'] }}</x-nq::button>
                            @endif
                            <x-nq::button type="button" variant="ghost" size="sm" x-on:click="another()">{{ $t['another'] }}</x-nq::button>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </template>
</div>
