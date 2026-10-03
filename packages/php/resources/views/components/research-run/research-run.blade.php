{{-- <x-nq::research-run :run="$run" :suggestions="['Why did churn fall in Q3?']" @nq-research-ask="start($event.detail.question)" />
     Ask a research question and follow it (React ResearchRun): an ask box, live progress (stages, sources checked and read, stop), then an answer whose paragraphs cite
     numbered evidence. Choosing a citation highlights the passage it rests on and scrolls to it. Failed and stopped runs say so and offer a retry. It runs nothing itself:
     you start the run, render the new data (Livewire, or a fresh response) and the server markup follows it. Needs the Alpine runtime (@nasaqScripts).
     run: null before the first question, or [ id, question, status: queued|running|done|failed|cancelled, stages?: [{ id, label, state: pending|running|done|failed, detail? }],
       sourcesChecked?, sourcesRead?, answer?: [{ id, text, cites?: [evidence ids] }], evidence?: [{ id, sourceId, quote, relevance? (0..1) }],
       sources?: [{ id, title, url?, snippet? }], confidence? (0..1), model?, finishedAt?, error? ].
     suggestions: example questions shown before the first run. default-question: the box starts with it. cancellable: shows Stop while running. retryable: shows Try again after a failure or a stop.
     labels: partial overrides of the words (keys of nq_rr_words; stageStates merges).
     Events, bubbling from the root. nq-research-ask { question, waitUntil } (resolve { error: "message" } to show it under the box), nq-research-cancel { id }, nq-research-retry { id, question }. --}}
@include('nasaq::components.research-run._logic')
@include('nasaq::components.copilot-chat._logic')
@props(['run' => null, 'suggestions' => [], 'defaultQuestion' => '', 'cancellable' => false, 'retryable' => false, 'labels' => []])
@php
    $t = nq_rr_words($labels);
    $js = fn ($v) => \Illuminate\Support\Js::from($v);
    $status = $run['status'] ?? null;
    $live = in_array($status, ['queued', 'running'], true);
    $evidence = array_values($run['evidence'] ?? []);
    $blocks = array_values($run['answer'] ?? []);
    $numbers = nq_rr_evidence_numbers($evidence);
    $sourceOf = [];
    foreach ($run['sources'] ?? [] as $s) {
        $sourceOf[$s['id']] = $s;
    }
    $extra = nq_rr_uncited($evidence, $blocks);
    $extraIds = array_column($extra, 'id');
    $main = array_values(array_filter($evidence, fn ($e) => ! in_array($e['id'], $extraIds, true)));
    $stages = array_values($run['stages'] ?? []);
    $progress = nq_rr_stage_progress($stages);
    $waitLabel = $status === 'queued' ? $t['queued'] : $t['asking'];
    $sections = [['label' => null, 'items' => $main]];
    if ($extra) {
        $sections[] = ['label' => $t['notCited'], 'items' => $extra];
    }
    $config = $js(['runId' => $run['id'] ?? null, 'question' => $run['question'] ?? '', 'live' => $live, 'failed' => $t['failed'], 'defaultQuestion' => (string) $defaultQuestion])->toHtml();
    $icons = ['pending' => 'lucide-circle-dashed', 'running' => 'lucide-loader', 'done' => 'lucide-check', 'failed' => 'lucide-x'];
    $tones = ['done' => 'text-nq-success-text', 'failed' => 'text-nq-danger-text', 'running' => 'text-nq-accent-text motion-safe:animate-spin', 'pending' => 'text-muted-foreground'];
    [$cb, $ca] = nq_rr_around($t['checked']);
    [$rb, $ra] = nq_rr_around($t['read']);
    [$vb, $va] = nq_rr_around($t['relevance']);
    $card = 'rounded-card border border-border bg-card';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'research-run') }}" aria-label="{{ $t['label'] }}" x-data="nqResearchRun({!! $config !!})"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
    <form class="flex flex-col gap-2" x-on:submit.prevent="ask()">
        <x-nq::field.textarea dir="auto" rows="2" placeholder="{{ $t['placeholder'] }}" aria-label="{{ $t['placeholder'] }}" :disabled="$live" x-model="question"
            x-bind:disabled="busy() ? true : null" x-on:keydown.ctrl.enter.prevent="ask()" x-on:keydown.meta.enter.prevent="ask()" class="min-h-16 resize-none">{{ $defaultQuestion }}</x-nq::field.textarea>
        <div class="flex flex-wrap items-center gap-2">
            @if ($live && $run && $cancellable)
                <x-nq::button type="button" variant="secondary" x-on:click="cancel()"><x-lucide-square aria-hidden="true" />{{ $t['cancel'] }}</x-nq::button>
            @endif
            <x-nq::button type="submit" variant="primary" class="ms-auto" :loading="$live" :disabled="$live" x-bind:disabled="blocked() ? true : null" x-bind:aria-busy="busy() ? `true` : null">
                <x-lucide-microscope aria-hidden="true" />
                <span x-text="busy() ? {!! $js($t['asking']) !!} : {!! $js($t['ask']) !!}">{{ $live ? $t['asking'] : $t['ask'] }}</span>
            </x-nq::button>
        </div>
        <p role="alert" class="min-h-4 text-caption text-nq-danger-text" x-text="problem"></p>
    </form>

    @if (! $run && count($suggestions) > 0)
        <div class="flex flex-col gap-2">
            <span class="text-caption text-muted-foreground">{{ $t['suggestions'] }}</span>
            <ul class="flex flex-wrap gap-2">
                @foreach ($suggestions as $s)
                    <li><x-nq::button type="button" size="sm" variant="secondary" dir="auto" data-q="{{ $s }}" x-on:click="pick($el.dataset.q)">{{ $s }}</x-nq::button></li>
                @endforeach
            </ul>
        </div>
    @endif

    @if ($run)
        <div data-status="{{ $status }}" class="flex min-w-0 flex-col gap-4">
            @if (count($stages) > 0 && ($live || $status !== 'done'))
                <div data-slot="research-progress" class="flex flex-col gap-3 p-4 {{ $card }}">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        @if ($live)
                            <x-nq::ai-states.thinking :label="$waitLabel" :steps="isset($stages[$progress['current']]) ? [$stages[$progress['current']]['label']] : []" :current="0" compact />
                        @else
                            <span class="text-label text-foreground">{{ $t['stages'] }}</span>
                        @endif
                        <span class="text-caption tabular-nums text-muted-foreground"><x-nq::numeric :value="$progress['done']" /> / <x-nq::numeric :value="$progress['total']" /></span>
                    </div>
                    <ol aria-label="{{ $t['stages'] }}" class="flex flex-col gap-2">
                        @foreach ($stages as $s)
                            <li data-state="{{ $s['state'] }}" @if ($s['state'] === 'running') aria-current="step" @endif class="flex items-center gap-2.5 text-body-sm">
                                <x-dynamic-component :component="$icons[$s['state']]" aria-hidden="true" class="size-4 shrink-0 {{ $tones[$s['state']] }}" />
                                <span class="min-w-0 flex-1 {{ $s['state'] === 'pending' ? 'text-muted-foreground' : 'text-foreground' }}">{{ $s['label'] }}</span>
                                @if (! empty($s['detail']))<span class="text-caption text-muted-foreground">{{ $s['detail'] }}</span>@endif
                                <span class="sr-only">{{ $t['stageStates'][$s['state']] }}</span>
                            </li>
                        @endforeach
                    </ol>
                    @if (isset($run['sourcesChecked']))
                        <p class="text-caption text-muted-foreground">{{ $cb }}<x-nq::numeric :value="$run['sourcesChecked']" />{{ $ca }}@if (isset($run['sourcesRead'])) · {{ $rb }}<x-nq::numeric :value="$run['sourcesRead']" />{{ $ra }}@endif</p>
                    @endif
                </div>
            @endif
            @if ($live && count($stages) === 0)
                <div role="status" class="p-4 {{ $card }}"><x-nq::ai-states.thinking :label="$waitLabel" /></div>
            @endif

            @if ($status === 'failed' || $status === 'cancelled')
                <div role="alert" class="flex flex-wrap items-center gap-3 p-4 {{ $card }}">
                    <x-lucide-circle-alert aria-hidden="true" class="size-4 shrink-0 {{ $status === 'failed' ? 'text-nq-danger-text' : 'text-muted-foreground' }}" />
                    <p dir="auto" class="min-w-0 flex-1 text-body-sm text-foreground">{{ $status === 'failed' ? ($run['error'] ?? $t['failed']) : $t['cancelled'] }}</p>
                    @if ($retryable)<x-nq::button size="sm" x-on:click="retry()"><x-lucide-rotate-ccw aria-hidden="true" />{{ $t['retry'] }}</x-nq::button>@endif
                </div>
            @endif

            @if ($status === 'done')
                <article data-slot="research-answer" aria-label="{{ $t['answer'] }}" class="flex flex-col gap-3 p-5 {{ $card }}">
                    <header class="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 class="text-label text-foreground">{{ $t['answer'] }}</h3>
                        <x-nq::ai-states.generated-label :model="$run['model'] ?? null" />
                        @if (isset($run['confidence']))<x-nq::ai-states.confidence-meter :value="$run['confidence']" class="ms-auto" />@endif
                    </header>
                    @if (count($blocks) === 0)
                        <p class="text-body-sm text-muted-foreground">{{ $t['noAnswer'] }}</p>
                    @endif
                    @foreach ($blocks as $b)
                        <p dir="auto" class="text-body text-nq-fg-body">{{ $b['text'] }}@foreach (nq_rr_cited_numbers($b['cites'] ?? null, $numbers) as $c)<button type="button" data-evidence="{{ $c['id'] }}" aria-label="{{ str_replace('{n}', (string) $c['n'], $t['showEvidence']) }}"
                            x-bind:aria-pressed="active === {!! $js($c['id']) !!}" x-on:click="focusEvidence($el.dataset.evidence)"
                            class="ms-1 inline-grid size-5 -translate-y-0.5 place-items-center rounded-full border border-border bg-secondary align-baseline text-[11px] tabular-nums text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:border-primary aria-pressed:bg-nq-selected aria-pressed:text-foreground"><x-nq::numeric :value="$c['n']" /></button>@endforeach</p>
                    @endforeach
                    @if (! empty($run['finishedAt']))
                        <p class="text-caption text-muted-foreground">{{ $t['finished'] }} <x-nq::numeric.date-time :value="$run['finishedAt']" relative /></p>
                    @endif
                </article>

                @if (count($evidence) > 0)
                    <div class="flex flex-col gap-2">
                        <div>
                            <h3 class="text-label text-foreground">{{ $t['evidence'] }}</h3>
                            <p class="text-caption text-muted-foreground">{{ $t['evidenceHint'] }}</p>
                        </div>
                        @foreach ($sections as $sec)
                            @if ($sec['label'])<p class="text-caption text-muted-foreground">{{ $sec['label'] }}</p>@endif
                            <ol aria-label="{{ $sec['label'] ?? $t['evidence'] }}" class="flex flex-col divide-y divide-border overflow-hidden {{ $card }}">
                                @foreach ($sec['items'] as $e)
                                    @php
                                        $src = $sourceOf[$e['sourceId'] ?? ''] ?? null;
                                        $safe = $src ? nq_cc_safe_url($src['url'] ?? null) : false;
                                    @endphp
                                    <li data-evidence-id="{{ $e['id'] }}" x-bind:data-active="active === {!! $js($e['id']) !!} ? '' : null" class="flex gap-3 px-4 py-3 transition-colors duration-150 ease-nq data-active:bg-nq-selected">
                                        <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] tabular-nums text-muted-foreground"><x-nq::numeric :value="$numbers[$e['id']] ?? 0" /></span>
                                        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <blockquote dir="auto" class="flex gap-2 text-body-sm text-foreground">
                                                <x-lucide-quote aria-hidden="true" class="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                                                <span>{{ $e['quote'] }}</span>
                                            </blockquote>
                                            <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                                @if ($src)
                                                    @if ($safe)
                                                        <a href="{{ $src['url'] }}" target="_blank" rel="noopener noreferrer" class="inline-flex min-w-0 items-center gap-1.5 text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">
                                                            <span dir="auto" class="truncate">{{ $src['title'] }}</span>
                                                            <bdi dir="ltr" class="shrink-0 text-muted-foreground">{{ nq_cc_host($src['url']) }}</bdi>
                                                            <span class="sr-only">{{ $t['openSource'] }}</span>
                                                        </a>
                                                    @else
                                                        <span dir="auto" class="truncate text-foreground">{{ $src['title'] }}</span>
                                                    @endif
                                                @endif
                                                @if (isset($e['relevance']))
                                                    <span>{{ $vb }}<x-nq::numeric :value="$e['relevance']" style="percent" :max-fraction="0" />{{ $va }}</span>
                                                @endif
                                            </p>
                                        </div>
                                    </li>
                                @endforeach
                            </ol>
                        @endforeach
                    </div>
                @endif

                @if (! empty($run['sources']))
                    <x-nq::copilot-chat.sources :sources="$run['sources']" :t="['sources' => $t['sources']]" />
                @endif
            @endif
        </div>
    @endif
</section>
