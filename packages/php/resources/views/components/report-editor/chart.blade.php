{{-- <x-nq::report-editor.chart :block="['type' => 'chart', 'title' => 'Sales', 'kind' => 'bar', 'series' => ['A', 'B'], 'rows' => [['label' => 'Jan', 'values' => [1, 2]]]]" />
     A bar, line or area chart of a chart block. The React one is a Recharts chart; this one is hand-drawn SVG (no chart library), so it has no
     hover cursor: each bar and dot carries a title with its values, and the legend names the series when there are several. Time runs right to left in RTL.
     block: ['title', 'kind' => bar|line|area, 'series' => [names], 'rows' => [['label', 'values' => [one per series]]], 'caption']. labels: overrides the words. locale overrides the app's. --}}
@include('nasaq::components.report-editor._logic')
@props(['block', 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_re_words($locale, $labels);
    $kind = in_array($block['kind'] ?? 'bar', ['bar', 'line', 'area'], true) ? ($block['kind'] ?? 'bar') : 'bar';
    $series = array_values($block['series'] ?? []);
    $rows = array_values($block['rows'] ?? []);
    $names = array_map(fn ($s, $i) => $s !== '' && $s !== null ? $s : nq_re_fill($t['defaultSeries'], nq_re_num($i + 1, $locale)), $series, array_keys($series));
    $kindName = ['bar' => $t['kindBar'], 'line' => $t['kindLine'], 'area' => $t['kindArea']][$kind];
    $summary = nq_re_fill($t['chartSummary'], ($block['title'] ?? '') !== '' ? $block['title'] : $kindName, '', nq_re_num(count($rows), $locale), nq_re_num(count($series), $locale));
    $config = [];
    foreach ($series as $i => $_) {
        $config['s'.$i] = ['label' => $names[$i]];
    }
    $chartClass = trim("aspect-auto h-64 flex-col justify-start gap-2 ".($attributes->get("class") ?? ""));
    $geo = nq_re_chart($block, $names, $locale);
@endphp
<x-nq::chart :config="$config" :label="$summary" :class="$chartClass">
    <div data-slot="report-chart" data-kind="{{ $kind }}" class="flex min-h-0 flex-1 gap-2">
        <div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
            <span>{{ nq_re_compact($geo['hi'], $locale) }}</span>
            <span>{{ nq_re_compact($geo['lo'], $locale) }}</span>
        </div>
        <div class="relative min-w-0 flex-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
                @if ($kind === 'bar')
                    @foreach ($geo['bars'] as $b)
                        <rect data-slot="report-bar" x="{{ $b['x'] }}" y="{{ $b['y'] }}" width="{{ $b['w'] }}" height="{{ $b['h'] }}" fill="var(--color-s{{ $b['si'] }})"><title>{{ $b['tip'] }}</title></rect>
                    @endforeach
                @else
                    @foreach ($geo['lines'] as $l)
                        @if ($kind === 'area')
                            <polygon points="{{ $l['area'] }}" fill="var(--color-s{{ $l['si'] }})" fill-opacity="0.16" />
                        @endif
                        <polyline data-slot="report-line" points="{{ $l['line'] }}" fill="none" stroke="var(--color-s{{ $l['si'] }})" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
                    @endforeach
                @endif
            </svg>
            @if ($kind !== 'bar')
                @foreach ($geo['dots'] as $d)
                    <span data-slot="chart-dot" title="{{ $d['tip'] }}" class="absolute size-1.5 -translate-y-1/2 rounded-full ltr:-translate-x-1/2 rtl:translate-x-1/2" style="inset-inline-start: {{ $d['x'] }}%; top: {{ $d['y'] }}%; background-color: var(--color-s{{ $d['si'] }})"></span>
                @endforeach
            @endif
        </div>
    </div>
    <div aria-hidden="true" class="flex justify-between gap-1 ps-14 text-muted-foreground">
        @foreach ($rows as $row)
            <span class="min-w-0 truncate">{{ $row['label'] ?? '' }}</span>
        @endforeach
    </div>
    @if (count($series) > 1)
        <ul data-slot="chart-legend" class="flex flex-wrap justify-center gap-3 text-muted-foreground">
            @foreach ($names as $i => $name)
                <li class="inline-flex items-center gap-1.5"><span aria-hidden="true" class="size-2 rounded-[2px]" style="background-color: var(--color-s{{ $i }})"></span>{{ $name }}</li>
            @endforeach
        </ul>
    @endif
</x-nq::chart>
