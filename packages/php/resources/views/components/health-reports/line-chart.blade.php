{{-- Internal: the hand-drawn line chart of x-nq::health-reports (the React one is a Recharts LineChart). A missing reading breaks the line instead of
     dropping to zero. The SVG mirrors in RTL and the dots use logical offsets, so time runs right to left. points: [['label' => '29 Sep', 'value' => 84.2]]
     (value null for a missing reading); config: key => ['label', 'color']; label: the accessible name. --}}
@props(['config' => [], 'points' => [], 'label' => null])
@php
    $values = array_values(array_filter(array_column($points, 'value'), fn ($v) => $v !== null));
    $lo = $values ? min($values) : 0;
    $hi = $values ? max($values) : 1;
    $pad = $hi == $lo ? 1 : ($hi - $lo) * 0.1;
    $lo -= $pad;
    $hi += $pad;
    $n = count($points);
    $plotted = [];
    foreach (array_values($points) as $i => $p) {
        $plotted[] = $p + ['x' => $n === 1 ? 50 : ($i / ($n - 1)) * 100, 'y' => $p['value'] === null ? null : 100 - (($p['value'] - $lo) / ($hi - $lo)) * 100];
    }
    $runs = [];
    $run = [];
    foreach ($plotted as $p) {
        if ($p['y'] === null) {
            if (count($run) > 1) {
                $runs[] = implode(' ', $run);
            }
            $run = [];
        } else {
            $run[] = round($p['x'], 2).','.round($p['y'], 2);
        }
    }
    if (count($run) > 1) {
        $runs[] = implode(' ', $run);
    }
    $fmt = fn ($v) => (string) (round($v * 10) / 10);
@endphp
<x-nq::chart :config="$config" :label="$label" {{ $attributes->cn('aspect-auto h-64 flex-col justify-start gap-2') }}>
    <div class="flex min-h-0 flex-1 gap-2">
        <div aria-hidden="true" class="flex w-10 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums"><span>{{ $fmt($hi) }}</span><span>{{ $fmt($lo) }}</span></div>
        <div class="relative min-w-0 flex-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
                @foreach ($runs as $r)
                    <polyline points="{{ $r }}" fill="none" stroke="var(--color-value)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
                @endforeach
            </svg>
            @foreach ($plotted as $p)
                @if ($p['y'] !== null)
                    <span data-slot="chart-dot" title="{{ $p['label'] }}: {{ $p['value'] }}" class="absolute size-1.5 -translate-y-1/2 rounded-full bg-[var(--color-value)] ltr:-translate-x-1/2 rtl:translate-x-1/2" style="inset-inline-start: {{ round($p['x'], 2) }}%; top: {{ round($p['y'], 2) }}%"></span>
                @endif
            @endforeach
        </div>
    </div>
    <div aria-hidden="true" class="flex justify-between ps-12 text-muted-foreground"><span>{{ $points[0]['label'] ?? '' }}</span><span>{{ $points ? end($points)['label'] : '' }}</span></div>
</x-nq::chart>
