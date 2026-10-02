{{-- <x-nq::web-vital-gauge.grid><x-nq::web-vital-gauge metric="LCP" :value="2900" :previous="3100" :distribution="['good' => 0.58, 'needsImprovement' => 0.28, 'poor' => 0.14]" /></x-nq::web-vital-gauge.grid>
     A semicircle gauge for one Web Vital against Google's thresholds: a good, a needs-improvement and a poor band, a marker at the 75th percentile, the
     value with its rating (icon and word, not colour alone), the thresholds in words, and an optional distribution of page loads across the ratings.
     metric: LCP | INP | CLS | FCP | TTFB. value: the 75th percentile in milliseconds (unitless for CLS); omit for "No data". previous: the previous
     period's value; adds the change (lower is better). distribution: ['good', 'needsImprovement', 'poor'] counts or fractions.
     selectable: the gauge is a toggle button that dispatches a bubbling "nq-select" ({ id: metric }); put it inside <x-nq::web-vital-gauge.grid selectable
     selected="LCP"> (which holds the single-choice state). labels: array overriding the built-in words. --}}
@include('nasaq::components.web-vital-gauge._logic')
@props(['metric', 'value' => null, 'previous' => null, 'distribution' => null, 'selectable' => false, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_wv_words($locale, $labels);
    $threshold = nq_wv_thresholds()[$metric];
    $bands = nq_wv_bands($metric);
    $hasValue = $value !== null && is_finite($value);
    $rating = $hasValue ? nq_wv_rate($metric, $value) : null;
    $marker = $hasValue ? nq_wv_point(nq_wv_fraction($metric, $value)) : null;
    $text = fn ($v) => nq_wv_format($metric, $v, $locale);
    $delta = $hasValue ? nq_wv_change($value, $previous) : null;
    $dist = $distribution ? nq_wv_normalize($distribution) : null;
    $pct = fn ($f) => nq_wv_number($f, $locale, 'percent', 0, 0);
    $ratingTone = ['good' => 'success', 'needs-improvement' => 'warning', 'poor' => 'danger'];
    $ratingVar = ['good' => 'var(--nq-success)', 'needs-improvement' => 'var(--nq-warning)', 'poor' => 'var(--nq-danger)'];
    $gaugeLabel = $hasValue ? sprintf($t['gaugeLabel'], $t['names'][$metric], $text($value), $t['rating'][$rating]) : $t['names'][$metric].': '.$t['noData'];
    $deltaTone = $delta === null ? '' : ($delta < 0 ? 'text-nq-success-text' : ($delta > 0 ? 'text-nq-danger-text' : 'text-muted-foreground'));
    $extra = ["data-metric" => $metric, "data-rating" => $rating] + ($selectable ? ["x-bind:class" => "selected === ".json_encode($metric)." ? 'border-primary ring-1 ring-primary' : ''"] : []);
@endphp
@if ($selectable)
    <button type="button" x-bind:aria-pressed="String(selected === @js($metric))" x-on:click="select(@js($metric))" class="rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
@endif
<x-nq::card data-slot="{{ $attributes->get('data-slot', 'web-vital-gauge') }}" {{ $attributes->except('data-slot')->merge($extra)->cn('h-full gap-3 px-4 py-4') }}>
    <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 flex-col">
            <div class="flex items-center gap-2">
                <span class="text-label text-foreground" dir="ltr">{{ $metric }}</span>
                @if ($threshold['core'])<span class="rounded-control bg-secondary px-1.5 py-0.5 text-caption text-muted-foreground">{{ $t['core'] }}</span>@endif
            </div>
            <span class="truncate text-caption text-muted-foreground">{{ $t['names'][$metric] }}</span>
        </div>
        @if ($rating)<x-nq::status :tone="$ratingTone[$rating]" tinted class="shrink-0 text-caption">{{ $t['rating'][$rating] }}</x-nq::status>@endif
    </div>

    <div class="relative mx-auto w-full max-w-56">
        <svg viewBox="0 0 200 116" role="img" aria-label="{{ $gaugeLabel }}" class="block w-full rtl:-scale-x-100">
            <path d="{{ nq_wv_arc(0, 1) }}" fill="none" stroke="var(--nq-surface-soft)" stroke-width="16" stroke-linecap="butt" />
            <path d="{{ nq_wv_arc(0, $bands['good']) }}" fill="none" stroke="{{ $ratingVar['good'] }}" stroke-width="14" />
            <path d="{{ nq_wv_arc($bands['good'], $bands['poor']) }}" fill="none" stroke="{{ $ratingVar['needs-improvement'] }}" stroke-width="14" />
            <path d="{{ nq_wv_arc($bands['poor'], 1) }}" fill="none" stroke="{{ $ratingVar['poor'] }}" stroke-width="14" />
            @if ($marker)
                <g>
                    <circle cx="{{ round($marker[0], 4) }}" cy="{{ round($marker[1], 4) }}" r="9" fill="var(--card)" stroke="var(--foreground)" stroke-width="2.5" />
                    <circle cx="{{ round($marker[0], 4) }}" cy="{{ round($marker[1], 4) }}" r="3" fill="{{ $ratingVar[$rating ?? 'good'] }}" />
                </g>
            @endif
        </svg>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center leading-tight">
            <span data-slot="web-vital-value" class="text-h2 text-foreground tabular-nums" dir="ltr">{{ $hasValue ? $text($value) : '–' }}</span>
            <span class="text-caption text-muted-foreground">{{ $t['p75'] }}</span>
        </div>
    </div>

    @if ($delta !== null)
        <p class="flex items-center justify-center gap-1.5 text-caption">
            @if ($delta < 0)<x-lucide-trending-down aria-hidden="true" class="size-3.5 text-nq-success-text rtl:-scale-x-100" />@elseif ($delta > 0)<x-lucide-trending-up aria-hidden="true" class="size-3.5 text-nq-danger-text rtl:-scale-x-100" />@endif
            <bdi data-slot="num" data-numeric="" class="tabular-nums text-label {{ $deltaTone }}">{{ ($delta > 0 ? '+' : '').nq_wv_number($delta, $locale, 'percent', 0, 1) }}</bdi>
            <span class="text-muted-foreground">{{ $t['vsPrevious'] }}</span>
        </p>
    @endif

    <ul class="grid gap-1 text-caption text-muted-foreground" aria-label="{{ $t['hints'][$metric] }}">
        <li class="flex items-center justify-between gap-2">
            <x-nq::status tone="success" class="shrink-0 whitespace-nowrap">{{ $t['good'] }}</x-nq::status>
            <bdi dir="ltr" class="text-end">{{ sprintf($t['atMost'], $text($threshold['good'])) }}</bdi>
        </li>
        <li class="flex items-center justify-between gap-2">
            <x-nq::status tone="warning" class="shrink-0 whitespace-nowrap">{{ $t['needs'] }}</x-nq::status>
            <bdi dir="ltr" class="text-end">{{ sprintf($t['band'], $text($threshold['good']), $text($threshold['poor'])) }}</bdi>
        </li>
        <li class="flex items-center justify-between gap-2">
            <x-nq::status tone="danger" class="shrink-0 whitespace-nowrap">{{ $t['poorLabel'] }}</x-nq::status>
            <bdi dir="ltr" class="text-end">{{ sprintf($t['over'], $text($threshold['poor'])) }}</bdi>
        </li>
    </ul>

    @if ($dist)
        <div data-slot="web-vital-distribution" class="flex flex-col gap-1.5">
            <span class="text-caption text-muted-foreground">{{ $t['distribution'] }}</span>
            <div role="img" aria-label="{{ $t['distribution'] }}: {{ $t['good'] }} {{ $pct($dist['good']) }}, {{ $t['needs'] }} {{ $pct($dist['needsImprovement']) }}, {{ $t['poorLabel'] }} {{ $pct($dist['poor']) }}" class="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                @if ($dist['good'] > 0)<span class="block h-full bg-nq-success" style="width: {{ $dist['good'] * 100 }}%"></span>@endif
                @if ($dist['needsImprovement'] > 0)<span class="block h-full bg-nq-warning" style="width: {{ $dist['needsImprovement'] * 100 }}%"></span>@endif
                @if ($dist['poor'] > 0)<span class="block h-full bg-nq-danger" style="width: {{ $dist['poor'] * 100 }}%"></span>@endif
            </div>
            <div class="flex justify-between text-caption tabular-nums text-muted-foreground">
                <bdi>{{ $pct($dist['good']) }}</bdi>
                <bdi>{{ $pct($dist['needsImprovement']) }}</bdi>
                <bdi>{{ $pct($dist['poor']) }}</bdi>
            </div>
        </div>
    @endif
</x-nq::card>
@if ($selectable)
    </button>
@endif
