{{-- Internal: the hand-drawn line and area chart of the APM panels (the React ones are Recharts charts). Not for use on its own.
     config: key => ['label', 'color']. keys: the series. rows: [['label' => '9:00 AM', 'values' => ['p50' => 120]]]. kind: line | area.
     tick: compact | percent (the y ticks). format: int | percent (a reading in the dot tooltip). reference: ['value' => 500, 'label' => 'Target p95 500'].
     Horizontal grid, a y-axis column, an optional dashed guide line, and an invisible dot per reading that shows on hover with its time and
     value in the native tooltip. The SVG mirrors in RTL and dots use logical offsets, so time runs right to left. --}}
@include('nasaq::components.apm-panels._logic')
@props(['config', 'keys', 'rows', 'kind' => 'line', 'tick' => 'compact', 'format' => 'int', 'reference' => null, 'label', 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $max = 0;
    foreach ($rows as $r) {
        foreach ($keys as $k) {
            $max = max($max, $r['values'][$k] ?? 0);
        }
    }
    if ($reference) {
        $max = max($max, $reference['value']);
    }
    $ticks = nq_apm_ticks($max);
    $top = $ticks[0] ?: 1;
    $yOf = fn ($v) => 100 - ($v / $top) * 100;
    $count = count($rows);
    $xOf = fn ($i) => $count === 1 ? 50 : ($i / ($count - 1)) * 100;
    $n = fn ($v) => number_format($v, 2, '.', '');
    $series = [];
    foreach ($keys as $key) {
        $pts = [];
        foreach (array_values($rows) as $i => $r) {
            $v = $r['values'][$key] ?? 0;
            $pts[] = ['x' => $xOf($i), 'y' => $yOf($v), 'v' => $v, 'label' => $r['label']];
        }
        $line = implode(' ', array_map(fn ($p) => $n($p['x']).','.$n($p['y']), $pts));
        $area = $pts ? $n($pts[0]['x']).',100 '.$line.' '.$n($pts[count($pts) - 1]['x']).',100' : '';
        $series[] = ['key' => $key, 'pts' => $pts, 'line' => $line, 'area' => $area];
    }
    $rowList = array_values($rows);
    $xLabels = array_map(fn ($i) => $rowList[$i]['label'], nq_apm_label_indices($count));
    $tickText = fn ($v) => $tick === 'percent' ? nq_apm_number($v, $locale, 'percent', 0, 1) : nq_apm_number($v, $locale, 'compact');
    $valueText = fn ($v) => $format === 'percent' ? nq_apm_number($v, $locale, 'percent', 0, 2) : nq_apm_number($v, $locale, 'decimal', 0, 0);
@endphp
<x-nq::chart :config="$config" :label="$label" {{ $attributes->cn('aspect-auto flex-col justify-start gap-2') }}>
    <div class="flex min-h-0 flex-1 gap-2">
        <div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
            @foreach ($ticks as $tk)<span>{{ $tickText($tk) }}</span>@endforeach
        </div>
        <div class="relative min-w-0 flex-1 border-b border-border">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
                @foreach (array_slice($ticks, 0, -1) as $tk)
                    <line x1="0" x2="100" y1="{{ $n($yOf($tk)) }}" y2="{{ $n($yOf($tk)) }}" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke" />
                @endforeach
                @if ($reference)
                    <line x1="0" x2="100" y1="{{ $n($yOf($reference['value'])) }}" y2="{{ $n($yOf($reference['value'])) }}" stroke="var(--nq-warning)" stroke-width="1.5" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" />
                @endif
                @foreach ($series as $s)
                    @if ($kind === 'area')<polygon points="{{ $s['area'] }}" fill="var(--color-{{ $s['key'] }})" fill-opacity="0.14" />@endif
                    <polyline points="{{ $s['line'] }}" fill="none" stroke="var(--color-{{ $s['key'] }})" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
                @endforeach
            </svg>
            @if ($reference)<span class="absolute end-1 text-caption text-nq-warning-text" style="top: {{ $n($yOf($reference['value'])) }}%">{{ $reference['label'] }}</span>@endif
            @foreach ($series as $s)
                @foreach ($s['pts'] as $p)
                    <span data-slot="chart-dot" title="{{ $p['label'] }}: {{ $config[$s['key']]['label'] ?? $s['key'] }} {{ $valueText($p['v']) }}" class="absolute size-2 -translate-y-1/2 rounded-full bg-[var(--color-key)] opacity-0 hover:opacity-100 ltr:-translate-x-1/2 rtl:translate-x-1/2" style="inset-inline-start: {{ $n($p['x']) }}%; top: {{ $n($p['y']) }}%; --color-key: var(--color-{{ $s['key'] }})"></span>
                @endforeach
            @endforeach
        </div>
    </div>
    <div aria-hidden="true" class="flex justify-between ps-14 text-muted-foreground">
        @foreach ($xLabels as $l)<span>{{ $l }}</span>@endforeach
    </div>
</x-nq::chart>
