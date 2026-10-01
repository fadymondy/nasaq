{{-- <x-nq::chart.mini-bar :data="[3, 5, 4, 8]" :highlight="3" label="Orders, last 4 weeks" />
     Axis-less bar strip for table cells and cards. Same sizing and RTL rules as chart.sparkline (flex lays the bars out in reading order,
     so time runs right to left in RTL). data: numbers or ['value' => n]. color: any CSS colour (default the brand colour).
     label: screen-reader summary; without it the chart is hidden from assistive tech. highlight: index of a bar to emphasise. --}}
@props(['data' => [], 'color' => 'var(--primary)', 'label' => null, 'highlight' => null])
@php
    $vals = array_map(fn ($d) => is_array($d) ? $d['value'] : $d, array_values($data));
    $max = max(0, ...($vals ?: [0]));
@endphp
<div data-slot="mini-bar" @if ($label) role="img" aria-label="{{ $label }}" @else aria-hidden="true" @endif {{ $attributes->cn('h-8 w-32 shrink-0') }}>
    <div class="flex size-full items-end gap-0.5 pt-0.5">
        @foreach ($vals as $i => $v)
            <span class="min-w-0 flex-1 rounded-[2px]"
                style="height: {{ $max ? round(max($v, 0) / $max * 100, 4) : 0 }}%; background-color: {{ $color }}; opacity: {{ $highlight === null || $highlight === $i ? 1 : 0.35 }}"></span>
        @endforeach
    </div>
</div>
