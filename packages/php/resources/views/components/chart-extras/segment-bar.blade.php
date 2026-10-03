{{-- <x-nq::chart-extras.segment-bar :segments="[['id' => 'organic', 'label' => 'Organic', 'value' => 4200], ['id' => 'paid', 'label' => 'Paid', 'value' => 2100]]" />
     One bar cut into proportional segments with a legend that carries the values, so nothing depends on colour alone. Segments grow from
     the inline start (right to left in Arabic). segments: rows of id, label, value, optional color. total: larger than the sum leaves an
     empty track (6 of 10 seats). rest-label: legend text for that track. legend / inline-labels: default true. patterned: hatch overlays.
     size: sm | md | lg. label: screen-reader summary. labels: array overriding the words. --}}
@include('nasaq::components.chart-extras._logic')
@props(['segments' => [], 'total' => null, 'legend' => true, 'inlineLabels' => true, 'patterned' => false, 'size' => 'md', 'label' => null, 'restLabel' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_cx_words($locale, $labels);
    $segments = array_values($segments);
    $calc = nq_cx_segment_shares($segments, $total);
    $palette = ['var(--primary)', 'var(--nq-tag-blue)', 'var(--nq-tag-teal)', 'var(--nq-tag-amber)', 'var(--nq-tag-violet)', 'var(--nq-tag-pink)', 'var(--nq-tag-orange)', 'var(--nq-tag-green)'];
    $patterns = [null, 'repeating-linear-gradient(135deg, color-mix(in oklab, var(--card) 55%, transparent) 0 2px, transparent 2px 7px)', 'repeating-linear-gradient(45deg, color-mix(in oklab, var(--card) 55%, transparent) 0 2px, transparent 2px 7px)', 'radial-gradient(color-mix(in oklab, var(--card) 65%, transparent) 1.2px, transparent 1.6px) 0 0 / 6px 6px'];
    $height = ['sm' => 'h-2', 'md' => 'h-4', 'lg' => 'h-7'][$size] ?? 'h-4';
    $pct0 = fn ($v) => nq_cx_number($v, $locale, 'percent', 0);
    $pct1 = fn ($v) => nq_cx_number($v, $locale, 'percent', 1);
    $summary = $label ?? sprintf($t['segments'], implode(', ', array_map(fn ($s, $i) => $s['label'].' '.$pct0($calc['shares'][$i]['share']), $segments, array_keys($segments))));
    $colorOf = fn ($s, $i) => $s['color'] ?? $palette[$i % count($palette)];
    $patternOf = fn ($i) => $patterned ? $patterns[$i % count($patterns)] : null;
    $fill = fn ($s, $i) => 'background-color: '.$colorOf($s, $i).';'.($patternOf($i) ? ' background-image: '.$patternOf($i).';' : '');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'segment-bar') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <div role="img" aria-label="{{ $summary }}" class="flex w-full gap-0.5 overflow-hidden rounded-full bg-nq-surface-soft {{ $height }}">
        @foreach ($segments as $i => $s)
            @if ($calc['shares'][$i]['share'] > 0)
                <span data-slot="segment-bar-segment" title="{{ $s['label'] }}: {{ nq_cx_number($calc['shares'][$i]['value'], $locale) }} ({{ $pct1($calc['shares'][$i]['share']) }})" style="flex-grow: {{ nq_cx_css($calc['shares'][$i]['value']) }}; flex-basis: 0; {{ $fill($s, $i) }}" class="flex min-w-1 items-center justify-center overflow-hidden text-caption text-primary-foreground first:rounded-s-full last:rounded-e-full">
                    @if ($inlineLabels && $size !== 'sm' && $calc['shares'][$i]['share'] >= 0.1)<span class="px-1 tabular-nums [text-shadow:0_0_2px_rgb(0_0_0/0.35)]">{{ $pct0($calc['shares'][$i]['share']) }}</span>@endif
                </span>
            @endif
        @endforeach
        @if ($calc['rest'] > 0)<span aria-hidden="true" style="flex-grow: {{ nq_cx_css($calc['rest']) }}; flex-basis: 0"></span>@endif
    </div>
    @if ($legend)
        <ul data-slot="segment-bar-legend" class="grid gap-x-6 gap-y-1.5 text-body-sm [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
            @foreach ($segments as $i => $s)
                <li class="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" style="{{ $fill($s, $i) }}"></span>
                    <span class="min-w-0 flex-1 truncate text-muted-foreground">{{ $s['label'] }}</span>
                    <span class="tabular-nums text-foreground"><x-nq::numeric :value="$s['value']" /></span>
                    <span class="w-12 text-end tabular-nums text-muted-foreground"><x-nq::numeric :value="$calc['shares'][$i]['share']" style="percent" :max-fraction="0" /></span>
                </li>
            @endforeach
            @if ($calc['rest'] > 0 && $restLabel)
                <li class="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px] border border-border bg-nq-surface-soft"></span>
                    <span class="min-w-0 flex-1 truncate text-muted-foreground">{{ $restLabel }}</span>
                    <span class="tabular-nums text-foreground"><x-nq::numeric :value="$calc['rest']" /></span>
                    <span class="w-12"></span>
                </li>
            @endif
        </ul>
    @endif
</div>
