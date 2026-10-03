{{-- <x-nq::ai-citations.provenance model="claude-sonnet" :latency-ms="1240" grounded :source-count="2" :confidence="0.86" />
     Where an answer came from: model, response time and whether it is grounded in sources. One quiet line that opens to the full list.
     Nothing here is guessed, you pass what your backend knows. Needs the Alpine runtime (@nasaqScripts).
     model: kept left to right. latency-ms. grounded (true | false | null). source-count: shown when grounded. tokens: ['input' => n, 'output' => n]. retrieved: passages before ranking.
     at: DateTime, timestamp or string. confidence: 0..1. extra: [['label' => ..., 'value' => ...]]. default-open. labels: words. --}}
@include('nasaq::components.ai-citations._logic')
@props(['model' => null, 'latencyMs' => null, 'grounded' => null, 'sourceCount' => null, 'tokens' => null, 'retrieved' => null, 'at' => null, 'confidence' => null, 'extra' => [], 'defaultOpen' => false, 'labels' => []])
@php
    $t = nq_aic_words($labels);
    $groundedText = $grounded === null ? null : ($grounded ? ($sourceCount !== null ? nq_aic_grounded_in($t, (int) $sourceCount) : $t['grounded']) : $t['ungrounded']);
    $lat = $latencyMs === null ? null : nq_aic_latency($latencyMs);
    $unit = $lat ? ($lat['unit'] === 's' ? $t['unitS'] : $t['unitMs']) : null;
    $hasTokens = is_array($tokens) && (isset($tokens['input']) || isset($tokens['output']));
@endphp
<x-nq::collapsible :open="$defaultOpen" data-slot="{{ $attributes->get('data-slot', 'ai-provenance') }}" {{ $attributes->except('data-slot')->cn('rounded-control border border-border bg-secondary') }}>
    <button type="button" data-slot="collapsible-trigger" x-bind:aria-controls="$id('nq-collapsible', 'panel')" x-bind:data-panel-open="open ? '' : undefined" x-on:click="toggle()" x-bind:aria-expanded="open" aria-expanded="{{ $defaultOpen ? 'true' : 'false' }}"
        @if ($defaultOpen) data-panel-open @endif
        class="group/trigger flex min-h-control-sm w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 text-start text-caption text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
        @if ($grounded !== null)
            @if ($grounded)<x-lucide-shield-check aria-hidden="true" class="size-3.5 shrink-0 text-nq-success-text" />@else<x-lucide-shield-question aria-hidden="true" class="size-3.5 shrink-0 text-nq-warning-text" />@endif
        @endif
        <span class="sr-only">{{ $t['provenance'] }}</span>
        @if ($groundedText)<span class="text-foreground">{{ $groundedText }}</span>@endif
        @if ($model)<bdi dir="ltr">{{ $model }}</bdi>@endif
        @if ($lat)<span><x-nq::numeric :value="$lat['value']" /> {{ $unit }}</span>@endif
        <span class="flex-1"></span>
        <x-lucide-chevron-down aria-hidden="true" class="size-3.5 shrink-0 transition-transform duration-150 ease-nq group-data-panel-open/trigger:rotate-180" />
    </button>
    <x-nq::collapsible.panel>
        <div class="flex flex-col gap-3 border-t border-border px-3 py-2">
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
                @if ($model)
                    <div class="contents"><dt class="text-muted-foreground">{{ $t['model'] }}</dt><dd class="min-w-0 text-foreground"><bdi dir="ltr">{{ $model }}</bdi></dd></div>
                @endif
                @if ($lat)
                    <div class="contents"><dt class="text-muted-foreground">{{ $t['latency'] }}</dt><dd class="min-w-0 text-foreground"><x-nq::numeric :value="$lat['value']" /> {{ $unit }}</dd></div>
                @endif
                @if ($hasTokens)
                    <div class="contents">
                        <dt class="text-muted-foreground">{{ $t['tokens'] }}</dt>
                        <dd class="min-w-0 text-foreground">
                            <span class="flex flex-wrap gap-x-3">
                                @if (isset($tokens['input']))<span><x-nq::numeric :value="$tokens['input']" /> {{ $t['tokensIn'] }}</span>@endif
                                @if (isset($tokens['output']))<span><x-nq::numeric :value="$tokens['output']" /> {{ $t['tokensOut'] }}</span>@endif
                            </span>
                        </dd>
                    </div>
                @endif
                @if ($retrieved !== null)
                    <div class="contents"><dt class="text-muted-foreground">{{ $t['retrieved'] }}</dt><dd class="min-w-0 text-foreground"><x-nq::numeric :value="$retrieved" /></dd></div>
                @endif
                @if ($at !== null)
                    <div class="contents"><dt class="text-muted-foreground">{{ $t['generatedAt'] }}</dt><dd class="min-w-0 text-foreground"><x-nq::numeric.date-time :value="$at" date-style="medium" time-style="short" /></dd></div>
                @endif
                @foreach ($extra as $r)
                    <div class="contents"><dt class="text-muted-foreground">{{ $r['label'] }}</dt><dd class="min-w-0 text-foreground">{{ $r['value'] }}</dd></div>
                @endforeach
            </dl>
            @if ($confidence !== null)<x-nq::ai-states.confidence-meter :value="$confidence" />@endif
        </div>
    </x-nq::collapsible.panel>
</x-nq::collapsible>
