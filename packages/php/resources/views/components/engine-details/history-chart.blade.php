{{-- Internal: the hand-drawn bar chart of x-nq::engine-details (the React one is a Recharts BarChart). Flex lays the bars out in reading order, so
     time runs right to left in RTL. bars: [['label' => '29 Sep', 'values' => ['entries' => 4]]]; config: key => ['label', 'color']; label: the accessible
     name; stacked stacks each bar's segments and draws a legend. --}}
@props(['config' => [], 'bars' => [], 'label' => null, 'stacked' => false])
@php
    $keys = array_keys($config);
    $total = fn ($bar) => array_sum(array_map(fn ($k) => $bar['values'][$k] ?? 0, $keys));
    $max = max(1, ...array_map($total, $bars ?: [['values' => []]]));
    $legend = array_map(fn ($k) => ['dataKey' => $k, 'color' => 'var(--color-'.$k.')'], $keys);
@endphp
<x-nq::chart :config="$config" :label="$label" {{ $attributes->cn('aspect-auto h-52 flex-col justify-start gap-2') }}>
    <div class="flex min-h-0 flex-1 gap-2">
        <div aria-hidden="true" class="flex w-7 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums"><span>{{ $max }}</span><span>0</span></div>
        <div class="flex min-w-0 flex-1 items-end gap-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
            @foreach ($bars as $bar)
                @php $title = $bar['label'].': '.implode(', ', array_map(fn ($k) => ($config[$k]['label'] ?? $k).' '.($bar['values'][$k] ?? 0), $keys)); @endphp
                <div data-slot="chart-bar" title="{{ $title }}" class="flex h-full min-w-0 flex-1 flex-col-reverse justify-start">
                    @foreach ($keys as $s => $k)
                        <span class="block w-full {{ $s === count($keys) - 1 ? 'rounded-t-[3px]' : '' }}" style="height: {{ (($bar['values'][$k] ?? 0) / $max) * 100 }}%; background-color: var(--color-{{ $k }})"></span>
                    @endforeach
                </div>
            @endforeach
        </div>
    </div>
    <div aria-hidden="true" class="flex justify-between ps-9 text-muted-foreground"><span>{{ $bars[0]['label'] ?? '' }}</span><span>{{ $bars ? end($bars)['label'] : '' }}</span></div>
    @if ($stacked)<x-nq::chart.legend :config="$config" :payload="$legend" />@endif
</x-nq::chart>
