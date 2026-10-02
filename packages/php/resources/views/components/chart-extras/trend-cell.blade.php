{{-- <x-nq::chart-extras.trend-cell :value="48210" :delta="0.124" :data="[4, 6, 5, 9, 8, 12]" chart-label="Revenue, last 6 weeks" />
     A table-row cell: the figure, its change and a small line or bar chart beside it. The change is an arrow, a word for screen readers and a
     signed number as well as a colour. value: a number (or fill the default slot). data: values for the small chart, oldest first.
     variant: line (default) | bar. delta: change as a fraction (0.124 is +12.4%). invert: down is good. highlight: bar to emphasise (default the
     last). chart-label: screen-reader summary of the chart; without it the chart is decorative. labels: array overriding the words. --}}
@include('nasaq::components.chart-extras._logic')
@props(['value' => null, 'data' => null, 'variant' => 'line', 'delta' => null, 'invert' => false, 'highlight' => null, 'chartLabel' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_cx_words($locale, $labels);
    $dir = $delta === null || $delta == 0 ? 'flat' : ($delta > 0 ? 'up' : 'down');
    $good = $dir === 'flat' ? null : (($dir === 'up') !== (bool) $invert);
    $color = $good === null ? 'var(--primary)' : ($good ? 'var(--nq-success)' : 'var(--nq-danger)');
    $tone = $good === null ? 'text-muted-foreground' : ($good ? 'text-nq-success-text' : 'text-nq-danger-text');
    $series = $data ? array_values($data) : [];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'trend-cell') }}" data-trend="{{ $dir }}" {{ $attributes->except('data-slot')->cn('flex items-center justify-end gap-3') }}>
    <div class="flex flex-col items-end leading-tight">
        <span class="text-body-sm tabular-nums text-foreground">@if ($slot->isNotEmpty()){{ $slot }}@elseif ($value !== null)<x-nq::numeric :value="$value" />@endif</span>
        @if ($delta !== null)
            <span class="inline-flex items-center gap-0.5 text-caption tabular-nums {{ $tone }}">
                @if ($dir === 'up')<x-lucide-arrow-up aria-hidden="true" class="size-3" />@elseif ($dir === 'down')<x-lucide-arrow-down aria-hidden="true" class="size-3" />@else<x-lucide-minus aria-hidden="true" class="size-3" />@endif
                <span class="sr-only">{{ $t[$dir] }} </span>
                <span dir="ltr" class="tabular-nums">{{ nq_cx_number($delta, $locale, 'percent', 1, true) }}</span>
            </span>
        @endif
    </div>
    @if ($series)
        @if ($variant === 'bar')
            <x-nq::chart.mini-bar :data="$series" :color="$color" :highlight="$highlight ?? count($series) - 1" :label="$chartLabel" class="h-8 w-20" />
        @else
            <x-nq::chart.sparkline :data="$series" :color="$color" :label="$chartLabel" class="h-8 w-20" />
        @endif
    @endif
</div>
