{{-- <x-nq::score-explainer :score="72" :confidence="0.8" ai-generated :dimensions="$dimensions" summary="Strong fit, recently active." />
     The reasons behind a score: the total with its band and confidence, then one row per dimension (points, a plain sentence, what matched, source chips).
     Anything a model worked out rather than read is marked "Inferred". The rows always add up to the score: a gap shows as "Other factors".
     score: 0..max. max: default 100. dimensions: [{ id, label, points, maxPoints?, reason, matched?[], sources?[{ label, url?, kind?, inferred? }], inferred?, confidence? (0..1) }].
     summary: one line above the reasons (or the default slot). confidence: overall, 0..1. model / ai-generated: show the "AI generated" mark.
     compact: hides matched words and per-dimension confidence. source-click: sources without a URL are buttons that dispatch "score-source". labels: words. --}}
@include('nasaq::components.score-explainer._logic')
@props(['score', 'max' => 100, 'dimensions' => [], 'summary' => null, 'confidence' => null, 'model' => null, 'aiGenerated' => false, 'compact' => false, 'sourceClick' => false, 'labels' => []])
@php
    $t = nq_score_words($labels);
    $id = 'nq-score-'.\Illuminate\Support\Str::random(6);
    $shown = nq_score_clamp($score, $max);
    $band = nq_score_band($shown, $max);
    $rows = nq_score_sort($dimensions);
    $remainder = nq_score_remainder($shown, $dimensions);
    $tone = ['high' => 'success', 'medium' => 'warning', 'low' => 'danger'];
    $hasSlot = trim((string) $slot) !== '';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'score-explainer') }}" data-band="{{ $band }}" aria-labelledby="{{ $id }}-title" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    <header class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-baseline gap-1.5">
            <span class="text-display-sm tabular-nums text-foreground" aria-hidden="true"><x-nq::numeric :value="round($shown)" /></span>
            <span class="text-body-sm text-muted-foreground">{{ nq_score_fill($t['outOf'], ['max' => $max]) }}</span>
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-1.5">
                <h3 id="{{ $id }}-title" class="text-title-sm text-foreground">{{ $t['why'] }}</h3>
                <x-nq::badge :variant="$tone[$band]">{{ $t['bands'][$band] }}</x-nq::badge>
                @if ($aiGenerated || $model)<x-nq::ai-states.generated-label :model="$model" />@endif
            </div>
            @if ($summary || $hasSlot)<p class="text-body-sm text-muted-foreground">{{ $hasSlot ? $slot : $summary }}</p>@endif
        </div>
    </header>
    @if ($confidence !== null)<x-nq::ai-states.confidence-meter :value="$confidence" />@endif

    @if (count($rows) === 0 && $remainder == 0)<p class="text-body-sm text-muted-foreground">{{ $t['noDimensions'] }}</p>@endif
    <ul data-slot="score-dimensions" class="flex flex-col gap-4">
        @foreach ($rows as $d)
            @php($fill = nq_score_fill_ratio($d, $max) * 100)
            <li data-slot="score-dimension" class="flex min-w-0 flex-col gap-1.5">
                <div class="flex items-baseline justify-between gap-3">
                    <span class="flex min-w-0 flex-wrap items-center gap-1.5 text-label text-foreground">
                        <span dir="auto">{{ $d['label'] }}</span>
                        @if (! empty($d['inferred']))<x-nq::score-explainer.inferred-mark :labels="$labels" />@endif
                    </span>
                    <span class="shrink-0 text-body-sm text-muted-foreground">
                        {{ ! empty($d['maxPoints']) ? nq_score_fill($t['points'], ['n' => nq_score_round1($d['points']), 'max' => $d['maxPoints']]) : nq_score_fill($t['pointsNoMax'], ['n' => nq_score_round1($d['points'])]) }}
                    </span>
                </div>
                <x-nq::progress :value="$fill" size="sm" :tone="$tone[nq_score_band($fill)]" aria-label="{{ $d['label'] }}" />
                <p dir="auto" class="text-body-sm text-muted-foreground">{{ $d['reason'] ?? '' }}</p>
                @if (! $compact && ! empty($d['matched']))
                    <div class="flex flex-wrap items-center gap-1">
                        <span class="text-caption text-muted-foreground">{{ $t['matched'] }}</span>
                        @foreach ($d['matched'] as $m)<x-nq::badge variant="outline" dir="auto">{{ $m }}</x-nq::badge>@endforeach
                    </div>
                @endif
                @if (! empty($d['sources']))
                    <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="{{ $t['sources'] }}: {{ $d['label'] }}">
                        @foreach ($d['sources'] as $s)<x-nq::score-explainer.source-chip :source="$s" :clickable="$sourceClick" :labels="$labels" />@endforeach
                    </div>
                @endif
                @if (! $compact && isset($d['confidence']))<x-nq::ai-states.confidence-meter :value="$d['confidence']" />@endif
            </li>
        @endforeach
        @if ($remainder != 0)
            <li data-slot="score-dimension" class="flex min-w-0 flex-col gap-1">
                <div class="flex items-baseline justify-between gap-3">
                    <span class="text-label text-foreground">{{ $t['other'] }}</span>
                    <span class="text-body-sm text-muted-foreground">{{ nq_score_fill($t['pointsNoMax'], ['n' => ($remainder > 0 ? '+' : '').nq_score_round1($remainder)]) }}</span>
                </div>
                <p class="text-body-sm text-muted-foreground">{{ $t['otherReason'] }}</p>
            </li>
        @endif
    </ul>
</section>
