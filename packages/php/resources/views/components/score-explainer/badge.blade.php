{{-- <x-nq::score-explainer.badge :score="72" :dimensions="$dimensions" ai-generated />
     A score as a small badge (the number and the band word, never colour alone). Pressing it opens a popover with the score explainer (compact).
     A dashed outline and "≈" mark a score the model inferred. Takes the score-explainer props, plus side (bottom) and open (start open).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.score-explainer._logic')
@props(['score', 'max' => 100, 'dimensions' => [], 'summary' => null, 'confidence' => null, 'model' => null, 'aiGenerated' => false, 'sourceClick' => false, 'labels' => [], 'side' => 'bottom', 'open' => false])
@php
    $t = nq_score_words($labels);
    $shown = nq_score_clamp($score, $max);
    $band = nq_score_band($shown, $max);
    $inferred = $aiGenerated || count(array_filter($dimensions, fn ($d) => ! empty($d['inferred'])));
    $bandClass = ['high' => 'border-nq-success/40 bg-nq-success-soft text-nq-success-text', 'medium' => 'border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text', 'low' => 'border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text'][$band];
    $aria = nq_score_fill($t['ariaBadge'], ['score' => round($shown), 'max' => $max, 'band' => $t['bands'][$band]]);
@endphp
<x-nq::popover :open="$open">
    <button type="button" data-slot="{{ $attributes->get('data-slot', 'score-badge') }}" data-band="{{ $band }}" aria-label="{{ $aria }}" x-ref="trigger" aria-haspopup="dialog" x-on:click="toggle()" x-bind:aria-expanded="open"
        x-bind:data-popup-open="open ? '' : undefined"
        {{ $attributes->except('data-slot')->cn(['inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-caption font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus hover:bg-nq-hover', $bandClass, $inferred ? 'border-dashed' : null]) }}>
        @if ($inferred)<span aria-hidden="true">≈</span>@endif
        <x-nq::numeric :value="round($shown)" class="text-body-sm" />
        <span>{{ $t['bands'][$band] }}</span>
    </button>
    <x-nq::popover.content :side="$side" align="start" class="w-[min(26rem,calc(100vw-2rem))] p-4">
        <x-nq::score-explainer :score="$score" :max="$max" :dimensions="$dimensions" :summary="$summary" :confidence="$confidence" :model="$model" :ai-generated="$aiGenerated" :source-click="$sourceClick" :labels="$labels" compact />
    </x-nq::popover.content>
</x-nq::popover>
